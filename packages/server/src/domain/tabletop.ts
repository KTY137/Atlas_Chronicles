// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { AdventureAdvance, AdventureUpdate, emptyAdventureTree, validAdventureTree, type AdventureCard } from "@chronicle/protocol";
import { stableJson } from "@chronicle/rules";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createGameplay } from "./gameplay.ts";
import { Conflict, Gone } from "./errors.ts";

export class AdventureValidationError extends Error { readonly statusCode = 400; }
const invalid = () => new AdventureValidationError("Bitte Szenen, Entscheidungen und Verbindungen des Abenteuerbaums prüfen. Verbindungen dürfen keinen Kreis bilden.");
const digest = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

export function createTabletop(db: Db, config: DomainConfig = {}) {
  const now = config.now ?? Date.now;
  async function read(tx: Db, campaignId: string): Promise<AdventureCard> {
    const row = (await tx.query<{ version: number; document: AdventureCard["document"]; current_node_id: string | null; updated_at: string }>(
      "SELECT version,document,current_node_id,updated_at FROM adventure_trees WHERE campaign_id=$1", [campaignId])).rows[0];
    return row ? { version: row.version, document: row.document, currentNodeId: row.current_node_id, updatedAt: Number(row.updated_at) }
      : { version: 0, document: emptyAdventureTree(), currentNodeId: null, updatedAt: null };
  }
  async function getAdventure(userId: string, campaignId: string) {
    return db.transaction(async tx => {
      await createCampaigns(tx, config).requireMember(userId, campaignId, ["leitung"]);
      return read(tx, campaignId);
    });
  }
  async function change(userId: string, campaignId: string, raw: unknown, operation: "save" | "advance"): Promise<AdventureCard> {
    if (!Value.Check(operation === "save" ? AdventureUpdate : AdventureAdvance, raw)) throw invalid();
    // Validate before crossing the transaction boundary; raw input is never used as SQL identifiers.
    const input = JSON.parse(stableJson(raw)) as typeof AdventureUpdate.static | typeof AdventureAdvance.static;
    if ("document" in input && !validAdventureTree(input.document)) throw invalid();
    return db.transaction(async tx => {
      const admitted = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 AND m.role='leitung' FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
      if (!admitted.rowCount) throw new Gone();
      const requestHash = digest({ campaignId, userId, operation: `adventure.${operation}`, input });
      const oldCommand = (await tx.query<{ campaign_id: string; request_hash: string; response: AdventureCard }>(
        "SELECT campaign_id,request_hash,response FROM commands WHERE user_id=$1 AND command_id=$2", [userId, input.commandId])).rows[0];
      if (oldCommand) {
        if (oldCommand.campaign_id !== campaignId || oldCommand.request_hash !== requestHash) throw new Conflict();
        return oldCommand.response;
      }
      const before = await read(tx, campaignId);
      if (input.expectedVersion !== before.version) throw new Conflict("Der Abenteuerbaum wurde inzwischen geändert. Lade den aktuellen Stand, bevor du speicherst.");
      let document = before.document, currentNodeId = before.currentNodeId;
      if ("document" in input) {
        document = input.document;
        const scenes = [...new Set(document.nodes.flatMap(node => node.sceneId ? [node.sceneId] : []))];
        if ((await tx.query("SELECT id FROM scenes WHERE campaign_id=$1 AND id=ANY($2::text[])", [campaignId, scenes])).rowCount !== scenes.length) throw invalid();
        if (!document.nodes.some(node => node.id === currentNodeId)) currentNodeId = null;
      } else {
        const node = document.nodes.find(node => node.id === input.nodeId);
        if (!node) throw new Gone();
        if (node.sceneId) {
          if (input.expectedSceneVersion === undefined) throw invalid();
          await createGameplay(tx, config).startScene(userId, campaignId, node.sceneId, { expectedSceneVersion: input.expectedSceneVersion });
        } else if (input.expectedSceneVersion !== undefined) throw invalid();
        currentNodeId = node.id;
      }
      const after: AdventureCard = { document, currentNodeId, version: before.version + 1, updatedAt: now() };
      await tx.query(`INSERT INTO adventure_trees(campaign_id,version,document,current_node_id,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(campaign_id) DO UPDATE SET version=EXCLUDED.version,document=EXCLUDED.document,current_node_id=EXCLUDED.current_node_id,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [campaignId, after.version, document, currentNodeId, userId, after.updatedAt]);
      await tx.query("INSERT INTO commands(user_id,command_id,campaign_id,request_hash,response,created_at) VALUES($1,$2,$3,$4,$5,$6)", [userId, input.commandId, campaignId, requestHash, after, after.updatedAt]);
      return after;
    });
  }
  return { getAdventure, saveAdventure: (userId: string, campaignId: string, input: unknown) => change(userId, campaignId, input, "save"),
    advanceAdventure: (userId: string, campaignId: string, input: unknown) => change(userId, campaignId, input, "advance") };
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { BAUWERK_TYPEN, type KartenSetting, type Knoten, type TacticalPoint } from "@chronicle/szene";
import { bauwerkAusdehnung, type GrundrissOptionen, type SiedlungOptionen } from "@chronicle/forge";
import type { Db } from "../db/index.ts";
import type { IdentityConfig } from "../identity/index.ts";
import { createCampaigns } from "./campaigns.ts";
import { createAtlas } from "./atlas.ts";
import { Conflict, Gone } from "./errors.ts";
import { createGrundriss, validateKartenOptionen, type KartenArt, type KartenStil, type KartenOptionen } from "./grundriss.ts";
import { createTactical, tacticalHash, TacticalValidationError } from "./tactical.ts";
import { activeMapEntrances, isMapDeleted, MapLifecycleConflict, type MapEntranceRow, type MapEnterPayload } from "./map-lifecycle.ts";
import { tacticalPointInside } from "./tactical-state.ts";

/** One durable entrance per source placement, with ordinary editable tactical maps behind it.
 * Generation, source CAS, edge and receipt share the existing Db transaction/savepoint boundary.
 * No browser state or second map-content store participates in a map's identity. */
export type ParentKind = "atlas" | "tactical";
export interface BetretenScope { readonly parentKind: ParentKind; readonly parentMapId: string }
export interface BetretenInput {
  readonly commandId: string;
  readonly knotenId: string;
  readonly parentKind?: ParentKind;
  readonly parentMapId?: string;
  readonly expectedVersion?: number;
  readonly name?: string;
  /** Explicitly attach an existing map; omission generates from the server-owned child seed. */
  readonly targetMapId?: string;
  /**
   * Welche Art Karte hinter dieser Tuer entsteht — dieselbe Wahl wie beim freien Erzeugen.
   *
   * Ohne sie war jede Unterkarte ein Grundriss: hinter dem Hoehleneingang lagen Raeume und
   * Gaenge. Die Wahl gilt nur beim ERSTEN Betreten; danach ist der Ort da, und ein zweites
   * Betreten fuehrt dorthin zurueck, statt ihn neu zu wuerfeln.
   */
  readonly art?: KartenArt;
  readonly stil?: KartenStil;
  readonly optionen?: KartenOptionen;
}
export interface BetretenResult { mapId: string; erzeugt: boolean; keimHash: string | null }
interface AdresseRow { map_id: string; keim_hash: string | null; parent_kind: ParentKind; parent_map_id: string; knoten_id: string }
/** `umfang` is the node's outline on its parent, in the parent's construction cells; it sizes a building's interior. */
interface Eingang { knotenId: string; titel: string; art: Knoten["art"]; bauwerk?: Knoten["bauwerk"]; x: number; y: number; kindKeim: string | null; erzeugungsArt?: KartenArt; umfang?: readonly [number, number] }
interface Quelle { scope: BetretenScope; title: string; version: number; nodes: Eingang[]; art?: KartenArt; stil?: KartenStil; setting: KartenSetting }
export interface MapAncestor { kind: ParentKind; id: string; title: string }
export interface KnotenMetadataInput { readonly commandId: string; readonly expectedVersion: number; readonly titel: string; readonly bauwerk?: NonNullable<Knoten["bauwerk"]> }

const validId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 128 && /\S/.test(value);
function validateScope(scope: BetretenScope): void {
  if (!scope || !["atlas", "tactical"].includes(scope.parentKind) || !validId(scope.parentMapId))
    throw new TacticalValidationError("Bitte eine vorhandene übergeordnete Karte auswählen.");
}
function validateInput(input: BetretenInput): void {
  const allowed = new Set(["commandId", "knotenId", "parentKind", "parentMapId", "expectedVersion", "name", "targetMapId", "art", "stil", "optionen"]);
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !allowed.has(key))
    || !validId(input.commandId) || !validId(input.knotenId)
    || input.name !== undefined && (typeof input.name !== "string" || !input.name.trim() || input.name.length > 160)
    || input.targetMapId !== undefined && !validId(input.targetMapId)
    || input.art !== undefined && !["grundriss", "hoehle", "siedlung"].includes(input.art)
    || input.stil !== undefined && !["grundriss", "gemalt", "zeitwelten", "genres"].includes(input.stil)
    || input.expectedVersion !== undefined && (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1))
    throw new TacticalValidationError("Bitte Kartenadresse, Namen und erwartete Version prüfen.");
  // Eine Kartenart zu nennen und zugleich eine fertige Karte anzuhaengen sind zwei verschiedene
  // Auftraege. Die Art waere hier wirkungslos — und eine wirkungslos geschluckte Eingabe ist
  // schlimmer als eine abgelehnte: niemand erfaehrt, dass seine Wahl nicht galt.
  if ((input.art !== undefined || input.stil !== undefined || input.optionen !== undefined) && input.targetMapId !== undefined)
    throw new TacticalValidationError("Eine bereits vorhandene Karte wird angehängt, nicht erzeugt — eine Kartenart lässt sich dabei nicht wählen.");
  if (input.parentKind !== undefined || input.parentMapId !== undefined)
    validateScope({ parentKind: input.parentKind!, parentMapId: input.parentMapId! });
}

function validateMetadata(input: KnotenMetadataInput): void {
  const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  const controls = /[\u0000-\u001f\u007f-\u009f]/u;
  if (!plain(input) || Object.keys(input).some(key => !["commandId", "expectedVersion", "titel", "bauwerk"].includes(key))
    || !validId(input.commandId) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1
    || typeof input.titel !== "string" || !input.titel.trim() || input.titel.length > 160 || controls.test(input.titel)
    || input.bauwerk !== undefined && (!plain(input.bauwerk)
      || Object.keys(input.bauwerk).some(key => !["typ", "beschreibung"].includes(key))
      || !BAUWERK_TYPEN.includes(input.bauwerk.typ) || typeof input.bauwerk.beschreibung !== "string"
      || input.bauwerk.beschreibung.length > 2000 || controls.test(input.bauwerk.beschreibung)))
    throw new TacticalValidationError("Bitte Namen und Gebäudebeschreibung prüfen.");
}

/** Polygon means may lie outside concave rooms. A scan line gives an interior anchor without
 * inventing geometry; the existing boundary vertex is the fallback for degenerate rings. */
function roomAnchor(points: readonly TacticalPoint[]): TacticalPoint {
  const mean: TacticalPoint = [points.reduce((n, p) => n + p[0], 0) / points.length, points.reduce((n, p) => n + p[1], 0) / points.length];
  if (tacticalPointInside(mean, points)) return mean;
  const ys = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b);
  // Three bands bound the work even for a malformed, zero-area ring with thousands of points.
  for (const i of new Set([1, Math.floor(ys.length / 2), ys.length - 1])) {
    if (i < 1 || i >= ys.length) continue;
    const y = (ys[i - 1]! + ys[i]!) / 2, xs: number[] = [];
    for (let j = 0; j < points.length; j++) {
      const a = points[j]!, b = points[(j + 1) % points.length]!;
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((a, b) => a - b);
    if (xs.length >= 2 && xs[0]! < xs[1]!) return [(xs[0]! + xs[1]!) / 2, y];
  }
  return points[0]!;
}

export function createBetreten(db: Db, cfg: IdentityConfig) {
  const now = cfg.now ?? Date.now;

  async function resolveScope(tx: Db, campaignId: string, knotenId: string, input?: Partial<BetretenScope>): Promise<BetretenScope> {
    if (input?.parentKind !== undefined || input?.parentMapId !== undefined) {
      const scope = { parentKind: input.parentKind!, parentMapId: input.parentMapId! }; validateScope(scope); return scope;
    }
    // Legacy route remains usable only when the old unscoped address is unambiguous.
    const rows = (await tx.query<{ map_id: string }>(`SELECT n.map_id FROM atlas_nodes n WHERE n.campaign_id=$1 AND n.id=$2
      AND NOT EXISTS (SELECT 1 FROM map_lifecycle_events e WHERE e.campaign_id=n.campaign_id AND e.operation='map.delete'
        AND e.payload->'preview'->'maps' @> jsonb_build_array(jsonb_build_object('kind','atlas','id',n.map_id))) LIMIT 2`, [campaignId, knotenId])).rows;
    if (rows.length !== 1) throw new Gone("knoten");
    return { parentKind: "atlas", parentMapId: rows[0]!.map_id };
  }

  async function source(tx: Db, userId: string, campaignId: string, scope: BetretenScope): Promise<Quelle> {
    validateScope(scope);
    if (scope.parentKind === "atlas") {
      // Use exactly the atlas projection's revelation/knowledge policy before looking up seeds.
      const map = await createAtlas(tx, cfg).getMap(userId, campaignId, scope.parentMapId);
      const data = new Map((await tx.query<{ id: string; data: Knoten }>("SELECT id,data FROM atlas_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, scope.parentMapId])).rows.map(row => [row.id, row.data]));
      const pins = new Map<string, (typeof map.pins)[number]>(map.pins.map(pin => [pin.id, pin]));
      const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
      return { scope, title: map.title, version: map.version ?? 0, setting: "fantasy",
        nodes: map.nodes.map(node => {
          const knoten = data.get(node.id), pin = pins.get(node.id);
          const erzeugungsArt = knoten?.herkunft?.erzeuger === "azgaar-fmg" && knoten.herkunft.erzeugungspfad[0] === "ort" ? "siedlung" as const : "grundriss" as const;
          return { knotenId: node.id, titel: node.title ?? "Unbenannt", art: knoten?.art ?? "ort", erzeugungsArt,
            ...(member.role === "leitung" && knoten?.bauwerk ? { bauwerk: knoten.bauwerk } : {}), x: pin?.x ?? 0, y: pin?.y ?? 0,
            kindKeim: member.role === "leitung" ? knoten?.herkunft?.kindKeim ?? null : null };
        }) };
    }
    // getMap is the canonical GM-only draft reader. Players cannot inspect generated rooms.
    const map = await createTactical(tx, cfg).getMap(userId, campaignId, scope.parentMapId);
    const data = new Map((await tx.query<{ knoten_id: string; data: Knoten }>("SELECT knoten_id,data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, scope.parentMapId])).rows.map(row => [row.knoten_id, row.data]));
    const original = await createTactical(tx, cfg).getSource(userId, campaignId, map.id);
    const generator = original.provenance.generator;
    const art: KartenArt = generator === "chronicle-siedlung" ? "siedlung" : generator === "chronicle-hoehle" ? "hoehle" : "grundriss";
    // The source document identifies generated streets even after geometry edits. New drawn
    // regions remain enterable; a street never becomes a fake room simply for lacking a node.
    const originalDocument = original.format === "native" ? JSON.parse(original.source_text) as typeof map.document : null;
    const originalRegions = new Set(originalDocument?.geometry.regions.map(region => region.id));
    const roles = map.cartography ? new Map(map.cartography.regions.map(region => [region.regionId, region.role])) : null;
    const existingEntrances = new Set((await activeMapEntrances(tx, campaignId)).filter(edge => edge.parent_kind === "tactical" && edge.parent_map_id === map.id).map(row => row.knoten_id));
    const stamps = (originalDocument ?? map.document).geometry.stamps;
    const zelle = map.cartography?.construction.cellSize ?? (map.document.grid.kind === "none" ? 100 : map.document.grid.size);
    const stil: KartenStil = stamps.some(stamp => stamp.a.startsWith("pk.genres/")) ? "genres"
      : stamps.some(stamp => stamp.a.startsWith("pk.zeitwelten/")) ? "zeitwelten"
      : stamps.some(stamp => stamp.a.startsWith("pk.gemalt/")) ? "gemalt" : "grundriss";
    return { scope, title: map.name, version: map.version, art, stil, setting: original.provenance.setting ?? "fantasy", nodes: map.document.geometry.regions
      .filter(region => roles ? ["building", "room"].includes(roles.get(region.id) ?? "") || existingEntrances.has(region.id)
        : art !== "siedlung" || data.get(region.id)?.art === "bauwerk" || !originalRegions.has(region.id))
      .map((region, index) => {
      const node = data.get(region.id), [x, y] = roomAnchor(region.punkte);
      const xs = region.punkte.map(p => p[0]), ys = region.punkte.map(p => p[1]);
      const umfang: readonly [number, number] = [(Math.max(...xs) - Math.min(...xs)) / zelle, (Math.max(...ys) - Math.min(...ys)) / zelle];
      // Drawn/imported rooms have a stable server-derived seed. Generated rooms keep their exact
      // original seed, independently of names, geometry or subsequent edits.
      const seed = node?.herkunft?.kindKeim ?? createHash("sha256").update(JSON.stringify(["chronicle-room-child-v1", campaignId, map.id, region.id])).digest("hex");
      return { knotenId: region.id, titel: node?.titel ?? `${art === "siedlung" ? "Gebäude" : "Raum"} ${index + 1}`,
        art: roles?.get(region.id) === "building" ? "bauwerk" : roles?.get(region.id) === "room" ? "raum" : node?.art ?? (art === "siedlung" ? "bauwerk" : "raum"), ...(node?.bauwerk ? { bauwerk: node.bauwerk } : {}), x, y, kindKeim: seed, umfang };
    }) };
  }

  async function address(tx: Db, campaignId: string, scope: BetretenScope, knotenId: string): Promise<AdresseRow | null> {
    return (await activeMapEntrances(tx, campaignId)).find(edge => edge.parent_kind === scope.parentKind
      && edge.parent_map_id === scope.parentMapId && edge.knoten_id === knotenId) ?? null;
  }

  async function ancestry(tx: Db, userId: string, campaignId: string, scope: BetretenScope): Promise<MapAncestor[]> {
    await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
    const result: MapAncestor[] = [], seen = new Set<string>();
    const edges = await activeMapEntrances(tx, campaignId);
    let current: BetretenScope | null = scope;
    while (current) {
      const key = `${current.parentKind}:${current.parentMapId}`;
      if (seen.has(key)) throw new TacticalValidationError("Die Kartenhierarchie enthält einen Kreis.");
      seen.add(key);
      const sql = current.parentKind === "atlas" ? "SELECT title FROM atlas_maps WHERE campaign_id=$1 AND id=$2"
        : "SELECT name AS title FROM tactical_maps WHERE campaign_id=$1 AND id=$2";
      const parent = (await tx.query<{ title: string }>(sql, [campaignId, current.parentMapId])).rows[0];
      if (!parent) throw new Gone("parent-map");
      result.unshift({ kind: current.parentKind, id: current.parentMapId, title: parent.title });
      if (current.parentKind === "atlas") break;
      const currentId: string = current.parentMapId;
      const edge: AdresseRow | undefined = edges.find(candidate => candidate.map_id === currentId);
      current = edge ? { parentKind: edge.parent_kind, parentMapId: edge.parent_map_id } : null;
    }
    return result;
  }

  async function betretbar(userId: string, campaignId: string, knotenId: string, requested?: BetretenScope) {
    return db.transaction(async tx => {
      const member = await createCampaigns(tx, cfg).requireMember(userId, campaignId);
      const scope = await resolveScope(tx, campaignId, knotenId, requested), parent = await source(tx, userId, campaignId, scope);
      const node = parent.nodes.find(candidate => candidate.knotenId === knotenId);
      if (!node) throw new Gone("knoten");
      const existing = member.role === "leitung" ? await address(tx, campaignId, scope, knotenId) : null;
      if (existing) await createTactical(tx, cfg).getMap(userId, campaignId, existing.map_id);
      return { kindKeim: node.kindKeim, vorhandeneKarteId: existing?.map_id ?? null, titel: node.titel,
        art: node.art, ...(node.bauwerk ? { bauwerk: node.bauwerk } : {}),
        erzeugungsArt: node.erzeugungsArt ?? "grundriss", stil: parent.stil ?? "grundriss", setting: parent.setting,
        ...scope, knotenId, version: parent.version };
    });
  }

  async function children(userId: string, campaignId: string, scope: BetretenScope) {
    return db.transaction(async tx => {
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      const parent = await source(tx, userId, campaignId, scope);
      const edges = new Map((await activeMapEntrances(tx, campaignId)).filter(edge => edge.parent_kind === scope.parentKind
        && edge.parent_map_id === scope.parentMapId).map(edge => [edge.knoten_id, edge]));
      return { art: parent.art, stil: parent.stil, setting: parent.setting,
        nodes: parent.nodes.map(({ kindKeim, erzeugungsArt, umfang: _umfang, ...node }) => ({ ...node, canEnter: kindKeim !== null || edges.has(node.knotenId), vorhandeneKarteId: edges.get(node.knotenId)?.map_id ?? null })),
        version: parent.version, ancestors: await ancestry(tx, userId, campaignId, scope) };
    });
  }

  async function betrete(userId: string, campaignId: string, input: BetretenInput): Promise<BetretenResult> {
    validateInput(input);
    return db.transaction(async tx => {
      // Shared campaign lock serializes concurrent imports/edits and opposing graph links.
      // Nested tactical imports use this same connection through Db's existing savepoints.
      if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rowCount) throw new Gone();
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      const requestHash = tacticalHash({ userId, campaignId, input });
      const receipt = (await tx.query<{ request_hash: string; response: BetretenResult }>("SELECT request_hash,response FROM betreten_command_receipts WHERE command_id=$1", [input.commandId])).rows[0];
      if (receipt) {
        if (receipt.request_hash !== requestHash) throw new Conflict();
        if (await isMapDeleted(tx, campaignId, "tactical", receipt.response.mapId))
          throw new MapLifecycleConflict("map-deleted", "Die damals geöffnete Unterkarte wurde gelöscht. Bitte den aktuellen Eingang erneut öffnen.");
        await createTactical(tx, cfg).getMap(userId, campaignId, receipt.response.mapId);
        return receipt.response;
      }
      const later = (await tx.query<{ operation: string; request_hash: string; ack: BetretenResult }>("SELECT operation,request_hash,ack FROM map_lifecycle_events WHERE command_id=$1", [input.commandId])).rows[0];
      if (later) {
        if (later.operation !== "map.enter" || later.request_hash !== requestHash) throw new Conflict();
        if (await isMapDeleted(tx, campaignId, "tactical", later.ack.mapId))
          throw new MapLifecycleConflict("map-deleted", "Die damals geöffnete Unterkarte wurde gelöscht. Bitte den aktuellen Eingang erneut öffnen.");
        await createTactical(tx, cfg).getMap(userId, campaignId, later.ack.mapId); return later.ack;
      }
      const scope = await resolveScope(tx, campaignId, input.knotenId, input);
      const parent = await source(tx, userId, campaignId, scope), node = parent.nodes.find(candidate => candidate.knotenId === input.knotenId);
      if (!node) throw new Gone("knoten");
      const existing = await address(tx, campaignId, scope, input.knotenId);
      let result: BetretenResult;
      let newEdge: MapEntranceRow | null = null;
      if (existing) {
        if (input.targetMapId && input.targetMapId !== existing.map_id) throw new Conflict();
        await createTactical(tx, cfg).getMap(userId, campaignId, existing.map_id);
        result = { mapId: existing.map_id, erzeugt: false, keimHash: existing.keim_hash };
      } else {
        if (input.expectedVersion === undefined) throw new TacticalValidationError("Zum Anlegen einer Unterkarte wird die aktuelle Version der übergeordneten Karte benötigt.");
        if (parent.version !== input.expectedVersion) throw new Conflict();
        let mapId: string, keimHash: string | null, erzeugt: boolean;
        if (input.targetMapId) {
          const target = await createTactical(tx, cfg).getMap(userId, campaignId, input.targetMapId);
          if ((await activeMapEntrances(tx, campaignId)).some(edge => edge.map_id === target.id))
            throw new TacticalValidationError("Diese Karte hat bereits einen übergeordneten Ort.");
          const ancestors = await ancestry(tx, userId, campaignId, scope);
          if (ancestors.some(item => item.kind === "tactical" && item.id === target.id))
            throw new TacticalValidationError("Eine Karte kann weder sich selbst noch eine ihrer übergeordneten Karten enthalten.");
          mapId = target.id; keimHash = null; erzeugt = false;
        } else {
          if (node.kindKeim === null) throw new Gone("kein-kindkeim");
          const commandId = createHash("sha256").update(`betreten-import:${input.commandId}`).digest("hex");
          const art = input.art ?? node.erzeugungsArt ?? "grundriss";
          validateKartenOptionen(art, input.optionen);
          // The saved building type governs its first interior. Later metadata edits never
          // touch an existing child: that address was resolved above, before generation.
          const chosen = input.optionen as Partial<GrundrissOptionen | SiedlungOptionen> | undefined;
          // The interior is sized by the building's own outline on the town map (the client sends
          // `zellen` only when the user chose a size); a cottage stays a cottage, a warehouse a hall.
          const optionen = art === "hoehle" ? input.optionen : {
            ...chosen, setting: chosen?.setting ?? parent.setting,
            ...(art === "grundriss" && node.bauwerk ? { profil: node.bauwerk.typ, ...((chosen as Partial<GrundrissOptionen> | undefined)?.zellen === undefined ? { zellen: bauwerkAusdehnung(node.bauwerk.typ, node.umfang) } : {}) } : {}),
          };
          const generated = await createGrundriss(tx, cfg).generate(userId, campaignId, {
            commandId, name: input.name?.trim() || node.titel, keim: node.kindKeim,
            // Ohne Angabe bleibt es beim Grundriss: eine Tuer, die gestern Raeume und Gaenge
            // ergab, soll heute nicht ploetzlich in Fels fuehren.
            art, stil: input.stil ?? parent.stil ?? "grundriss", ...(optionen ? { optionen } : {}),
          });
          mapId = generated.ack.subjectId; keimHash = generated.keimHash; erzeugt = true;
        }
        // A generator can return a durable import retry. Recheck its actual target before
        // committing an entrance or parent CAS, including a previously retired result.
        await createTactical(tx, cfg).getMap(userId, campaignId, mapId);
        newEdge = { campaign_id: campaignId, parent_kind: scope.parentKind, parent_map_id: scope.parentMapId,
          knoten_id: input.knotenId, map_id: mapId, keim_hash: keimHash, created_by: userId, created_at: String(now()) };
        const legacySlot = (await tx.query(`SELECT 1 FROM betreten_karten WHERE campaign_id=$1 AND parent_kind=$2
          AND parent_map_id=$3 AND knoten_id=$4`, [campaignId, scope.parentKind, scope.parentMapId, input.knotenId])).rowCount > 0;
        if (!legacySlot) await tx.query(`INSERT INTO betreten_karten(campaign_id,parent_kind,parent_map_id,knoten_id,map_id,keim_hash,created_by,created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [campaignId, scope.parentKind, scope.parentMapId, input.knotenId, mapId, keimHash, userId, newEdge.created_at]);
        const table = scope.parentKind === "atlas" ? "atlas_maps" : "tactical_maps";
        if (!(await tx.query(`UPDATE ${table} SET version=version+1 WHERE campaign_id=$1 AND id=$2 AND version=$3 RETURNING id`, [campaignId, scope.parentMapId, input.expectedVersion])).rowCount) throw new Conflict();
        result = { mapId, erzeugt, keimHash };
      }
      if ((await tx.query("SELECT 1 FROM betreten_karten WHERE campaign_id=$1 AND map_id=$2", [campaignId, result.mapId])).rowCount) {
        await tx.query(`INSERT INTO betreten_command_receipts(command_id,campaign_id,actor_user_id,request_hash,response,created_at)
          VALUES($1,$2,$3,$4,$5,$6)`, [input.commandId, campaignId, userId, requestHash, JSON.stringify(result), now()]);
      } else {
        const edge = newEdge ?? (await activeMapEntrances(tx, campaignId)).find(candidate => candidate.map_id === result.mapId)!;
        const parentRevision = scope.parentKind === "tactical" ? (await tx.query<{ head_revision: number }>("SELECT head_revision FROM tactical_maps WHERE campaign_id=$1 AND id=$2", [campaignId, scope.parentMapId])).rows[0]!.head_revision : null;
        const payload: MapEnterPayload = { schemaVersion: 1, edge, createdEdge: newEdge !== null, parentRevision,
          parentVersionBefore: parent.version, parentVersionAfter: parent.version + (newEdge ? 1 : 0) };
        await tx.query(`INSERT INTO map_lifecycle_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
          VALUES($1,$2,$3,'map.enter',$4,$5,$6,$7,$8)`, [input.commandId, campaignId, userId, requestHash,
          JSON.stringify(input), JSON.stringify(payload), JSON.stringify(result), newEdge ? Number(newEdge.created_at) : now()]);
      }
      return result;
    }).catch((error: unknown) => {
      const pg = error as { code?: string; constraint?: string };
      if (pg?.code === "23505" && (pg.constraint?.startsWith("betreten_") || pg.constraint === "map_lifecycle_events_command_id_key")) throw new Conflict();
      throw error;
    });
  }
  async function updateMetadata(userId: string, campaignId: string, parentMapId: string, knotenId: string, input: KnotenMetadataInput): Promise<{ version: number }> {
    validateMetadata(input);
    if (!validId(knotenId)) throw new TacticalValidationError("Bitte ein vorhandenes Gebäude auswählen.");
    const scope = { parentKind: "tactical" as const, parentMapId }; validateScope(scope);
    return db.transaction(async tx => {
      if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
        WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rowCount) throw new Gone();
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      const parent = await source(tx, userId, campaignId, scope);
      const entrance = parent.nodes.find(node => node.knotenId === knotenId);
      if (!entrance) throw new Gone("knoten");
      const requestHash = tacticalHash({ operation: "knoten.metadata", userId, campaignId, parentMapId, knotenId, input });
      const receipt = (await tx.query<{ request_hash: string; response: { version: number } }>(
        "SELECT request_hash,response FROM betreten_command_receipts WHERE command_id=$1", [input.commandId])).rows[0];
      if (receipt) { if (receipt.request_hash !== requestHash) throw new Conflict(); return receipt.response; }
      if (parent.version !== input.expectedVersion) throw new Conflict();
      const saved = (await tx.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2 AND knoten_id=$3", [campaignId, parentMapId, knotenId])).rows[0]?.data;
      if (input.bauwerk && entrance.art !== "bauwerk") throw new TacticalValidationError("Gebäudetypen gehören zu Gebäuden. Der Name eines Raums kann separat bearbeitet werden.");
      const map = await createTactical(tx, cfg).getMap(userId, campaignId, parentMapId);
      const original: Knoten = saved ?? { id: knotenId as Knoten["id"], art: entrance.art, titel: entrance.titel,
        eltern: [], rahmen: map.document.frame, anker: null, sichtAnker: null, herkunft: null };
      const data: Knoten = { ...original, titel: input.titel.trim(), ...(input.bauwerk ? { bauwerk: input.bauwerk } : {}) };
      await tx.query(`INSERT INTO tactical_map_nodes(map_id,knoten_id,campaign_id,data) VALUES($1,$2,$3,$4)
        ON CONFLICT(map_id,knoten_id) DO UPDATE SET data=EXCLUDED.data`, [parentMapId, knotenId, campaignId, JSON.stringify(data)]);
      const changed = await tx.query<{ version: number }>("UPDATE tactical_maps SET version=version+1 WHERE campaign_id=$1 AND id=$2 AND version=$3 RETURNING version", [campaignId, parentMapId, input.expectedVersion]);
      if (!changed.rowCount) throw new Conflict();
      const result = { operation: "knoten.metadata" as const, parentMapId, knotenId, version: changed.rows[0]!.version };
      await tx.query(`INSERT INTO betreten_command_receipts(command_id,campaign_id,actor_user_id,request_hash,response,created_at)
        VALUES($1,$2,$3,$4,$5,$6)`, [input.commandId, campaignId, userId, requestHash, JSON.stringify(result), now()]);
      return result;
    }).catch((error: unknown) => {
      const pg = error as { code?: string; constraint?: string };
      if (pg?.code === "23505" && pg.constraint?.startsWith("betreten_")) throw new Conflict();
      throw error;
    });
  }
  return { betretbar, betrete, children, updateMetadata };
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native prueft das Modul `figurantrag` so streng wie den Chronist: geschlossene Feldmengen,
 * nachgerechnete Pruefsummen, echte Beziehungen. Was hier durchkommt, ist beim Wiedereinspielen
 * derselbe Antrag mit derselben Entscheidung — oder es kommt gar nicht erst durch.
 */
import { keys, object, fail, hash } from "../campaign-v3-json.ts";
import type { CampaignTablesV17 } from "./schema.ts";
import { collectFigurantragIdentityIds, type FigurantragEventRow, type FigurantragRow, type FigurvorlageFreigabeRow } from "./data.ts";

function require(value: unknown, message: string): asserts value { if (!value) fail("figurantrag", message); }
const closed = (value: unknown, names: readonly string[]) => keys(object(value, "figurantrag"), names, "figurantrag");
const unique = (values: readonly string[], name: string) => require(new Set(values).size === values.length, `duplicate ${name}`);
const zeit = (value: unknown) => typeof value === "string" && /^(0|[1-9][0-9]{0,18})$/.test(value);
const zahl = (value: unknown, min = 1) => Number.isSafeInteger(value) && Number(value) >= min;
const FREIGABE_ACK = ["templateId", "campaignId", "freigegeben", "version", "freedBy", "freedAt", "revokedAt"] as const;
const ANTRAG_ACK = ["id", "templateId", "templateRevision", "name", "anfangswerte", "status", "version", "antragsteller",
  "createdAt", "decidedBy", "decidedAt", "actorId", "reason"] as const;
/** Ein ACK ist die Karte, die damals ausgeliefert wurde — samt der Werte, die entschieden wurden. */
const antragAck = (value: unknown) => { closed(value, ANTRAG_ACK); werte((value as { anfangswerte: unknown }).anfangswerte, "ack starting values"); };
/** Anfangswerte sind Skalare mit Paketfeldnamen — nie ein verschachteltes Dokument. */
function werte(value: unknown, message: string): void {
  const row = object(value, "figurantrag");
  require(Object.keys(row).length <= 64, message);
  for (const [key, entry] of Object.entries(row)) {
    require(/^[a-z][a-z0-9_-]{0,95}$/.test(key), message);
    require(typeof entry === "string" && entry.length <= 4096 || typeof entry === "number" && Number.isFinite(entry) || typeof entry === "boolean", message);
  }
}

export function validateFigurantragTables(tables: CampaignTablesV17, campaignId: string): void {
  const freigaben = tables.figurvorlagen_freigaben as unknown as readonly FigurvorlageFreigabeRow[];
  const antraege = tables.figurantraege as unknown as readonly FigurantragRow[];
  const events = tables.figurantrag_events as unknown as readonly FigurantragEventRow[];
  const users = new Set(tables.users.map(u => String(u.id)));
  const vorlagen = new Set(tables.actor_templates.filter(t => t.campaign_id === campaignId).map(t => String(t.id)));
  const revisionen = new Set(tables.actor_template_revisions.filter(r => r.campaign_id === campaignId).map(r => `${String(r.template_id)}/${String(r.revision)}`));
  const figuren = new Set(tables.actor_profiles.filter(p => p.campaign_id === campaignId).map(p => String(p.actor_id)));
  const antragById = new Map(antraege.map(a => [a.id, a]));

  unique(freigaben.map(f => f.template_id), "template release");
  unique(events.map(e => e.command_id), "figurantrag command");
  for (const id of collectFigurantragIdentityIds(freigaben, antraege, events)) require(users.has(id), "figurantrag identity");

  for (const row of freigaben) {
    require(row.campaign_id === campaignId, "release campaign");
    require(vorlagen.has(row.template_id), "released template missing");
    require(zahl(row.version) && zeit(row.freed_at) && (row.revoked_at === null || zeit(row.revoked_at)), "release fields");
    // Ein Entzug kann nicht vor seiner Freigabe liegen, und eine erneute Freigabe hebt ihn auf.
    require(row.revoked_at === null || BigInt(row.revoked_at) >= BigInt(row.freed_at), "release order");
  }

  for (const row of antraege) {
    require(row.campaign_id === campaignId, "application campaign");
    require(revisionen.has(`${row.template_id}/${row.template_revision}`), "application template revision missing");
    require(row.name.length >= 1 && row.name.length <= 160 && row.name.trim().length >= 1, "application name");
    werte(row.anfangswerte, "application starting values");
    require(zahl(row.version) && zeit(row.created_at), "application fields");
    // Dieselben Aussagen wie die CHECK-Bedingungen der Migration — die Sicherung darf keine
    // Zeile zurueckspielen, die die Datenbank selbst nie angenommen haette.
    require((row.state === "offen") === (row.decided_by === null), "undecided application");
    require((row.decided_by === null) === (row.decided_at === null), "decision timestamp");
    require(row.decided_at === null || zeit(row.decided_at), "decision timestamp");
    require((row.state === "bestaetigt") === (row.actor_id !== null), "confirmed application actor");
    require(row.reason === null || row.state === "abgelehnt" && row.reason.length >= 1 && row.reason.length <= 500, "rejection reason");
    if (row.actor_id !== null) require(figuren.has(row.actor_id), "confirmed application actor missing");
  }

  for (const row of events) {
    require(row.campaign_id === campaignId, "event campaign");
    require(zeit(row.seq) && zeit(row.created_at), "event fields");
    const request = object(row.request, "figurantrag.request");
    const freigabe = row.operation === "figurvorlage.freigeben" || row.operation === "figurvorlage.entziehen";
    const antrag = row.operation === "figurantrag.beantragen";
    closed(request, freigabe ? ["campaignId", "operation", "templateId", "expectedVersion"]
      : antrag ? ["campaignId", "operation", "input"] : ["campaignId", "operation", "id", "expectedVersion", "reason"]);
    require(request.campaignId === campaignId && request.operation === row.operation, "event request identity");
    // Die Pruefsumme wird nachgerechnet, nicht geglaubt.
    require(hash(request) === row.request_hash, "event request hash");
    const payload = object(row.payload, "figurantrag.payload"), ack = object(row.ack, "figurantrag.ack");
    require(payload.schemaVersion === 1, "event payload schema");
    if (freigabe) {
      closed(payload, ["schemaVersion", "before", "after"]);
      require(zahl(request.expectedVersion, 0), "release expected version");
      require(vorlagen.has(String(request.templateId)), "event template missing");
      if (payload.before !== null) closed(payload.before, FREIGABE_ACK);
      closed(payload.after, FREIGABE_ACK); closed(ack, FREIGABE_ACK);
      require(ack.templateId === request.templateId && ack.campaignId === campaignId, "release ack identity");
      require(typeof ack.freigegeben === "boolean" && ack.freigegeben === (ack.revokedAt === null), "release ack state");
    } else if (antrag) {
      closed(payload, ["schemaVersion", "anfangswerte"]); werte(payload.anfangswerte, "event starting values");
      const input = object(request.input, "figurantrag.request.input");
      closed(input, ["commandId", "templateId", "name", "anfangswerte"]);
      require(input.commandId === row.command_id, "event command identity");
      werte(input.anfangswerte, "event starting values");
      antragAck(ack);
      const stored = antragById.get(String(ack.id));
      require(stored && stored.antragsteller === row.actor_user_id && stored.template_id === input.templateId, "application ack identity");
      require(ack.antragsteller === row.actor_user_id && ack.status === "offen" && ack.version === 1, "original application ack");
    } else {
      closed(payload, ["schemaVersion", "before", "after"]);
      antragAck(payload.before); antragAck(payload.after); antragAck(ack);
      require(zahl(request.expectedVersion), "decision expected version");
      require(row.operation === "figurantrag.ablehnen" ? typeof request.reason === "string" : request.reason === null, "decision reason");
      const stored = antragById.get(String(request.id));
      require(stored && ack.id === stored.id, "decided application missing");
      require(ack.status === (row.operation === "figurantrag.bestaetigen" ? "bestaetigt"
        : row.operation === "figurantrag.ablehnen" ? "abgelehnt" : "zurueckgezogen"), "decision ack state");
      require(ack.version === Number(request.expectedVersion) + 1, "decision ack version");
      if (row.operation === "figurantrag.bestaetigen") require(typeof ack.actorId === "string" && figuren.has(ack.actorId), "confirmation actor missing");
    }
  }
}

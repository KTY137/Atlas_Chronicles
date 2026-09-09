// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { AzgaarImportError, MAX_AZGAAR_BYTES, importiereAzgaar, importiereEronKarte, type AzgaarImport, type EronMapImport, type AtlasMarkerIcon } from "@chronicle/forge";
import { dateiSlug } from "@chronicle/io";
import type { Knoten, Ort } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { Gone, Conflict } from "./errors.ts";
import { activeMapEntrances, assertMapActive, authorizeMapLifecycle, mapLifecycleRows, retiredMapKeys } from "./map-lifecycle.ts";

interface NodeRow { id: string; data: Knoten; entry_id: string | null }
interface MapRow { id: string; title: string; artifact_id: string; width: number; height: number; version: number }
type AtlasSource = AzgaarImport | EronMapImport;
function isEron(source: AtlasSource): source is EronMapImport { return source.quelle.format === "fandom-interactivemap"; }
/**
 * Welches Bild zu dieser Karte gehört — und zwar für JEDE Karte, nicht für eine.
 *
 * Vorher stand hier eine Bedingung, die genau eine Datei durchließ: der Quellname musste wörtlich
 * `Andaria 03.02.2024.jpg` lauten und die Karte 8192×8192 groß sein. Jede andere Karte bekam
 * deshalb grundsätzlich kein Bild. Der Name steht in der Karte selbst — eine Fandom-Karte nennt
 * ihr Bild in `mapImage`, und genau das ist der Keim des Imports. Eine ausdrücklich
 * mitgeschriebene Herkunft (`atlas_karten_herkunft.bild_dateiname`) sticht ihn, weil ein
 * hochgeladenes Kartenbild seinen Namen von der Spielleitung hat und nicht aus der Quelle.
 */
export function kartenbildName(source: AtlasSource): string | null {
  if (!isEron(source)) return null;
  const name = dateiSlug(source.keim.seed);
  return name || null;
}
export interface Kartenherkunft {
  readonly art: "wiki" | "beispiel" | "bild";
  readonly wikiUrl?: string; readonly seitentitel?: string;
  readonly pageid?: number; readonly revid?: number;
  readonly lizenz?: string; readonly bildDateiname?: string;
}
interface HerkunftRow {
  art: "wiki" | "beispiel" | "bild"; wiki_url: string | null; seitentitel: string | null;
  pageid: string | null; revid: string | null; bild_dateiname: string | null; lizenz: string | null; abgerufen_am: string;
}
export function createAtlas(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  async function importMap(userId: string, campaignId: string, json: string, herkunft?: Kartenherkunft) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    // Detection must retain the parser's size boundary before allocating a parsed document.
    if (typeof json !== "string" || Buffer.byteLength(json, "utf8") > MAX_AZGAAR_BYTES)
      throw new AzgaarImportError("limit", "$", "Kartendatei darf höchstens 32 MiB groß sein");
    let format: unknown;
    try { format = JSON.parse(json); } catch { /* The selected parser reports the bounded format error. */ }
    const world: AtlasSource = format && typeof format === "object" && "mapBounds" in format ? importiereEronKarte(json) : importiereAzgaar(json);
    const artifactKind = isEron(world) ? "eron-map" : "azgaar";
    return db.transaction(async (tx) => {
      await authorizeMapLifecycle(tx, userId, campaignId);
      const previous = (await tx.query<{ id: string; artifact_id: string }>(`SELECT m.id,m.artifact_id FROM atlas_maps m JOIN artifacts a ON a.id=m.artifact_id
        WHERE a.campaign_id=$1 AND a.kind=$2 AND a.source_hash=$3 ORDER BY m.created_at,m.id`, [campaignId, artifactKind, world.quelle.sha256])).rows;
      const retired = retiredMapKeys(await mapLifecycleRows(tx, campaignId));
      const existing = previous.find(map => !retired.has(`atlas:${map.id}`));
      // Dieselbe Karte ein zweites Mal: ihr Stand wird geöffnet, ihre einmal notierte Herkunft
      // bleibt stehen. Ein zweiter Abruf ist kein zweiter Ursprung.
      if (existing) return { id: existing.id, report: world.bericht, unchanged: true };
      const artifactId = previous[0]?.artifact_id ?? randomUUID(), id = randomUUID();
      if (!previous.length) await tx.query("INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [artifactId, campaignId, artifactKind, world.quelle.sha256, world, world.bericht, userId, now()]);
      await tx.query("INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, campaignId, artifactId, world.titel, world.szene.size[0], world.szene.size[1], now()]);
      // Batch JSON recordset keeps a real world import one transaction without thousands of round trips.
      await tx.query(`INSERT INTO atlas_nodes(map_id,id,campaign_id,data)
        SELECT $1,n.id,$2,n.data FROM jsonb_to_recordset($3::jsonb) AS n(id text,data jsonb)`,
        [id, campaignId, JSON.stringify(world.knoten.map((n) => ({ id: n.id, data: n })))]);
      if (herkunft) await tx.query(`INSERT INTO atlas_karten_herkunft(map_id,campaign_id,art,wiki_url,seitentitel,pageid,revid,bild_dateiname,lizenz,abgerufen_am,geholt_von)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, campaignId, herkunft.art, herkunft.wikiUrl ?? null, herkunft.seitentitel ?? null,
          herkunft.pageid ?? null, herkunft.revid ?? null,
          herkunft.bildDateiname ?? kartenbildName(world), herkunft.lizenz ?? null, now(), userId]);
      return { id, report: world.bericht, unchanged: false };
    });
  }
  async function visible(userId: string, campaignId: string, mapId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    await assertMapActive(db, campaignId, "atlas", mapId);
    const map = (await db.query<MapRow>("SELECT * FROM atlas_maps WHERE id=$1 AND campaign_id=$2", [mapId, campaignId])).rows[0];
    if (!map) throw new Gone();
    const all = (await db.query<NodeRow>("SELECT id,data,entry_id FROM atlas_nodes WHERE map_id=$1 ORDER BY id", [mapId])).rows;
    if (member.role === "leitung") return { map, member, nodes: all };
    const direct = new Set((await db.query<{ node_id: string }>("SELECT node_id FROM atlas_revelations WHERE map_id=$1 AND actor_id=$2", [mapId, member.actorId])).rows.map((r) => r.node_id));
    const knowledge = await createDocuments(db, cfg).knowledge(userId, campaignId);
    const nodes = all.filter((n) => direct.has(n.id) || (n.entry_id && knowledge.bekannteEntryIds?.has(n.entry_id)));
    if (!nodes.length) throw new Gone();
    return { map, member, nodes };
  }
  async function listMaps(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const all = (await db.query<MapRow>("SELECT * FROM atlas_maps WHERE campaign_id=$1 ORDER BY created_at,id", [campaignId])).rows;
    const retired = retiredMapKeys(await mapLifecycleRows(db, campaignId));
    const result: { id: string; title: string }[] = [];
    for (const m of all) {
      if (retired.has(`atlas:${m.id}`)) continue;
      if (member.role !== "leitung") { try { await visible(userId, campaignId, m.id); } catch (e) { if (e instanceof Gone) continue; throw e; } }
      result.push({ id: m.id, title: m.title });
    }
    return result;
  }
  /** Die mitgeschriebene Herkunft dieser Karte, oder nichts, wenn sie älter ist als das Feld. */
  async function herkunftVon(campaignId: string, mapId: string): Promise<HerkunftRow | undefined> {
    return (await db.query<HerkunftRow>(`SELECT art,wiki_url,seitentitel,pageid,revid,bild_dateiname,lizenz,abgerufen_am
      FROM atlas_karten_herkunft WHERE map_id=$1 AND campaign_id=$2`, [mapId, campaignId])).rows[0];
  }
  interface BildKopf { id: string; mime: string; breite: number; hoehe: number; sha256: string }
  /**
   * Das Kartenbild als Kampagnendatum: eine Zeile im Bildbestand, kein Pfad im Programmordner.
   * Damit trägt jede Karte ihr Bild — geholt, hochgeladen oder mitgeliefert, gleich behandelt.
   */
  async function bildkopf(campaignId: string, source: AtlasSource, herkunft: HerkunftRow | undefined): Promise<BildKopf | undefined> {
    const name = herkunft?.bild_dateiname ?? kartenbildName(source);
    if (!name) return undefined;
    const row = (await db.query<BildKopf & { mime: string | null }>(`SELECT id,mime,breite,hoehe,sha256 FROM wiki_assets
      WHERE campaign_id=$1 AND dateiname=$2`, [campaignId, name])).rows[0];
    return row?.mime ? row as BildKopf : undefined;
  }
  async function getMap(userId: string, campaignId: string, mapId: string) {
    const { map, member, nodes } = await visible(userId, campaignId, mapId);
    const source = (await db.query<{ source: AtlasSource }>("SELECT source FROM artifacts WHERE id=$1", [map.artifact_id])).rows[0]!.source;
    const gm = member.role === "leitung";
    const children = new Map(gm ? (await activeMapEntrances(db, campaignId))
      .filter(edge => edge.parent_kind === "atlas" && edge.parent_map_id === mapId).map(row => [row.knoten_id, row.map_id]) : []);
    const allowed = new Set(nodes.map((n) => n.id)), entries = new Map(nodes.map((n) => [n.id, n.entry_id]));
    const knownEntries = member.role === "leitung" ? null : (await createDocuments(db,cfg).knowledge(userId,campaignId)).bekannteEntryIds;
    const knownEntry = (id: string | null | undefined) => id && (member.role === "leitung" || knownEntries?.has(id)) ? id : null;
    const icons: readonly AtlasMarkerIcon[] = ["place", "city", "castle", "cave", "ruin", "portal"];
    const pins = source.orte.filter((o: Ort) => allowed.has(o.id)).map((o) => {
      const markerColor = typeof o.merkmale.color === "string" && /^#[\da-f]{6}$/i.test(o.merkmale.color) ? Number.parseInt(o.merkmale.color.slice(1), 16) : undefined;
      const icon: AtlasMarkerIcon = children.has(o.id) ? "portal" : icons.includes(o.merkmale.icon as AtlasMarkerIcon) ? o.merkmale.icon as AtlasMarkerIcon : "city";
      return { id: o.id, x: o.x, y: o.y, label: o.name, icon,
        ...(markerColor === undefined ? {} : { color: markerColor }),
        ...(typeof o.merkmale.category === "string" ? { category: o.merkmale.category } : {}),
        ...(typeof o.merkmale.symbol === "string" ? { symbol: o.merkmale.symbol, symbolColor: o.merkmale.symbolColor } : {}),
        ...(knownEntry(entries.get(o.id)) ? { entryId: entries.get(o.id)! } : {}) };
    });
    const cells = source.zellen.filter((c) => member.role === "leitung" || [c.regionId,c.machtId,c.landmasseId].some((id) => id && allowed.has(id)))
      .map((c) => ({ id: c.id, polygon: c.polygon, fill: c.land ? 0x273d37 : 0x142632 }));
    /**
     * DIE MARKERBESCHREIBUNG. Sie kam schon immer mit — der Parser hebt sie als
     * `merkmale.description` auf — und wurde bis hierher nirgends gezeigt. Sie ist QUELLTEXT des
     * Wikis, kein Kanon: sie erzeugt keinen Artikel und keine Freigabe (docs/NESTED_MAPS.md), sie
     * steht neben dem Ort wie eine Notiz an der Pinnwand. Deshalb nur für die Spielleitung, in
     * einer Reihe mit dem Importbericht und der Herkunft eines Ortes.
     */
    const beschreibungen = new Map<string, string>(source.orte
      .map((o: Ort) => [String(o.id), typeof o.merkmale.description === "string" ? o.merkmale.description : ""] as const)
      .filter(([, wert]) => wert.length > 0));
    // Eine Abfrage für beides: die Herkunft nennt das Bild und steht selbst unter der Karte.
    const herkunft = gm ? await herkunftVon(campaignId, mapId) : undefined;
    const bild = gm ? await bildkopf(campaignId, source, herkunft) : undefined;
    return { id: map.id, title: map.title, width: map.width, height: map.height, cells, pins,
      nodes: nodes.map((n) => ({ id: n.id, title: n.data.titel, kind: n.data.art,
        parents: n.data.eltern.filter((e) => allowed.has(e.nach)).map((e) => ({ id: e.nach, kind: e.art })),
        ...(knownEntry(n.entry_id) ? { entryId: n.entry_id! } : {}),
        ...(gm ? { canEnter: Boolean(n.data.herkunft?.kindKeim), ...(beschreibungen.has(n.id) ? { description: beschreibungen.get(n.id)! } : {}),
          ...(children.has(n.id) ? { childMapId: children.get(n.id)! } : {}) } : {}) })),
      ...(gm ? { version: map.version, report: source.bericht } : {}),
      ...(herkunft ? { herkunft: kartenherkunft(herkunft) } : {}),
      ...(bild ? { background: { url: `/api/campaigns/${encodeURIComponent(campaignId)}/maps/${encodeURIComponent(mapId)}/image`, width: bild.breite, height: bild.hoehe } } : {}) };
  }
  /**
   * Woher diese Karte kommt, für die Anzeige unter der Karte. Vorher stand dort ein fest
   * verdrahteter Verweis auf das ERON-Wiki — auch unter einer Karte, die von woanders kam.
   */
  function kartenherkunft(row: HerkunftRow) {
    return { art: row.art,
      ...(row.wiki_url ? { wikiUrl: row.wiki_url } : {}), ...(row.seitentitel ? { seitentitel: row.seitentitel } : {}),
      ...(row.pageid ? { pageid: Number(row.pageid) } : {}), ...(row.revid ? { revid: Number(row.revid) } : {}),
      ...(row.lizenz ? { lizenz: row.lizenz } : {}), abgerufenAm: Number(row.abgerufen_am) };
  }
  async function getNode(userId: string, campaignId: string, mapId: string, nodeId: string) {
    const { nodes, member } = await visible(userId, campaignId, mapId);
    const selected = nodes.find(node => node.id === nodeId);
    if (!selected) throw new Gone("node");
    // The complete provenance includes child seeds and is authoring information.
    if (member.role !== "leitung") throw new Gone("membership");
    return { node: selected.data, ...(selected.entry_id ? { entryId: selected.entry_id } : {}) };
  }
  /**
   * Das Kartenbild kommt aus der Kampagne, nicht aus dem Dateisystem.
   *
   * Der Weg vorher las eine feste Datei neben dem Programm und lieferte sie nur aus, wenn die
   * Quelle wörtlich eine bestimmte Karte war. Jetzt entscheidet die Kampagne: der Bildbestand
   * hält die Bytes samt gemessenem Typ, und der Name kommt aus der Herkunft der Karte oder aus
   * der Karte selbst — nie aus einem Routenparameter, nie aus einem hochgeladenen Dateinamen,
   * der sich in einen Pfad verwandeln könnte.
   */
  async function mapImage(userId: string, campaignId: string, mapId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    await assertMapActive(db, campaignId, "atlas", mapId);
    const row = (await db.query<{ source: AtlasSource }>(`SELECT a.source FROM atlas_maps m JOIN artifacts a ON a.id=m.artifact_id
      WHERE m.id=$1 AND m.campaign_id=$2`, [mapId, campaignId])).rows[0];
    if (!row) throw new Gone("map-image");
    const name = (await herkunftVon(campaignId, mapId))?.bild_dateiname ?? kartenbildName(row.source);
    if (!name) throw new Gone("map-image");
    const bild = (await db.query<{ mime: string | null; sha256: string | null; daten: string | null }>(
      "SELECT mime,sha256,daten FROM wiki_assets WHERE campaign_id=$1 AND dateiname=$2", [campaignId, name])).rows[0];
    if (!bild?.daten || !bild.mime) throw new Gone("map-image");
    return { mime: bild.mime, sha256: bild.sha256!, daten: Buffer.from(bild.daten, "base64") };
  }
  async function revealNode(userId: string, campaignId: string, mapId: string, nodeId: string, actorId: string) {
    return db.transaction(async tx => {
    await authorizeMapLifecycle(tx, userId, campaignId); await assertMapActive(tx, campaignId, "atlas", mapId);
    const valid = await tx.query(`SELECT 1 FROM atlas_nodes n JOIN actors a ON a.campaign_id=n.campaign_id
      WHERE n.map_id=$1 AND n.id=$2 AND n.campaign_id=$3 AND a.id=$4`, [mapId, nodeId, campaignId, actorId]);
    if (!valid.rowCount) throw new Gone();
    await tx.query(`INSERT INTO atlas_revelations(map_id,node_id,campaign_id,actor_id,knowledge,granted_by,granted_at)
      VALUES($1,$2,$3,$4,'benannt',$5,$6) ON CONFLICT(map_id,node_id,actor_id) DO NOTHING`, [mapId,nodeId,campaignId,actorId,userId,now()]);
    });
  }
  async function linkEntry(userId: string, campaignId: string, mapId: string, nodeId: string, entryId: string, expectedVersion: number) {
    return db.transaction(async (tx) => {
      await authorizeMapLifecycle(tx, userId, campaignId); await assertMapActive(tx, campaignId, "atlas", mapId);
      await createDocuments(tx, cfg).source(campaignId, entryId);
      if (!(await tx.query("UPDATE atlas_maps SET version=version+1 WHERE id=$1 AND campaign_id=$2 AND version=$3 RETURNING id", [mapId,campaignId,expectedVersion])).rowCount) throw new Conflict();
      if (!(await tx.query("UPDATE atlas_nodes SET entry_id=$4 WHERE map_id=$1 AND id=$2 AND campaign_id=$3 RETURNING id", [mapId,nodeId,campaignId,entryId])).rowCount) throw new Gone();
      return { ok: true };
    });
  }
  return { importMap, listMaps, getMap, getNode, mapImage, revealNode, linkEntry, herkunftVon };
}

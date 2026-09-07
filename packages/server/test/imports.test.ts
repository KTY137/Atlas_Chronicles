import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createImports } from "../src/domain/imports.ts";
import { createAtlas } from "../src/domain/atlas.ts";
import { Gone } from "../src/domain/errors.ts";

describe("Imports become persisted application objects with explicit visibility", () => {
  let db: Db, gm: string, campaign: string, player: string, actor: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    gm = (await createIdentity(db,{origin:"https://chronicle.test",cookieSecret:"a-secret-at-least-thirty-two-characters-long"}).bootstrap("Kaya")).userId;
    const c = createCampaigns(db); campaign = (await c.createCampaign(gm,{name:"Import world"})).id;
    const invite = await c.issueInvitation(gm,campaign), join = await c.requestJoin(invite.code,{displayName:"Sera"});
    const approved = await c.approveJoin(gm,campaign,join.id); player = approved.userId; actor = approved.actorId;
  },30_000);
  afterAll(async () => db?.close());
  it("previews Eron without applying, persists selected entries once, and keeps original source/provenance", async () => {
    const articles = JSON.parse(await readFile(new URL("../../../design/fixtures/eron/articles.json",import.meta.url),"utf8"));
    const templates = JSON.parse(await readFile(new URL("../../../design/fixtures/eron/templates.json",import.meta.url),"utf8"));
    const service = createImports(db), docs = createDocuments(db);
    const preview = await service.previewEron(gm,campaign,{articles,templates,wikiUrl:"https://eron.fandom.com"});
    expect(await docs.listEntries(gm,campaign)).toEqual([]);
    const selected = preview.entries.map((e) => e.id);
    const accepted = await service.acceptEron(gm,campaign,preview.artifactId,selected);
    expect(accepted.applied).toBe(73);
    expect((await docs.listEntries(gm,campaign))).toHaveLength(73);
    expect(await docs.listEntries(player,campaign)).toEqual([]);
    expect((await service.acceptEron(gm,campaign,preview.artifactId,selected)).applied).toBe(0);
    expect(JSON.stringify(await service.artifact(gm,campaign,preview.artifactId))).toContain("incomplete");
    await expect(service.artifact(player,campaign,preview.artifactId)).rejects.toBeInstanceOf(Gone);
    const source = await db.query("SELECT provenance FROM passages WHERE campaign_id=$1 AND provenance IS NOT NULL",[campaign]);
    expect(source.rowCount).toBeGreaterThan(73);
  },30_000);

  it("legt die Kategorien des Quellwikis an, statt sie beim Import zu verlieren", async () => {
    const kategorien = await db.query<{ slug: string; title: string }>("SELECT slug,title FROM categories WHERE campaign_id=$1 ORDER BY slug",[campaign]);
    expect(kategorien.rows).toContainEqual({ slug: "Charaktere", title: "Charaktere" });
    const zuordnungen = await db.query("SELECT 1 FROM entry_categories WHERE campaign_id=$1",[campaign]);
    expect(zuordnungen.rowCount).toBeGreaterThan(0);
    // Zweimal importieren darf die Kategorie nicht verdoppeln.
    const doppelt = await db.query<{ anzahl: string }>("SELECT count(*) AS anzahl FROM categories WHERE campaign_id=$1 AND slug='Charaktere'",[campaign]);
    expect(Number(doppelt.rows[0]!.anzahl)).toBe(1);
  },30_000);
  it("imports a real generated world, survives re-open, and projects individually granted places", async () => {
    const data = gunzipSync(await readFile(new URL("../../forge/test/fixtures/azgaar-full.json.gz",import.meta.url))).toString("utf8");
    const service = createAtlas(db);
    const imported = await service.importMap(gm,campaign,data);
    expect((await service.importMap(gm,campaign,data)).id).toBe(imported.id);
    expect(await service.listMaps(player,campaign)).toEqual([]);
    const world = await service.getMap(gm,campaign,imported.id);
    // 698 Burgen + 73 Marker, die eine Notiz mit Namen tragen.
    expect(world.pins).toHaveLength(771);
    expect(JSON.stringify(world)).not.toContain("quelle");
    const place = world.pins[0]!;
    await service.revealNode(gm,campaign,world.id,place.id,actor);
    const projected = await service.getMap(player,campaign,world.id);
    expect(projected.pins).toHaveLength(1);
    expect(projected.nodes).toHaveLength(1);
    expect(projected.cells).toEqual([]);
    expect(projected).not.toHaveProperty("version");
    expect(projected).not.toHaveProperty("report");
    const entry = await createDocuments(db).saveEntry(gm,campaign,{title:"Linked place",passages:[{inhalt:{kind:"absatz",inhalt:[{text:"private detail",marks:[]}]}}]});
    await service.linkEntry(gm,campaign,world.id,place.id,entry.entryId,world.version!);
    expect((await service.getMap(gm,campaign,world.id)).pins[0]?.entryId).toBe(entry.entryId);
    expect((await service.getMap(player,campaign,world.id)).pins[0]).not.toHaveProperty("entryId");
    await createDocuments(db).revealPassage(gm,campaign,entry.passagen[0]!.pid,actor);
    expect((await service.getMap(player,campaign,world.id)).pins[0]?.entryId).toBe(entry.entryId);
  },30_000);
});

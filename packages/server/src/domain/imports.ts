import { randomUUID } from "node:crypto";
import { canonicalHash, trustCampaignId, trustUniverseId, type CanonicalValue } from "@chronicle/core";
import { importEron, type EronImportResult } from "@chronicle/io";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Gone, Conflict } from "./errors.ts";

export function createImports(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  async function previewEron(userId: string, campaignId: string, input: { articles: unknown; templates: unknown; wikiUrl: string }) {
    const member = await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const result = importEron({ ...input, universeId: trustUniverseId(member.universeId), campaignId: trustCampaignId(campaignId), importiertAm: new Date(now()).toISOString() });
    const previous = await db.query<{ id: string; version: number }>("SELECT id,version FROM entries WHERE campaign_id=$1", [campaignId]);
    const versions = Object.fromEntries(previous.rows.map((r) => [r.id, r.version]));
    const id = randomUUID();
    // Each preview captures the reviewed versions, so later acceptance cannot overwrite intervening edits.
    await db.query("INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,'eron-preview',$3,$4,$5,$6,$7)",
      [id,campaignId,canonicalHash({ source: result.source.sha256, preview: id }), { result, versions },result.report,userId,now()]);
    return { artifactId: id, report: result.report, attributionComplete: result.attributionComplete,
      entries: result.entries.map((e) => ({ id: e.id, title: e.titel, existing: versions[e.id] !== undefined })),
      notice: "Importierte Inhalte bleiben Notizen. Bestehende Artikel werden nur nach einzelner Auswahl ersetzt; historische Passagen bleiben erhalten." };
  }
  async function acceptEron(userId: string, campaignId: string, artifactId: string, selectedEntryIds: string[]) {
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(userId,campaignId,["leitung"]);
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const artifact = (await tx.query<{ source: { result: EronImportResult; versions: Record<string,number> } }>(
        "SELECT source FROM artifacts WHERE id=$1 AND campaign_id=$2 AND kind='eron-preview'", [artifactId,campaignId])).rows[0];
      if (!artifact) throw new Gone();
      const { result, versions } = artifact.source, selected = new Set(selectedEntryIds);
      if (selected.size !== selectedEntryIds.length || selectedEntryIds.some((id) => !result.entries.some((e) => e.id === id))) throw new Gone("selection");
      let applied = 0;
      // First all Entry identities, then revisions/passages. Internal references can cross imported articles.
      for (const entry of result.entries.filter((e) => selected.has(e.id))) {
        if ((await tx.query("SELECT 1 FROM import_acceptances WHERE artifact_id=$1 AND entry_id=$2", [artifactId,entry.id])).rowCount) continue;
        const current = (await tx.query<{ version: number; slug: string }>("SELECT version,slug FROM entries WHERE id=$1 FOR UPDATE", [entry.id])).rows[0];
        if ((current?.version ?? undefined) !== versions[entry.id]) throw new Conflict();
        if ((await tx.query(`SELECT id FROM entries WHERE campaign_id=$1 AND slug=$2 AND id<>$3
          UNION SELECT entry_id AS id FROM entry_aliases WHERE campaign_id=$1 AND slug=$2 AND entry_id<>$3`, [campaignId,entry.slug,entry.id])).rowCount) throw new Conflict();
        const revisionId = current ? randomUUID() : entry.aktuelleRevision, version = (current?.version ?? 0) + 1;
        if (!current) await tx.query(`INSERT INTO entries(id,universe_id,campaign_id,slug,title,art,kanonstatus,current_revision_id,created_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [entry.id,entry.universeId,campaignId,entry.slug,entry.titel,entry.art,entry.kanonstatus,revisionId,userId]);
        const incoming = result.passages.filter((p) => p.entryId === entry.id);
        const oldPassages = (await tx.query<{id:string;revision_id:string}>("SELECT id,revision_id FROM passages WHERE entry_id=$1", [entry.id])).rows;
        const created = new Map(oldPassages.map((p) => [p.id,p.revision_id]));
        const snapshot = { title: entry.titel, slug: entry.slug, passagen: incoming.map((p) => ({ ...p, erstelltInRevision: created.get(p.pid) ?? revisionId })), tags: incoming.map(() => []), importArtifactId: artifactId };
        await tx.query(`INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash,document,created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [revisionId,entry.id,version,userId,canonicalHash(snapshot as unknown as CanonicalValue),snapshot,now()]);
        const retired = (await tx.query<{ id: string }>(`UPDATE passages SET retired_at_revision=$2 WHERE entry_id=$1 AND retired_at_revision IS NULL
          AND NOT(id=ANY($3::text[])) RETURNING id`, [entry.id,revisionId,incoming.map((p) => p.pid)])).rows;
        for (const p of retired) await tx.query("INSERT INTO lineage_events(entry_id,revision_id,event,created_at) VALUES($1,$2,$3,$4)",
          [entry.id,revisionId,{kind:"retire",pid:p.id},now()]);
        for (const p of incoming) {
          const existing = (await tx.query<{ content: unknown; retired_at_revision: string | null }>("SELECT content,retired_at_revision FROM passages WHERE id=$1", [p.pid])).rows[0];
          // A source-derived ID may not resurrect a retired atom or overwrite a human edit.
          if (existing && (existing.retired_at_revision || canonicalHash(existing.content as CanonicalValue) !== canonicalHash(p.inhalt as unknown as CanonicalValue))) throw new Conflict();
          if (!existing) {
            await tx.query(`INSERT INTO passages(id,entry_id,campaign_id,revision_id,ord,path,content,gen,geltung,praegung,provenance)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,'notiz',NULL,$9)`,
              [p.pid,entry.id,campaignId,revisionId,p.ord,JSON.stringify(p.pfad),p.inhalt,p.gen,result.provenance.find((v) => v.value.passageId === p.pid) ?? null]);
            await tx.query("INSERT INTO lineage_events(entry_id,revision_id,event,created_at) VALUES($1,$2,$3,$4)", [entry.id,revisionId,{kind:"create",pid:p.pid},now()]);
          } else await tx.query("UPDATE passages SET ord=$2,path=$3 WHERE id=$1", [p.pid,p.ord,JSON.stringify(p.pfad)]);
        }
        await tx.query("UPDATE entries SET title=$2,slug=$3,current_revision_id=$4,version=$5 WHERE id=$1", [entry.id,entry.titel,entry.slug,revisionId,version]);
        await tx.query("INSERT INTO import_acceptances(artifact_id,entry_id,revision_id,accepted_by,accepted_at) VALUES($1,$2,$3,$4,$5)", [artifactId,entry.id,revisionId,userId,now()]);
        applied++;
      }
      for (const alias of result.aliases) {
        if (!(await tx.query("SELECT 1 FROM entries WHERE id=$1 AND campaign_id=$2", [alias.nachEntryId,campaignId])).rowCount) continue;
        if ((await tx.query(`SELECT id FROM entries WHERE campaign_id=$1 AND slug=$2 AND id<>$3
          UNION SELECT entry_id AS id FROM entry_aliases WHERE campaign_id=$1 AND slug=$2 AND entry_id<>$3`, [campaignId,alias.vonSlug,alias.nachEntryId])).rowCount) throw new Conflict();
        await tx.query("INSERT INTO entry_aliases(campaign_id,slug,entry_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [campaignId,alias.vonSlug,alias.nachEntryId]);
      }
      return { applied, attributionComplete: result.attributionComplete, report: result.report };
    });
  }
  async function artifact(userId: string,campaignId: string,id: string) {
    await campaigns.requireMember(userId,campaignId,["leitung"]);
    const row = (await db.query("SELECT kind,source,report,source_hash AS \"sourceHash\" FROM artifacts WHERE id=$1 AND campaign_id=$2", [id,campaignId])).rows[0];
    if (!row) throw new Gone(); return row;
  }
  return { previewEron, acceptEron, artifact };
}

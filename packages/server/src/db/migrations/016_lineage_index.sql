-- lineage_events wächst pro Spielabend und hat keinen Aufräumpfad. Bis hier trug die Tabelle
-- ausschließlich lineage_events_pkey auf seq; beide Fremdschlüssel waren unindiziert, weil
-- Postgres für Fremdschlüssel keinen Index anlegt.
--
-- entry_id: fünf Lesestellen joinen darüber und filtern die Kampagne über entries —
--   documents.ts:43, gameplay.ts:193, tactical.ts:256, week.ts:64, bundles.ts:126.
-- revision_id: der Lineage-Lauf der Publikation joint darüber auf revisions — authoring.ts:285.
--
-- Rein additiv: CREATE INDEX ändert kein Schema, das älterer Code voraussetzt, und ist damit
-- rolling-update-fähig (design/10-hosted-betrieb-und-auslieferung.md §1.4).
CREATE INDEX lineage_events_entry_id_idx ON lineage_events(entry_id);
-- statement
CREATE INDEX lineage_events_revision_id_idx ON lineage_events(revision_id);

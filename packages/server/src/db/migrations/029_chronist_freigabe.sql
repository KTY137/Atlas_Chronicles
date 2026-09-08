-- Eine Egress-Freigabe gilt genau einmal — auch über Prozessgrenzen und Neustarts hinweg.
-- Der Beleg liegt seit 027 in chronist_laeufe.evidence.controlEvidence[*].freigabeHash;
-- 029 fuegt nur Indizes hinzu und aendert weder Tabellen noch Spalten noch 027.
-- Der GIN-Index traegt die Enthaltensein-Pruefung, mit der Start und Resume unter der
-- globalen Dispatch-Sperre jeden bereits verbrauchten Abdruck finden.
CREATE INDEX chronist_freigabe_belege ON chronist_laeufe USING gin ((evidence -> 'controlEvidence'));
-- statement
-- Struktureller Rueckhalt: derselbe Startbeleg kann keinen zweiten Lauf eroeffnen, auch
-- dann nicht, wenn ein kuenftiger Codepfad die Pruefung vergisst. Laeufe ohne Freigabe
-- (lokale Verarbeitung) und Altbestand ohne Feld bleiben ausserhalb des Index.
CREATE UNIQUE INDEX chronist_freigabe_start ON chronist_laeufe ((evidence -> 'controlEvidence' -> 0 ->> 'freigabeHash'))
  WHERE (evidence -> 'controlEvidence' -> 0 ->> 'freigabeHash') IS NOT NULL;

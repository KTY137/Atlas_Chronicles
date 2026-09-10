-- Der Chronist bekommt zwei Aufgaben, mit denen er selbst schreibt: `artikel` entwirft aus
-- gewählten Quellen einen ganzen Artikel, `ueberarbeitung` eine geänderte Fassung genau einer
-- vorhandenen Passage. Die Prüfregel von 027 kannte nur die drei lesenden Aufgaben.
--
-- Kein neuer Tisch, keine neue Spalte: die Zielpassage einer Überarbeitung steht im ohnehin
-- gespeicherten `submission_request`, und ersetzt wird nach wie vor über eine Prägung
-- `berichtigung`, die es seit 004 gibt. Bestehende Zeilen bleiben gültig.
ALTER TABLE chronist_laeufe DROP CONSTRAINT chronist_laeufe_mode_check
-- statement
ALTER TABLE chronist_laeufe ADD CONSTRAINT chronist_laeufe_mode_check
  CHECK (mode IN ('prosa','sitzung','abriss','artikel','ueberarbeitung'))

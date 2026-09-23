-- Die Kartenlage des Kampftischs: wo eine Karte liegt und was die Runde von ihr sieht.
--
-- Eine eigene Tabelle statt neuer Spalten an `kampf_teilnehmer`: diese Tabelle steht im
-- eingefrorenen Exportprofil native-v11, und kein Profil kann Spalten an eine bestehende Tabelle
-- anhängen — `requireCoveredSchema` bräche jeden Export. Dasselbe Muster wie `actor_portraits`
-- neben `actor_profiles` (design/10-hosted-betrieb-und-auslieferung.md §1.4: rein additiv).
--
-- Eine Karte OHNE Zeile hier liegt auf dem Feld und trägt die Voreinstellung ihrer Seite. So
-- bleiben ältere Pakete (v11–v21) gültig, und ein Kampf ohne Besonderheiten erzeugt keine Zeile.
--
-- „Wer am Zug ist, liegt auf dem Feld" gilt über zwei Tabellen und lässt sich deshalb nicht als
-- CHECK schreiben. Die Domäne hält es unter der Kampfsperre, das Paket prüft es beim Einlesen.
CREATE TABLE kampf_karten (
  teilnehmer_id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  lage text NOT NULL CHECK (lage IN ('hand','feld','umgelegt','ablage')),
  name_fuer_runde text CHECK (name_fuer_runde IS NULL OR length(name_fuer_runde) BETWEEN 1 AND 160),
  sicht jsonb NOT NULL,
  vom_kampf_angelegt boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  geaendert_am bigint NOT NULL CHECK (geaendert_am >= 0),
  FOREIGN KEY (teilnehmer_id, campaign_id) REFERENCES kampf_teilnehmer(id, campaign_id)
);
-- statement
CREATE INDEX kampf_karten_campaign_idx ON kampf_karten(campaign_id);

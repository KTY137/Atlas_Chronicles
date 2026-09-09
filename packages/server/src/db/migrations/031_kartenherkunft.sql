-- Woher eine Weltkarte kommt.
--
-- Bis hierher war die Antwort in den Quelltext geschrieben: genau eine Karte, genau eine Datei
-- neben dem Programm, und jede andere Karte bekam grundsätzlich kein Bild. Sobald die
-- Spielleitung selbst eine Wiki-Adresse angibt, ist die Herkunft eine ANGABE — und eine Angabe
-- gehört in die Kampagne, nicht in den Quelltext.
--
-- Warum eine eigene Zeile und nicht ein Feld im Artefakt: `artifacts.source` ist das
-- unveränderte Quelldokument und wird beim Sichern Zeichen für Zeichen gegen seinen Hash
-- gehalten (packages/io/src/campaign-bundle.ts). Ein Abrufzeitpunkt darin würde dieselbe Karte
-- bei jedem Abruf zu einer anderen Karte machen. Die Herkunft steht deshalb daneben.
--
-- Die Lizenz des BILDES führt weiterhin `wiki_assets` mit seinem eigenen Urteil (015). Hier
-- steht die Lizenzangabe der KARTENSEITE, und `bild_dateiname` sagt, welche Bildzeile dazu
-- gehört — derselbe Name, den die Karte selbst in `mapImage` nennt.
CREATE TABLE atlas_karten_herkunft (
  map_id text NOT NULL PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  -- 'wiki'      — von der Spielleitung angegebene Adresse, live geholt
  -- 'beispiel'  — die mitgelieferte Beispielkarte, mit ihrer dokumentierten Herkunft
  -- 'bild'      — nur ein hochgeladenes Kartenbild, ohne Wiki
  art text NOT NULL CHECK(art IN ('wiki','beispiel','bild')),
  wiki_url text CHECK(wiki_url IS NULL OR wiki_url ~ '^https://' AND length(wiki_url) <= 2000),
  seitentitel text CHECK(seitentitel IS NULL OR length(seitentitel) BETWEEN 1 AND 512),
  pageid bigint CHECK(pageid > 0), revid bigint CHECK(revid > 0),
  bild_dateiname text CHECK(bild_dateiname IS NULL OR length(bild_dateiname) BETWEEN 1 AND 512),
  lizenz text CHECK(lizenz IS NULL OR length(lizenz) <= 2000),
  abgerufen_am bigint NOT NULL CHECK(abgerufen_am >= 0),
  geholt_von text NOT NULL REFERENCES users(id),
  FOREIGN KEY(map_id,campaign_id) REFERENCES atlas_maps(id,campaign_id),
  -- Eine Wiki-Herkunft ohne Wiki wäre keine Herkunft, sondern eine Behauptung.
  CHECK((art IN ('wiki','beispiel')) = (wiki_url IS NOT NULL)),
  CHECK((art IN ('wiki','beispiel')) = (seitentitel IS NOT NULL)),
  CHECK(art <> 'bild' OR bild_dateiname IS NOT NULL)
);
-- statement
CREATE INDEX atlas_karten_herkunft_campaign ON atlas_karten_herkunft(campaign_id, map_id);

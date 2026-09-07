-- Wiki-Bilder: eine Datei, eine Identität, eine belegte Herkunft.
--
-- Die Bytes liegen als base64 in der Zeile, wie bei tactical_sources.image_base64 (011): eine
-- Kampagne ist ein Paket, das exportiert, gesichert und wiederhergestellt wird, und ein
-- Dateisystempfad daneben ist genau die Stelle, an der ein solches Paket unvollständig wird.
--
-- Zwei Zustände in einer Tabelle, absichtlich: die Zeile entsteht beim Artikelimport OHNE
-- Bytes (Herkunft, Lizenzurteil, Quelladresse), und die Bytes kommen in einem zweiten,
-- wiederholbaren Schritt dazu. Deshalb sind mime/sha256/bytes/breite/hoehe gemeinsam NULL oder
-- gemeinsam gesetzt: eine Zeile darf nie einen Typ behaupten, den niemand gemessen hat.
CREATE TABLE wiki_assets (
  id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  universe_id text NOT NULL,
  dateiname text NOT NULL CHECK(length(dateiname) BETWEEN 1 AND 512),
  -- Aus den Magic Bytes bestimmt, nie aus dem Dateinamen (RB-12; media/LIESMICH.md).
  mime text CHECK(mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  sha256 text CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  bytes bigint CHECK(bytes>0), breite integer CHECK(breite>0), hoehe integer CHECK(hoehe>0),
  daten text,
  -- Was das Quell-Wiki BEHAUPTET. Wird aufbewahrt, um widerlegt zu werden, nicht um geglaubt zu werden.
  behaupteter_mime text CHECK(behaupteter_mime IS NULL OR length(behaupteter_mime) <= 200),
  lizenz_status text NOT NULL CHECK(lizenz_status IN ('frei','zitat','unbekannt')),
  lizenz_quelle text, lizenz_gesetzt_von text NOT NULL CHECK(lizenz_gesetzt_von IN ('import','mensch')),
  beschreibungsseite_url text, quell_url text, urheber text, hochgeladen_am text,
  verwendet_von jsonb NOT NULL DEFAULT '[]'::jsonb,
  verwaist boolean NOT NULL DEFAULT false, im_bestand boolean NOT NULL DEFAULT false,
  import_id text, created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL CHECK(created_at>=0),
  geholt_von text, geholt_am bigint CHECK(geholt_am>=0),
  PRIMARY KEY(id,campaign_id),
  CHECK((mime IS NULL) = (sha256 IS NULL) AND (mime IS NULL) = (daten IS NULL)
    AND (mime IS NULL) = (bytes IS NULL) AND (mime IS NULL) = (breite IS NULL) AND (mime IS NULL) = (hoehe IS NULL)),
  CHECK((daten IS NULL) = (geholt_am IS NULL)),
  UNIQUE(campaign_id, dateiname)
);
-- statement
CREATE INDEX wiki_assets_campaign ON wiki_assets(campaign_id, verwaist, dateiname);
-- statement
-- Welche Passage welches Bild benutzt. Der Server beantwortet damit die einzige Frage, die vor
-- der Auslieferung eines Bildes zählt: darf DIESE Leserin eine Passage sehen, die es zeigt?
CREATE TABLE wiki_asset_uses (
  asset_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  passage_id text NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  entry_id text NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  PRIMARY KEY(asset_id,campaign_id,passage_id),
  FOREIGN KEY(asset_id,campaign_id) REFERENCES wiki_assets(id,campaign_id) ON DELETE CASCADE
);
-- statement
CREATE INDEX wiki_asset_uses_passage ON wiki_asset_uses(campaign_id, passage_id);

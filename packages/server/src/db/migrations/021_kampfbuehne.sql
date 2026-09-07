-- Die Kampfbühne: wer ist dran, in welcher Runde, auf welcher Seite.
--
-- Sie ist die ABSTRAKTE Schwester der taktischen Karte, nicht ihr Ersatz. Die taktische Fläche
-- (011) trägt Gelände, Marken und Koordinaten; hier gibt es nichts davon. Zwei gegenüberliegende
-- Reihen, jeder Kämpfende eine Karte, eine Reihenfolge, ein Rundenzähler — das ist die ganze
-- Aussage. Wer Gelände braucht, nimmt die Karte; wer nur die Reihenfolge braucht, diese Bühne.
-- Beides nebeneinander ist richtig, eines in das andere zu pressen wäre der billige Weg.
--
-- `seite` ist deshalb ein Modellwert und keine Layoutentscheidung: die zwei Reihen SIND das
-- Kartenspiel-Bild. `neutral` gibt es, weil ein Kampf am Tisch regelmäßig etwas enthält, das zu
-- keiner Partei gehört und trotzdem am Zug ist.
--
-- Der Zug sitzt auf der Karte, nicht auf der Bühne. Ein Zeiger `kaempfe.am_zug` auf einen
-- Teilnehmer und zurück wäre ein Fremdschlüssel-Kreis: `restoreOrder` in `domain/bundles.ts`
-- spielt Tabellen nacheinander ein, und keine Reihenfolge löst einen Kreis auf. Das partielle
-- eindeutige Register unten sagt dieselbe Sache ohne Kreis — und schärfer, denn es lässt
-- **höchstens einen** Teilnehmer je Kampf am Zug sein, durchgesetzt von der Datenbank statt von
-- der Sorgfalt des Aufrufers.
--
-- Rein additiv: zwei neue Tabellen und drei Register ändern kein Schema, das älterer Code
-- voraussetzt (design/10-hosted-betrieb-und-auslieferung.md §1.4).
CREATE TABLE kaempfe (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  name text NOT NULL,
  zustand text NOT NULL DEFAULT 'vorbereitet'
    CHECK (zustand IN ('vorbereitet','laufend','beendet')),
  -- 0 heißt: noch nicht eröffnet. Die erste Runde ist 1, wie am Tisch gezählt wird.
  runde integer NOT NULL DEFAULT 0 CHECK (runde >= 0),
  erstellt_am bigint NOT NULL,
  beendet_am bigint,
  -- Ein beendeter Kampf hat einen Zeitpunkt, ein laufender keinen. Ohne diesen CHECK wäre
  -- "beendet" eine Behauptung der Anwendung statt eine Eigenschaft der Zeile.
  CHECK ((zustand = 'beendet') = (beendet_am IS NOT NULL)),
  -- Solange nicht eröffnet wurde, ist die Runde 0; sobald eröffnet wurde, nicht mehr.
  CHECK ((zustand = 'vorbereitet') = (runde = 0)),
  UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE kampf_teilnehmer (
  id text PRIMARY KEY,
  kampf_id text NOT NULL,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  seite text NOT NULL CHECK (seite IN ('gefaehrten','gegner','neutral')),
  -- Die Beschriftung der Karte. Sie steht auch dann hier, wenn ein `actor_id` daneben steht:
  -- die Bühne soll lesbar bleiben, ohne für jede Karte eine zweite Tabelle zu befragen, und ein
  -- Gegner hat gar keine Figur, auf die sie zeigen könnte.
  name text NOT NULL,
  actor_id text,
  initiative integer NOT NULL,
  -- Die stabile Ordnungszahl entscheidet Gleichstände. Ohne sie hinge die Reihenfolge zweier
  -- Kämpfender mit gleicher Initiative daran, in welcher Reihenfolge die Datenbank Zeilen
  -- zurückgibt — also an nichts.
  ordnung integer NOT NULL CHECK (ordnung >= 0),
  -- Der Beleg, wo es einen gibt. Nichts Wirksames ohne Quittung ist die Hausregel dieser
  -- Anwendung; ein von Hand gesetzter Gegnerwert hat keine und sagt das, statt es zu verschweigen.
  initiative_roll_id text,
  am_zug boolean NOT NULL DEFAULT false,
  FOREIGN KEY(kampf_id,campaign_id) REFERENCES kaempfe(id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(initiative_roll_id,campaign_id) REFERENCES action_rolls(id,campaign_id),
  UNIQUE(kampf_id,ordnung),
  UNIQUE(id,campaign_id)
);
-- statement
-- Höchstens einer je Kampf ist am Zug. Ein partielles eindeutiges Register statt eines Zeigers
-- auf der Bühne: dieselbe Aussage, kein Fremdschlüssel-Kreis, und die Datenbank hält sie.
CREATE UNIQUE INDEX kampf_teilnehmer_am_zug_idx ON kampf_teilnehmer(kampf_id) WHERE am_zug;
-- statement
CREATE INDEX kampf_teilnehmer_kampf_idx ON kampf_teilnehmer(campaign_id,kampf_id,ordnung);
-- statement
CREATE INDEX kaempfe_campaign_idx ON kaempfe(campaign_id,erstellt_am);

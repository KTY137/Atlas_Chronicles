-- Der Geldzähler: eine Zahl, die der Figur gehört — nicht dem Bogen und nicht einem Beutel.
--
-- Warum kein Gegenstand: ein Beutel läge in EINEM Inventar, Geld aber gehört der Figur und geht
-- mit ihr, egal welches Inventar gerade offen ist. Und jede Ausgabe wäre eine Mengenänderung an
-- einer Karte statt einer Zahl, die man ablesen kann.
--
-- Warum kein Bogenfeld: dann hinge Geld am Regelpaket. How to be a Hero kennt keines; es dort
-- einzuführen hieße, dem lizenzierten System eine Regel zuzuschreiben, die es nicht hat
-- (dieselbe Grenze wie bei den Erleichterungen). Und es stünde nur auf dem Bogen, nicht im
-- Inventar.
--
-- Rein additiv: zwei Tabellen, keine Änderung an bestehenden.
CREATE TABLE geld_einheit (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id),
  -- Wie diese Runde ihr Geld nennt. Ein fest verdrahtetes „Gold" wäre eine Aussage über eine
  -- Welt, die uns nicht gehört; ohne Namen wäre die Zahl bedeutungslos.
  name text NOT NULL CHECK (name <> '' AND length(name) <= 40),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  geaendert_am bigint NOT NULL
);
-- statement
CREATE TABLE geldbestand (
  campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_id text NOT NULL,
  -- Ganzzahlig und nie negativ: Schulden sind eine Erzählung, kein Kontostand. Eine Zahl, die
  -- unter null rutschen kann, lädt zu genau dem stillen Rechenfehler ein, den ein Zähler
  -- verhindern soll.
  betrag bigint NOT NULL DEFAULT 0 CHECK (betrag >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  geaendert_am bigint NOT NULL,
  PRIMARY KEY(campaign_id,actor_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id)
);

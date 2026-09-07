-- Erleichterungen: die Spielleitung gewährt ein Zugeständnis, die Spielerin würfelt es selbst.
--
-- Warum das nicht als Modifikator gebaut ist: das Regelwerk hat keinen. Jede Fertigkeitsprobe
-- trägt in ihrer Offenlegung „Ohne Modifikator", und die Adaption sagt in `manual_ruling`, warum:
-- es gibt keine offizielle allgemeine Modifikatorformel. Was sie stattdessen anbietet, ist die
-- ausdrückliche Absprache — Endwert und kritische Grenzen werden benannt, und die Eingaben
-- bleiben im Beleg. Eine Erleichterung ist genau das: eine festgehaltene Absprache, kein
-- erfundener Rechenweg.
--
-- Warum das keine Vollmacht ist: eine Vollmacht ist eine Tür für SPÄTER, urteilt über eine
-- Schwelle (`assertVollmachtAction` weist Aktionen mit Ergebnisbändern deshalb ausdrücklich ab)
-- und zählt gegen ein Wochenkontingent. Eine Erleichterung gilt für diesen Moment, wird von den
-- Bändern des Pakets beurteilt und zählt gegen nichts. Beides in eine Tabelle zu zwingen hieße,
-- einen Begriff mit zwei Bedeutungen zu beladen.
--
-- Rein additiv: eine Tabelle und zwei Register.
CREATE TABLE erleichterungen (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_id text NOT NULL,
  -- Wofür die Erleichterung gilt — die Probe, die am Tisch gemeint war. Sie steht hier für die
  -- Erzählung und für die Anzeige; gewürfelt wird die abgesprochene Aktion darunter.
  gemeinte_aktion text NOT NULL,
  -- Was tatsächlich gewürfelt wird: die vom Regelwerk sanktionierte Absprache-Aktion.
  gewuerfelte_aktion text NOT NULL,
  eingaben jsonb NOT NULL CHECK (jsonb_typeof(eingaben) = 'object'),
  -- Pflicht. Eine Erleichterung ohne Begründung ist eine Zahl ohne Absprache — und genau die
  -- soll sie ersetzen.
  grund text NOT NULL CHECK (grund <> ''),
  gewaehrt_von text NOT NULL REFERENCES users(id),
  gewaehrt_am bigint NOT NULL,
  eingeloest_roll_id text,
  eingeloest_am bigint,
  widerrufen_am bigint,
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(eingeloest_roll_id,campaign_id) REFERENCES action_rolls(id,campaign_id),
  -- Einlösung ist ein Ereignis mit Beleg und Zeitpunkt: beides oder keines.
  CHECK ((eingeloest_roll_id IS NULL) = (eingeloest_am IS NULL)),
  -- Was eingelöst wurde, kann nicht mehr widerrufen werden, und umgekehrt.
  CHECK (eingeloest_am IS NULL OR widerrufen_am IS NULL),
  UNIQUE(id,campaign_id)
);
-- statement
-- Höchstens EINE offene Erleichterung je Figur und gemeinter Probe. Zwei gleichzeitig wären ein
-- Stapel, und ein Stapel wäre wieder der Dauerbonus, den das Regelwerk nicht hat.
CREATE UNIQUE INDEX erleichterungen_offen_idx ON erleichterungen(campaign_id,actor_id,gemeinte_aktion)
  WHERE eingeloest_am IS NULL AND widerrufen_am IS NULL;
-- statement
CREATE INDEX erleichterungen_figur_idx ON erleichterungen(campaign_id,actor_id,gewaehrt_am);

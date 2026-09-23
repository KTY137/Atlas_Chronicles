<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Der Kampftisch — Karten, Balken, Masken

Stand 2026-09-23. Entwurf im Gespräch von Kaya freigegeben („jo passt"). Klickbares Mockup:
[`design/iterations/kampftisch-20260923/mockup.html`](../../../design/iterations/kampftisch-20260923/mockup.html).

## Anlass

Kaya, 2026-09-23: *„die kampf section besser […], gegner und spieler sollen wie cards aufm
spieltisch angezeigt werden mit allen resource bars wie leben, mana, ausdauer etc. […] bars sollen
gemasked werden können vom spielleiter, prinzipiell sollte der Spielleiter in der Lage sein zu
entscheiden wann eine Figur vom Spielfeld kommt etc."*

Die Kampfbühne (Feature 2, `9a8eb21`, 2026-09-07) führt Initiative, Runde und Zug. Ihr fehlen:

- **Werte auf der Karte.** `Vitalanzeige.tsx` ist fertig, aber nirgends eingebunden. Das war
  Absicht: `docs/FEATURELISTE.md` (Feature 13, „Offen") hält fest, dass Balken auf der Bühne die
  Lebenspunkte **fremder** Figuren offenlegen, und dass das eine Offenlegungsentscheidung ist. Die
  Masken der Spielleitung sind genau diese Entscheidung.
- **Ein Kartenleben.** Herunternehmen löscht die Zeile. Verdeckt, umgelegt, abgelegt gibt es nicht.
- **Sichtsteuerung.** Spieler bekommen denselben Inhalt wie die Spielleitung.
- **Live.** `projectedFingerprint` enthält keine Kämpfe; die Bühne fragt alle 4 s nach.
- **Initiative ändern.** Die bekannte raue Kante aus Feature 2.

## Entscheidungen

Jede Entscheidung ist begründet, damit Kaya sie im Nachhinein kippen kann. Wo zwei Wege offen
waren, gilt die allgemeinere Variante (`kaya-entscheide-selbst`).

### E1 — Jede Karte hat einen Bogen

Ein Gegner ist eine **Figur**, genau wie eine Spielerfigur: eigener Bogen, eigene Würfe, Inventar,
Beute, Niederlage-Regel. Er gehört der Spielleitung. Spieler sehen nur Figuren, die sie führen
(`listControlledActorIds`), ein Gegner taucht in ihrer Figurenliste also nie auf.

Warum nicht Werte direkt an der Karte? Das wäre ein zweiter Bogen: Balken, Höchstwert-Ausdruck,
Feldprüfung, Niederlage, Würfe und Beute müssten für Karten ein zweites Mal gebaut werden, und die
beiden Wahrheiten liefen beim ersten Höchstwert mit Klammern auseinander. „Keine zweite Wahrheit"
ist die Hausregel (Feature 13).

**Schnellgegner.** „Aus Vorlage auf den Tisch": Figurvorlage, Anzahl 1–12, Seite, Initiative,
Lage. Das legt in **einer** Transaktion N Figuren und N Karten an (`instantiatePinnedActorInTx`).
Bei N > 1 heißen sie „Wolf 1" bis „Wolf N". Solche Karten tragen die Marke `vom_kampf_angelegt`.

**Ohne Werte bleibt erlaubt.** Die brennende Hütte oder die einstürzende Decke braucht keinen
Bogen. Im Formular heißt das „Nur Name (ohne Werte)". Alte Karten ohne Figur bleiben gültig und
zeigen keine Balken.

### E2 — Die Spielleitung entscheidet, wo eine Karte liegt

| Lage | Wer sieht sie | Zugfolge | Bedeutung am Tisch |
| --- | --- | --- | --- |
| `hand` | nur die Spielleitung | nein | verdeckt, noch nicht im Spiel (Hinterhalt, Verstärkung) |
| `feld` | alle | ja | im Spiel |
| `umgelegt` | alle | nein | kampfunfähig, bleibt liegen |
| `ablage` | nur die Spielleitung | nein | vom Feld genommen, zurückholbar |

- **Nichts geschieht automatisch.** Ist ein Vitalwert mit `depletion: "defeat"` aufgebraucht
  oder steht `defeatPending` am Bogen, bekommt die Karte für die Spielleitung den Hinweis
  „Leben aufgebraucht — umlegen?" mit Knopf. Die Spielleitung legt um oder lässt liegen.
- **Umlegen ist Tischzustand, keine Kanon-Niederlage.** „Niederlage bestätigen" bleibt im Kanon,
  wo es heute ist. Die Bühne vermengt beides nicht.
- **Übergänge:** jede Lage in jede andere. Zurück aus der Ablage geht in die Hand oder aufs Feld.
- **Löschen bleibt** für Versehen („Karte löschen"), mit Rückfrage in der Oberfläche, nie über
  `window.confirm` (Electron-Fokusfehler, siehe `regelkern-universell-stand`).

**Zugregeln.**

- Am Zug ist nur eine Karte, die auf dem Feld liegt.
- „Nächster Zug" geht zur nächsten Feld-Karte in Initiativreihenfolge.
- Springt der Zug an den Anfang, beginnt die nächste Runde. Gezählt werden dabei nur Feld-Karten.
- Verlässt die Karte am Zug das Feld (in die Hand, umgelegt, in die Ablage, gelöscht), wandert
  der Zug zur nächsten Feld-Karte. Das ist dieselbe Regel wie heute beim Herunternehmen.
- Liegt keine Karte mehr auf dem Feld, ist niemand am Zug. Die nächste Karte, die aufs Feld kommt,
  ist sofort am Zug.
- Eröffnen verlangt mindestens eine Karte auf dem Feld.
- Eine Karte, die mitten in der Runde aufs Feld kommt, reiht sich nach ihrer Initiative ein. Liegt
  ihre Stelle vor dem aktuellen Zug, handelt sie ab der nächsten Runde.

### E3 — Masken je Balken und je Karte

Die Spielleitung stellt pro Karte ein, was die Runde sieht:

| Maske (Schlüssel) | Oberfläche | Was in der Spieler-Nutzlast steht |
| --- | --- | --- |
| `genau` | „Genau" | `wert`, `hoechst` |
| `fuellstand` | „Nur Füllstand" | `zehntel` (0–10), keine Zahl |
| `worte` | „In Worten" | `stufe` (`voll`/`gut`/`knapp`/`leer`) und `art` (`leben`/`vorrat`) |
| `verborgen` | „Verborgen" | — der Balken fehlt |

Dazu drei Schalter pro Karte:

- **Name für die Runde:** Die Runde liest „Vermummte Gestalt", die Spielleitung „Graf Veyl".
- **Bild zeigen:** Ein verkleideter Graf verriete sich sonst über sein Porträt.
- **Zustände zeigen:** blutend, benommen und so weiter.

**Wortstufen.**

- Verhältnis ≥ 1 → `voll`.
- ≥ 0,5 → `gut`.
- > 0 → `knapp`.
- ≤ 0 → `leer`. Ein Höchstwert ≤ 0 zählt als `voll`, solange der Wert > 0 ist.

**Die Wörter hängen am Balkentyp.** Ein Vitalwert mit `depletion: "defeat"` ist `art: "leben"`
und liest sich „unversehrt / angeschlagen / schwer angeschlagen / am Boden". Jeder andere ist
`art: "vorrat"` und liest sich „voll / gut gefüllt / fast leer / leer".

**Füllstand.**

- Wert ≤ 0 → 0.
- Verhältnis ≥ 1 → 10.
- Sonst die gerundeten Zehntel, mindestens 1, höchstens 9.

Ein fast voller Balken erscheint so nicht als voll, und ein fast leerer nicht als leer. Aus der
Zahl lässt sich der genaue Wert nicht zurückrechnen, weil der Höchstwert fehlt.

**Voreinstellung nach Seite.**

- Gefährten: alles `genau`, Bild und Zustände an.
- Gegner und Dazwischen: alles `worte`, Bild und Zustände an.

Die Spielleitung ändert das pro Karte. Die Maske speichert einen `standard` für Vitalwerte ohne
eigenen Eintrag. So überlebt sie einen Paketwechsel, und neue Balken sind nicht plötzlich offen.

**Die eigene Figur sieht der Spieler immer genau.** Er kann ihren Bogen ohnehin lesen. Eine Maske
dort wäre nur eine Behauptung.

### E4 — Die Projektion macht der Server, nach der Hausregel

Grenze B9 (`packages/core/src/nurleitung.ts`): *der Projektor ist der Server*, keine
Sichtbarkeits-Metadaten in Spieler-Antworten, kein Nenner.

- Karten in `hand` und `ablage` **fehlen** in der Spieler-Nutzlast. Es gibt kein Feld
  `verdeckt: true`, keinen Zähler „2 verdeckt" und keine Lücke in der Ordnung, die man zählen
  könnte.
- Verborgene Balken **fehlen**. Das Feld „Name für die Runde" **ersetzt** den Namen, statt neben
  ihm zu stehen.
- Die Figur-Kennung (`actorId`) und die Bogenversion stehen nur an Karten, die der Betrachter
  führt. `initiativeRollId` bekommt nur die Spielleitung; alle anderen lesen `gewuerfelt: boolean`.
- Die Masken-Einstellungen selbst (`sicht`) und `vom_kampf_angelegt` bekommt nur die
  Spielleitung.
- **`ordnung` bekommt nur die Spielleitung.** Die Ordnungszahl zählt fortlaufend über alle Karten
  eines Kampfes, auch über die in der Hand. Eine Lücke in ihr wäre genau der Nenner, den die
  Hausregel verbietet. Spieler bekommen die Karten fertig sortiert und keine Ordnungszahl.
- **Live ohne Seitenkanal.** Der Fingerabdruck hasht die **projizierte** Nutzlast des Betrachters.
  Ändert die Spielleitung etwas an einer Karte in der Hand, bleibt der Fingerabdruck der Spieler
  gleich. Es entsteht kein Refresh-Signal, dessen Zeitpunkt etwas verriete. Das ist ein
  ausdrücklicher Test.
- **Eine Rechnung, und sie steht beim Server.** Die Projektion einer Karte ist eine reine Funktion
  in `packages/projection/src/kampfkarte.ts`. `@chronicle/projection` ist laut eigener
  Beschreibung „die Sicht als Bibliothek, rein und serverseitig". Die Oberfläche rechnet nie
  selbst. Die Vorschau „Mit den Augen der Runde" holt sie über
  `GET …/kaempfe/:kampfId/als-runde`: die Nutzlast eines Betrachters, der keine Figur führt. Die
  Hinweise „Runde sieht: …" unter jedem Balken stehen in der Nutzlast der Spielleitung als
  `fuerRunde`, von derselben Funktion erzeugt. Eine zweite Rechnung in der Oberfläche liefe
  auseinander.
- **Beendete Kämpfe zeigen keine Balken.** Die Werte von jetzt sind nicht die Werte von damals.
  Der Rückblick zeigt, wer dabei war und wer lag. Er liest dabei auch keine Bögen, und das hält
  den Fingerabdruck billig.

### E5 — Werte direkt auf der Karte ändern

- Die Spielleitung ändert an jeder Karte mit Bogen, ein Spieler an der Figur, die er führt: ein
  Tipp auf die Zahl öffnet − / + und ein Eingabefeld.
- Geschrieben wird **in den Bogen**. Es gibt eine schmale Bogenoperation „einen Vitalwert
  setzen": ein Feld, mit Versionsprüfung. Sie läuft durch dieselbe Feldprüfung und dieselbe
  Niederlage-Markierung wie `updateSheet`. Einen zweiten Wert an der Karte gibt es nicht.
- Veraltete Version: 409 und in der Oberfläche der Satz „Der Wert hat sich inzwischen geändert —
  hier ist der neue Stand."

### E6 — Initiative nachträglich ändern

Die Spielleitung setzt die Initiative einer Karte neu, von Hand oder aus dem jüngsten
Initiativwurf der Figur. Die Belegregel aus Feature 2 bleibt: Wer von Hand ändert, verliert den
Beleg. Die Karte am Zug bleibt am Zug; ab dem nächsten Zug gilt die neue Reihenfolge.

### E7 — Aufräumen beim Beenden

„Beenden" bietet ein Häkchen an, voreingestellt an: „Die N Gegner, die für diesen Kampf angelegt
wurden, ins Archiv legen". Das gilt nur für Figuren mit `vom_kampf_angelegt`, nie für andere.
Archivieren ist umkehrbar und löscht nichts (Inventar und Beute bleiben an der Figur). Das
Archivieren läuft nach dem Beenden als je eigener `actor.archive`-Befehl. Scheitert einer, ist der
Kampf trotzdem beendet, und die Antwort nennt, wer nicht archiviert wurde.

### E8 — Neue Tabelle statt neuer Spalten

`kampf_teilnehmer` ist im eingefrorenen Profil `native-v11` festgelegt. Kein Exportprofil kann
bisher Spalten an eine bestehende Tabelle anhängen. `requireCoveredSchema` bräche jeden Export. Die
Kartenlage kommt deshalb in eine **eigene Tabelle** mit neuer Formatgeneration. Das ist rein
additiv (`design/10-hosted-betrieb-und-auslieferung.md` §1.4) und folgt dem Muster von
`actor_portraits` neben `actor_profiles`.

## Datenmodell

Migration `037_kampfkarten.sql`:

```sql
CREATE TABLE kampf_karten (
  teilnehmer_id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  lage text NOT NULL CHECK (lage IN ('hand','feld','umgelegt','ablage')),
  name_fuer_runde text CHECK (name_fuer_runde IS NULL OR length(name_fuer_runde) BETWEEN 1 AND 160),
  sicht jsonb NOT NULL,
  vom_kampf_angelegt boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  geaendert_am bigint NOT NULL,
  FOREIGN KEY (teilnehmer_id, campaign_id) REFERENCES kampf_teilnehmer(id, campaign_id)
);
```

**`sicht`, Schema 1:**

```json
{ "schema": 1, "standard": "worte", "balken": { "leben": "fuellstand" }, "zustaende": true, "bild": true }
```

Die Form prüft der Server mit TypeBox an der Tür.

**Fehlende Zeile gleich Voreinstellung.** Eine Karte ohne Zeile in `kampf_karten` liegt auf dem
Feld und trägt die Voreinstellung ihrer Seite. Die Zeile entsteht mit der ersten Änderung
(Version 0 → 1, dasselbe Muster wie `actor_sheets`). Warum kein Nachfüllen in der Migration?
Bündel der Generationen v11–v21 enthalten Karten ohne Zeile, und ihr Import muss ohnehin damit
umgehen. Eine Regel für beide Fälle ist besser als zwei.

**Invariante:** `am_zug` nur bei Lage `feld`. Ein CHECK über zwei Tabellen geht nicht, deshalb
hält die Domäne die Invariante und ein Test prüft sie. Jeder Schreibweg sperrt den Kampf
(`FOR UPDATE`), bevor er Lage oder Zug liest. Das ist dieselbe Nebenläufigkeitsregel wie heute.

**Export, Import, Löschen.** Das sind dieselben fünf Orte wie bei Feature 2 (`FEATURELISTE.md`,
„Warum das kein UI-Stück ist"), und sie landen zusammen:

1. die Migration
2. die Formatgeneration `packages/io/src/native-v22/**` (additiv)
3. `restoreOrder` (nach `kampf_teilnehmer`) und die Formatversion-Union
4. die Löschabdeckung, bei der `kampf_karten` vor `kampf_teilnehmer` gelöscht wird
5. die Domäne

Beim Entfernen einer Karte wird ihre Zeile in `kampf_karten` mitgelöscht.

## Schnittstelle

Bestehende Wege bleiben unverändert gültig. Neu oder erweitert:

| Weg | Wer | Zweck |
| --- | --- | --- |
| `GET …/kaempfe`, `GET …/kaempfe/:kampfId` | alle Mitglieder | jetzt **projiziert** je Betrachter |
| `POST …/kaempfe/:kampfId/teilnehmer` | Leitung | zusätzlich `lage` (`hand`/`feld`, Vorgabe `feld`), `nameFuerRunde`, `sicht` |
| `POST …/kaempfe/:kampfId/teilnehmer/aus-vorlage` | Leitung | `{commandId, templateId, templateRevision, anzahl 1–12, name?, seite, initiative, lage}` |
| `POST …/teilnehmer/:tid/lage` | Leitung | `{lage, expectedVersion}`, mit Zugregeln aus E2 |
| `POST …/teilnehmer/:tid/sicht` | Leitung | `{sicht, nameFuerRunde, expectedVersion}` |
| `POST …/teilnehmer/:tid/initiative` | Leitung | `{initiative, initiativeRollId}` |
| `GET …/teilnehmer/:tid/bild` | wer die Karte sieht und `bild` an ist; Leitung immer | Porträt über den Kampf, sonst 404 |
| `GET …/kaempfe/:kampfId/als-runde` | Leitung | Vorschau: die Nutzlast eines Betrachters ohne eigene Figur |
| `PUT …/actors/:id/sheet/vitals/:vital` | Leitung; Spieler für geführte Figur | `{wert, expectedVersion}`, als `setVital` in `domain/gameplay.ts` neben `updateSheet` |
| `POST …/kaempfe/:kampfId/beenden` | Leitung | zusätzlich `{archivieren?: boolean}` (E7) |

Fehler folgen dem Haus: 404, wer nicht führen darf; 409 bei veralteter Version, doppeltem Klick
oder unzulässigem Übergang.

## Oberfläche

Der Reiter heißt weiter „Kampf". Die Fläche heißt **Kampftisch**.

**Aufbau.**

- **Kopfleiste:** Name, Runde, groß „Am Zug: …". Für die Spielleitung außerdem Eröffnen, Nächster
  Zug, Beenden und der Umschalter **„Mit den Augen der Runde"**.
- **Tischfläche:** Gegner oben, Dazwischen in der Mitte, Gefährten unten. Eine Mittellinie trägt
  die Runde. Umgelegte Karten bleiben an ihrem Platz.
- **Seitenleiste (nur Spielleitung):**
  - „Deine Hand": verdeckte Karten, aufgefächert
  - „Ablage": eingeklappt
  - „Wer kämpft mit?": Figur am Tisch, aus Vorlage oder nur Name

**Die Karte.**

- Initiative als Siegel in der Ecke, Porträt oder Monogramm, Name in der Anzeigeschrift.
- Balken mit Beschriftung und Zahl, Füllstand oder Wort.
- Zustände als Marken, im Fuß „gewürfelt" oder „gesetzt".
- Die Seite zeigt sich als Farbband am oberen Rand **und** als Wort in der Reihenüberschrift.

**Zustände der Karte.**

- **Am Zug:** angehoben, mit Leuchtrand und der Marke „am Zug", also nicht nur Farbe.
- **Umgelegt:** entsättigt, leicht gekippt, Stempel „umgelegt".
- **In der Hand:** Die Spielleitung sieht die Karte mit der Marke „verdeckt".
- **Deine Figur:** Für den Spieler ist die eigene Karte markiert und trägt − / +.

**Bedienung durch die Spielleitung.**

- **Augensymbol an jedem Balken:** Es öffnet die vier Masken in Klartext mit der Vorschau „So
  sieht es die Runde: *angeschlagen*".
- **Kartenmenü (⋯):**
  - Aufs Feld · In die Hand · Umlegen · Aufstehen lassen · Vom Feld nehmen
  - Initiative ändern · Was sieht die Runde? · Inventar öffnen · Karte löschen

**Klartext.**

- Jeder sichtbare Satz ist Alltagsdeutsch mit englischem Katalogeintrag.
- Kein „Projektion", kein „Maske" in der Oberfläche. Es heißt „Was die Runde sieht".

**Barrierefreiheit.**

- Genaue Balken tragen `role="meter"` mit Werten.
- Füllstand trägt `aria-valuetext` („etwa sechs Zehntel").
- Wortstufen sind Text.
- Die Marke „am Zug" ist ein Wort.

**Aussehen.**

- **Derselbe Tisch wie im Reiter „Tisch".** `tabletop.css` hat Holzkante (`.tabletop-furniture`)
  und Filz (`.tabletop-felt`). Der Tisch ist ein Gegenstand, kein Bedienelement, und bleibt in
  jedem Look gleich. Der Kampftisch benutzt dieselben Regeln, statt einen zweiten Tisch zu malen.
  Beschriftungen direkt auf dem Filz nehmen die Schriftfarbe der Tischkante (`#f0dcc0`).
- **Alles, was auf dem Tisch liegt, folgt dem Look:** Karten, Fenster, Marken. Dort gibt es nur
  Farbwerte aus den Looks, keine fest verdrahtete Farbe.
- Die vorhandenen Ersatzwerte `#fdfaf4` und `var(--radius, 6px)` in `kampfbuehne.css` fliegen raus.
- Die Fläche muss in allen zwölf Looks stehen, auch in den drei hellen: ein Prüfblatt aus den
  echten Stilblättern, im Bild angesehen.

**Bewegung.** Anheben und Aufdecken folgen `--panel-motion`. Unter `prefers-reduced-motion`
gibt es keine Bewegung.

**Schmal.** Die Reihen stapeln sich, zwei Karten nebeneinander, die Hand scrollt waagrecht.

## Prüfung

- **Reine Projektion:**
  - Wortstufen und Zehntel an den Grenzen (0, knapp über 0, 0,5, knapp unter 1, 1, über 1,
    Höchstwert 0)
  - eigene Figur genau
  - `standard` für unbekannte Balken
  - verborgene Balken fehlen
  - Name für die Runde ersetzt
- **Server:**
  - Zugregeln: überspringen, leeres Feld, nächste Feld-Karte übernimmt, Runde zählt nur
    Feld-Karten
  - Invariante `am_zug` ⇒ `feld`
  - Rechte: Spieler ändern weder Lage noch Sicht; Vitalwert nur an geführter Figur
  - Handkarten fehlen in der Spieler-Nutzlast, samt Porträt-Weg (404); die Spieler-Nutzlast
    enthält weder `ordnung` noch `sicht` noch `vom_kampf_angelegt`
  - Fingerabdruck der Spieler bleibt gleich bei Änderungen an Handkarten und ändert sich bei
    sichtbaren Werten
  - `aus-vorlage` legt N Figuren in einer Transaktion an und rollt bei Fehler alles zurück
  - Beenden mit Archivieren
- **Export:**
  - Rundlauf in `alles-in-einer-datei` mit `kampf_karten`
  - `restore-order`, Löschabdeckung
  - Import eines v21-Bündels ohne `kampf_karten`
- **Oberfläche:**
  - Render-Prüfung des Kampftischs
  - Sprachgate
  - Parse und Build
  - Prüfblatt in zwölf Looks
  - Playwright-Ablauf Spielleitung stellt auf, maskiert, Spieler sieht es
- **Gegenprobe:** Projektion und Fingerabdruck-Filter aushängen, dann müssen die zugehörigen Fälle
  rot werden.

Nie die volle Suite. Gezielt laufen die betroffenen Dateien und die Konsumenten der geänderten
Schnittstellen (`featureliste-arbeitsregeln`).

## Bewusst nicht enthalten

- Kopplung an Marken auf der Szenenkarte (Umlegen legt die Marke nicht um)
- automatische Beute bei Niederlage, Übergabe an die Gruppe
- automatisches Würfeln der Initiative für Schnellgegner
- Schaden aus einem Angriffswurf direkt auf die Zielkarte
- mehrere Hände (Co-Spielleitung)

Jeder dieser Punkte kann auf dem Datenmodell aufsetzen, ohne es zu ändern.

# Regelschmiede: Formel-Bauteil im Objekt-Bild

Auftrag (Kaya): Formeln in der Regelschmiede sollen sich wie ein eigenes
Bauteil im Objekt-Bild anfühlen — eine Zeile zum Tippen mit Vorschlägen und
verständlichen Fehlern, dazu zwei weitere Ansichten auf dieselbe Formel
(Bausteine zum Klicken, ein Knotennetz zum Verdrahten), ein lesbares Beispiel
und Klartext ohne Fachjargon, alles bis zum schmalen Bildschirm hinunter
bedienbar.

## Entscheidungen

Bindend war die Spec `docs/superpowers/specs/2026-09-08-regelschmiede-formel-
bauteil-design.md`; die Aufteilung in zwölf Aufgaben und ihre Selbstprüfung
stehen in `.superpowers/sdd/2026-09-08-regelschmiede-formel-bauteil/progress.md`.
Aufgabe 12 (dieser Stand) war die letzte: den kompletten Ablauf im echten
Browser fahren, die Gates ziehen und die Nachweise schreiben.

Absichtliche Abweichung von der Spec, seit der Selbstprüfung des Plans
bekannt und hier bestätigt: Der Chip in der Formelzeile zeigt die Kennung
(z. B. `@geschick`), nicht die Bezeichnung — die Überlagerung muss
zeichengenau über dem echten Eingabefeld liegen, eine längere Bezeichnung
würde das verschieben. Die Bezeichnung steht stattdessen als Tooltip auf dem
Chip, in der Vorschlagsliste beim Tippen und im Beispieltext unter der
Formel. Die Zeile selbst bleibt zusätzlich in den Ansichten „Bausteine" und
„Knoten" sichtbar (nicht nur als dritte, austauschbare Ansicht), damit der
Tipptext beim Umschalten nie verschwindet.

## Was gebaut wurde

- **Formelzeile** mit Autovervollständigung für Attribute/Parameter (`@…`,
  `?…`), Enter übernimmt den ersten Vorschlag, ein Erst-Hinweis unter dem
  Feld und ein Spickzettel für die Zeichen.
- **Klartext-Fehlerkatalog**: Würfel-, Zahlen-, Objektpfad-, Verbotscodes
  (Würfel/Wissen) und der Leerfall — alle als vollständige, jargonfreie
  Sätze statt Fehlercodes, inklusive „Meintest du …"-Vorschlägen bei
  Tippfehlern in Attributnamen.
- **Zucker/Entzuckerung**: `@attribut`/`?parameter` sind Zucker über der
  internen `actor.…`/Objektpfad-Schreibweise; beide Richtungen sind
  verlustfrei (`resugarFormula`/`parseFormula`).
- **Beispiel**: ein deterministisches Rechenbeispiel unter der Formel, das
  sich mit jeder Änderung aktualisiert.
- **Bausteine-Ansicht**: die Formel als anklickbare Blöcke (Würfel, Zahl,
  Attribut/Parameter, Rechenzeichen, Klammern), bearbeitbar ohne die
  Formelsprache zu kennen.
- **Knoten-Ansicht**: dieselbe Formel als Knotennetz zum Verdrahten.
- **Objekt-Bild**: alle drei Ansichten sitzen im selben Bauteil, ein
  Umschalter wechselt zwischen Zeile/Bausteine/Knoten ohne Datenverlust.
- **HTBAH-Vorlage**: nutzt dieselbe Formelzeile und denselben Export-/
  Downloadpfad; die Vorlage bleibt byte-genau reproduzierbar.

## Gemessene Nachweise

Alle Zahlen aus tatsächlichen Läufen in diesem Worktree
(`C:\Users\nukei\Desktop\PROJECTS\project_atlas\Atlas_Chronicles\.claude\worktrees\regelschmiede-formeln`,
Branch `feature/regelschmiede-formel-bauteil`), nicht aus dem Aufgabentext.

**Browserabläufe (Playwright, `msedge`, `npm run build` vorab):**

- `e2e/rule-forge-formula.spec.ts` — 2/2 grün, einzeln und zusammen
  wiederholt. Deckt: Tippen mit Vorschlag und Enter-Übernahme, Klartext-
  Tippfehlerhinweis mit „Meintest du …", deaktivierter Installieren-Knopf bei
  Fehler, Wechsel Zeile → Bausteine → Knoten → Zeile ohne Wertverlust,
  Installieren/Prüfen/Aktivieren (je 200), Wurf am Tisch mit
  `receipt.expression === "1d20 + actor.insight"`, schmale Ansicht (390 px)
  ohne horizontales Scrollen, keine `pageerror`. Ein einzelner Lauf des
  Drei-Spec-Bündels riss beim `context.close()` mit einem
  `ENOENT …-pwnetcopy-1.network`-Fehler ab (Playwright-Tracing kopiert unter
  Windows Netzwerk-Mitschnitte parallel zum Kontext-Schließen und race't sich
  dabei selbst aus); alle vorherigen Assertions im Trace waren bereits grün,
  und ein isolierter Wiederholungslauf sowie ein erneuter Lauf des Bündels
  waren beide sauber. Das ist eine Windows-Tracing-Flakiness von Playwright,
  kein Produkt- oder Spec-Fehler; keine Erwartung wurde deswegen gelockert.
- `e2e/rule-forge.spec.ts` — 1/1 grün nach einer Spec-Korrektur (siehe unten).
- `e2e/htbah.spec.ts` — 1/1 grün ohne Änderung.

**Spec-Korrektur in `rule-forge.spec.ts`:** Zeile 60 wählte den Attribut-Chip
über `editor.getByRole("button", { name: /Scharfsinn/ })`. Seit Aufgabe 3
(„Attribute als Liste plus Editor", Commit `c768921`) trägt die Attributliste
zusätzlich einen „Feld Scharfsinn entfernen"-Knopf; die Regel-Prüfung ist
strikt und die lockere Regex traf beide Knöpfe (`strict mode violation`,
2 Treffer). Das war eine veraltete Erwartung der Spec gegen eine seither
geänderte Objektliste, kein Produktfehler — behoben durch Verankerung am
Zeilenanfang (`/^Scharfsinn /`), die nur den Listeneintrag trifft, dessen
sichtbarer Name mit der Bezeichnung beginnt.

**Gates:**

- `npm run typecheck` — grün.
- `npm run build` — grün.
- `npm run gate:version` — grün, `chronicle@0.1.0, @chronicle/desktop@0.1.0`.
- `npm run gate:boundaries` — grün, 541 Dateien, 8 Regeln, 0 Verstöße.

**Gezielte Vitest-Liste (Aufgabe 12, Schritt 3):** 19 Testdateien, 291 von
291 Fällen grün, 24,8 s Gesamtlaufzeit. `packages/server/test/rules.test.ts`
existiert unter diesem Namen nicht; nach der im Aufgabentext vorgesehenen
Suche (`ls packages/server/test | grep -i rule`) gibt es stattdessen
`rule-preview.test.ts` (3/3) und `gameplay-rule-bounds.test.ts` (2/2) — beide
importieren `@chronicle/rules` und decken den Server-Konsumenten ab; beide
liefen mit.

## Abweichungen von der Spec

- Chip zeigt die Kennung, nicht die Bezeichnung; Bezeichnung als Tooltip, in
  der Vorschlagsliste und im Beispiel (siehe „Entscheidungen").
- Die Zeile bleibt in den Ansichten Bausteine und Knoten sichtbar statt durch
  sie ersetzt zu werden.

## Offen

- Regelkarte (eine gedruckt wirkende Zusammenfassung des installierten
  Pakets) ist nicht gebaut.
- Kategorien/Gruppierung von Attributen und Aktionen über die flache Liste
  hinaus fehlen.
- Ausrüstung als eigener Feldtyp mit Formelbezug ist nicht angebunden.
- Weitere Beispiel-Regelwerke außer HTBAH sind nicht vorbereitet.
- Lizenzfragen für künftige Vorlagen jenseits von HTBAH (CC-BY-NC-SA-4.0,
  bereits im Bundle bestätigt) sind nicht geklärt.

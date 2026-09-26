<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Zugänglich und schön: Regelschmiede, Figuren und Bogen

Stand 2026-09-26. Kaya: *„kannst du die regelwerk schmiede noch noch besser und mehr accessible
machen? Auch die Char Creation etc. alles was auch drumherum zusammenhängt? visuell und so auch“*.
Entschieden nach `kaya-entscheide-selbst` (allgemeinste Option, keine Rückfragen). Gehört zur Stufe
(a) „Optik, Übersicht“ der Leiter (`2026-09-25-regelschmiede-leiter-design.md`) und ändert das
Paketformat nicht — umkehrbare Schicht.

## Ziel und Maßstab

**Präzisierung Kaya, 2026-09-26:** *„mit accessible mein ich btw einfach das ein dummer nutzer der
dass system nicht kennt damit umgehen kann bzw schnell weiß wie es geht. nicht barrierefrei aber
auch gut wenn du das jetzt gemacht hast“.* Das **Hauptziel ist Anfängertauglichkeit**;
Barrierefreiheit ist das Nebenziel und bleibt drin, wo sie ohnehin anfällt.

**Hauptziel.** Jemand, der Atlas Chronicles zum ersten Mal öffnet und kein Regelsystem-Vokabular
kennt, schafft diese drei Aufgaben ohne Anleitung und ohne Raten:

1. als Spielleitung ein eigenes Regelwerk anlegen, ausprobieren und für die Runde aktivieren;
2. als Spielleitung eine Figur für die Runde anlegen (über Vorlage oder direkt);
3. als Spieler eine Figur beantragen und danach auf „Ich“ seinen Bogen finden und ändern.

**Maßstab Anfängertauglichkeit.** Jede Ansicht im Umfang beantwortet oben drei Fragen — *Was ist
das hier? Was mache ich jetzt? Was passiert danach?* — und hat genau **einen** hervorgehobenen
nächsten Schritt. Beim ersten Öffnen stehen höchstens sieben gleichrangige Wahlmöglichkeiten im
Blick. Jeder Fachbegriff, der bleiben muss, ist an Ort und Stelle erklärt (ein Satz, ein Beispiel).
Keine leere Ansicht ohne Hinweis, was hineingehört, und ohne Knopf „Mit Beispiel beginnen“.
Geprüft durch einen „Neulingsgang“-Test (die drei Aufgaben als e2e-Durchlauf nur über sichtbare
Beschriftungen) und durch Ansehen der Bilder.

Ein Bogen liest sich wie ein Charakterbogen, nicht wie ein Behördenformular.

**Maßstab Barrierefreiheit (Nebenziel):** WCAG 2.2 AA. Gemessen mit axe-core 4.13 (Tags `wcag2a/aa`, `wcag21a/aa`, `wcag22aa`,
`best-practice`) auf echten Bildschirmen in einem dunklen (Fantasy) und einem hellen Look
(Parchment), bei 1440 und 390 Pixel Breite. Dazu eigene Messungen, die axe nicht kennt: kein Text
unter 12 px, Tippziele ≥ 24 px, kein Überlauf bei 390 px, Fokus landet nach jedem Ansichtswechsel
auf der neuen Überschrift.

## Befund (Bestandsaufnahme 2026-09-26)

Zwei Prüfungen: Laufzeit (39 Bildschirme × 2 Looks × 2 Breiten, 347 Bilder, axe je Bildschirm,
Tastaturgang) und Code (Regelschmiede- und Figurendateien). Kurzfassung, nach Wirkung:

1. **Der Bogen ist ein Formular.** `RuleFields` schreibt unter jeden Wert „Pflichtfeld“/„optional“
   und „Ganzzahl von 0 bis 50, z. B. 10“; der Lite-Bogen ist 13 200 px hoch. Balken stehen zuletzt,
   Speichern nur oben, berechnete Werte als Browser-Standardliste, „Verlernen“ klebt am Text.
2. **Kaputte Kontrollkästchen.** `styles.css:38` gibt jedem `input` `width:100%; min-height:42px`;
   im Figurantrag schweben 44-px-weiße Kästen über ihren Zuständen, in der Vorlage browserblaue.
3. **Fokus geht verloren.** Bibliothek ↔ Werkbank ↔ Assistent, Assistentenschritte, Karteneditor:
   Fokus fällt auf `body`, nichts wird angesagt.
4. **25 Browser-Rückfragen** (`window.confirm`) im Umfang; ignorieren den Look, haben den
   Electron-Fokusfehler ausgelöst.
5. **Zu kleine Schrift:** 9–11 px an über 40 Stellen (Pflichtfeld-Hinweise, Paketkennungen,
   Zustandstexte, Hilfetexte, Fußband).
6. **Überdeckung:** Die Vorschau-Schublade liegt unter 1600 px über dem Editor; die klebende
   Fußleiste des Assistenten verdeckt auf dem Handy Chips (axe `target-size`, einziger
   „serious“-Befund) und auf dem Desktop die Vorschau.
7. **Warnungen in Erfolgsgrün:** `Notice` kennt nur ok/Fehler.
8. **Jargon und Rohwerte:** Kennung, Revision, Migration, Namensraum, „32 Hexadezimalzeichen“,
   „Kennungslisten korrigieren“ (auch für Spieler), `id@version`, rohe Engine-Fehler im Assistenten.
9. **Gleiches sieht verschieden aus:** 6 Reiter-Bauarten, 3 Schrittanzeigen, ~11 Hinweiskästen,
   4 Listen-mit-Suche-Kopien, 16 Schriftgrößen, 48 feste Radien, Dichte-Einstellung wirkungslos.
10. **Ablaufstolpersteine:** zwei Wege in den Assistenten, fünf gleich laute Vorlagenknöpfe,
    Veröffentlichen-Knöpfe gegen die Schrittfolge, gesperrte Knöpfe ohne Begründung, drei
    Figurwähler auf „Ich“, „Figur anlegen“ als 1000-px-Knopf für einen Antrag.

axe fand sonst wenig (Look-Kontraste bestehen; `region` auf dem Handy, `heading-order`,
`aria-prohibited-attr`). Die Hauptlast liegt also bei Dingen, die kein Prüfer findet — deshalb
eigene Messungen und Bilder als Nachweis.

## Entscheidungen

**E1 Bausteine gehören nach `@chronicle/ui`.** Neu: `Notice` mit `tone` (`ok` | `info` | `warn` |
`error`; `error`-Prop bleibt), `ConfirmHost` + `useConfirm()` (natives `<dialog>` mit
`showModal()`: Fokusfalle, Escape, Hintergrund inert, Fokus zurück an den Auslöser; Versprechen
statt `window.confirm`), `StepList` (geordnete Liste, `aria-current="step"`, „erledigt“ für
Bildschirmleser), `Tabs` (Rollen tablist/tab/tabpanel, Pfeiltasten, Pos1/Ende). Kein Router, kein
Kontext außer dem Rückfrage-Host.

**E2 Ein Maßsystem.** In `packages/ui/src/tokens.css`: Schriftstufen `--text-xs` (12 px) bis
`--text-xl`, Abstände `--space-1…7` aus `--theme-space` (damit die Dichte-Einstellung wirkt),
Radien `--radius-sm/--radius/--radius-lg` aus dem Look. Im Umfang werden feste px-Schriften unter
12 px, feste Radien und Abstände auf diese Stufen umgestellt. Kontrollkästchen und Optionsknöpfe
sind global von der Textfeld-Regel ausgenommen und bekommen `accent-color: var(--accent)` und
20 px.

**E3 Der Bogen wird ein Bogen.** `RuleFields` bekommt eine Darstellung `sheet` (Standard auf allen
Bögen) neben `form` (Regelschmiede-Formulare):
- Zahlen als kompakte Wertkachel: Name, große Zahl, − und + (je ≥ 32 px), der Bereich als leise
  Angabe „0–50“; die ausführliche Beschreibung nur für Bildschirmleser (`aria-describedby`).
- Kein „Pflichtfeld“/„optional“. Ein Zahlenfeld ohne Wert zeigt den Fehler, sonst nichts.
- Texte als Zeile; die Zeichengrenze erscheint erst ab 80 % Füllung.
- Ja/Nein als Schalterzeile.
- Raster `repeat(auto-fill, minmax(11rem, 1fr))`, auf dem Handy zwei Spalten für Zahlen, eine für
  Text.
Außerdem:
- Balken zuerst, wenn der Baum sie nicht selbst setzt (alte v1/v2-Pakete); bei v3 bleibt die
  Reihenfolge der Autorin — der Baum ist die eine Wahrheit.
- Berechnete Werte als Wertkacheln ohne Eingabe.
- Fähigkeiten als Karten; Knöpfe heißen „{Name} lernen/verlernen“; gesperrtes Lernen sagt warum
  (zu wenig Punkte, Voraussetzung fehlt).
- Zustände als Umschalt-Chips mit Beschreibung darunter.
- „Kennungslisten korrigieren“ nur, wenn eine Liste unbekannte Einträge enthält, als
  „Gespeicherte Liste reparieren“.
- Klebende Speicherleiste unten („Ungespeicherte Änderungen · Bogen speichern“), wo ein Bogen
  gespeichert wird.
- Porträtwahl als gestalteter Knopf statt nackter Dateiauswahl.

**E4 Fokus folgt der Ansicht.** Jeder Ansichtswechsel (Bibliothek/Werkbank/Assistent,
Assistentenschritt, Reiter der Werkbank über Knopf statt Tab, Kartenknoten schließen) setzt den
Fokus auf die neue Überschrift (`tabIndex=-1`) und sagt sie über eine ruhige Live-Region an.
Escape in einer Vorschlagsliste schließt nur die Liste. Live-Regionen melden gebündelt (nach 700 ms
Ruhe), nicht je Tastendruck.

**E5 Nichts verdeckt etwas.** Vorschau-Schublade wird ab 1280 px eine Spalte im Raster, darunter
ein Abschnitt im Fluss („Vorschau zeigen“). Klebende Leisten reservieren ihren Platz
(`scroll-padding-bottom`, Innenabstand), Assistent: Fußleiste in der Fragenspalte, auf dem Handy
steht die Frage vor der Bogenvorschau, die Vorschau ist aufklappbar.

**E6 Klartext bis in die Fehler.** Engine-Fehler laufen überall durch `explainValidationError`.
Kennung, Version, Engine, Würfelstart, Passagen, Migration wandern hinter „Für Fortgeschrittene“;
wo sie sichtbar bleiben müssen, mit Alltagswort. `id@version` wird „Chronicles Lite, Version 1.0.0“.
Ein Begriff je Sache: **Regelschmiede** (nicht Regelwerkstatt/Schmiede im Fließtext),
**Attribute** und **Balken** auch im Assistenten (dort mit Alltagssatz erklärt), **Listen**,
**Berechnete Werte**, **Fertigkeitspunkte**.

**E7 Ein lauter Knopf je Ort.** Bibliothek: „Neues Regelwerk“ oben primär, der Startbereich bietet
nur noch Vorlagen/leer/Datei (die doppelte Assistenten-Karte fällt weg), Vorlagenknöpfe sekundär,
Karten gleich hoch, Kennzahlen in einer Zeile. Veröffentlichen: Knöpfe in Schrittfolge. Figurvorlage:
„Speichern“ primär und zuerst. Figurantrag: „Figur beantragen“ in normaler Breite. Gesperrte Knöpfe
erklären sich (sichtbarer Satz, per `aria-describedby` verbunden).

**E8 Rund um die Figur.**
- „Ich“: ein Figurwähler oben, der Bogen und Inventar steuert. Die Lesesicht für Chronik/Atlas
  heißt „Aus wessen Sicht liest du?“ und steht darunter. Geld einmal. Auf dem Handy zeigt der
  erste Bildschirm Name, Porträt und Balken.
- Figurantrag: das Vorlagenfeld „Name“ entfällt zugunsten von „Name deiner Figur“. Der
  Wartezustand markiert erledigte Schritte. Abgelehnte Anträge: der letzte sichtbar, ältere
  eingeklappt.
- Anträge der Spielleitung: Zähler am Reiter, Ablehnungsgrund direkt am Knopf.
- „Grund der Änderung“: freiwillig. Leer schickt der Client einen festen Standardgrund, damit der
  Serververtrag (Pflichtfeld im Verlauf) unberührt bleibt.

**E9 Rückfragen im Look.** Alle 25 `window.confirm` im Umfang werden `useConfirm()`. Die 55
übrigen im Client (Karten, Chronik, Kampftisch u. a.) bleiben — andere Sitzungen arbeiten dort;
der Baustein steht ihnen offen.

**E10 Einfach zuerst.** Die Werkbank öffnet im Modus **„Das Wichtigste“**: Paket, Attribute, Balken,
Aktionen, Fähigkeiten, Bogen, Ausprobieren, Übernehmen. Die übrigen Bereiche (Regelkarte,
Berechnete Werte, Listen, Zustände, Bogenregeln, Migration) erscheinen hinter „Alle Bereiche
zeigen“ — oder von selbst, sobald das Paket dort Inhalt oder ein Problem hat (ein Bereich mit
Inhalt wird nie versteckt). Die Wahl merkt sich der Browser je Person. Dasselbe Prinzip gilt im
Bereich: Kennungen, Versionen, Formeltext, Würfelstart stehen unter „Für Fortgeschrittene“.

**E11 Jede Ansicht sagt, wo man ist.** Ein gemeinsamer Kopf `ViewIntro` (Titel, ein Satz „was ist
das hier“, der eine nächste Schritt, optional „Wie geht das?“ mit drei kurzen Schritten) steht über
Bibliothek, jedem Werkbank-Bereich, Figurvorlagen, Figur anlegen, Figurantrag und „Ich“. Die
Sätze sind auf das Beispiel bezogen („Ein Attribut ist eine Zahl auf dem Bogen, zum Beispiel
Stärke 12.“), nicht abstrakt.

**E12 Leere Ansichten lehren.** Jede leere Liste im Umfang zeigt, was hineingehört, und bietet
„Mit Beispiel beginnen“, das einen fertigen, gültigen Beispieleintrag anlegt (Attribut „Stärke“,
Balken „Leben“, Aktion „Probe auf Stärke“, Fähigkeit „Kraftschlag“, Zustand „Erschöpft“, Liste
„Ausrüstung“, Figurvorlage aus dem aktiven Regelwerk). Der Eintrag ist danach normal bearbeitbar
und per Rückgängig entfernbar.

**E13 Begriffe erklären sich selbst.** Ein Begriffsverzeichnis `begriffe.ts` (eine Quelle, etwa
15 Kernbegriffe: Regelwerk, Version, Installieren, Aktivieren, Attribut, Berechneter Wert, Balken,
Aktion/Probe, Fähigkeit, Zustand, Liste, Bogen, Figurvorlage, Figur, Antrag) mit je einem Satz und
einem Beispiel. Die Komponente `Begriff` zeigt das Wort mit einem kleinen „?“, das die Erklärung
aufklappt (Knopf mit `aria-expanded`, kein Hover-Zwang). Überall, wo der Begriff zum ersten Mal in
einer Ansicht vorkommt, steht er als `Begriff`.

**E14 Erste Schritte der Runde.** Die Übersicht der Schmiede zeigt für die Spielleitung eine
Checkliste „So startet deine Runde“: Regelwerk (✓, sobald eins aktiv ist — mit Chronicles Lite
von Anfang an), Figurvorlage anlegen, Mitspieler einladen, Figuren anlegen oder Anträge
freigeben. Jeder Punkt hakt sich aus dem echten Stand ab und führt mit einem Knopf direkt hin.
Sind alle erledigt, schrumpft die Liste auf eine Zeile.

**E15 Figur erstellen ist ein geführter Weg.** Figur anlegen (Spielleitung) und Figurantrag
(Spieler) zeigen denselben Weg in drei Schritten — *Wer ist die Figur?* (Name, Bild, Beruf),
*Was kann sie?* (Werte als Wertkacheln mit „Punkte übrig“, wo das Regelwerk ein Budget hat;
Fähigkeiten), *Fertig* (Zusammenfassung, Absenden) — mit dem Bogen als Live-Vorschau daneben.
Werte sind mit den Vorgaben des Regelwerks vorbelegt; „Zurück auf die Vorgaben“ setzt sie zurück.

## Prüfnetz

- **Neulingsgang** `e2e/neulingsgang.spec.ts`: die drei Aufgaben des Hauptziels als Durchlauf auf
  einer frisch angelegten Runde (Chronicles Lite aktiv), nur über sichtbare Beschriftungen und
  Rollen, ohne Testkennungen und ohne URL-Sprünge nach dem Einstieg. Prüft unterwegs, dass jede
  Ansicht genau einen hervorgehobenen Knopf hat und der „Was ist das hier“-Satz sichtbar ist.
- **Dauerhafter Test** `e2e/zugaenglichkeit.spec.ts`: eine Runde mit Lite und ChronicleHeroes,
  Bildschirme Bibliothek, Assistent (alle Schritte), Werkbank (Paket, Attribute, Aktionen,
  Übernehmen), Figurvorlagen, Figurantrag, „Ich“, Tisch-Bogen; je Fantasy und Parchment, 1440 und
  390. Fällt bei axe-Befunden „serious“/„critical“ und bei `region`, `heading-order`,
  `aria-prohibited-attr`, `label`, `button-name`; misst Text < 12 px und Tippziele < 24 px in den
  Hauptbereichen, Überlauf bei 390 px, Fokus nach Ansichtswechsel. Ziel: grün, ohne
  Ausnahmeliste.
- **Bildwerkzeug** `e2e/ux-audit.spec.ts` bleibt als Werkzeug (nur mit `UX_AUDIT=1`), damit jede
  spätere Runde vorher/nachher-Bilder erzeugen kann.
- Harness- und Modelltests der betroffenen Bauteile ziehen mit; `gate:sprache` grün
  (neue englische Einträge in eigenen Katalogdateien), Klartext-Wächter deckt neue Dateien ab.
- Nachweis: vorher/nachher-Bilder der Hauptbildschirme beider Looks, angesehen, nicht nur erzeugt.

## Wellen

| Welle | Inhalt | Dateien (Besitz) |
| --- | --- | --- |
| 1 Fundament | E1, E2, `ViewIntro`, `Begriff` + `begriffe.ts` (E11, E13), globale Kästchen-Regel, Fokus-Hilfe, Prüfnetz-Gerüst | `packages/ui/*`, `client/src/styles.css`, `App.tsx`, `i18n.ts`, `features/Begriff.tsx`, `features/begriffe.ts` |
| 2 Bogen | E3, Filter „Wer ist die Figur / Was kann sie“ für E15 | `RuleFields`, `HostRuleFields`, `RulePresentationView`, `CharacterSheet`, `CharacterProgress`, `CharacterPortrait`, `FaehigkeitenBogen`, `Vitalanzeige`, `character-sheet.css`, `vitalanzeige.css`, `rule-categories.css` |
| 3 Regelschmiede | E4–E7, E10, E11–E13 in der Schmiede | `RuleForge*`, `RuleWizard`, `Rule*Editor`, `Formula*`, `RuleMap`, `RuleEntry*`, `rule-forge*.css`, `rule-wizard.css`, `rule-map.css`, `formula-field.css` |
| 4 Figuren | E7–E9, E11–E15 um die Figur | `ForgeWorkbench` (Übersicht), `ActorTemplatesHost`, `InstantiateActorHost`, `ActorWorkbench`, `ActorInventoryWorkbench`, `ChronicleHeroesTemplate`, `FigurAntrag` (auch Anträge der Spielleitung), `MeineFigur`, `actors.css`, `character-creation.css` |
| 5 Nachweis | Neulingsgang und Prüfnetz grün, Bilder, Sprachgate-Waisen, Merge | — |

Welle 1 zuerst; 2–4 danach parallel mit getrenntem Dateibesitz. Englische Katalogeinträge je Welle
in eigener Datei (`i18n/en/zugang-*.json`); verwaiste Schlüssel alter Kataloge räumt Welle 5 an einer
Stelle ab, damit sich parallele Arbeit nicht in denselben Katalogen trifft.

## Nicht in diesem Schritt

Die 55 übrigen Browser-Rückfragen außerhalb des Umfangs; Neuordnung der 14 Werkbank-Reiter
(Stufe 8, Bogen per Ziehen); Formelgraph per Tastatur umordnen (bekommt eine Tastatur-Alternative
„Anschluss wählen“ erst mit Stufe 3/4); Kampftisch-Oberfläche.

## Umsetzung (2026-09-26)

Welle 1 selbst, Wellen 2–4 als drei Helfer mit getrenntem Dateibesitz, Welle 5 selbst. Nachweis:
`e2e/neulingsgang.spec.ts` 3/3 (die drei Aufgaben des Hauptziels, nur über sichtbare Beschriftungen),
`e2e/zugaenglichkeit.spec.ts` 6/6 (Fantasy und Parchment, 1440 und 390), 986 Client-Tests, Gates grün.
Der Lite-Bogen ist 6 065 statt 13 200 Pixel hoch.

Der Neulingsgang hat vier Fehler gefunden, die keine Prüfung vorher sah — alle behoben:

1. Nach „Figurvorlage speichern“ sprang das Formular auf eine leere neue Vorlage; wer weitertippte,
   legte Doppel an. Jetzt bleibt die gespeicherte Vorlage offen, „Figur aus dieser Vorlage anlegen“
   ist der eine nächste Schritt.
2. Nach „Figur anlegen“ begann der Weg sofort von vorn. Jetzt steht das Ergebnis mit „Zur Figur am
   Tisch“, das den Bogen genau dieser Figur öffnet (die Navigation reicht die Figur durch).
3. „Weiter“ und „Figur anlegen“ teilten sich ohne Schlüssel ein Element; der Klick auf „Weiter“
   machte es noch im Klick zum Absende-Knopf, ein Doppelklick legte die Figur ohne „Fertig“ an.
4. `useHostRules` hing am Objekt der Werte statt an ihrem Inhalt: 27 Regelprüfungen in zehn
   Ruhesekunden am Tisch, bis der Server die Spielleitung mit „Zu viele Anfragen“ bremste. Der
   Wächter `e2e/ruhezustand.spec.ts` hält jede Ansicht im Ruhezustand unter vier Anfragen je zehn
   Sekunden. Zusätzlich teilt `useResource` gleichzeitige Abfragen derselben Adresse innerhalb eines
   Schreibstands (jede Änderung und jede Live-Meldung zählt ihn hoch).

Außerdem: Spieler ohne Figur bekommen auf „Heute“ „Figur beantragen“ als ersten Schritt, die
Spielleitung die Checkliste „So startet deine Runde“ auch dort; die Punkte-Übersicht steht wieder
auf dem Bogen; ohne Porträt steht ein kleiner Platzhalter statt eines halben Bildschirms.

**Bekannt und nicht von diesem Umbau:** `e2e/actors.spec.ts` scheitert am Export (400) auch auf
dem Stand vor dem Umbau (gegengeprüft in einer eigenen Arbeitskopie) und reißt bei Robotertempo
die Grenze von 240 Anfragen je Minute (gleiche Anfragezahl wie vorher, 195 zu 196, nur schneller);
`e2e/campaign.spec.ts` braucht `.local/config.json` (lokales Postgres).

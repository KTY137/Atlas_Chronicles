# Regelkern universell — Review der Codex-Lieferung und Ergänzungen (2026-09-15)

Auftrag: Kayas Architekturskizze (Host besitzt das Regelwerk, GUI rendert das Manifest,
Fähigkeitsprofil statt Systemname, DSA5-artiger Prototyp, Migrationsgrenzen, Primitive) plus drei
Fehler: Abbruch der Charaktererstellung sperrt Felder, Regelkarte rauszoomen, Regelwerk-Erstellung
undurchsichtig. Kaya: „codex hat schon viel davon implemented, das musst du reviewen“.
Spec: `docs/superpowers/specs/2026-09-15-regelkern-universell-design.md`. Doku: `docs/REGELKERN.md`.

## Review 8c8495b..f29d7a9 (drei unabhängige Prüfungen)

| Fund | Datei | Behebung |
| --- | --- | --- |
| `lore_check` würfelte zweimal gegen `cleverness` | `templates/universal-reference.ts` | drittes Attribut `charisma` |
| Fähigkeitsfeld und Sammlungsspeicher durften dasselbe Textfeld sein | `package-v2.ts` | Parser lehnt ab; Test in `presentation-v3.test.ts` |
| „Der Host prüft …“ in der Oberfläche | `HostRuleFields.tsx` | „Das Regelwerk prüft …“ |
| „Lade die Vorlage erneut …“ an jedem Fehler | `ActorTemplatesHost.tsx` | nur bei 409 |
| „Character Sheet“, „Label“, „Referenz“ in der Oberfläche | `RuleForge.tsx`, `RulePresentationEditor.tsx` | Charakterbogen, Beschriftung, Verweist auf; beide Dateien im Jargon-Wächter |
| Attribut umbenennen zerriss den Präsentationsbaum (`unknown field reference`) | `rule-forge-model.ts` | `presentationAuto` (gespiegelter Baum wird beim Kompilieren neu erzeugt) + `renameFieldReferences` für Baum, Listen, Balken, Fähigkeitsfelder |
| Typprüfung rot (3 Fehler), Sprachgate rot (77 fehlend, 19 verwaist), HTBAH-Tests auf 1.2.0 | main | behoben; Katalog `regelkern.json`, Tests auf 1.3.0 |
| Server (Rollen, Pins, Hash, Transaktionen, Fehlertexte) | — | keine Befunde |

## Ergänzungen

- `packages/rules/src/capabilities.ts`: `describeRuleCapabilities(pkg)` — Zahlen und Merkmale
  aus dem Paket abgelesen; im `RuleRuntime` als `capabilities` (Vertrag bleibt 2).
- 3W20-Referenz 1.2.0: Qualitätsstufen 1–6 als geordnete Ergebnisbereiche über die übrigen
  Talentpunkte; Migrationswege von 1.0.0 und 1.1.0.
- `RuleForgePath.tsx`: Wegweiser (Grundlage → Bogen und Regeln → Ausprobieren → Installieren →
  Aktivieren) mit Zustand und Sprung; Karte „Was dieses Regelwerk kann“ im Reiter Paket;
  Startvorlagen offen, solange kein Entwurf bearbeitet wird; die drei Verben der Übernahme erklärt.
- `RuleMap.tsx`: Zoom (−/+/Einpassen/volle Größe, Strg + Mausrad um den Zeiger, gemerkt).
- Verwerfen (Vorlage) und Abbrechen (Spielerantrag) liegen außerhalb des gesperrten Bereichs.

## Abbruch der Charaktererstellung

Sieben Wege in `e2e/actor-template-abort.spec.ts` (Demo-Paket) und
`e2e/actor-template-abort-chronicle.spec.ts` (ChronicleHeroes, Spielleitung und Spielerantrag):
Verwerfen, „Neue Figurvorlage“, abgebrochener Dialog, Wechsel zu „Figur erschaffen“ und zurück,
Bereichswechsel, Revision öffnen und zurück, Antrag abbrechen und neu beginnen. Alle ließen die
Felder bedienbar — der gemeldete Fehler wurde damit nicht reproduziert. Die Regressionen bleiben.

## Prüfstand

- Regeln: `universal-reference`, `capabilities`, `presentation-v3`, `how-to-be-a-hero`,
  `package-v2` grün (u. a. 51/51, 30/30, 10/10 in den gezielten Läufen).
- Client: `rule-map` (7), `rule-forge-path` (4), `rule-forge-model` (54), `rule-forge-klartext`
  (25, jetzt mit `RuleForgePath`, `RulePresentationEditor`, `RulePresentationView`,
  `HostRuleFields`) grün.
- Server: `figurantrag` (14), `figurantrag-pinned`, `pinned-template-rules-http` grün.
- Browser (echter Server, PGlite, frischer Build): `actor-template-abort` 5/5,
  `actor-template-abort-chronicle` 2/2, `rule-forge-path` 1/1, `rule-forge-map` 1/1 (mit Zoom).
- Typprüfung, `gate:sprache` (5056 Schlüssel, 0 Verstöße), `gate:version`, `gate:boundaries` grün.
- Nicht gelaufen: die volle Vitest-Suite und `gate:assets` (unverändert).

## Integration mit Codex' Nachschub (5a79e7b)

Während dieser Arbeit lieferte Codex Chronicles Lite und das vollständige 5e-SRD-Paket. Umbasierung
ohne Konflikte; danach: verwaister Katalogeintrag aus `universal-rules.json` entfernt,
`fifth-edition-srd.test.ts` gelesen die Würfelspur falsch (`rolls` ist eine Kette je Würfel; auf
dem unberührten Serverstand ebenfalls rot), Wegweiser-Text und `docs/REGELKERN.md` nennen die neuen
Vorlagen. Typprüfung, Sprachgate (5062 Schlüssel) und die gezielten Regeltests danach grün.

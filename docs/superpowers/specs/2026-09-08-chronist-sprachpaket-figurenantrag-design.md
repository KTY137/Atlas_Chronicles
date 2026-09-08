# Chronist fertigstellen, englisches Sprachpaket, Figurenantrag

Stand 2026-09-08, von Kaya freigegeben. Drei Teilprojekte in der Branch
`experimental/featureliste-20260907`. Grundlage sind fünf lesende Audits vom selben Tag;
ihre Zahlen stehen hier, nicht ihre Vermutungen.

Kayas Entscheidungen: Claude übernimmt das Codex-WIP zum Chronist; Anbieter lokal (Ollama)
und API (Anthropic) wählbar; Sprachpaket nur Oberfläche, Deutsch bleibt Standard; Spieler
legen Figuren selbst an, die Spielleitung bestätigt.

## A. Chronist fertigstellen

**Ausgangslage.** Der Snapshot des Codex-WIP enthält Migration 027, Native V16, die
Server-Domain `packages/server/src/domain/chronist/*`, 13 Routen in
`packages/server/src/http/chronist.ts`, fünf Anbieterprofile in
`packages/chronist/src/provider-profile.ts`, die Client-Werkbank
`packages/client/src/features/Chronist*.tsx` und die Desktop-Allowlist in
`packages/desktop/src/policy.ts`. 50 Chronist-Fälle sind grün.

**A1 Rot auf Grün.**
- `packages/server/test/chronist-provider-registry.test.ts:50`: `availabilityCode` im
  gefälschten Activation-Objekt typisieren (TS2769).
- `packages/server/test/chronist-document-proposal.test.ts:117`: Chronisttabellen vor der
  V15-Bundle-Konstruktion abtrennen.
- `packages/server/test/chronist-cli-provider.test.ts:221`: ein suspendiertes Kind muss
  den Supervisor-Kill nicht überleben; Fix in `chronist-providers/cli-windows-job.ts`,
  nicht im Test.
- `packages/server/test/chronist-http-provider.test.ts` von `node:test` auf Vitest
  umstellen; erst dann darf STATUS eine Zahl nennen.
- Neuer Test `packages/io/test/native-v16-roundtrip.test.ts`: Export, Import,
  Schema-Deckung, Delegation an V15 bei leeren Tabellen.

**A2 Egress-Freigabe wird serverseitig.** `POST …/runs/preview` gibt bei
`location:"fremd"` `freigabe:{token,ablaufAt}` zurück: HMAC mit dem Cookie-Geheimnis über
`(campaignId,userId,scopeHash,providerFingerprint,model,ablaufAt)`, TTL 5 Minuten, einmalig
verbraucht. `StartChronistRun.externalConsent` und `ResumeChronistRun.externalConsent`
werden zu `{scopeHash,token}`. `consent()` in `domain/chronist/service.ts` prüft HMAC,
Ablauf, Einmaligkeit; bei `lokal` bleibt ein Token verboten. Neue Datei
`domain/chronist/freigabe.ts`, Test `chronist-freigabe.test.ts` mit den acht Fällen aus dem
Audit (fehlend, fremde Kampagne, abgelaufen, doppelt, lokal mit Token, Schätzung mit und
ohne Preise, Export ohne Token-Geheimnis). Der Freigabebeleg im Native-Export enthält nie
das Token.

**A3 Kostenschätzung.** `ChronistPreviewResult.estimate.costMicros` wird obere Schranke
aus `maxCalls`, `maxInputCharsPerCall/4`, Preisen je Million; `costKind:"estimated"`,
ohne Preise `null` und `"unknown"`. Die Oberfläche zeigt Passagenzahl, Zeichen, Titel,
Spanne und die Annahme Tokens je Zeichen.

**A4 Schlüsselablage im Desktop.** `chronist-key.dpapi` je Profil über die vorhandene
`SecretBox` in `packages/desktop/src/profiles.ts`; Eingabe und Löschen im
Verwaltungsfenster; `controller.ts` entschlüsselt und `hostEnvironment()` injiziert
`CHRONICLE_CHRONIST_KEY_ANTHROPIC` nur in den privaten Worker. Der Schlüssel erscheint
nie in Deskriptor, Fingerprint, Fehlertext, Export oder Renderer. Anbieterwechsel
verlangt weiterhin einen Hostneustart; das wird dokumentiert, nicht versteckt.

**A5 Anbieterprofile.** Neues Profil `anthropic-messages-2` mit
`thinking:{type:"disabled"}`; das bestehende Profil bleibt byteweise unverändert. Standard
`claude-sonnet-5`, Sparmodus `claude-haiku-4-5`, ohne Datumssuffix. Ollama ohne hartes
Default; Discovery über `/api/tags`. Rohes `fetch` bleibt, kein SDK, damit der Wire-Text
reproduzierbar gehasht wird. `docs/CHRONIST.md` bekommt den Anthropic-Block mit Preisen.

**A6 Ehrlichkeit.** STATUS.md verliert die Aussage „42 Streamprüfungen grün", bis A1 sie
belegt. Codex- und Gemini-CLI bleiben `capability-unverified`. `e2e/chronist.spec.ts`
wird ausgeführt und das Ergebnis eingetragen.

## B. Englisches Sprachpaket, nur Oberfläche

**Mechanik: Nachricht als Schlüssel.** Der deutsche Quelltext bleibt im Code.
`packages/client/src/i18n.ts` exportiert `t(text, params?)`, `plural(n, eins, viele)`
und den Sprachzustand; `t` sucht in `packages/client/src/i18n/en.json`, fehlende Einträge
liefern den deutschen Text. Englisch wird per `import()` nachgeladen. Interpolation über
`{name}`-Platzhalter; die 79 Template-Literale und 152 gemischten JSX-Stellen werden
darauf umgestellt.

**Sprachwahl.** Feld `language:"de"|"en"` in `AccessibilityPreferencesV1`
(`packages/theme/src/preferences.ts`, `schemaVersion` 2 mit expliziter Migration),
Auswahl in `AppearanceSettings.tsx` unter „Deine Darstellung", Speicher `localStorage`
wie bisher. Erstwert aus `navigator.language`, `?lang=en` als Override für Tests.
`document.documentElement.lang` setzt `AppearanceProvider`. Die 24 hart auf `de-DE`
gesetzten Datums- und Zahlformate nutzen die gewählte Sprache; `toLocaleLowerCase("de")`
und `localeCompare(…,"de")` in Filtern bleiben, das ist Datenlogik.

**Serverfehler.** Bleiben deutsch. `errorText` in `packages/client/src/api.ts` läuft durch
`t`; die 15 statischen Server-Fehlersätze und die statischen Validierungstexte aus
`szene`, `forge`, `io` stehen im Katalog. Dynamische Texte fallen auf Deutsch zurück. Kein
Serverumbau.

**Grenze.** Nicht übersetzt werden Datenschlüssel (`art`, `BAUWERK_TYPEN`,
`KARTEN_SETTINGS`, `ASSET_GENRES`, Gefüge-Kanten, Wikitext-Kanon), gespeicherte
Generatortitel (`RAUM_LABEL`, `ZEIT_RAUM_LABEL`, `UNVERORTET_TITEL`), das HTBAH-Paket,
Assetnamen, Exportformate, der Systemprompt in `provider-profile.ts` und die
Welt-Publikation (`public-projection.ts`, eigene `world.locale`-Achse). Anzeigetabellen
wie `BAUWERK_LABEL` bleiben in `szene`; der Client übersetzt an der Anzeigestelle mit
`t(BAUWERK_LABEL[typ])`, filtert aber weiterhin über den deutschen Wert.

**Gate.** `tools/gate-sprache.mjs` nach dem Muster von `gate-boundaries.mjs`, Extraktion
per TypeScript-AST: jedes `t("…")`-Literal hat einen Katalogeintrag, keine verwaisten
Einträge, kein nicht-literales `t()`-Argument, Deny-Liste der Datenpakete, kein neues
hartes `"de-DE"` außerhalb einer Allowlist. Eingehängt zwischen `gate:boundaries` und
`gate:assets`. Selbsttest `tools/test/gate-sprache.test.mjs`.

**Tests.** Ohne gesetzte Sprache liefern `t` und der Katalog den identischen deutschen
Text; die 25 Client-Suiten und 891 Browser-Locatoren bleiben unverändert. Sieben
Harness-Dateien bekommen `if (name === "../i18n") return { t: s => s, plural… }`. Neu:
je Übersetzungspaket ein Vitest-Fall, der Englisch setzt und eine Stichprobe prüft, und
ein Browserablauf `e2e/sprache.spec.ts` mit Umschalten in „Deine Darstellung".

**Pakete.** Infrastruktur seriell zuerst, dann acht disjunkte Pakete P1 bis P8 laut Audit
(RuleForge, Figuren, Tisch und Woche, Atlas, Kartenstudio, Wiki und Import, Chronist und
Kanal, Rahmen und Konto samt Server-Fehlersätzen), zusammen 2.460 Strings.

## C. Figurenantrag

**Modell.** Antrag als eigenes Objekt; eine Figur entsteht erst bei Bestätigung über
`instantiateActor` mit `created_by` gleich Antragsteller und automatischem Kontrollgrant.
Es gibt keine unbestätigte Figur, deshalb bleibt `authorizeActor` mit seinen acht
Aufrufern unverändert. Vorlagen erhalten eine Freigabe für Spieler.

**Migration 028** `028_figurantrag.sql`: `figurvorlagen_freigaben`, `figurantraege`
(Status `offen|bestaetigt|abgelehnt|zurueckgezogen`, `version`, `actor_id`),
`figurantrag_events` mit `command_id UNIQUE` und `deny_history_mutation`-Trigger nach dem
Muster von `026_map_lifecycle.sql`. Keine Änderung an eingefrorenen Tabellen.

**Native V17** `packages/io/src/native-v17/*`, Modul `figurantrag`, additiv über V16,
Delegation an V16 solange alle drei Tabellen leer sind. `docs/CAMPAIGN_FORMAT_V17.md`.
`restoreOrder` und `LOESCHREIHENFOLGE` in `bundles.ts` und `deletion.ts` ergänzt.

**Routen** in `packages/server/src/http/actors.ts`: Freigabe setzen und entziehen
(Spielleitung, `expectedVersion`); `GET /actor-templates/freigegeben` liefert Spielern
projizierte Karten ohne Beutetabellen und ohne unbekannte `loreEntryId`, gefiltert gegen
den aktiven Paket-Pin; `POST /figurantraege`, Zurücknehmen, Liste (Spieler eigene,
Spielleitung offene), Bestätigen und Ablehnen mit Grund. Paketbindung wird bei Antrag und
autoritativ bei Bestätigung geprüft.

**Client.** `MeineFigur.tsx`: leere Fläche bekommt „Figur anlegen", neue
`FigurAntrag.tsx` mit Vorlagenwahl, Name, Anfangswerten, Status „wartet auf die
Spielleitung". `ActorWorkbench.tsx`: Freigabeschalter an Vorlagen, Reiter „Anträge" mit
Bestätigungsliste.

**Tests rot auf grün.** Nicht freigegebene Vorlage 410; fremdes Paket Konflikt bei Antrag
und Bestätigung; doppelte Bestätigung Konflikt; genau ein Grant; Ablehnung erzeugt keine
`actors`-Zeile; Freigabeentzug zwischen Antrag und Bestätigung; Export enthält die drei
Tabellen, Restore stellt sie her; `deletion.test.ts` Schema-Deckung; `e2e/meine-figur.spec.ts`
und `e2e/actors.spec.ts` erweitert.

## Reihenfolge und Flächen

Welle 1, fünf Agenten mit disjunkten Flächen: A1 (Tests, CLI-Job), A2 und A3 (Freigabe,
Schätzung, Protokoll, Client-Werkbank), A4 (Desktop), B-Infrastruktur (`i18n.ts`,
Präferenzen, Harness-Stubs, Gate), C-Daten (028, V17, Domain). Welle 2: acht
Übersetzungspakete, C-Routen und Client, A5 und A6 mit Dokumentation. Abschluss: `npm run
gate`, betroffene Browserabläufe, neues Desktop-Paket, STATUS und FEATURELISTE.

Nicht Teil dieses Entwurfs: Anbieterwechsel ohne Hostneustart, Codex- und Gemini-CLI,
Übersetzung mitgelieferter Inhalte, Figurenerstellung ohne Bestätigung.

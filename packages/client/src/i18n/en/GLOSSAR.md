# Glossar Deutsch → Englisch für das Oberflächen-Sprachpaket

Verbindlich für alle Übersetzungspakete P1 bis P8, damit ein Begriff in jeder Ansicht
gleich heißt. Produktname bleibt „Atlas Chronicles". Anrede: „you", nie „thou"; Ton:
klar, knapp, freundlich, wie die deutsche Vorlage.

| Deutsch | Englisch | Hinweis |
| --- | --- | --- |
| Spielleitung | Game Master (GM) | Erstnennung ausgeschrieben, danach „GM" erlaubt |
| Spieler, Spielerin | player | |
| Mitglied | member | |
| Beobachter | observer | |
| Runde | party | die Gruppe am Tisch |
| Kampagne | campaign | |
| Welt | world | Desktop: eine Datenbank je Welt |
| Chronik | chronicle | Bereich und Produktkern |
| Chronist | Chronicler | Eigenname des Agenten |
| Kanon | canon | |
| Antrag (Chronist) | proposal | |
| Antrag (Figur) | application | Figurenantrag = character application |
| Prägung, prägen | mint, to mint | bestätigter Wurf wird geprägt |
| Wurf | roll | |
| Tisch | table | Bereich für den Spielabend |
| Szene | scene | |
| Szenenkarte | scene map | |
| Woche, Wochenansicht | week, week view | |
| Brief | letter | |
| Kanal | channel | Textchat |
| Heute | Today | Bereich |
| Ich | Me | Bereich der eigenen Figur |
| Atlas | atlas | |
| Karte | map | |
| Unterkarte | sub-map | |
| Kartenstudio | Map Studio | |
| Kartenbibliothek | map library | |
| Siedlung | settlement | |
| Innenraum | interior | |
| Raum | room | |
| Gebäude | building | |
| Gelände | terrain | |
| Straße | road | |
| Tür | door | |
| Stempel | stamp | platziertes Asset |
| Einrasten | snap | |
| Rückgängig, Wiederholen | undo, redo | |
| Entwurf | draft | |
| Entwurf zurücksetzen | discard draft | |
| speichern | save | |
| verwerfen | discard | |
| Kartenrevision | map revision | |
| Wissensblick | knowledge view | |
| Figur | character | |
| handelnde Figur | active character | |
| Figurvorlage | character template | |
| Bogen, Charakterbogen | sheet, character sheet | |
| Inventar | inventory | |
| Gegenstand | item | |
| Beute | loot | |
| Vorrat der Spielleitung | GM stash | |
| Kontrolle erlauben | grant control | |
| Regelpaket | rule package | |
| Schmiede | Forge | Bereich mit Werkbänken |
| Werkbank | workbench | |
| Regelbau | rule builder | |
| Formel | formula | |
| Artikel | article | Wiki |
| Passage | passage | |
| Quelle, Beleg | source, evidence | |
| Veröffentlichung | publication | |
| Freigabe (Egress, Chronist) | consent | ausdrückliche Zustimmung je Lauf |
| Freigabe (Vorlage für Spieler) | release | Vorlage für Spieler freigeben = release to players |
| Anbieter | provider | |
| lokal / fremd | local / external | Chronist-Anbieterort |
| Lauf | run | |
| Kosten | cost | |
| Darstellung | appearance | „Deine Darstellung" = Your appearance |
| Sprache | language | |
| Zugang verwalten | manage access | |
| Passkey | passkey | |
| Einrichtung | setup | |
| Beitritt | join | |
| Ungespeicherte Änderungen verwerfen? | Discard unsaved changes? | |
| Erneut laden | Reload | |
| Wird geladen … | Loading … | Auslassungszeichen bleibt |

## Feste Regeln über die Tabelle hinaus

- **Eingabezeichen bleiben in jeder Sprache gleich.** `@` steht für ein Attribut, `?` für
  einen Parameter; beide stehen in gespeicherten Formeln. Ein sprachabhängiges Zeichen
  würde eine deutsche Formel im englischen Kontext unlesbar machen. Übersetzt wird nur der
  Satz drumherum: „Tippe @ für Attribute, ? für Parameter" → „Type @ for attributes,
  ? for parameters".
- **Würfelnotation bleibt `W`**, nicht `d`: sie gehört zum Regelpaket, nicht zur Oberfläche.
- **Keine zusammengesetzten Fragmente.** Typwörter wie „Zahl", „Ja/Nein", „Text" werden nicht
  mit umgebendem Text verkettet; jede Stelle bekommt einen vollständigen Satz mit Platzhalter,
  weil sich englische Sätze anders fügen.
- **Der deutsche Satz bleibt der Schlüssel.** Es gibt keine Kunstschlüssel wie
  `forge.formula.error.unknownField`. Nur so sehen der Jargon-Wächter
  (`packages/client/test/rule-forge-klartext.test.ts`), die Browserabläufe und die Prüfstände
  weiterhin die echten deutschen Sätze.

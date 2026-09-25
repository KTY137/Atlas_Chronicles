# Moderne Stadt und Kolonie (Kartenstudio Teil 2 von 3) — Nachweise 2026-09-23/25

Spec `docs/superpowers/specs/2026-09-23-stadt-zukunft-design.md`, Plan
`docs/superpowers/plans/2026-09-23-stadt-zukunft.md`, Zweig `feature/stadt-zukunft`.

## Was jetzt anders ist

Gegenwart und Sci-Fi laufen durch dieselbe Viertelpipeline wie Fantasy, jede mit ihrem Stil
(`packages/forge/src/stadt/stil.ts`): Fantasy `viertel/stil.ts` (v11, Byte für Byte wie Teil 1,
Goldtest), Gegenwart `modern/` und Sci-Fi `kolonie/` (beide Version 12, auch mit Zonen- oder
Straßenplan). Der alte Rasterbaustein (v8/v9/v10) ist entfernt.

- **Gegenwart**: größere Stadtteile, Stadtring als Hauptstraße um den Kern, je Stadtteil ein nach
  seiner Hauptstraße gedrehtes Straßenraster. Blöcke nach Rolle: Hochhäuser und Rathausplatz in
  der Innenstadt, Blockrand mit grünem Hof, Einfamilienhäuser mit Garten, Zeilenbauten, Villen,
  Hallen an den Straßenseiten, Krankenhaus und Schule, Ämter um einen Platz, Parks mit Wegen.
- **Sci-Fi**: Nabe, Ringe und Speichen als echte Zerlegung der Karte (`kolonie/sektoren.ts`, Kreise
  ohne Winkelfunktion über `stadt/kreis.ts`). Kommandozentrale und Reaktor auf dem Deck, Kuppel-
  reihen an den Straßen mit Hydrokulturgarten, Wohntürme, Container, Fertigungshallen, Raumhafen
  mit Landefeldern (braucht kein Wasser), Schutzzaun ohne Türme.
- **Kartografie**: optionales `dach` je Gebäude (`giebel|flach|halle|kuppel|plattform`).
- **Optik `cartography-13`**: Dächer nach Form, gestrichelte Mittellinie auf heutigen
  Hauptstraßen, leuchtende Straßenränder in der Kolonie, Platten- und Deckplatten, Solar- und
  Hydrokulturfelder, leuchtender Zaun, Ortssymbol je Setting (keine Kirche außerhalb Fantasy).
- **Oberfläche**: Zonenplaner spricht die Sprache des Settings, Schutzzaun-Schalter für die
  Kolonie, keine Befestigung in der Gegenwart.

## Gemessen

| | vorher (v8) | nachher (v12) |
| --- | --- | --- |
| Gegenwart Stadt 56×44 Fluss | 224 Gebäude, ein starres Quadratraster | 204 Gebäude, ~12 Stadtteile, ≥ 2 Rasterrichtungen |
| Sci-Fi Stadt 56×44 Küste | 224 Gebäude, Zickzackraster | 154 Gebäude, Nabe + 3 Ringe + 8 Speichen, 3 Landefelder |
| Großstadt 88×64, 480 verlangt | – | ≥ 240 Gebäude, < 3 s, ≤ 4096 Flächen, < 1 MiB |

Heutige Gebäude sind größer als Fantasy-Häuser: die Gebäudezahl ist ein Höchstwert, erreicht wird
mindestens die Hälfte (Test), meist 60–90 %.

## Bilder (angesehen)

`.local/stadt-probe/png/` (Hauptcheckout-Worktree): `vorher-*` gegen `nachher-*`.

- `nachher-stadt-gegenwart-fluss.png`: Stadtteile in verschiedenen Richtungen, Blockrand mit
  Innenhöfen am Fluss, Einfamilienhäuser im Westen, Sheddach-Hallen im Osten, Mittellinien auf den
  Hauptstraßen, Dachaufbauten auf Flachdächern. Liest als heutige Stadt.
- `nachher-stadt-scifi-kueste.png`: Kreisrund um die Nabe, leuchtende Kuppeln, drei Landefelder
  mit Markierung und Lichtern am Ufer, Solar- und Hydrokulturfelder draußen. Liest als Kolonie.
- `nachher-dorf-*`: Dorf mit Asphaltstraßen und Häusern bzw. Kuppelring mit Hallen und Landefeld.
- `nachher-ortssymbol.png`: Fantasy Dächer + Kirche + Mauer; Gegenwart Flachdächer im Raster,
  dunkle Hochhäuser, Ring; Sci-Fi Kuppeln, große Mittelkuppel, Landefeld, Zaun.

## Noch nicht gut

- Blockrand-Lose an Ecken sind schräg geschnitten; das Flachdach zeigt dort Dreiecke.
- Industrie-Stadtteile lassen hinter den Hallen viel Hof frei (gewollt: Lagerfläche), wirken leer.
- Häuser und Innenräume variieren zu wenig in der Form (Kaya 2026-09-25) — eigener Folgeschritt,
  zusammen mit „auf Treppen klicken wechselt das Geschoss".

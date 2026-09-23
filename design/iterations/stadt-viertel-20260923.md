# Stadtgenerator mit Vierteln (Kartenstudio Teil 1 von 3) — Nachweise 2026-09-23

Spec `docs/superpowers/specs/2026-09-23-stadtgenerator-viertel-design.md`, Plan
`docs/superpowers/plans/2026-09-23-stadtgenerator-viertel.md`, Zweig `feature/stadt-viertel`.

## Was jetzt anders ist

Fantasy-Siedlungen entstehen als Version 11 aus Vierteln (`packages/forge/src/stadt/viertel/`):
Flecken auf einer Sonnenblumenspirale, Rollen je Viertel (Markt, Tempel, Burg, Hafen, Adel,
Handwerk, Arm, Park, Wohnen; ein Zonenplan gewinnt), Mauerring mit Rundtürmen und Torflanken,
Hauptstraßen per Wegsuche vom Tor zum Markt, Gassen durch fortgesetztes Halbieren, Häuserzeilen,
Rathaus auf dem Markt, Dom mit Kreuzgrundriss, Burg mit Bergfried/Kaserne/Hof/Burgweg, lockere
Vorstädte, Feldstreifen, Bauernhöfe, Viertelnamen als Beschriftung, `bericht.viertelPlan`.
Gegenwart und Sci-Fi bleiben Byte für Byte v8/v9/v10 (Goldtest `siedlung-gold.test.ts`).
Neue Gebäudetypen: burg, rathaus, muehle, bauernhof, kaserne (mit Innenräumen). Neue Zonen:
burg, tempel. Optionen `mauer`, `burg` (nur Fantasy). Kartenoptik `cartography-12`: Rundtürme
nach der Mauer, Mauer ⅕ Zelle breit, Pflaster und Marktstände, aufgeteiltes Zeichenbudget.

## Gemessen

| | vorher (v8) | nachher (v11) |
|---|---|---|
| Stadt 56×44, Vorgabe | 224 Gebäude, keine Viertel | 320 Gebäude, 12–14 benannte Viertel |
| Erzeugung Stadt | ~0,75 s | ~0,8 s (Großstadt 480: ~2,6 s) |
| Kartografie Großstadt | – | ~700 KB (Grenze 1 MiB) |
| Dachdetails dichte Stadt | 0 (Budget von Flur verbraucht) | ~5 000 Polygone |

Tests: forge 640/640 + neue viertel-*-Suiten; server Karten 139; client Karten 190; szene
Projektion 43; Browser map-studio/map-zones-assets/map-workshop 10/10; typecheck, build,
gate:sprache, gate:boundaries, gate:version grün. Vitest meldet auf diesem Rechner bei großen
Läufen „Timeout calling onTaskUpdate“ trotz aller Tests grün (auch mit einem Worker; bekannt
seit 2026-09-12).

## Bilder (angesehen)

`.local/stadt-probe/png/` im Hauptcheckout: `vorher-*.png` (v8), `final-*.png` (v11),
`crop-markt2.png` (Ausschnitt in voller Auflösung), `innenraeume.png` (neue Typen). Probe-Skripte
`render.ts`, `crop.ts` im Arbeitsordner des Zweigs.

## Offen / bewusst später

- Brücken folgen Zellkanten und knicken leicht; gerade Brücken über mehrere Kanten wären schöner.
- Marktstände nur auf Platzstücken ab 0,8 Zellen²; ein Markt, der um das Rathaus zerfällt, hat wenige.
- Teil 2 (eigene Sci-Fi-/Moderne-Stadt) und Teil 3 (Weltkarten-Baukasten) folgen mit eigener Spec.

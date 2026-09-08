<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->

# Englischer Oberflächenkatalog

Der deutsche Quelltext bleibt im Code und ist zugleich der Schlüssel dieses Katalogs.
`packages/client/src/i18n.ts` lädt **alle** Dateien dieses Ordners per `import.meta.glob`
und verschmilzt sie zu einem Katalog. Fehlt ein Eintrag, bleibt die Stelle deutsch.

## Eine Datei je Paket

Jedes Übersetzungspaket P1 bis P8 schreibt ausschließlich in seine eigene Datei
`P<n>.json`, damit die acht Pakete ohne Konflikt in dieselbe Branch mergen:

| Datei | Paket |
| --- | --- |
| `P1.json` | RuleForge |
| `P2.json` | Figuren |
| `P3.json` | Tisch und Woche |
| `P4.json` | Atlas |
| `P5.json` | Kartenstudio |
| `P6.json` | Wiki und Import |
| `P7.json` | Chronist und Kanal |
| `P8.json` | Rahmen und Konto, samt der statischen Server-Fehlersätze |

## Aufbau einer Paketdatei

```json
{
  "Speichern": "Save",
  "Hallo {name}, du hast {anzahl} offene Anträge.": "Hello {name}, you have {anzahl} open requests.",
  "__dynamisch": ["Die Verbindung konnte nicht abgeschlossen werden."]
}
```

- **Schlüssel** ist der deutsche Quelltext, Zeichen für Zeichen so wie er im Argument von
  `t("…")` steht — einschließlich Satzzeichen, typografischer Anführungszeichen und
  Auslassungspunkte. Ein Schlüssel, der im Code nicht als Literal vorkommt, gilt dem
  Sprachgate als verwaist.
- **Wert** ist die englische Fassung. Sie darf nur Platzhalter benutzen, die auch im
  Schlüssel stehen; `{name}` bleibt in beiden Fassungen gleich geschrieben.
- **`__dynamisch`** ist der einzige reservierte Schlüssel: eine Liste deutscher Texte, die
  `t` erst zur Laufzeit erreicht (die statischen Server-Fehlersätze über `errorText` in
  `packages/client/src/api.ts`). Sie sind vom Verwaistentest ausgenommen, sonst gilt für
  sie dieselbe Schreibweise. Alles andere mit `__` am Anfang ignoriert der Lader.

## Pluralformen

Pluralstellen stehen **nicht** hier, sondern in `packages/client/src/i18n/en.plural.json`,
mit dem deutschen Einzahltext als Schlüssel:

```json
{ "{n} Vorschlag": { "eins": "{n} suggestion", "viele": "{n} suggestions" } }
```

Im Code: `plural(anzahl, "{n} Vorschlag", "{n} Vorschläge")`. `{n}` ist immer gebunden.

## Was nicht in den Katalog gehört

Datenschlüssel und gespeicherte Werte werden nie übersetzt. Das Sprachgate
(`npm run gate:sprache`) liest dafür acht Datenpakete — `packages/szene/src/model.ts`,
`packages/szene/src/asset-genres.ts`, `packages/forge/src/grundriss.ts`,
`packages/forge/src/bauprogramme.ts`, `packages/rules/src/templates/how-to-be-a-hero.ts`,
`packages/io/src/wikitext.ts`, `packages/chronist/src/provider-profile.ts`,
`packages/server/src/domain/public-projection.ts` — und sperrt aus ihnen genau:

- **Array-Elemente und Schlüssel der Datenkonstanten**, erkannt am Namen: `*_TYPEN`,
  `*_SETTINGS`, `*_GENRES`, `*_ARTEN`, `*_KANTEN` (die Gefüge-Kanten), `*_NAMESPACES`;
- **`art:`-, `kind:`- und `role:`-Werte** überall in diesen Dateien.

Gesperrt ist also `"schmiede"`, `"fantasy"`, `"liegt_in_geografie"`, `"Datei"` — 80 Werte.

**Nicht** gesperrt sind die Werte der Anzeigetabellen `*_LABEL`, `*_LABELS` und `*_TITEL`.
`"Schmiede"`, `"Wohnhaus"`, `"Fantasy"` sind Anzeigetexte und gehören in den Katalog —
`App.tsx` benutzt „Schmiede" als Navigationsbeschriftung.

Für die Anzeigestelle einer solchen Tabelle gilt zusätzlich: `t(BAUWERK_LABEL[typ])` ist
erlaubt, obwohl das Argument kein Literal ist. Die Ausnahme greift für jeden Bezeichner,
der auf `_LABEL`, `_LABELS` oder `_TITEL` endet — die Tabelle bleibt in ihrem Paket, der
Client übersetzt an der Anzeigestelle und filtert weiter über den deutschen Wert. Jedes
andere nicht-literale `t(…)` bleibt ein Verstoß.

## Vollständigkeit je Datei

Das Gate prüft dateiweise: sobald eine Quelldatei **einen** übersetzten Schlüssel hat,
müssen **alle** ihre `t("…")`- und `plural`-Schlüssel im Katalog stehen. So bleibt jedes
Paket für sich prüfbar, während die anderen sieben noch offen sind.

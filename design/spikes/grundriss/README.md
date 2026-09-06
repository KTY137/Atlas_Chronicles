# Grundriss — Vorschauen

Drei erzeugte Grundrisse, damit die erste eigene Kartenerzeugung **angesehen** und nicht nur
behauptet werden kann. Die Dateien sind Diagnoseartefakte, kein Renderer und kein Lieferpfad:
`packages/render` besitzt Pixi, hier steht nur SVG.

| Datei | Keim | Optionen |
|---|---|---|
| [`kellergewoelbe.svg`](kellergewoelbe.svg) | `eron:kellergewoelbe:1` | 40×30 Zellen, 9 Räume, 2 Schleifen |
| [`turm.svg`](turm.svg) | `eron:turm:2` | dieselben |
| [`burgkeller.svg`](burgkeller.svg) | `andaria/burg-3` | dieselben |

Neu erzeugen:

```
node --import tsx packages/forge/tools/zeichne-grundriss.mts "eron:turm:2" --aus design/spikes/grundriss/turm.svg
```

## Was in den Bildern zu sehen ist

- **Boden** ist ein Stamp je Zelle aus `pk.grundriss`; das Material kommt aus dem Raumthema
  (`krypta` → rissiger Stein, `wohnraum` → Dielen, `flach` → Wasser), Gänge aus `optionen.gangboden`.
- **Wände** sind die zusammengefassten Kantenläufe zwischen Boden und Fels — Linien, keine Volumen.
- **Türen** (orange) sitzen in den Öffnungen zwischen Raum und Gang. Dort steht per Konstruktion
  keine Wand, und die beiden angrenzenden Zellen bleiben von Möbeln frei.
- **Beschriftung** ist Thema und Rolle des Raums; sie steht nur in der Vorschau, nicht im Dokument.

## Was die Bilder nicht zeigen

Der eigentliche Ertrag ist unsichtbar: jeder Raum verlässt den Generator als `Knoten` mit einer
Id, einer typisierten Elternkante, einem `Anker` im Bauwerksrahmen und einem `kindKeim`. RB-21d
§2.2 hat gemessen, dass die Erzeugung über Maßstäbe hinweg längst gelöst ist und trotzdem niemand
sie verbindet — *„the gap is not the generator, it is the address"*. Die Adresse steht im Test,
nicht im Bild: [`packages/forge/test/grundriss.test.ts`](../../../packages/forge/test/grundriss.test.ts).

Ebenfalls nicht enthalten und im `bericht.ausgelassen` jedes Laufs benannt: Sichtlinien, Nebel,
Geheimtüren, Fallen, Begegnungen, Schätze, Höhen, Hintergrundbild und Kachelpyramide.

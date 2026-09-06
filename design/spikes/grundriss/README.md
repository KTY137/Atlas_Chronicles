# Grundriss, Höhle, Verschachtelung — Vorschauen

Drei Artefakte, damit die eigene Kartenerzeugung **angesehen** und nicht nur behauptet werden kann.
Es sind Diagnosebilder, kein Renderer und kein Lieferpfad: `packages/render` besitzt Pixi, hier
steht nur SVG.

| Datei | Was sie zeigt |
|---|---|
| [`kellergewoelbe.svg`](kellergewoelbe.svg) | **Grundriss** — gebaute Räume, Gänge, Türen (`eron:kellergewoelbe:1`) |
| [`hohlgang.svg`](hohlgang.svg) | **Höhle** — Kammern mit getrasteten Umrissen statt Rechtecken, ohne Türen (`eron:hohlgang:1`) |
| [`verschachtelung.svg`](verschachtelung.svg) | **Die Kette** — drei Artefakte, jedes mit eigenem Rahmen, verbunden durch je einen Übergang (`eron:vharon:1`) |

Neu erzeugen:

```
node --import tsx packages/forge/tools/zeichne-grundriss.mts "eron:kellergewoelbe:1" --aus design/spikes/grundriss/kellergewoelbe.svg
node --import tsx packages/forge/tools/zeichne-grundriss.mts "eron:hohlgang:1" --hoehle --aus design/spikes/grundriss/hohlgang.svg
node --import tsx packages/forge/tools/zeichne-grundriss.mts "eron:vharon:1" --verschachtelt --aus design/spikes/grundriss/verschachtelung.svg
```

## Was in den Bildern zu sehen ist

- **Boden** ist ein Stamp je Zelle aus `pk.grundriss`; das Material kommt aus dem Raumthema
  (`krypta` → rissiger Stein, `wohnraum` → Dielen, `unterlauf` → Wasser, `tropfsteinhalle` → Fels).
- **Wände** sind die zusammengefassten Kantenläufe zwischen Boden und Fels — Linien, keine Volumen.
  Dieselbe Funktion zeichnet das Rechteckraster eines Kellers und den zerfransten Rand einer Höhle.
- **Türen** (orange) sitzen nur im Grundriss, in den Öffnungen zwischen Raum und Gang. Eine Höhle
  hat keine: ein UVTT-Portal ist eine Tür oder ein Fenster, und eine Engstelle ist beides nicht.
- **Gestrichelte orangene Ringe** sind die Regionen — im Grundriss Rechtecke, in der Höhle echte
  Umrisse. Das ist der Unterschied, für den die zweite Kartenart gebaut wurde.
- Im Verschachtelungsbild ist der **Raum orange umrandet**, aus dem der Übergang führt, und die
  gestrichelte Kurve trägt den Maßstab: 0,35 heißt, eine Kindzelle ist gut ein Drittel einer
  Elternzelle, und damit passt die Kindkarte tatsächlich in den Raum, der sie trägt.

## Was die Bilder nicht zeigen

Der eigentliche Ertrag ist unsichtbar. Jeder Raum verlässt den Generator als `Knoten` mit einer Id,
einer typisierten Elternkante, einem `Anker` im Rahmen seines Artefakts und einem `kindKeim`. Genau
davon lebt die Verschachtelung: die zweite Ebene wird **ausschließlich** aus dem gespeicherten
Kindkeim ihres Elternraums erzeugt. RB-21d §2.2 hat gemessen, dass die Erzeugung über Maßstäbe
hinweg längst gelöst ist und trotzdem niemand sie verbindet — *„the gap is not the generator, it is
the address"*. Die Adresse steht in den Tests, nicht im Bild:

- [`grundriss.test.ts`](../../../packages/forge/test/grundriss.test.ts) — der gebaute Ort
- [`hoehle.test.ts`](../../../packages/forge/test/hoehle.test.ts) — der gefundene Ort
- [`kette.test.ts`](../../../packages/forge/test/kette.test.ts) — Weltimport → Ort → Bauwerk → Raum
- [`verschachtelung.test.ts`](../../../packages/forge/test/verschachtelung.test.ts) — die Kette der Artefakte

Ebenfalls nicht enthalten und im `bericht.ausgelassen` jedes Laufs benannt: Sichtlinien, Nebel,
Geheimtüren, Fallen, Begegnungen, Schätze, Höhen, Hintergrundbild, Kachelpyramide — und
**Geschwisterebenen**: ein tieferes Stockwerk ist per RB-21a R6 ein Geschwister mit Höhenband und
kein Kind, und solange `Knoten` kein Höhenband trägt, stapelt hier nichts.

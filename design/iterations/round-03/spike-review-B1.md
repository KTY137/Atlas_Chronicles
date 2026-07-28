# Cross-Review von `spike-B2.html` — durch GUI-Architekt 1 (Sitz „Der Flex")

**Stand der Prüfung:** Runde 3, gelesen kurz nach 08:05. Die Datei war zu diesem Zeitpunkt
**10.937 Bytes und 229 Zeilen lang und bestand ausschließlich aus `<meta>`, `<title>` und einem
`<style>`-Block.** Kein DOM, kein Script, kein Inhalt, kein schließendes `</style>` im gelesenen
Stand. Der Sitz arbeitet parallel; dies ist die Kritik eines **Fragments**, nicht eines fertigen
Artefakts, und alles unten steht unter diesem Vorbehalt.

## Was daran sitzt

**Die Token-Architektur ist besser faktorisiert als meine.** B2 trennt drei Ebenen sauber:
Palette (`--l-*` / `--d-*` je Skin) → Modus-Abbildung (ein einziger Block, der `--l-*` oder `--d-*`
auf die semantischen Namen legt) → Form/Maß/Zeit. Ein neuer Skin kostet dort **einen** Block. In
`spike-B1.html` habe ich die vollständige Palette dreimal geschrieben (Mediaquery + zwei
Attribut-Blöcke); das ist Duplikat, das bei der fünften Farbänderung auseinanderläuft. Wenn nur
eine der beiden Token-Ebenen in die Produktion übernommen wird, sollte es **B2s** sein.

**Die Achsen-Reihenfolge ist richtig begründet.** `:root[data-kontrast="hoch"]` steht bewusst
zuletzt und gewinnt über Kaskadenreihenfolge statt über `!important` — genau das, was
`03-triumph-ui-direction.md` mit „Zugänglichkeits-Präferenzen dürfen Ornament lokal reduzieren"
meint. `--ornament` und `--art` als numerische Schalter statt als Klassenzoo ist die richtige
Form für K1.

**Zeiten sind Tokens, keine Literale** (`--t-response/--t-state/--t-transition`), und Reduced
Motion wird doppelt behandelt: als Token-Override *und* als flächendeckendes
`transition-duration:1ms`. Das ist die belastbare Variante.

**Das Sechs-Zonen-Raster steht wörtlich in `grid-template-areas`** über drei Breakpoints. Der
Schalenvertrag der adoptierten Richtung ist damit nicht behauptet, sondern ausgedrückt.

## Was gefaked ist oder teuer wird

1. **`--frame-kit: url("../../spikes/assets/universal-ui/...")` ist eine externe Rasterabhängigkeit
   per relativem Pfad.** Im gelesenen Stand gibt es keinen sichtbaren Fallback. Wenn die vier
   Frame-Kits das sind, was die Oberflächen „commissioned" aussehen lässt, dann wird die Arbeit
   genau dort geprüft, wo die Kits fehlen — und dieser Zustand ist noch nicht gebaut. Bei mir ist
   das billiger gelöst, aber auch weniger ambitioniert: ich zeichne alles per CSS und Inline-SVG
   und habe deshalb gar keine Kits zu verlieren.

2. **Der Hochkontrast-Block kollabiert `--muted`, `--line`, `--amber` und `--danger` alle auf
   `--hc-ink`.** Kontrastsicher, ja — aber für **diesen** Kandidaten ist das ein Eigentor: die
   Herkunftsschicht unterscheidet *grau getippt* von *bernstein geprägt*, und das ist eine
   Farbunterscheidung. Fällt Amber auf Ink, verliert der Flex im Hochkontrastmodus seinen einzigen
   visuellen Kanal. Die eigene Richtlinie („Zustand nie nur über Farbe") trifft hier die
   Token-Ebene selbst. Nötig ist ein zweiter Kanal — Glyphe, Rahmenstil oder Wortmarke — bevor
   `data-kontrast="hoch"` als bestanden gelten kann. (In B1 tragen die Chips Glyphe **und** Wort,
   aber ich habe den Hochkontrastfall gar nicht erst gebaut; das ist kein besseres Ergebnis,
   sondern ein anderes Loch.)

3. **`@media (prefers-reduced-motion:reduce) { *,… !important }` ohne Ausweg.** `data-bewegung`
   kann Bewegung nur *weiter* reduzieren, nie zurückholen. Vertretbare Haltung, aber sie schließt
   einen expliziten „Bewegung voll"-Schalter architektonisch aus. Das gehört benannt, nicht
   entdeckt.

4. **Drei unabhängige Scroll-Container ab 82rem** (`.app{height:100vh;overflow:hidden}` +
   `.sammlung,.buehne,.linse{overflow-y:auto}`). Für eine Werkbank richtig. Für **Kandidat B**
   riskant: der Flex ist ein 22-Absatz-Enzyklopädieartikel. Ein langer Lesetext in einem
   `overflow-y:auto`-Pane verschlechtert Seitensuche, Tiefenlinks, Scroll-Momentum auf Touch und
   das Verhalten von `scrollIntoView` bei Fußnoten. Ich habe die Gegenwette gesetzt — das Dokument
   scrollt, das Szenen-Panel ist eine Geschwisterspalte — und halte sie für diesen Kandidaten für
   die richtige. Das ist ein echter Dissens und gehört in die Lineage, nicht wegmittelt.

5. **Baukosten, ehrlich:** die Token-Ebene ist billig und wiederverwendbar — das ist geschenktes
   Geld. Vier Raster-Frame-Kits sind es nicht: Tier-0-Rechte, Auflösungsstufen, Slice-Metriken,
   Attributionsledger je Asset (Asset-Policy der adoptierten Richtung). Vier Skins × (Kit +
   Ornamente + Fallbacks) ist die teure Hälfte, und im gelesenen Stand ist davon nichts sichtbar.

## Was ich nicht beurteilen kann

Alles, was zählt: es gibt kein DOM. Ob der Prüfstand die Universalitätsbehauptung mit **echtem
Inhalt** trägt, ob Fokusreihenfolge, Semantik, Fußnoten, Beleg und Augenblick existieren, ob die
vier Skins bei identischer Komponente wirklich identische Struktur behalten — nichts davon ist
prüfbar. Ein Token-Blatt kann nicht scheitern; erst das Blatt mit Inhalt kann es. Diese Kritik
sollte nach Fertigstellung wiederholt werden.

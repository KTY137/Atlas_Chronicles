// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **Das Startdeck zu ChronicleHeroes — vierzig fertige Beutekarten.**
 *
 * Eine Lootkarte beschreibt, sie wirkt nicht: der Kartenvertrag (`ItemContractV2`) kennt
 * bewusst keinen Würfelmodifikator und keine Regelwirkung. Was eine Waffe hier an Schaden
 * nennt, ist deshalb eine **Angabe in einer freien Zeile**, die die Runde bei der
 * Schadensprobe von Hand einträgt — kein Automatismus. Genauso die Rüstung: die Zahl steht
 * auf der Karte, ins Feld `ruestung` des Bogens trägt sie ein Mensch.
 *
 * Die Bilder liegen als PNG unter `assets/loot/chronicle-heroes/` und werden aus **genau
 * dieser Liste** erzeugt (`tools/assets/erzeuge-lootkarten.mjs`); `--pruefe` hält beide
 * Seiten zusammen. `bildAssetId` fehlt hier mit Absicht: welche Bildkennung eine Karte
 * bekommt, entscheidet die Kampagne, in die das Bild geladen wird.
 *
 * Die Verteilung folgt der Seltenheit: zwölf gewöhnliche, zehn ungewöhnliche, acht seltene,
 * sechs epische, vier legendäre Karten.
 */

/** Die fünf Stufen des Kartenvertrags, hier gespiegelt, damit `packages/rules` nichts importiert. */
export type ChronicleLootRarity = "gewoehnlich" | "ungewoehnlich" | "selten" | "episch" | "legendaer";
export interface ChronicleLootCard {
  /** Stabile Kennung des Decks; sie wandert nie, auch wenn der Name sich ändert. */
  readonly id: string;
  readonly name: string;
  readonly kategorie: string;
  readonly seltenheit: ChronicleLootRarity;
  readonly spruch: string;
  readonly zeilen: readonly { readonly label: string; readonly wert: string }[];
  readonly tags: readonly string[];
  /** Dateiname des erzeugten Bildes unter `assets/loot/chronicle-heroes/`. */
  readonly bild: string;
  /** Welches Sinnbild das Bild zeichnet; mehrere Karten teilen sich eine Familie. */
  readonly sinnbild: ChronicleLootEmblem;
}
export type ChronicleLootEmblem = "klinge" | "bogen" | "panzer" | "phiole" | "buch" | "reif" | "werkzeug" | "zehrung" | "tuch" | "muenze";

const card = (
  id: string, name: string, kategorie: string, seltenheit: ChronicleLootRarity, sinnbild: ChronicleLootEmblem,
  spruch: string, zeilen: readonly { label: string; wert: string }[], tags: readonly string[],
): ChronicleLootCard => ({ id, name, kategorie, seltenheit, sinnbild, spruch, zeilen, tags, bild: `${id}.png` });

export const CHRONICLE_LOOT_DECK: readonly ChronicleLootCard[] = Object.freeze([
  // -- gewöhnlich: was in jedem Rucksack liegen darf ------------------------------------------
  card("wanderstab", "Wanderstab", "Werkzeug", "gewoehnlich", "werkzeug", "Drei Winter, kein Bruch.",
    [{ label: "Schaden", wert: "1W6" }, { label: "Nutzen", wert: "Halt auf nassem Fels" }], ["holz", "reise"]),
  card("kurzmesser", "Kurzmesser", "Waffe", "gewoehnlich", "klinge", "Für Seil, Brot und Notfall.",
    [{ label: "Schaden", wert: "1W6" }], ["eisen", "nah"]),
  card("lederkoller", "Lederkoller", "Rüstung", "gewoehnlich", "panzer", "Riecht nach Rauch und langen Wegen.",
    [{ label: "Rüstung", wert: "1" }], ["leder"]),
  card("reisebrot", "Reisebrot", "Nahrung", "gewoehnlich", "zehrung", "Hart wie ein Vorwurf, hält aber satt.",
    [{ label: "Reicht für", wert: "Zwei Tage" }], ["vorrat"]),
  card("zunderbuechse", "Zunderbüchse", "Werkzeug", "gewoehnlich", "werkzeug", "Trocken bleibt sie, wenn du es bist.",
    [{ label: "Nutzen", wert: "Feuer bei Wind" }], ["feuer"]),
  card("hanfseil", "Hanfseil", "Werkzeug", "gewoehnlich", "werkzeug", "Fünfzehn Schritt, gut geflochten.",
    [{ label: "Länge", wert: "15 Schritt" }], ["seil", "reise"]),
  card("tonkrug", "Tonkrug", "Nahrung", "gewoehnlich", "zehrung", "Wasser schmeckt nach Krug. Das ist in Ordnung.",
    [{ label: "Fasst", wert: "Zwei Tagesrationen" }], ["wasser"]),
  card("wolldecke", "Wolldecke", "Ausrüstung", "gewoehnlich", "tuch", "Kratzt. Wärmt trotzdem.",
    [{ label: "Nutzen", wert: "Nachtlager im Freien" }], ["stoff"]),
  card("rostiger_schluessel", "Rostiger Schlüssel", "Kuriosität", "gewoehnlich", "werkzeug", "Irgendwo passt er. Irgendwo.",
    [{ label: "Herkunft", wert: "Unbekannt" }], ["raetsel"]),
  card("kienspan", "Kienspan", "Werkzeug", "gewoehnlich", "werkzeug", "Licht für eine Stunde, Ruß für drei.",
    [{ label: "Brennt", wert: "Eine Stunde" }], ["licht"]),
  card("filzhut", "Filzhut", "Kleidung", "gewoehnlich", "tuch", "Gegen Sonne, gegen Regen, gegen Blicke.",
    [{ label: "Nutzen", wert: "Wetter im Gesicht" }], ["stoff"]),
  card("kupfermuenzen", "Handvoll Kupfer", "Wertsache", "gewoehnlich", "muenze", "Genug für ein Bett, nicht für zwei.",
    [{ label: "Wert", wert: "Eine Nacht im Gasthaus" }], ["geld"]),

  // -- ungewöhnlich: brauchbar, gepflegt, bezahlbar --------------------------------------------
  card("jagdbogen", "Jagdbogen", "Waffe", "ungewoehnlich", "bogen", "Der Zug ist schwer, der Schuss ist leise.",
    [{ label: "Schaden", wert: "2W6" }, { label: "Reichweite", wert: "Weit" }], ["holz", "fern"]),
  card("kettenhemd", "Kettenhemd", "Rüstung", "ungewoehnlich", "panzer", "Zweitausend Ringe, jeder von Hand.",
    [{ label: "Rüstung", wert: "3" }, { label: "Kostet", wert: "3 Initiative" }], ["eisen"]),
  card("heiltrank", "Heiltrank", "Trank", "ungewoehnlich", "phiole", "Bitter. Wirkt.",
    [{ label: "Wirkung", wert: "Lebenskraft zurück" }], ["trank", "heilung"]),
  card("fuhrmannskompass", "Kompass des Fuhrmanns", "Werkzeug", "ungewoehnlich", "werkzeug", "Zeigt nach Norden. Meistens.",
    [{ label: "Nutzen", wert: "Bonus auf Orientierung" }], ["reise"]),
  card("sturmlaterne", "Sturmlaterne", "Werkzeug", "ungewoehnlich", "werkzeug", "Der Docht kennt keinen Wind.",
    [{ label: "Brennt", wert: "Eine Nacht" }], ["licht"]),
  card("wurfmesser", "Drei Wurfmesser", "Waffe", "ungewoehnlich", "klinge", "Zwei kommen zurück. Meist.",
    [{ label: "Schaden", wert: "1W6" }, { label: "Reichweite", wert: "Mittel" }], ["eisen", "fern"]),
  card("reisechronik", "Reisechronik", "Schriftstück", "ungewoehnlich", "buch", "Fremde Wege, fremde Handschrift.",
    [{ label: "Enthält", wert: "Notizen zu drei Pässen" }], ["wissen"]),
  card("silberring", "Silberring", "Schmuck", "ungewoehnlich", "reif", "Innen eine Gravur, außen nichts.",
    [{ label: "Wert", wert: "Ein Monatslohn" }], ["silber", "geld"]),
  card("kraeuterbeutel", "Kräuterbeutel", "Trank", "ungewoehnlich", "phiole", "Riecht nach Wiese und nach Arbeit.",
    [{ label: "Nutzen", wert: "Bonus auf Feldmedizin" }], ["heilung"]),
  card("steigeisen", "Steigeisen", "Werkzeug", "ungewoehnlich", "werkzeug", "Auf Eis ein Segen, auf Holz ein Ärgernis.",
    [{ label: "Nutzen", wert: "Bonus auf Klettern" }], ["eisen", "berg"]),

  // -- selten: dafür geht man einen Umweg -------------------------------------------------------
  card("flussstahlklinge", "Klinge aus Flussstahl", "Waffe", "selten", "klinge", "Sie singt, wenn man sie zieht.",
    [{ label: "Schaden", wert: "3W6" }], ["stahl", "nah"]),
  card("schuppenpanzer", "Schuppenpanzer", "Rüstung", "selten", "panzer", "Jede Schuppe einzeln vernietet.",
    [{ label: "Rüstung", wert: "5" }, { label: "Kostet", wert: "5 Initiative" }], ["stahl"]),
  card("ruhige_hand", "Trank der ruhigen Hand", "Trank", "selten", "phiole", "Der Puls wird langsam, der Blick klar.",
    [{ label: "Wirkung", wert: "Ein Wurf ohne Zittern" }], ["trank"]),
  card("passkarte", "Karte der alten Pässe", "Schriftstück", "selten", "buch", "Vier Wege, drei davon gibt es noch.",
    [{ label: "Zeigt", wert: "Gebirgsübergänge" }], ["wissen", "reise"]),
  card("falkenpfeife", "Falkenpfeife", "Werkzeug", "selten", "werkzeug", "Du hörst nichts. Der Falke schon.",
    [{ label: "Nutzen", wert: "Ruft einen Falken" }], ["tier"]),
  card("mondsilberkette", "Mondsilberkette", "Schmuck", "selten", "reif", "Kühl, auch in der Sonne.",
    [{ label: "Wert", wert: "Ein Jahreslohn" }], ["silber", "geld"]),
  card("stille_wacht", "Buch der stillen Wacht", "Schriftstück", "selten", "buch", "Zweiundvierzig Namen. Keiner erklärt.",
    [{ label: "Enthält", wert: "Eine Liste, die jemand sucht" }], ["wissen", "raetsel"]),
  card("rauchperlen", "Rauchperlen", "Kuriosität", "selten", "muenze", "Zerdrücken, ausatmen, verschwinden.",
    [{ label: "Vorrat", wert: "Drei Perlen" }], ["rauch"]),

  // -- episch: davon spricht die Runde noch nächstes Jahr ---------------------------------------
  card("wolfszahn", "Wolfszahn, der Speer", "Waffe", "episch", "klinge", "Er wurde nie geworfen. Man erzählt es trotzdem.",
    [{ label: "Schaden", wert: "4W6" }, { label: "Reichweite", wert: "Mittel" }], ["stahl", "sage"]),
  card("grenzwacht_harnisch", "Harnisch der Grenzwacht", "Rüstung", "episch", "panzer", "Vier Träger, vier Namen, vier Gräber.",
    [{ label: "Rüstung", wert: "7" }, { label: "Kostet", wert: "7 Initiative" }], ["stahl", "sage"]),
  card("morgentau", "Phiole Morgentau", "Trank", "episch", "phiole", "Gesammelt vor dem ersten Licht.",
    [{ label: "Wirkung", wert: "Volle Lebenskraft, einmal" }], ["trank", "heilung"]),
  card("vermittlerring", "Siegelring der Vermittler", "Schmuck", "episch", "reif", "Wer ihn trägt, wird angehört. Nicht geglaubt.",
    [{ label: "Nutzen", wert: "Zutritt zu Verhandlungen" }], ["gold", "macht"]),
  card("langer_schluessel", "Der lange Schlüssel", "Kuriosität", "episch", "werkzeug", "Zu lang für jedes Schloss, das du kennst.",
    [{ label: "Passt in", wert: "Ein Tor, das niemand findet" }], ["raetsel", "sage"]),
  card("sturmmantel", "Sturmmantel", "Rüstung", "episch", "tuch", "Der Regen fällt daneben.",
    [{ label: "Rüstung", wert: "2" }, { label: "Nutzen", wert: "Wetter zählt nicht" }], ["stoff", "sage"]),

  // -- legendär: vier Stück, und jedes ist eine Geschichte ---------------------------------------
  card("eisenherz", "Eisenherz, die Axt", "Waffe", "legendaer", "klinge", "Sie hat einen Namen, weil sie einen verdient hat.",
    [{ label: "Schaden", wert: "5W6" }, { label: "Bekannt für", wert: "Ein zersprungenes Tor" }], ["stahl", "sage"]),
  card("erste_wacht", "Panzer der ersten Wacht", "Rüstung", "legendaer", "panzer", "Er stand, als alles andere fiel.",
    [{ label: "Rüstung", wert: "10" }, { label: "Kostet", wert: "10 Initiative" }], ["stahl", "sage"]),
  card("krug_ohne_grund", "Der Krug, der nicht leert", "Kuriosität", "legendaer", "zehrung", "Er gibt Wasser. Nur Wasser. Immer.",
    [{ label: "Gibt", wert: "Wasser, jeden Tag" }], ["wasser", "sage"]),
  card("offene_wege", "Chronik der offenen Wege", "Schriftstück", "legendaer", "buch", "Die letzte Seite ist leer und bleibt es nicht.",
    [{ label: "Enthält", wert: "Jeden gegangenen Weg" }], ["wissen", "sage"]),
]);

/** Wie viele Karten je Stufe im Deck liegen — die Verteilung ist Teil des Entwurfs. */
export const CHRONICLE_LOOT_SPREAD: Readonly<Record<ChronicleLootRarity, number>> =
  Object.freeze({ gewoehnlich: 12, ungewoehnlich: 10, selten: 8, episch: 6, legendaer: 4 });
/** Wo die erzeugten Bilder liegen, vom Wurzelverzeichnis aus. */
export const CHRONICLE_LOOT_IMAGE_DIR = "assets/loot/chronicle-heroes";

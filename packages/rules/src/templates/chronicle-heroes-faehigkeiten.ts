// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **ChronicleHeroes 2.0 — Fähigkeiten und Zustände.** Eigenes Werk, eigener Text.
 *
 * Zweihundert Fähigkeiten in Ketten: jede Kette gehört zu einer Fertigkeit (oder, bei den
 * allgemeinen, zur gesammelten Erfahrung) und hat drei Ränge. Rang 1 ist ein kleiner dauerhafter
 * Vorteil, Rang 2 meist ein kräftiger Einsatz gegen einen Funken, Rang 3 die Meisterschaft. So
 * bleibt die Regel ein Satz — „wer die Stufe darunter hat und genug kann, darf die nächste lernen" —
 * und die Tiefe steckt in der Auswahl.
 *
 * Wirkungen sind hier symbolisch notiert (`fertigkeit:athletik`, `feld:koerper`, `proben`,
 * `talente`, `schaden`, `initiative`). Der Paketbauer in `chronicle-heroes.ts` löst sie gegen den
 * Fertigkeitskatalog der Runde auf: fehlt eine Fertigkeit, wirkt die Fähigkeit auf die Talentprobe
 * ihres Feldes. Damit gilt jede der 200 Fähigkeiten in jedem Katalog.
 */
import type { AbilityKind, ModifierTarget } from "../package-v2.ts";
import { deepFreeze } from "../validation.ts";

export type ChronicleAbilityField = "koerper" | "geist" | "herz" | "allgemein";
export type ChronicleEffectTarget = `fertigkeit:${string}` | "feld:koerper" | "feld:geist" | "feld:herz" | "proben" | "talente" | "schaden" | "initiative";
export interface ChronicleEffect { readonly ziel: ChronicleEffectTarget; readonly art: ModifierTarget; readonly wert: number }
export interface ChronicleAbilityEntry {
  readonly id: string; readonly name: string; readonly feld: ChronicleAbilityField; readonly gruppe: string;
  readonly rang: 1 | 2 | 3; readonly kind: AbilityKind; readonly funken: number; readonly preis: number;
  readonly vorstufe?: string;
  /** Fertigkeit, an der die Voraussetzung hängt; Mindestpunkte je Rang 30, 50, 70. */
  readonly fertigkeit?: string; readonly mindestens?: number;
  readonly text: string; readonly wirkungen: readonly ChronicleEffect[];
}
export interface ChronicleConditionEntry { readonly id: string; readonly name: string; readonly text: string; readonly wirkungen: readonly ChronicleEffect[] }

/** Preis in Erfahrung je Rang, und die Mindestpunkte in der Kettenfertigkeit. */
export const CHRONICLE_ABILITY_PRICES = deepFreeze([3, 5, 8] as const);
export const CHRONICLE_ABILITY_MINIMUMS = deepFreeze([30, 50, 70] as const);

const z = (ziel: ChronicleEffectTarget, wert: number): ChronicleEffect => ({ ziel, art: "ziel", wert });
const e = (ziel: "schaden" | "initiative", wert: number): ChronicleEffect => ({ ziel, art: "ergebnis", wert });
const f = (id: string): ChronicleEffectTarget => `fertigkeit:${id}`;
const d = "dauerhaft", ei = "einsatz", r = "reaktion";
type Stufe = readonly [id: string, name: string, kind: AbilityKind, funken: number, text: string, wirkungen?: readonly ChronicleEffect[]];

function kette(feld: ChronicleAbilityField, gruppe: string, fertigkeit: string | undefined, stufen: readonly [Stufe, Stufe, Stufe]): ChronicleAbilityEntry[] {
  return stufen.map(([id, name, kind, funken, text, wirkungen = []], index) => ({
    id, name, feld, gruppe, rang: (index + 1) as 1 | 2 | 3, kind, funken, preis: CHRONICLE_ABILITY_PRICES[index]!,
    ...(index ? { vorstufe: stufen[index - 1]![0] } : {}),
    ...(fertigkeit ? { fertigkeit, mindestens: CHRONICLE_ABILITY_MINIMUMS[index]! } : {}),
    text, wirkungen,
  }));
}
const einzeln = (id: string, name: string, kind: AbilityKind, funken: number, text: string, wirkungen: readonly ChronicleEffect[] = []): ChronicleAbilityEntry =>
  ({ id, name, feld: "allgemein", gruppe: "Herkunft", rang: 1, kind, funken, preis: CHRONICLE_ABILITY_PRICES[0], text, wirkungen });

const KOERPER: readonly ChronicleAbilityEntry[] = [
  ...kette("koerper", "Bewegung", "athletik", [
    ["leichtfuessig", "Leichtfüßig", d, 0, "Laufen, Springen und Klettern fallen dir leichter: +5 auf Athletik.", [z(f("athletik"), 5)]],
    ["kraftakt", "Kraftakt", ei, 1, "Einmal alles geben: +20 auf eine Athletikprobe.", [z(f("athletik"), 20)]],
    ["unermuedlich", "Unermüdlich", d, 0, "Dein Körper hält durch, wo andere aufgeben: +5 auf alle Körperproben.", [z("feld:koerper", 5)]]]),
  ...kette("koerper", "Werkstatt", "handwerk", [
    ["geschickte_haende", "Geschickte Hände", d, 0, "Werkzeug liegt dir gut in der Hand: +5 auf Handwerk.", [z(f("handwerk"), 5)]],
    ["notbehelf", "Notbehelf", ei, 1, "Aus dem, was herumliegt, wird ein brauchbares Werkzeug: +20 auf eine Handwerksprobe.", [z(f("handwerk"), 20)]],
    ["meisterstueck", "Meisterstück", d, 0, "Was du baust, hält Generationen: +10 auf Handwerk.", [z(f("handwerk"), 10)]]]),
  ...kette("koerper", "Kampf", "schlagkraft", [
    ["harter_schlag", "Harter Schlag", d, 0, "Deine Treffer sitzen: +2 Schaden.", [e("schaden", 2)]],
    ["wuchtiger_hieb", "Wuchtiger Hieb", ei, 1, "Du legst dein ganzes Gewicht hinein: +4 Schaden.", [e("schaden", 4)]],
    ["vernichtender_schlag", "Vernichtender Schlag", ei, 1, "Ein Hieb, der Rüstungen verbeult: +8 Schaden.", [e("schaden", 8)]]]),
  ...kette("koerper", "Bewegung", "klettern", [
    ["sicherer_griff", "Sicherer Griff", d, 0, "Deine Finger finden jede Kante: +5 auf Klettern.", [z(f("klettern"), 5)]],
    ["wandlaeufer", "Wandläufer", ei, 1, "Du findest Halt, wo keiner ist: +20 auf eine Kletterprobe.", [z(f("klettern"), 20)]],
    ["gipfelstuermer", "Gipfelstürmer", d, 0, "Höhe schreckt dich nicht: +10 auf Klettern und auf Mut.", [z(f("klettern"), 10), z(f("mut"), 10)]]]),
  ...kette("koerper", "Bewegung", "schwimmen", [
    ["wasserratte", "Wasserratte", d, 0, "Im Wasser bist du zu Hause: +5 auf Schwimmen.", [z(f("schwimmen"), 5)]],
    ["langer_atem", "Langer Atem", r, 0, "Du hältst die Luft länger an als andere: +20 auf eine Schwimmprobe unter Wasser.", [z(f("schwimmen"), 20)]],
    ["stroemungskundig", "Strömungskundig", d, 0, "Eine Strömung trägt dich, statt dich zu ziehen: +10 auf Schwimmen.", [z(f("schwimmen"), 10)]]]),
  ...kette("koerper", "Bewegung", "laufen", [
    ["ausdauerlaeufer", "Ausdauerläufer", d, 0, "Du läufst den ganzen Tag: +5 auf Laufen.", [z(f("laufen"), 5)]],
    ["sprint", "Sprint", ei, 1, "Ein Antritt, dem keiner folgt: +20 auf eine Laufprobe und +2 auf die Initiative.", [z(f("laufen"), 20), e("initiative", 2)]],
    ["windschnell", "Windschnell", d, 0, "Du bist schon da, bevor andere loslaufen: +4 auf die Initiative.", [e("initiative", 4)]]]),
  ...kette("koerper", "Bewegung", "springen", [
    ["federnd", "Federnd", d, 0, "Deine Beine sind Sprungfedern: +5 auf Springen.", [z(f("springen"), 5)]],
    ["weiter_satz", "Weiter Satz", ei, 1, "Über den Graben, den keiner schafft: +20 auf eine Sprungprobe.", [z(f("springen"), 20)]],
    ["sturzfest", "Sturzfest", r, 0, "Aus großer Höhe landest du auf den Füßen: +20 auf Springen und auf Athletik beim Fallen.", [z(f("springen"), 20), z(f("athletik"), 20)]]]),
  ...kette("koerper", "Bewegung", "balancieren", [
    ["trittsicher", "Trittsicher", d, 0, "Schmale Wege sind breit genug: +5 auf Balancieren.", [z(f("balancieren"), 5)]],
    ["seiltaenzer", "Seiltänzer", ei, 1, "Über das Seil, als wäre es eine Straße: +20 auf eine Balancierprobe.", [z(f("balancieren"), 20)]],
    ["katzengleich", "Katzengleich", d, 0, "Geschmeidig in jeder Lage: +5 auf Balancieren, Springen und Klettern.", [z(f("balancieren"), 5), z(f("springen"), 5), z(f("klettern"), 5)]]]),
  ...kette("koerper", "Heimlichkeit", "schleichen", [
    ["leise_sohlen", "Leise Sohlen", d, 0, "Deine Schritte machen kein Geräusch: +5 auf Schleichen.", [z(f("schleichen"), 5)]],
    ["schattengang", "Schattengang", ei, 1, "Von Schatten zu Schatten: +20 auf eine Schleichprobe.", [z(f("schleichen"), 20)]],
    ["ungesehen", "Ungesehen", d, 0, "Man bemerkt dich erst, wenn du es willst: +10 auf Schleichen und Verstecken.", [z(f("schleichen"), 10), z(f("verstecken"), 10)]]]),
  ...kette("koerper", "Heimlichkeit", "verstecken", [
    ["tarnkundig", "Tarnkundig", d, 0, "Laub, Staub, Schatten — alles wird Deckung: +5 auf Verstecken.", [z(f("verstecken"), 5)]],
    ["blitzversteck", "Blitzversteck", r, 1, "Kaum sieht jemand hin, bist du verschwunden: +20 auf eine Versteckprobe.", [z(f("verstecken"), 20)]],
    ["teil_der_mauer", "Teil der Mauer", d, 0, "Du stehst still, bis man dich für Stein hält: +10 auf Verstecken.", [z(f("verstecken"), 10)]]]),
  ...kette("koerper", "Widerstand", "zaehigkeit", [
    ["dickes_fell", "Dickes Fell", d, 0, "Du steckst mehr ein, als man dir ansieht: +5 auf Zähigkeit.", [z(f("zaehigkeit"), 5)]],
    ["zaehneknirschen", "Zähneknirschen", r, 1, "Schmerz beiseiteschieben: +20 auf eine Zähigkeitsprobe.", [z(f("zaehigkeit"), 20)]],
    ["eiserne_natur", "Eiserne Natur", d, 0, "Gift, Kälte und Hunger setzen dir kaum zu: +10 auf Zähigkeit.", [z(f("zaehigkeit"), 10)]]]),
  ...kette("koerper", "Kampf", "ausweichen", [
    ["flink", "Flink", d, 0, "Du bist schwer zu treffen: +5 auf Ausweichen.", [z(f("ausweichen"), 5)]],
    ["abrollen", "Abrollen", r, 1, "Zur Seite, bevor der Schlag kommt: +20 auf eine Ausweichprobe.", [z(f("ausweichen"), 20)]],
    ["unantastbar", "Unantastbar", d, 0, "Klingen treffen nur Luft: +10 auf Ausweichen und +2 auf die Initiative.", [z(f("ausweichen"), 10), e("initiative", 2)]]]),
  ...kette("koerper", "Kampf", "fechten", [
    ["klingenkunde", "Klingenkunde", d, 0, "Du kennst jede Parade: +5 auf Fechten.", [z(f("fechten"), 5)]],
    ["riposte", "Riposte", r, 1, "Nach der Abwehr sofort zurück: +20 auf eine Fechtprobe.", [z(f("fechten"), 20)]],
    ["klingentanz", "Klingentanz", ei, 1, "Deine Klinge ist überall zugleich: +20 auf Fechten und +4 Schaden.", [z(f("fechten"), 20), e("schaden", 4)]]]),
  ...kette("koerper", "Kampf", "ringen", [
    ["klammergriff", "Klammergriff", d, 0, "Wen du packst, der kommt nicht los: +5 auf Ringen.", [z(f("ringen"), 5)]],
    ["schulterwurf", "Schulterwurf", ei, 1, "Der Gegner liegt, bevor er es merkt: +20 auf eine Ringprobe.", [z(f("ringen"), 20)]],
    ["baerenumarmung", "Bärenumarmung", ei, 1, "Ein Griff, der Rippen knacken lässt: +20 auf Ringen und +4 Schaden.", [z(f("ringen"), 20), e("schaden", 4)]]]),
  ...kette("koerper", "Fernkampf", "bogenschiessen", [
    ["ruhige_hand", "Ruhige Hand", d, 0, "Die Sehne zittert nicht: +5 auf Bogenschießen.", [z(f("bogenschiessen"), 5)]],
    ["gezielter_schuss", "Gezielter Schuss", ei, 1, "Ein Atemzug, ein Pfeil: +20 auf Bogenschießen.", [z(f("bogenschiessen"), 20)]],
    ["meisterschuetze", "Meisterschütze", d, 0, "Du triffst, was du anvisierst: +10 auf Bogenschießen und +2 Schaden.", [z(f("bogenschiessen"), 10), e("schaden", 2)]]]),
  ...kette("koerper", "Fernkampf", "werfen", [
    ["wurfarm", "Wurfarm", d, 0, "Steine, Messer, Speere — alles fliegt gerade: +5 auf Werfen.", [z(f("werfen"), 5)]],
    ["doppelwurf", "Doppelwurf", ei, 1, "Zwei Würfe in einem Atemzug: +20 auf eine Wurfprobe.", [z(f("werfen"), 20)]],
    ["treffsicherer_wurf", "Treffsicherer Wurf", ei, 1, "Genau zwischen die Platten: +20 auf Werfen und +6 Schaden.", [z(f("werfen"), 20), e("schaden", 6)]]]),
  ...kette("koerper", "Kampf", "schildkampf", [
    ["schildwall", "Schildwall", d, 0, "Dein Schild ist eine Wand: +5 auf Schildkampf.", [z(f("schildkampf"), 5)]],
    ["schildstoss", "Schildstoß", ei, 1, "Der Schild als Waffe: +20 auf Schildkampf und +2 Schaden.", [z(f("schildkampf"), 20), e("schaden", 2)]],
    ["bollwerk", "Bollwerk", r, 1, "Du stellst dich vor die anderen: +30 auf eine Schildkampfprobe.", [z(f("schildkampf"), 30)]]]),
  ...kette("koerper", "Reisen", "reiten", [
    ["sattelfest", "Sattelfest", d, 0, "Kein Pferd wirft dich ab: +5 auf Reiten.", [z(f("reiten"), 5)]],
    ["sturmritt", "Sturmritt", ei, 1, "Im Galopp mitten hinein: +20 auf Reiten und +2 auf die Initiative.", [z(f("reiten"), 20), e("initiative", 2)]],
    ["reiterangriff", "Reiterangriff", ei, 1, "Aus vollem Lauf zugeschlagen: +6 Schaden.", [e("schaden", 6)]]]),
  ...kette("koerper", "Wildnis", "jagen", [
    ["pirschjaeger", "Pirschjäger", d, 0, "Du kommst an jedes Wild heran: +5 auf Jagen.", [z(f("jagen"), 5)]],
    ["fallensteller", "Fallensteller", ei, 1, "Die Falle sitzt beim ersten Versuch: +20 auf Jagen und auf Fallen stellen.", [z(f("jagen"), 20), z(f("fallen_stellen"), 20)]],
    ["unfehlbarer_jaeger", "Unfehlbarer Jäger", d, 0, "Was du jagst, entkommt nicht: +10 auf Jagen und +2 Schaden.", [z(f("jagen"), 10), e("schaden", 2)]]]),
  ...kette("koerper", "Heimlichkeit", "taschendiebstahl", [
    ["lange_finger", "Lange Finger", d, 0, "Beutel wechseln wie von selbst den Besitzer: +5 auf Taschendiebstahl.", [z(f("taschendiebstahl"), 5)]],
    ["dietrichkunst", "Dietrichkunst", ei, 1, "Kein Schloss hält lange: +20 auf Schlösser öffnen.", [z(f("schloesser_oeffnen"), 20)]],
    ["meisterdieb", "Meisterdieb", d, 0, "Du nimmst, was du willst: +10 auf Taschendiebstahl und Schlösser öffnen.", [z(f("taschendiebstahl"), 10), z(f("schloesser_oeffnen"), 10)]]]),
];

const GEIST: readonly ChronicleAbilityEntry[] = [
  ...kette("geist", "Wissen", "buchwissen", [
    ["belesen", "Belesen", d, 0, "Du hast mehr gelesen als die meisten: +5 auf Buchwissen.", [z(f("buchwissen"), 5)]],
    ["querverweis", "Querverweis", ei, 1, "Du erinnerst dich, wo es stand: +20 auf Buchwissen.", [z(f("buchwissen"), 20)]],
    ["gelehrter", "Gelehrter", d, 0, "Wissen öffnet jede Tür: +5 auf alle Geistproben.", [z("feld:geist", 5)]]]),
  ...kette("geist", "Sinne", "wahrnehmung", [
    ["wachsam", "Wachsam", d, 0, "Dir fällt auf, was anderen entgeht: +5 auf Wahrnehmung.", [z(f("wahrnehmung"), 5)]],
    ["scharfer_blick", "Scharfer Blick", ei, 1, "Ein genauer Blick auf das Wesentliche: +20 auf Wahrnehmung.", [z(f("wahrnehmung"), 20)]],
    ["nichts_entgeht_dir", "Nichts entgeht dir", d, 0, "Du siehst den Hinterhalt kommen: +10 auf Wahrnehmung und +2 auf die Initiative.", [z(f("wahrnehmung"), 10), e("initiative", 2)]]]),
  ...kette("geist", "Heilen", "feldmedizin", [
    ["verbandskunde", "Verbandskunde", d, 0, "Ein Verband sitzt beim ersten Mal: +5 auf Feldmedizin.", [z(f("feldmedizin"), 5)]],
    ["schnelle_hilfe", "Schnelle Hilfe", ei, 1, "Die Behandlung dauert nur einen Moment: +20 auf Feldmedizin.", [z(f("feldmedizin"), 20)]],
    ["wundarzt", "Wundarzt", d, 0, "Du flickst zusammen, was andere aufgeben: +10 auf Feldmedizin und Heilkunde.", [z(f("feldmedizin"), 10), z(f("heilkunde"), 10)]]]),
  ...kette("geist", "Heilen", "heilkunde", [
    ["heilkundig", "Heilkundig", d, 0, "Du kennst Leiden und ihre Mittel: +5 auf Heilkunde.", [z(f("heilkunde"), 5)]],
    ["sichere_diagnose", "Sichere Diagnose", ei, 1, "Du erkennst, was wirklich fehlt: +20 auf Heilkunde.", [z(f("heilkunde"), 20)]],
    ["lebensretter", "Lebensretter", r, 1, "Fällt jemand auf 0 Lebenskraft, bist du zur Stelle: +30 auf Heilkunde oder Feldmedizin.", [z(f("heilkunde"), 30), z(f("feldmedizin"), 30)]]]),
  ...kette("geist", "Natur", "kraeuterkunde", [
    ["kraeutersammler", "Kräutersammler", d, 0, "Am Wegrand wächst deine Apotheke: +5 auf Kräuterkunde.", [z(f("kraeuterkunde"), 5)]],
    ["heiltrank", "Heiltrank", ei, 1, "Ein Sud, der wirklich hilft: +20 auf Kräuterkunde beim Zubereiten.", [z(f("kraeuterkunde"), 20)]],
    ["alchemist", "Alchemist", d, 0, "Aus Pflanzen werden Wirkstoffe: +10 auf Kräuterkunde und Giftkunde.", [z(f("kraeuterkunde"), 10), z(f("giftkunde"), 10)]]]),
  ...kette("geist", "Natur", "giftkunde", [
    ["giftnase", "Giftnase", d, 0, "Du riechst, was im Becher ist: +5 auf Giftkunde.", [z(f("giftkunde"), 5)]],
    ["gegengift", "Gegengift", r, 1, "Du hast das Richtige dabei: +20 auf eine Giftkundeprobe.", [z(f("giftkunde"), 20)]],
    ["giftmischer", "Giftmischer", ei, 1, "Eine präparierte Klinge: +6 Schaden.", [e("schaden", 6)]]]),
  ...kette("geist", "Natur", "tierkunde", [
    ["tierfreund", "Tierfreund", d, 0, "Tiere vertrauen dir: +5 auf Tierkunde.", [z(f("tierkunde"), 5)]],
    ["tiersprache", "Tiersprache", ei, 1, "Du verstehst, was ein Tier meint: +20 auf Tierkunde und auf Tiere beruhigen.", [z(f("tierkunde"), 20), z(f("tiere_beruhigen"), 20)]],
    ["treuer_gefaehrte", "Treuer Gefährte", d, 0, "Ein Tier begleitet dich und warnt dich: +10 auf Tierkunde und Wahrnehmung.", [z(f("tierkunde"), 10), z(f("wahrnehmung"), 10)]]]),
  ...kette("geist", "Natur", "wetterkunde", [
    ["wolkenleser", "Wolkenleser", d, 0, "Du weißt morgens, was der Tag bringt: +5 auf Wetterkunde.", [z(f("wetterkunde"), 5)]],
    ["sturmwarnung", "Sturmwarnung", ei, 1, "Rechtzeitig unter Dach: +20 auf Wetterkunde.", [z(f("wetterkunde"), 20)]],
    ["wetterfest", "Wetterfest", d, 0, "Regen und Frost halten dich nicht auf: +10 auf Wetterkunde und Zähigkeit.", [z(f("wetterkunde"), 10), z(f("zaehigkeit"), 10)]]]),
  ...kette("geist", "Wissen", "sternkunde", [
    ["sternenkenner", "Sternenkenner", d, 0, "Du kennst den Himmel wie eine Karte: +5 auf Sternkunde.", [z(f("sternkunde"), 5)]],
    ["nachtnavigation", "Nachtnavigation", ei, 1, "Auch ohne Mond auf Kurs: +20 auf Sternkunde und Orientierung.", [z(f("sternkunde"), 20), z(f("orientierung"), 20)]],
    ["himmelsdeuter", "Himmelsdeuter", d, 0, "Einmal pro Abend darfst du ein Vorzeichen deuten; die Runde sagt, was es bedeutet: +10 auf Sternkunde.", [z(f("sternkunde"), 10)]]]),
  ...kette("geist", "Wissen", "geschichte", [
    ["ahnenkunde", "Ahnenkunde", d, 0, "Du kennst die alten Häuser und Linien: +5 auf Geschichte.", [z(f("geschichte"), 5)]],
    ["vergessene_orte", "Vergessene Orte", ei, 1, "Du weißt, was hier einmal stand: +20 auf Geschichte.", [z(f("geschichte"), 20)]],
    ["lebendes_archiv", "Lebendes Archiv", d, 0, "In deinem Kopf steht eine Bibliothek: +10 auf Geschichte und Buchwissen.", [z(f("geschichte"), 10), z(f("buchwissen"), 10)]]]),
  ...kette("geist", "Gesellschaft", "rechtskunde", [
    ["paragraphenreiter", "Paragraphenreiter", d, 0, "Du kennst die Gesetze auswendig: +5 auf Rechtskunde.", [z(f("rechtskunde"), 5)]],
    ["schlupfloch", "Schlupfloch", ei, 1, "Irgendwo steht eine Ausnahme: +20 auf Rechtskunde und Verhandeln.", [z(f("rechtskunde"), 20), z(f("verhandeln"), 20)]],
    ["richterspruch", "Richterspruch", d, 0, "Man beugt sich deinem Urteil: +10 auf Rechtskunde und Streit schlichten.", [z(f("rechtskunde"), 10), z(f("streit_schlichten"), 10)]]]),
  ...kette("geist", "Gesellschaft", "sprachen", [
    ["sprachtalent", "Sprachtalent", d, 0, "Fremde Worte bleiben hängen: +5 auf Sprachen.", [z(f("sprachen"), 5)]],
    ["dolmetscher", "Dolmetscher", ei, 1, "Du übersetzt, auch was zwischen den Zeilen steht: +20 auf Sprachen.", [z(f("sprachen"), 20)]],
    ["vielzuengig", "Vielzüngig", d, 0, "In jeder Sprache überzeugend: +10 auf Sprachen und Überreden.", [z(f("sprachen"), 10), z(f("ueberreden"), 10)]]]),
  ...kette("geist", "Reisen", "orientierung", [
    ["pfadfinder", "Pfadfinder", d, 0, "Du verläufst dich nie: +5 auf Orientierung.", [z(f("orientierung"), 5)]],
    ["abkuerzung", "Abkürzung", ei, 1, "Du kennst einen kürzeren Weg, die Gruppe spart einen halben Tag: +20 auf Orientierung.", [z(f("orientierung"), 20)]],
    ["kartograph", "Kartograph", d, 0, "Was du einmal gesehen hast, zeichnest du auf: +10 auf Orientierung und Kartenkunde.", [z(f("orientierung"), 10), z(f("kartenkunde"), 10)]]]),
  ...kette("geist", "Wildnis", "spurenlesen", [
    ["faehrtenkunde", "Fährtenkunde", d, 0, "Jeder Abdruck erzählt etwas: +5 auf Spurenlesen.", [z(f("spurenlesen"), 5)]],
    ["frische_spur", "Frische Spur", ei, 1, "Die Spur ist nicht älter als eine Stunde: +20 auf Spurenlesen.", [z(f("spurenlesen"), 20)]],
    ["unerbittlicher_verfolger", "Unerbittlicher Verfolger", d, 0, "Wen du suchst, den findest du: +10 auf Spurenlesen und +2 auf die Initiative.", [z(f("spurenlesen"), 10), e("initiative", 2)]]]),
  ...kette("geist", "Werkstatt", "mechanik", [
    ["tueftler", "Tüftler", d, 0, "Du verstehst, wie Dinge funktionieren: +5 auf Mechanik.", [z(f("mechanik"), 5)]],
    ["improvisierte_falle", "Improvisierte Falle", ei, 1, "Aus Seil und Brett wird ein Mechanismus: +20 auf Mechanik und Fallen stellen.", [z(f("mechanik"), 20), z(f("fallen_stellen"), 20)]],
    ["erfinder", "Erfinder", d, 0, "Du baust, was es noch nicht gibt: +10 auf Mechanik und Handwerk.", [z(f("mechanik"), 10), z(f("handwerk"), 10)]]]),
  ...kette("geist", "Kampf", "kriegskunst", [
    ["taktiker", "Taktiker", d, 0, "Du liest das Gefecht, bevor es beginnt: +2 auf die Initiative.", [e("initiative", 2)]],
    ["flankenangriff", "Flankenangriff", ei, 1, "Von der Seite, wo keiner schaut: +4 Schaden für einen abgesprochenen Angriff.", [e("schaden", 4)]],
    ["feldherr", "Feldherr", d, 0, "Unter dir kämpft jede Gruppe wie ein Heer: +4 auf die Initiative und +10 auf Kriegskunst.", [e("initiative", 4), z(f("kriegskunst"), 10)]]]),
  ...kette("geist", "Wissen", "entschluesseln", [
    ["raetselfreund", "Rätselfreund", d, 0, "Rätsel ziehen dich an: +5 auf Entschlüsseln.", [z(f("entschluesseln"), 5)]],
    ["codebrecher", "Codebrecher", ei, 1, "Jede Chiffre hat ein Muster: +20 auf Entschlüsseln.", [z(f("entschluesseln"), 20)]],
    ["geheimschriftkundig", "Geheimschriftkundig", d, 0, "Du liest, was verborgen bleiben sollte: +10 auf Entschlüsseln und Fälschung erkennen.", [z(f("entschluesseln"), 10), z(f("faelschung_erkennen"), 10)]]]),
  ...kette("geist", "Verstand", "gedaechtnis", [
    ["gutes_gedaechtnis", "Gutes Gedächtnis", d, 0, "Namen und Gesichter bleiben: +5 auf Gedächtnis.", [z(f("gedaechtnis"), 5)]],
    ["ploetzliche_erinnerung", "Plötzliche Erinnerung", ei, 1, "Da war doch etwas: +20 auf Gedächtnis.", [z(f("gedaechtnis"), 20)]],
    ["unvergesslich", "Unvergesslich", d, 0, "Was du einmal gehört hast, vergisst du nicht: +10 auf Gedächtnis und Buchwissen.", [z(f("gedaechtnis"), 10), z(f("buchwissen"), 10)]]]),
  ...kette("geist", "Verstand", "konzentration", [
    ["fokus", "Fokus", d, 0, "Du bleibst bei der Sache: +5 auf Konzentration.", [z(f("konzentration"), 5)]],
    ["tunnelblick", "Tunnelblick", ei, 1, "Die Welt verschwindet, nur die Aufgabe bleibt: +20 auf eine Geistprobe.", [z("feld:geist", 20)]],
    ["innere_ruhe", "Innere Ruhe", r, 1, "Ablenkung prallt an dir ab: +20 auf Konzentration und Willenskraft.", [z(f("konzentration"), 20), z(f("willenskraft"), 20)]]]),
  ...kette("geist", "Verstand", "planen", [
    ["vorausschauend", "Vorausschauend", d, 0, "Du denkst zwei Schritte weiter: +5 auf Planen.", [z(f("planen"), 5)]],
    ["plan_b", "Plan B", r, 1, "Du hattest vorgesorgt: +20 auf eine Planungsprobe, wenn der erste Plan scheitert.", [z(f("planen"), 20)]],
    ["meisterplan", "Meisterplan", ei, 2, "Alles greift ineinander: +10 auf jede Probe, die zu deinem Plan gehört.", [z("proben", 10)]]]),
];

const HERZ: readonly ChronicleAbilityEntry[] = [
  ...kette("herz", "Worte", "ueberreden", [
    ["redegewandt", "Redegewandt", d, 0, "Die richtigen Worte kommen von selbst: +5 auf Überreden.", [z(f("ueberreden"), 5)]],
    ["schlagfertig", "Schlagfertig", r, 1, "Eine Antwort, bevor der Satz zu Ende ist: +20 auf Überreden.", [z(f("ueberreden"), 20)]],
    ["silberzunge", "Silberzunge", d, 0, "Menschen hören dir gern zu: +5 auf alle Herzproben.", [z("feld:herz", 5)]]]),
  ...kette("herz", "Gespür", "menschenkenntnis", [
    ["gutes_gespuer", "Gutes Gespür", d, 0, "Du merkst, wenn etwas nicht stimmt: +5 auf Menschenkenntnis.", [z(f("menschenkenntnis"), 5)]],
    ["luege_durchschauen", "Lüge durchschauen", r, 1, "Das Zucken im Mundwinkel verrät alles: +20 auf Menschenkenntnis.", [z(f("menschenkenntnis"), 20)]],
    ["seelenleser", "Seelenleser", d, 0, "Du weißt, was dein Gegenüber will: +10 auf Menschenkenntnis und Verhandeln.", [z(f("menschenkenntnis"), 10), z(f("verhandeln"), 10)]]]),
  ...kette("herz", "Haltung", "mut", [
    ["beherzt", "Beherzt", d, 0, "Du packst an, wo andere zögern: +5 auf Mut.", [z(f("mut"), 5)]],
    ["ohne_zoegern", "Ohne Zögern", ei, 1, "Vorwärts, sofort: +20 auf Mut und +2 auf die Initiative.", [z(f("mut"), 20), e("initiative", 2)]],
    ["furchtlos", "Furchtlos", d, 0, "Angst hat keinen Griff an dir: +10 auf Mut und Willenskraft.", [z(f("mut"), 10), z(f("willenskraft"), 10)]]]),
  ...kette("herz", "Bühne", "auftreten", [
    ["buehnenpraesenz", "Bühnenpräsenz", d, 0, "Wenn du den Raum betrittst, schauen alle: +5 auf Auftreten.", [z(f("auftreten"), 5)]],
    ["grosser_auftritt", "Großer Auftritt", ei, 1, "Alle Augen auf dich: +20 auf Auftreten.", [z(f("auftreten"), 20)]],
    ["legende_der_buehne", "Legende der Bühne", d, 0, "Man spricht noch Jahre von dir: +10 auf Auftreten und Schauspiel.", [z(f("auftreten"), 10), z(f("schauspiel"), 10)]]]),
  ...kette("herz", "Handel", "verhandeln", [
    ["geschaeftssinn", "Geschäftssinn", d, 0, "Du erkennst ein gutes Geschäft: +5 auf Verhandeln.", [z(f("verhandeln"), 5)]],
    ["letztes_angebot", "Letztes Angebot", ei, 1, "Jetzt oder nie: +20 auf eine Verhandlungsprobe.", [z(f("verhandeln"), 20)]],
    ["handelsfuerst", "Handelsfürst", d, 0, "Kein Handel ohne deinen Vorteil: +10 auf Verhandeln und Feilschen.", [z(f("verhandeln"), 10), z(f("feilschen"), 10)]]]),
  ...kette("herz", "Täuschung", "luegen", [
    ["pokerface", "Pokerface", d, 0, "Man liest nichts in deinem Gesicht: +5 auf Lügen.", [z(f("luegen"), 5)]],
    ["glaubhafte_luege", "Glaubhafte Lüge", ei, 1, "So erzählt, klingt es wahr: +20 auf Lügen.", [z(f("luegen"), 20)]],
    ["doppelleben", "Doppelleben", d, 0, "Du trägst eine zweite Geschichte mühelos: +10 auf Lügen und Schauspiel.", [z(f("luegen"), 10), z(f("schauspiel"), 10)]]]),
  ...kette("herz", "Haltung", "einschuechtern", [
    ["finsterer_blick", "Finsterer Blick", d, 0, "Man weicht dir aus: +5 auf Einschüchtern.", [z(f("einschuechtern"), 5)]],
    ["drohgebaerde", "Drohgebärde", ei, 1, "Eine Geste genügt: +20 auf Einschüchtern.", [z(f("einschuechtern"), 20)]],
    ["schreckgestalt", "Schreckgestalt", ei, 1, "Gegner zögern, bevor sie handeln: +20 auf Einschüchtern und +4 auf die Initiative.", [z(f("einschuechtern"), 20), e("initiative", 4)]]]),
  ...kette("herz", "Gemeinschaft", "beruhigen", [
    ["sanfte_stimme", "Sanfte Stimme", d, 0, "Deine Stimme nimmt die Spannung: +5 auf Beruhigen.", [z(f("beruhigen"), 5)]],
    ["gemueter_kuehlen", "Gemüter kühlen", ei, 1, "Bevor die Fäuste fliegen: +20 auf Beruhigen.", [z(f("beruhigen"), 20)]],
    ["friedensstifter", "Friedensstifter", d, 0, "Wo du bist, wird verhandelt statt gekämpft: +10 auf Beruhigen und Streit schlichten.", [z(f("beruhigen"), 10), z(f("streit_schlichten"), 10)]]]),
  ...kette("herz", "Führung", "anfuehren", [
    ["vorbild", "Vorbild", d, 0, "Andere folgen deinem Beispiel: +5 auf Anführen.", [z(f("anfuehren"), 5)]],
    ["schlachtruf", "Schlachtruf", ei, 1, "Ein Ruf, und alle stehen auf: +20 auf Anführen und +2 auf die Initiative.", [z(f("anfuehren"), 20), e("initiative", 2)]],
    ["anfuehrernatur", "Anführernatur", d, 0, "Man richtet sich nach dir, ohne dass du fragst: +10 auf Anführen und Befehlen.", [z(f("anfuehren"), 10), z(f("befehlen"), 10)]]]),
  ...kette("herz", "Gemeinschaft", "aufmuntern", [
    ["frohsinn", "Frohsinn", d, 0, "Deine Laune steckt an: +5 auf Aufmuntern.", [z(f("aufmuntern"), 5)]],
    ["aufbauende_worte", "Aufbauende Worte", ei, 1, "Genau das, was jemand hören muss: +20 auf Aufmuntern.", [z(f("aufmuntern"), 20)]],
    ["licht_im_dunkeln", "Licht im Dunkeln", d, 0, "Auch in schweren Stunden gibst du Halt: +5 auf alle Herzproben und +10 auf Aufmuntern.", [z("feld:herz", 5), z(f("aufmuntern"), 10)]]]),
  ...kette("herz", "Bühne", "erzaehlen", [
    ["geschichtenerzaehler", "Geschichtenerzähler", d, 0, "Am Feuer hören alle zu: +5 auf Erzählen.", [z(f("erzaehlen"), 5)]],
    ["fesselnde_erzaehlung", "Fesselnde Erzählung", ei, 1, "Niemand geht, bevor du fertig bist: +20 auf Erzählen.", [z(f("erzaehlen"), 20)]],
    ["sagenweber", "Sagenweber", d, 0, "Aus deinen Worten werden Legenden: +10 auf Erzählen und Dichten.", [z(f("erzaehlen"), 10), z(f("dichten"), 10)]]]),
  ...kette("herz", "Bühne", "musizieren", [
    ["spielmann", "Spielmann", d, 0, "Jedes Instrument klingt bei dir: +5 auf Musizieren.", [z(f("musizieren"), 5)]],
    ["kampflied", "Kampflied", ei, 1, "Deine Musik treibt die Gefährten an: +20 auf Musizieren und +2 Schaden für einen Angriff.", [z(f("musizieren"), 20), e("schaden", 2)]],
    ["meistermusikant", "Meistermusikant", d, 0, "Man reist weit, um dich zu hören: +10 auf Musizieren und Singen.", [z(f("musizieren"), 10), z(f("singen"), 10)]]]),
  ...kette("herz", "Täuschung", "schauspiel", [
    ["verkleidung", "Verkleidung", d, 0, "Mit Hut und Haltung ein anderer Mensch: +5 auf Schauspiel.", [z(f("schauspiel"), 5)]],
    ["rollentausch", "Rollentausch", ei, 1, "Du wirst die Rolle, nicht nur ihr Kostüm: +20 auf Schauspiel.", [z(f("schauspiel"), 20)]],
    ["tausend_gesichter", "Tausend Gesichter", d, 0, "Niemand weiß, wer du wirklich bist: +10 auf Schauspiel und Lügen.", [z(f("schauspiel"), 10), z(f("luegen"), 10)]]]),
  ...kette("herz", "Gesellschaft", "benehmen", [
    ["hofgerecht", "Hofgerecht", d, 0, "Du kennst jede Etikette: +5 auf Benehmen.", [z(f("benehmen"), 5)]],
    ["diplomatischer_ton", "Diplomatischer Ton", ei, 1, "Das richtige Wort zur richtigen Zeit: +20 auf Benehmen und Verhandeln.", [z(f("benehmen"), 20), z(f("verhandeln"), 20)]],
    ["hofmeister", "Hofmeister", d, 0, "An jedem Hof bist du willkommen: +10 auf Benehmen und Beziehungen pflegen.", [z(f("benehmen"), 10), z(f("beziehungen_pflegen"), 10)]]]),
  ...kette("herz", "Gesellschaft", "geruechte_sammeln", [
    ["ohr_am_markt", "Ohr am Markt", d, 0, "Du hörst, was die Stadt erzählt: +5 auf Gerüchte sammeln.", [z(f("geruechte_sammeln"), 5)]],
    ["netz_aus_zungen", "Netz aus Zungen", ei, 1, "Überall jemand, der dir etwas steckt: +20 auf Gerüchte sammeln.", [z(f("geruechte_sammeln"), 20)]],
    ["spinne_im_netz", "Spinne im Netz", d, 0, "Du weißt, wer mit wem: +10 auf Gerüchte sammeln und Menschenkenntnis.", [z(f("geruechte_sammeln"), 10), z(f("menschenkenntnis"), 10)]]]),
  ...kette("herz", "Haltung", "willenskraft", [
    ["standhaft", "Standhaft", d, 0, "Du bleibst bei deinem Wort: +5 auf Willenskraft.", [z(f("willenskraft"), 5)]],
    ["eiserner_wille", "Eiserner Wille", r, 1, "Nichts bricht dich: +30 auf eine Willenskraftprobe.", [z(f("willenskraft"), 30)]],
    ["unbeugsam", "Unbeugsam", d, 0, "Was du dir vornimmst, gelingt öfter: +5 auf alle Proben.", [z("proben", 5)]]]),
  ...kette("herz", "Glaube", "glaube", [
    ["gottvertrauen", "Gottvertrauen", d, 0, "Du bist nie ganz allein: +5 auf Glaube.", [z(f("glaube"), 5)]],
    ["stilles_gebet", "Stilles Gebet", ei, 1, "Ein Moment der Andacht gibt Kraft: +20 auf Glaube und Mut.", [z(f("glaube"), 20), z(f("mut"), 20)]],
    ["heiliger_zorn", "Heiliger Zorn", ei, 2, "Dein Glaube wird zur Waffe: +20 auf Glaube und +6 Schaden.", [z(f("glaube"), 20), e("schaden", 6)]]]),
  ...kette("herz", "Gemeinschaft", "tiere_beruhigen", [
    ["tierfluesterer", "Tierflüsterer", d, 0, "Scheue Tiere kommen zu dir: +5 auf Tiere beruhigen.", [z(f("tiere_beruhigen"), 5)]],
    ["bestien_zaehmen", "Bestien zähmen", ei, 1, "Selbst ein wildes Tier senkt den Kopf: +20 auf Tiere beruhigen.", [z(f("tiere_beruhigen"), 20)]],
    ["rudelfuehrer", "Rudelführer", d, 0, "Tiere folgen dir wie ihrem Leittier: +10 auf Tiere beruhigen und Reiten.", [z(f("tiere_beruhigen"), 10), z(f("reiten"), 10)]]]),
  ...kette("herz", "Haltung", "selbstbeherrschung", [
    ["kuehler_kopf", "Kühler Kopf", d, 0, "Du wirst nicht laut: +5 auf Selbstbeherrschung.", [z(f("selbstbeherrschung"), 5)]],
    ["eiserne_kontrolle", "Eiserne Kontrolle", r, 1, "Kein Zucken, kein Wort zu viel: +20 auf Selbstbeherrschung.", [z(f("selbstbeherrschung"), 20)]],
    ["unerschuetterlich", "Unerschütterlich", d, 0, "Was auch geschieht, du stehst: +10 auf Selbstbeherrschung und Willenskraft.", [z(f("selbstbeherrschung"), 10), z(f("willenskraft"), 10)]]]),
  ...kette("herz", "Gesellschaft", "werben", [
    ["charmant", "Charmant", d, 0, "Man mag dich sofort: +5 auf Werben.", [z(f("werben"), 5)]],
    ["kontakte", "Kontakte", ei, 1, "Du kennst jemanden, der jemanden kennt: +20 auf Beziehungen pflegen.", [z(f("beziehungen_pflegen"), 20)]],
    ["einflussreich", "Einflussreich", d, 0, "Dein Name öffnet Türen: +10 auf Beziehungen pflegen und Werben.", [z(f("beziehungen_pflegen"), 10), z(f("werben"), 10)]]]),
];

const ALLGEMEIN: readonly ChronicleAbilityEntry[] = [
  ...kette("allgemein", "Schicksal", undefined, [
    ["glueckskind", "Glückskind", ei, 1, "Das Glück ist auf deiner Seite: +10 auf eine beliebige Probe.", [z("proben", 10)]],
    ["schicksalswende", "Schicksalswende", r, 1, "Im letzten Augenblick dreht sich alles: +20 auf eine beliebige Probe.", [z("proben", 20)]],
    ["vom_schicksal_erwaehlt", "Vom Schicksal erwählt", d, 0, "Die Welt meint es gut mit dir: +5 auf alle Proben.", [z("proben", 5)]]]),
  ...kette("allgemein", "Erfahrung", undefined, [
    ["kampferprobt", "Kampferprobt", d, 0, "Du hast schon manches Gefecht gesehen: +1 auf die Initiative und +1 Schaden.", [e("initiative", 1), e("schaden", 1)]],
    ["veteran", "Veteran", d, 0, "Nichts im Kampf überrascht dich noch: +2 auf die Initiative und +2 Schaden.", [e("initiative", 2), e("schaden", 2)]],
    ["kriegsheld", "Kriegsheld", ei, 1, "Wo du kämpfst, wendet sich die Schlacht: +4 auf die Initiative und +6 Schaden.", [e("initiative", 4), e("schaden", 6)]]]),
  ...kette("allgemein", "Reisen", undefined, [
    ["weitgereist", "Weitgereist", d, 0, "Du warst schon an vielen Orten: +5 auf Orientierung und Sprachen.", [z(f("orientierung"), 5), z(f("sprachen"), 5)]],
    ["ueberall_zu_hause", "Überall zu Hause", d, 0, "Fremde Sitten sind dir vertraut: +5 auf Benehmen und Wetterkunde.", [z(f("benehmen"), 5), z(f("wetterkunde"), 5)]],
    ["weltenbummler", "Weltenbummler", d, 0, "Die Welt ist dein Haus: +10 auf Orientierung und Sprachen.", [z(f("orientierung"), 10), z(f("sprachen"), 10)]]]),
  ...kette("allgemein", "Überleben", undefined, [
    ["ueberlebenskuenstler", "Überlebenskünstler", d, 0, "Du findest immer einen Weg durch: +5 auf Zähigkeit und Jagen.", [z(f("zaehigkeit"), 5), z(f("jagen"), 5)]],
    ["letzte_reserve", "Letzte Reserve", r, 1, "Kurz vor dem Fall findest du noch Kraft: +20 auf alle Körperproben einer Szene.", [z("feld:koerper", 20)]],
    ["nicht_totzukriegen", "Nicht totzukriegen", d, 0, "Du stehst immer wieder auf: +10 auf Zähigkeit und Willenskraft.", [z(f("zaehigkeit"), 10), z(f("willenskraft"), 10)]]]),
  ...kette("allgemein", "Gefährten", undefined, [
    ["teamgeist", "Teamgeist", ei, 1, "Wenn ihr gemeinsam handelt: +10 auf eine Probe, die der Gruppe hilft.", [z("proben", 10)]],
    ["schulter_an_schulter", "Schulter an Schulter", d, 0, "Mit Gefährten an deiner Seite bist du schneller: +2 auf die Initiative.", [e("initiative", 2)]],
    ["unzertrennlich", "Unzertrennlich", r, 1, "Für einen Gefährten gibst du alles: +20 auf eine Probe, die ihm hilft.", [z("proben", 20)]]]),
  ...kette("allgemein", "Vielseitigkeit", undefined, [
    ["vielseitig", "Vielseitig", d, 0, "Du kannst von allem ein bisschen: +5 auf alle Talentproben.", [z("talente", 5)]],
    ["lernbegierig", "Lernbegierig", d, 0, "Du hörst nie auf zu lernen: +5 auf alle Geist- und Herzproben.", [z("feld:geist", 5), z("feld:herz", 5)]],
    ["alleskoenner", "Alleskönner", d, 0, "Es gibt kaum etwas, das du nicht versuchen kannst: +10 auf alle Talentproben.", [z("talente", 10)]]]),
  einzeln("ahnenerbe", "Ahnenerbe", d, 0, "Ein Erbstück deiner Familie begleitet dich. Einmal pro Abend darf die Runde es erzählerisch wirken lassen."),
  einzeln("vorahnung", "Vorahnung", r, 0, "Ein ungutes Gefühl warnt dich rechtzeitig: +3 auf die Initiative.", [e("initiative", 3)]),
];

/** Die ganze Sammlung: 60 Körper, 60 Geist, 60 Herz, 20 allgemein. */
export const CHRONICLE_ABILITY_LIBRARY: readonly ChronicleAbilityEntry[] = deepFreeze([...KOERPER, ...GEIST, ...HERZ, ...ALLGEMEIN]);

/** Zwölf Zustände. Die Spielleitung hakt sie am Bogen an; sie wirken bis zum Abhaken. */
export const CHRONICLE_CONDITIONS: readonly ChronicleConditionEntry[] = deepFreeze([
  { id: "erschoepft", name: "Erschöpft", text: "Zu wenig Schlaf, zu viel Weg: −10 auf alle Proben.", wirkungen: [z("proben", -10)] },
  { id: "benommen", name: "Benommen", text: "Der Kopf dröhnt: −20 auf Geistproben und −3 auf die Initiative.", wirkungen: [z("feld:geist", -20), e("initiative", -3)] },
  { id: "veraengstigt", name: "Verängstigt", text: "Die Angst sitzt im Nacken: −20 auf Herzproben.", wirkungen: [z("feld:herz", -20)] },
  { id: "verletzt", name: "Verletzt", text: "Eine Wunde behindert jede Bewegung: −10 auf Körperproben.", wirkungen: [z("feld:koerper", -10)] },
  { id: "blutend", name: "Blutend", text: "Zu Beginn jedes eigenen Zugs 1W6 Lebenskraft von Hand abziehen, bis die Wunde versorgt ist; −5 auf Körperproben.", wirkungen: [z("feld:koerper", -5)] },
  { id: "vergiftet", name: "Vergiftet", text: "Das Gift arbeitet: −10 auf Körper- und Geistproben, bis ein Gegenmittel wirkt.", wirkungen: [z("feld:koerper", -10), z("feld:geist", -10)] },
  { id: "geblendet", name: "Geblendet", text: "Kaum etwas zu sehen: −20 auf alle Proben.", wirkungen: [z("proben", -20)] },
  { id: "festgehalten", name: "Festgehalten", text: "Gepackt oder gefesselt: −20 auf Körperproben und −5 auf die Initiative.", wirkungen: [z("feld:koerper", -20), e("initiative", -5)] },
  { id: "liegend", name: "Am Boden", text: "Wer liegt, kämpft schlecht: −10 auf Körperproben und −3 auf die Initiative.", wirkungen: [z("feld:koerper", -10), e("initiative", -3)] },
  { id: "erschuettert", name: "Erschüttert", text: "Etwas hat dich bis ins Mark getroffen: −10 auf Herzproben und −5 auf die Initiative.", wirkungen: [z("feld:herz", -10), e("initiative", -5)] },
  { id: "inspiriert", name: "Inspiriert", text: "Eine Rede, ein Sieg, ein Lied: +10 auf alle Proben bis zum Ende der Szene.", wirkungen: [z("proben", 10)] },
  { id: "verborgen", name: "Verborgen", text: "Niemand weiß, wo du bist: +20 auf Schleichen und Verstecken.", wirkungen: [z(f("schleichen"), 20), z(f("verstecken"), 20)] },
]);

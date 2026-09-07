import type { EntryProjektion, ProjBlock, ProjInline, ProjiziertePassage } from "@chronicle/projection";

/**
 * Der Wiki-Export: eine **projizierte** Chronik als ein einziges Markdown-Dokument.
 *
 * Die Gegenrichtung zu `wikitext.ts`. Dort kommt fremdes Wiki herein und wird zum geschlossenen
 * Blockmodell; hier geht das Blockmodell hinaus und wird lesbarer Text. Beides bleibt außerhalb
 * des Ruhezustands: `Passage.inhalt` ist und bleibt ein Block-AST, „never HTML, never Markdown
 * at rest" (`chronik/model.ts`).
 *
 * **Was hier NICHT entschieden wird: wer was sehen darf.** Die Eingabe ist bereits projiziert —
 * genau das, was `projiziereEntry` der aufrufenden Person zeigt. Dieser Serialisierer trifft
 * keine einzige Sichtbarkeitsentscheidung und darf es auch nie: eine zweite Rechtepolitik neben
 * der Projektion wäre genau die Doppelung, die irgendwann auseinanderläuft — und zwar
 * stillschweigend und zugunsten des Lecks.
 */

/** Zeichen, die in Markdown eine Bedeutung tragen und deshalb im Fließtext geschützt werden. */
const ZU_SCHUETZEN = /[\\`*_{}[\]()#+\-.!|<>]/g;

/**
 * Ein Stern im Fließtext ist ein Stern, keine Kursivschrift. Ohne diesen Schutz würde ein
 * Artikel, der über Markdown-Zeichen spricht, sich beim Export selbst umformatieren — der
 * Export wäre dann keine Kopie mehr, sondern eine Interpretation.
 */
export function schuetzeMarkdown(text: string): string {
  return text.replace(ZU_SCHUETZEN, zeichen => `\\${zeichen}`);
}

/** Ein Titel als Sprungmarke: dieselbe Ableitung für Überschrift und Verweis. */
export const ankerVon = (slug: string): string => slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function inline(teile: readonly ProjInline[]): string {
  return teile.map(teil => {
    let text = schuetzeMarkdown(teil.text);
    // Reihenfolge ist Absicht: `code` zuerst, damit die Auszeichnungen außen liegen und der
    // Backtick nicht zwischen zwei Sternen steht.
    if (teil.marks.some(mark => mark.art === "code")) text = `\`${teil.text.replaceAll("`", "‘")}\``;
    if (teil.marks.some(mark => mark.art === "strong")) text = `**${text}**`;
    if (teil.marks.some(mark => mark.art === "em")) text = `*${text}*`;
    const link = teil.marks.find(mark => mark.art === "link");
    // Ein Verweis zeigt in dieses Dokument. Ein Ziel, das die Leserin nicht kennt, ist in der
    // Projektion gar nicht erst ein Ziel — hier bleibt es dann schlicht Text mit Sprungmarke.
    if (link && link.art === "link") text = `[${text}](#${ankerVon(link.zielSlug)})`;
    return text;
  }).join("");
}

function block(inhalt: ProjBlock): string {
  switch (inhalt.kind) {
    case "absatz": return inline(inhalt.inhalt);
    case "zitat": return `> ${inline(inhalt.inhalt).replaceAll("\n", "\n> ")}`;
    case "liste": return inhalt.punkte.map((punkt, i) => `${inhalt.geordnet ? `${i + 1}.` : "-"} ${inline(punkt)}`).join("\n");
    case "feld": {
      const label = `**${schuetzeMarkdown(inhalt.label)}**`;
      // Eine mehrwertige Zeile ist eine Aufzählung und bleibt eine — sie zu einer Zeile mit
      // Kommas zusammenzuziehen verlöre die Aussage, dass es mehrere getrennte Werte sind.
      return inhalt.mehrwertig && inhalt.werte.length > 1
        ? `${label}:\n${inhalt.werte.map(wert => `- ${inline(wert)}`).join("\n")}`
        : `${label}: ${inhalt.werte.map(inline).join(", ")}`;
    }
    // Die Bytes des Bildes liegen NICHT in dieser Datei. Ein `![…](…)` würde auf nichts zeigen
    // und beim Öffnen ein kaputtes Bild zeigen — also wird die Abbildung benannt statt behauptet.
    case "bildunterschrift": {
      const name = inhalt.dateiname ?? inhalt.alt ?? inhalt.assetId;
      const text = inline(inhalt.inhalt);
      return `*Abbildung: ${schuetzeMarkdown(name)}*${text ? ` — ${text}` : ""}`;
    }
    // Quarantäne bleibt Quarantäne: unverwandelter Quelltext wird gezeigt, nicht stillschweigend
    // fallengelassen. Eine still verlorene Konstruktion wäre eine Lüge über Vollständigkeit.
    case "rohblock": return `> Aus dem Wiki übernommen — nicht umgewandelt (${inhalt.grund}):\n\n\`\`\`\n${inhalt.quelltext.replaceAll("```", "'''")}\n\`\`\``;
  }
}

/** Die Überschriften, die sich gegenüber dem vorigen Pfad geändert haben — und erst ab dort. */
function ueberschriften(vorher: readonly string[], jetzt: readonly string[], grundtiefe: number): string[] {
  const zeilen: string[] = [];
  let ab = 0;
  while (ab < jetzt.length && ab < vorher.length && jetzt[ab] === vorher[ab]) ab += 1;
  for (let i = ab; i < jetzt.length; i += 1)
    zeilen.push(`${"#".repeat(Math.min(6, grundtiefe + 1 + i))} ${schuetzeMarkdown(jetzt[i]!)}`);
  return zeilen;
}

/** Ein Artikel als Markdown-Abschnitt. `grundtiefe` ist die Ebene seiner eigenen Überschrift. */
export function artikelAlsMarkdown(artikel: EntryProjektion, grundtiefe = 2): string {
  const zeilen = [`${"#".repeat(Math.min(6, grundtiefe))} ${schuetzeMarkdown(artikel.titel)}`, "", `<a id="${ankerVon(artikel.slug)}"></a>`, ""];
  const sortiert = [...artikel.passagen].sort((a: ProjiziertePassage, b: ProjiziertePassage) => a.ord - b.ord);
  let pfad: readonly string[] = [];
  for (const passage of sortiert) {
    for (const zeile of ueberschriften(pfad, passage.pfad, grundtiefe)) { zeilen.push(zeile, ""); }
    pfad = passage.pfad;
    zeilen.push(block(passage.inhalt), "");
  }
  return zeilen.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export interface WikiExport {
  readonly titel: string;
  readonly artikel: readonly EntryProjektion[];
  readonly erzeugtAm: string;
  /** Wahr, wenn die exportierende Person die Spielleitung ist und damit alles sieht. */
  readonly vollstaendig: boolean;
}

/**
 * Die ganze sichtbare Chronik als ein Dokument, mit Inhaltsverzeichnis.
 *
 * **Der Kopf sagt, wessen Blick das ist.** Ein Spielerexport enthält, was diese Figur weiß —
 * nicht die Welt. Das ungesagt zu lassen wäre die unangenehmste Sorte Fehler: jemand hielte
 * eine Teilmenge für das Ganze und merkte es nie.
 */
export function wikiAlsMarkdown(daten: WikiExport): string {
  const kopf = [
    `# ${schuetzeMarkdown(daten.titel)}`,
    "",
    daten.vollstaendig
      ? "Vollständiger Stand der Chronik, ausgegeben für die Spielleitung."
      : "Dies ist **dein** Blick auf die Chronik: enthalten ist, was deine Figur weiß — nicht die ganze Welt.",
    "",
    `Ausgegeben am ${daten.erzeugtAm}. Bilder sind nicht enthalten; Abbildungen werden benannt.`,
    "",
  ];
  if (!daten.artikel.length)
    return [...kopf, "_Noch ist nichts zu lesen._", ""].join("\n");
  const verzeichnis = ["## Inhalt", "", ...daten.artikel.map(a => `- [${schuetzeMarkdown(a.titel)}](#${ankerVon(a.slug)})`), ""];
  return [...kopf, ...verzeichnis, ...daten.artikel.map(a => `${artikelAlsMarkdown(a)}\n`)].join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

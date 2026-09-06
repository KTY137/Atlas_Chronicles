/**
 * Importiert den Eron-Fixture-Auszug in `src/wiki.generated.json`.
 *
 * Bewusst dumm: Dieses Skript strukturiert NICHTS. Es liefert rohen Wikitext
 * plus Metadaten; geparst wird zur Laufzeit von `src/wikitext.ts`. Genau ein
 * Parser für Import und Bearbeitung — sonst laufen Anzeige und Editor
 * auseinander, sobald jemand schreibt.
 *
 * Quelle: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0.
 * Derselbe Weg funktioniert live gegen jede MediaWiki-API (siehe 07 §11.3).
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.resolve("../fixtures/eron");
const raw = JSON.parse(readFileSync(path.join(FIXTURE, "articles.json"), "utf8"));
const articles = Array.isArray(raw) ? raw : (raw.articles ?? Object.values(raw));

/* Medien: Zuordnung nur über Infobox-Bild oder Titeltreffer. Dateiverweise im
   Fliesstext gehoeren oft zu einer anderen Person im selben Artikel — Olav trug
   so einmal Shromus' Portrait. Lieber kein Bild als ein falsches. */
const mediaFiles = readdirSync(path.join(FIXTURE, "media")).filter((f) =>
  f.endsWith(".webp"),
);
const normalise = (name) =>
  name.replace(/\.[a-z]+$/i, "").replace(/[_\s]+/g, "").toLowerCase();
const mediaByKey = new Map(mediaFiles.map((f) => [normalise(f), f]));

const entries = articles
  .map((entry) => {
    const infoboxImage = /\|\s*Bild\s*=\s*(?:Datei|File|Bild):([^|}\n#]+)/i.exec(
      entry.wikitext,
    )?.[1];
    const image =
      (infoboxImage ? mediaByKey.get(normalise(infoboxImage)) : null) ??
      mediaByKey.get(normalise(entry.title)) ??
      mediaFiles.find((f) => normalise(f).startsWith(normalise(entry.title))) ??
      null;

    return {
      title: entry.title,
      wikitext: entry.wikitext,
      lastEdit: (entry.last_edit ?? "").slice(0, 10),
      bytes: entry.bytes,
      image,
      source: "eron.fandom.com/de",
      license: "CC BY-SA 3.0",
      revision: entry.revid ?? null,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, "de"));

writeFileSync("src/wiki.generated.json", `${JSON.stringify({ entries }, null, 0)}\n`);

console.log(
  JSON.stringify(
    {
      artikel: entries.length,
      mitBild: entries.filter((e) => e.image).length,
      zeichen: entries.reduce((s, e) => s + e.wikitext.length, 0),
    },
    null,
    1,
  ),
);

#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Gate „Die Sprache" — Nachricht als Schlüssel bleibt prüfbar.
//
// Das Sprachpaket übersetzt nur die Oberfläche. Der deutsche Quelltext bleibt im Code und
// ist zugleich der Katalogschlüssel (docs/superpowers/specs/2026-09-08-…-design.md,
// Abschnitt B). Genau das kann still verrotten: ein umformulierter deutscher Satz lässt
// seinen Katalogeintrag verwaisen, ein `t(variable)` entzieht sich jeder Prüfung, und ein
// Datenschlüssel aus `szene`/`forge`/`io` im Katalog übersetzt plötzlich gespeicherte
// Werte statt Anzeigetexte. Dieses Gate liest den Quelltext mit dem TypeScript-Scanner
// (typescript@7 liefert keinen Parser im Prozess, wohl aber seinen Lexer) statt mit
// Regexen über JSX.
//
// Fünf Verstöße:
//   fehlend      — eine bereits übersetzte Datei hat einen unübersetzten Schlüssel
//   verwaist     — ein Katalogeintrag hat keine Fundstelle im Code
//   nicht-literal— `t(x)` / `plural(n, a, b)` ohne Zeichenkettenliteral
//   deny         — ein Katalogeintrag ist ein Datenschlüssel aus den eingefrorenen Paketen
//                  (Schlüssel und Array-Elemente der Datenkonstanten, nicht deren Anzeigetabellen)
//   hart-de      — neues hartes "de-DE"/"de" in toLocale*/Intl außerhalb von i18n.ts
//   platzhalter  — die englische Fassung benutzt einen Platzhalter, den der Schlüssel nicht hat

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createScanner, LanguageVariant, ScriptTarget, SyntaxKind } from "typescript/unstable/ast";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

export const QUELLORDNER = ["packages/client/src", "packages/ui/src"];
export const I18N_DATEI = "packages/client/src/i18n.ts";
export const KATALOG_ORDNER = "packages/client/src/i18n/en";
export const PLURAL_DATEI = "packages/client/src/i18n/en.plural.json";

/** Datenpakete: was dort als Literal steht, ist ein Schlüssel oder ein gespeicherter Wert. */
export const DENY_DATEIEN = [
  "packages/szene/src/model.ts",
  "packages/szene/src/asset-genres.ts",
  "packages/forge/src/grundriss.ts",
  "packages/forge/src/bauprogramme.ts",
  "packages/rules/src/templates/how-to-be-a-hero.ts",
  "packages/io/src/wikitext.ts",
  "packages/chronist/src/provider-profile.ts",
  "packages/server/src/domain/public-projection.ts",
];

/** Der Bestand vom 2026-09-08, den Welle 2 auf `locale()` umstellt: 24 Stellen in 17 Dateien.
 * Die Zahl ist eine Obergrenze je Datei — abbauen ist erlaubt, neu anlegen nicht. */
export const LOKAL_ALLOWLIST = {
  "packages/client/src/Account.tsx": 1,
  "packages/client/src/Reader.tsx": 1,
  "packages/client/src/Round.tsx": 3,
  "packages/client/src/Wiki.tsx": 1,
  "packages/client/src/features/ChannelView.tsx": 1,
  "packages/client/src/features/CharacterSheet.tsx": 1,
  "packages/client/src/features/ChronistSessionNotes.tsx": 1,
  "packages/client/src/features/ChronistWorkbench.tsx": 1,
  "packages/client/src/features/MapGenerationControls.tsx": 2,
  "packages/client/src/features/PassageProvenance.tsx": 1,
  "packages/client/src/features/PublicationWorkbench.tsx": 1,
  "packages/client/src/features/RollCard.tsx": 1,
  "packages/client/src/features/TableView.tsx": 1,
  "packages/client/src/features/TacticalCanvas.tsx": 2,
  "packages/client/src/features/TacticalGenerate.tsx": 2,
  "packages/client/src/features/WeekView.tsx": 1,
  "packages/client/src/features/chronist-model.ts": 3,
};

/** `errorText` reicht den Satz des Servers durch; er steht erst zur Laufzeit fest. */
export const DYNAMISCH_ERLAUBT = { "packages/client/src/api.ts": 1 };
/** Anzeigetabellen bleiben in ihrem Paket; der Client übersetzt an der Anzeigestelle mit
 * `t(BAUWERK_LABEL[typ])` und filtert weiter über den deutschen Wert (Spec B, „Grenze"). */
export const ETIKETT_KONSTANTEN = /_(?:LABEL|LABELS|TITEL)$/;
/** Datenkonstanten: ihre Schlüssel und Array-Elemente sind gespeicherte Werte, keine Anzeige.
 * Ihre Anzeigetabellen (`*_LABEL`) sind ausdrücklich nicht gemeint. */
export const DENY_KONSTANTEN = /(?:_TYPEN|_SETTINGS|_GENRES|_ARTEN|_KANTEN|_NAMESPACES)$/;
const DISKRIMINATOREN = new Set(["art", "kind", "role"]);

const LOKAL_FUNKTIONEN = new Set(["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]);
const LOKAL_WERTE = new Set(["de", "de-DE"]);
const LITERAL_ARTEN = new Set([SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral]);
const AUF = new Set([SyntaxKind.OpenParenToken, SyntaxKind.OpenBracketToken, SyntaxKind.OpenBraceToken]);
const ZU = new Set([SyntaxKind.CloseParenToken, SyntaxKind.CloseBracketToken, SyntaxKind.CloseBraceToken]);

/** Der echte TypeScript-Lexer: Kommentare und Zeichenketten zählen nicht als Code.
 * Ein `}` in einem Template-Literal muss wie im TypeScript-Parser nachgescannt werden,
 * sonst verschluckt der nächste Backtick den halben Rest der Datei. */
export function tokenListe(text) {
  const scanner = createScanner(ScriptTarget.Latest, true, LanguageVariant.JSX);
  scanner.setText(text);
  const tokens = [], klammern = [];
  for (let schutz = 0; schutz < 4_000_000; schutz++) {
    let kind = scanner.scan();
    if (kind === SyntaxKind.CloseBraceToken && klammern.length > 0) {
      if (klammern[klammern.length - 1] > 0) klammern[klammern.length - 1]--;
      else kind = scanner.reScanTemplateToken(false);
    } else if (kind === SyntaxKind.OpenBraceToken && klammern.length > 0) klammern[klammern.length - 1]++;
    if (kind === SyntaxKind.TemplateHead) klammern.push(0);
    else if (kind === SyntaxKind.TemplateMiddle) klammern[klammern.length - 1] = 0;
    else if (kind === SyntaxKind.TemplateTail) klammern.pop();
    if (kind === SyntaxKind.EndOfFile || kind === undefined) break;
    tokens.push({ kind, text: scanner.getTokenText(), wert: LITERAL_ARTEN.has(kind) ? scanner.getTokenValue() : "", start: scanner.getTokenStart() });
  }
  return tokens;
}

function zeileVon(text, offset) {
  let zeile = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === "\n") zeile++;
  return zeile;
}

/** Die Argumentgruppen eines Aufrufs; `null`, wenn die Klammer nicht schließt. */
function argumente(tokens, klammer) {
  const gruppen = [];
  let aktuell = [], tiefe = 0;
  for (let j = klammer + 1; j < tokens.length; j++) {
    const kind = tokens[j].kind;
    if (kind === SyntaxKind.CloseParenToken && tiefe === 0) { gruppen.push(aktuell); return gruppen; }
    if (kind === SyntaxKind.CommaToken && tiefe === 0) { gruppen.push(aktuell); aktuell = []; continue; }
    if (AUF.has(kind)) tiefe++; else if (ZU.has(kind)) tiefe--;
    aktuell.push(tokens[j]);
  }
  return null;
}

const literalWert = gruppe => gruppe && gruppe.length === 1 && LITERAL_ARTEN.has(gruppe[0].kind) ? gruppe[0].wert : null;

/** Alle `t`/`plural`-Aufrufe und alle harten Sprachkennungen einer Quelldatei. */
export function sammleAufrufe(text) {
  const tokens = tokenListe(text);
  const texte = [], pluralformen = [], nichtLiteral = [], lokal = [], etiketten = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== SyntaxKind.Identifier || tokens[i + 1]?.kind !== SyntaxKind.OpenParenToken) continue;
    const davor = tokens[i - 1]?.kind;
    const zugriff = davor === SyntaxKind.DotToken || davor === SyntaxKind.QuestionDotToken;
    const zeile = zeileVon(text, token.start);
    // `t`/`plural` sind Modulfunktionen; `obj.t(…)` und `function t(` sind etwas anderes.
    if (!zugriff && davor !== SyntaxKind.FunctionKeyword && (token.text === "t" || token.text === "plural")) {
      const gruppen = argumente(tokens, i + 1);
      if (!gruppen) { nichtLiteral.push({ zeile, aufruf: `${token.text}(…)` }); continue; }
      if (token.text === "t") {
        const schluessel = literalWert(gruppen[0]);
        const kopf = gruppen[0]?.[0];
        if (schluessel !== null) texte.push({ schluessel, zeile });
        // `t(BAUWERK_LABEL[typ])` schlägt die Anzeigetabelle im Katalog nach; sie steht in
        // ihrem Paket, nicht hier, und ihre Werte sind über den Deny-Test erlaubt.
        else if (kopf?.kind === SyntaxKind.Identifier && ETIKETT_KONSTANTEN.test(kopf.text)) etiketten.push({ zeile, name: kopf.text });
        else nichtLiteral.push({ zeile, aufruf: "t(…)" });
      } else {
        const eins = literalWert(gruppen[1]), viele = literalWert(gruppen[2]);
        if (eins === null || viele === null) nichtLiteral.push({ zeile, aufruf: "plural(…)" }); else pluralformen.push({ schluessel: eins, viele, zeile });
      }
      continue;
    }
    // Datums- und Zahlformate: `wert.toLocaleString("de-DE")` und `new Intl.X("de-DE")`.
    if (!zugriff || (!LOKAL_FUNKTIONEN.has(token.text) && tokens[i - 2]?.text !== "Intl")) continue;
    for (const gruppe of argumente(tokens, i + 1) ?? []) {
      for (const teil of gruppe) if (LITERAL_ARTEN.has(teil.kind) && LOKAL_WERTE.has(teil.wert)) lokal.push({ zeile, wert: teil.wert });
    }
  }
  return { texte, plural: pluralformen, nichtLiteral, lokal, etiketten };
}

/** Nur die gespeicherten Werte einer Datei: Schlüssel und Array-Elemente der Datenkonstanten
 * sowie `art:`/`kind:`/`role:`-Werte. Anzeigetexte aus `*_LABEL`/`*_TITEL` bleiben draußen —
 * „Schmiede" ist ein Navigationslabel, „schmiede" ein Datenschlüssel. */
export function sammleDatenschluessel(text) {
  const tokens = tokenListe(text);
  const werte = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== SyntaxKind.Identifier) continue;
    if (DISKRIMINATOREN.has(token.text) && tokens[i + 1]?.kind === SyntaxKind.ColonToken && LITERAL_ARTEN.has(tokens[i + 2]?.kind)) {
      werte.add(tokens[i + 2].wert);
      continue;
    }
    if (!DENY_KONSTANTEN.test(token.text) || ETIKETT_KONSTANTEN.test(token.text)) continue;
    let j = i + 1;
    while (j < tokens.length && tokens[j].kind !== SyntaxKind.EqualsToken && tokens[j].kind !== SyntaxKind.SemicolonToken) j++;
    if (tokens[j]?.kind !== SyntaxKind.EqualsToken) continue;
    const stapel = [];
    for (j++; j < tokens.length; j++) {
      const kind = tokens[j].kind;
      if (AUF.has(kind)) { stapel.push(kind); continue; }
      if (kind === SyntaxKind.OpenParenToken) { stapel.push(kind); continue; }
      if (ZU.has(kind) || kind === SyntaxKind.CloseParenToken) { stapel.pop(); if (stapel.length === 0) break; continue; }
      if (stapel.length === 0 && (kind === SyntaxKind.SemicolonToken || kind === SyntaxKind.CommaToken)) break;
      const oben = stapel[stapel.length - 1];
      const schluessel = tokens[j + 1]?.kind === SyntaxKind.ColonToken;
      if (oben === SyntaxKind.OpenBracketToken && LITERAL_ARTEN.has(kind)) werte.add(tokens[j].wert);
      else if (oben === SyntaxKind.OpenBraceToken && schluessel && LITERAL_ARTEN.has(kind)) werte.add(tokens[j].wert);
      else if (oben === SyntaxKind.OpenBraceToken && schluessel && kind === SyntaxKind.Identifier) werte.add(tokens[j].text);
    }
    i = j;
  }
  return werte;
}

const platzhalter = text => new Set([...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(treffer => treffer[1]));

/** Die reine Prüfung. Alles Lesen steckt in `main`, damit der Selbsttest ohne Dateien auskommt. */
export function pruefeSprache({ quellen, katalog = {}, plural = {}, dynamisch = [], denyLiterale = new Set(), lokalAllowlist = {}, dynamischErlaubt = {} }) {
  const verstoesse = [];
  const genutzteTexte = new Map(), genutztePlural = new Map();
  const offen = [];
  const dynamischSatz = new Set(dynamisch);

  for (const { datei, text } of quellen) {
    const { texte, plural: pluralAufrufe, nichtLiteral, lokal } = sammleAufrufe(text);
    const erlaubteDynamik = dynamischErlaubt[datei] ?? 0;
    if (nichtLiteral.length > erlaubteDynamik) {
      for (const stelle of nichtLiteral.slice(erlaubteDynamik)) {
        verstoesse.push(`nicht-literal · ${datei}:${stelle.zeile} · ${stelle.aufruf} entzieht sich dem Katalog; nur Literale sind Schlüssel`);
      }
    }
    const erlaubtLokal = lokalAllowlist[datei] ?? 0;
    if (lokal.length > erlaubtLokal) {
      for (const stelle of lokal.slice(erlaubtLokal)) {
        verstoesse.push(`hart-de · ${datei}:${stelle.zeile} · "${stelle.wert}" in toLocale*/Intl; nimm locale() aus i18n.ts`);
      }
    }
    let getroffen = false;
    const fehlend = [];
    for (const { schluessel, zeile } of texte) {
      genutzteTexte.set(schluessel, (genutzteTexte.get(schluessel) ?? 0) + 1);
      if (Object.hasOwn(katalog, schluessel)) getroffen = true; else fehlend.push({ art: "t", schluessel, zeile });
    }
    for (const { schluessel, zeile } of pluralAufrufe) {
      genutztePlural.set(schluessel, (genutztePlural.get(schluessel) ?? 0) + 1);
      if (Object.hasOwn(plural, schluessel)) getroffen = true; else fehlend.push({ art: "plural", schluessel, zeile });
    }
    for (const stelle of fehlend) {
      // Eine angefangene Datei muss fertig werden; eine unberührte darf noch deutsch sein.
      if (getroffen) verstoesse.push(`fehlend · ${datei}:${stelle.zeile} · ${stelle.art}("${stelle.schluessel}") ohne Katalogeintrag`);
      else offen.push(`${datei}:${stelle.zeile}`);
    }
  }

  for (const [schluessel, wert] of Object.entries(katalog)) {
    if (!genutzteTexte.has(schluessel) && !dynamischSatz.has(schluessel)) {
      verstoesse.push(`verwaist · en/*.json · "${schluessel}" kommt im Quelltext nicht als t("…") vor`);
    }
    if (denyLiterale.has(schluessel)) verstoesse.push(`deny · en/*.json · "${schluessel}" ist ein Datenschlüssel aus den eingefrorenen Paketen`);
    const erlaubt = platzhalter(schluessel);
    for (const name of platzhalter(wert)) if (!erlaubt.has(name)) verstoesse.push(`platzhalter · en/*.json · "${schluessel}" kennt kein {${name}}`);
  }
  for (const [schluessel, formen] of Object.entries(plural)) {
    if (!genutztePlural.has(schluessel)) verstoesse.push(`verwaist · en.plural.json · "${schluessel}" kommt im Quelltext nicht als plural(…) vor`);
    if (denyLiterale.has(schluessel)) verstoesse.push(`deny · en.plural.json · "${schluessel}" ist ein Datenschlüssel aus den eingefrorenen Paketen`);
    const erlaubt = platzhalter(schluessel).add("n");
    for (const form of [formen.eins, formen.viele]) {
      for (const name of platzhalter(form)) if (!erlaubt.has(name)) verstoesse.push(`platzhalter · en.plural.json · "${schluessel}" kennt kein {${name}}`);
    }
  }

  return { verstoesse, schluessel: Object.keys(katalog).length + Object.keys(plural).length, offen, dateien: quellen.length };
}

async function* wandere(ordner) {
  let eintraege;
  try { eintraege = await readdir(ordner, { withFileTypes: true }); } catch { return; }
  for (const eintrag of eintraege) {
    if (eintrag.name === "node_modules" || eintrag.name === "dist" || eintrag.name.startsWith(".")) continue;
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) yield* wandere(pfad);
    else if (/\.(ts|tsx)$/.test(eintrag.name)) yield pfad;
  }
}

const alsPfad = absolut => relative(ROOT, absolut).split("\\").join("/");
const lies = async pfad => JSON.parse(await readFile(join(ROOT, pfad), "utf8"));

async function main() {
  const quellen = [];
  for (const ordner of QUELLORDNER) {
    for await (const datei of wandere(join(ROOT, ordner))) {
      const pfad = alsPfad(datei);
      if (pfad === I18N_DATEI) continue;
      quellen.push({ datei: pfad, text: await readFile(datei, "utf8") });
    }
  }

  const katalog = {}, dynamisch = [];
  let paketDateien = 0;
  for (const name of (await readdir(join(ROOT, KATALOG_ORDNER)).catch(() => [])).filter(name => name.endsWith(".json")).sort()) {
    paketDateien++;
    for (const [schluessel, wert] of Object.entries(await lies(`${KATALOG_ORDNER}/${name}`))) {
      if (schluessel === "__dynamisch") { if (Array.isArray(wert)) dynamisch.push(...wert); continue; }
      if (schluessel.startsWith("__")) continue;
      if (typeof wert !== "string") { console.error(`gate:sprache — ${name}: "${schluessel}" ist kein Text`); process.exit(2); }
      if (Object.hasOwn(katalog, schluessel)) { console.error(`gate:sprache — "${schluessel}" steht in mehr als einer Paketdatei`); process.exit(2); }
      katalog[schluessel] = wert;
    }
  }
  const plural = {};
  for (const [schluessel, formen] of Object.entries(await lies(PLURAL_DATEI).catch(() => ({})))) {
    if (schluessel.startsWith("__")) continue;
    if (!formen || typeof formen.eins !== "string" || typeof formen.viele !== "string") { console.error(`gate:sprache — en.plural.json: "${schluessel}" braucht eins und viele`); process.exit(2); }
    plural[schluessel] = formen;
  }

  const denyLiterale = new Set();
  for (const datei of DENY_DATEIEN) {
    for (const wert of sammleDatenschluessel(await readFile(join(ROOT, datei), "utf8"))) denyLiterale.add(wert);
  }

  const ergebnis = pruefeSprache({ quellen, katalog, plural, dynamisch, denyLiterale, lokalAllowlist: LOKAL_ALLOWLIST, dynamischErlaubt: DYNAMISCH_ERLAUBT });

  if (ergebnis.verstoesse.length > 0) {
    console.error(`\nGATE RED — Sprachpaket (${ergebnis.verstoesse.length}):\n`);
    for (const verstoss of ergebnis.verstoesse) console.error(`  ${verstoss}`);
    console.error("");
    process.exit(1);
  }

  console.log(`gate:sprache GREEN — ${ergebnis.schluessel} Schlüssel aus ${paketDateien} Paketdateien, ${ergebnis.dateien} Quelldateien geprüft, ${ergebnis.offen.length} offene Texte, ${denyLiterale.size} gesperrte Literale, 0 Verstöße`);
}

if (/gate-sprache\.mjs$/.test((process.argv[1] ?? "").split("\\").join("/"))) await main();

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DYNAMISCH_ERLAUBT, LOKAL_ALLOWLIST, pruefeSprache, sammleAufrufe, sammleDatenschluessel } from "../gate-sprache.mjs";

const quelle = (datei, text) => [{ datei, text }];
const arten = ergebnis => ergebnis.verstoesse.map(zeile => zeile.split(" ·")[0]);

test("liest t und plural aus echtem JSX, nicht aus Kommentaren, Strings und Template-Literalen", () => {
  const text = `
    // t("aus einem Kommentar")
    const spur = \`\${wert} t("aus einem Template") \${anderes}\`;
    const roh = 't("aus einem String")';
    export function Panel() {
      return <p title={t("Titel")}>{t("Hallo {name}", { name })} · {plural(n, "{n} Karte", "{n} Karten")}</p>;
    }`;
  const gefunden = sammleAufrufe(text);
  assert.deepEqual(gefunden.texte.map(stelle => stelle.schluessel), ["Titel", "Hallo {name}"]);
  assert.deepEqual(gefunden.plural.map(stelle => stelle.schluessel), ["{n} Karte"]);
  assert.equal(gefunden.nichtLiteral.length, 0);
});

test("zählt ein Template-Literal mit Einsetzung nicht als offenes Anführungszeichen", () => {
  // Ohne Nachscannen des schließenden } verschluckt der nächste Backtick den Rest der Datei.
  const text = 'const a = `x ${y} z`;\nconst b = new Date().toLocaleString("de-DE");\n';
  assert.equal(sammleAufrufe(text).lokal.length, 1);
});

test("erkennt harte Sprachkennungen in toLocale* und Intl, aber nicht in Sortierung und Filtern", () => {
  const text = `
    wert.toLocaleString("de-DE");
    wert.toLocaleDateString("de");
    new Intl.NumberFormat("de-DE", { style: "currency" });
    name.toLocaleLowerCase("de");
    a.localeCompare(b, "de");
    wert.toLocaleString(locale());`;
  assert.deepEqual(sammleAufrufe(text).lokal.map(stelle => stelle.wert), ["de-DE", "de", "de-DE"]);
});

test("erlaubt genau den Bestand der Allowlist und meldet jede zusätzliche Stelle", () => {
  const datei = "packages/client/src/features/WeekView.tsx";
  const eine = pruefeSprache({ quellen: quelle(datei, 'x.toLocaleString("de-DE");'), lokalAllowlist: LOKAL_ALLOWLIST });
  assert.deepEqual(eine.verstoesse, []);
  const zwei = pruefeSprache({ quellen: quelle(datei, 'x.toLocaleString("de-DE"); y.toLocaleDateString("de-DE");'), lokalAllowlist: LOKAL_ALLOWLIST });
  assert.deepEqual(arten(zwei), ["hart-de"]);
  const fremd = pruefeSprache({ quellen: quelle("packages/ui/src/index.tsx", 'x.toLocaleString("de-DE");'), lokalAllowlist: LOKAL_ALLOWLIST });
  assert.deepEqual(arten(fremd), ["hart-de"]);
});

test("weist nicht-literale Argumente zurück, außer an der einen dynamischen Stelle", () => {
  const frei = pruefeSprache({ quellen: quelle("packages/client/src/Wiki.tsx", "const a = t(fehler.message), b = plural(n, eins, viele);") });
  assert.deepEqual(arten(frei), ["nicht-literal", "nicht-literal"]);
  const api = pruefeSprache({ quellen: quelle("packages/client/src/api.ts", "const a = t(fehler.message);"), dynamischErlaubt: DYNAMISCH_ERLAUBT });
  assert.deepEqual(api.verstoesse, []);
  const zwei = pruefeSprache({ quellen: quelle("packages/client/src/api.ts", "const a = t(fehler.message), b = t(anderes);"), dynamischErlaubt: DYNAMISCH_ERLAUBT });
  assert.deepEqual(arten(zwei), ["nicht-literal"]);
});

test("meldet einen leeren Katalog als offen, eine angefangene Datei aber als unvollständig", () => {
  const text = 'const a = t("Speichern"), b = t("Verwerfen");';
  const leer = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", text) });
  assert.deepEqual(leer.verstoesse, []);
  assert.equal(leer.offen.length, 2);
  assert.equal(leer.schluessel, 0);

  const halb = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", text), katalog: { Speichern: "Save" } });
  assert.deepEqual(arten(halb), ["fehlend"]);
  assert.match(halb.verstoesse[0], /Verwerfen/);

  const ganz = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", text), katalog: { Speichern: "Save", Verwerfen: "Discard" } });
  assert.deepEqual(ganz.verstoesse, []);
  assert.equal(ganz.schluessel, 2);
});

test("meldet verwaiste Einträge, verschont aber die als dynamisch erklärten Serversätze", () => {
  const verwaist = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", ""), katalog: { "Alter Satz": "Old sentence" } });
  assert.deepEqual(arten(verwaist), ["verwaist"]);
  const dynamisch = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", ""), katalog: { "Alter Satz": "Old sentence" }, dynamisch: ["Alter Satz"] });
  assert.deepEqual(dynamisch.verstoesse, []);
  const pluralVerwaist = pruefeSprache({ quellen: quelle("packages/client/src/Round.tsx", ""), plural: { "{n} Karte": { eins: "{n} map", viele: "{n} maps" } } });
  assert.deepEqual(arten(pluralVerwaist), ["verwaist"]);
});

// Die Deny-Datei in der Form, in der `packages/szene/src/model.ts` sie wirklich hat.
const DATENPAKET = `
  export const BAUWERK_TYPEN = Object.freeze(["haus", "schmiede"] as const);
  export const BAUWERK_LABEL: Readonly<Record<BauwerkTyp, string>> = Object.freeze({
    haus: "Wohnhaus", schmiede: "Schmiede",
  });
  export const RAUM_KANTEN: readonly KantenArt[] = ["liegt_in_geografie"];
  export const MEDIAWIKI_NAMESPACES = { "Datei": "Datei" };
  const knoten = { art: "bauwerk", label: "Bauwerk" };`;

test("sperrt Datenschlüssel und Kantennamen, aber nicht die Werte der Anzeigetabellen", () => {
  const deny = sammleDatenschluessel(DATENPAKET);
  assert.ok(deny.has("schmiede") && deny.has("liegt_in_geografie") && deny.has("Datei") && deny.has("bauwerk"));
  assert.ok(!deny.has("Schmiede") && !deny.has("Wohnhaus") && !deny.has("Bauwerk"));
});

test("hält Datenschlüssel aus dem Katalog heraus, lässt aber „Schmiede“ als Anzeigetext zu", () => {
  const denyLiterale = sammleDatenschluessel(DATENPAKET);
  const anzeige = pruefeSprache({
    quellen: quelle("packages/client/src/App.tsx", 'const a = t("Schmiede");'),
    katalog: { Schmiede: "Forge" }, denyLiterale,
  });
  assert.deepEqual(anzeige.verstoesse, []);
  const datenschluessel = pruefeSprache({
    quellen: quelle("packages/client/src/App.tsx", 'const a = t("bauwerk");'),
    katalog: { bauwerk: "building" }, denyLiterale,
  });
  assert.deepEqual(arten(datenschluessel), ["deny"]);
});

test("erlaubt die Anzeigestelle t(BAUWERK_LABEL[typ]) und nur sie", () => {
  const erlaubt = sammleAufrufe('const a = t(BAUWERK_LABEL[typ]), b = t(RAUM_LABEL), c = t(ZEIT_RAUM_TITEL);');
  assert.equal(erlaubt.nichtLiteral.length, 0);
  assert.deepEqual(erlaubt.etiketten.map(stelle => stelle.name), ["BAUWERK_LABEL", "RAUM_LABEL", "ZEIT_RAUM_TITEL"]);
  const frei = sammleAufrufe("const a = t(BAUWERK_TYPEN[typ]);");
  assert.equal(frei.nichtLiteral.length, 1);
  assert.deepEqual(pruefeSprache({ quellen: quelle("packages/client/src/Wiki.tsx", "const a = t(BAUWERK_LABEL[typ]);") }).verstoesse, []);
});

test("verlangt, dass die englische Fassung nur Platzhalter des Schlüssels benutzt", () => {
  const gut = pruefeSprache({
    quellen: quelle("packages/client/src/Round.tsx", 'const a = t("Hallo {name}"); const b = plural(n, "{n} Karte", "{n} Karten");'),
    katalog: { "Hallo {name}": "Hello {name}" }, plural: { "{n} Karte": { eins: "{n} map", viele: "{n} maps" } },
  });
  assert.deepEqual(gut.verstoesse, []);
  const schlecht = pruefeSprache({
    quellen: quelle("packages/client/src/Round.tsx", 'const a = t("Hallo {name}"); const b = plural(n, "{n} Karte", "{n} Karten");'),
    katalog: { "Hallo {name}": "Hello {naem}" }, plural: { "{n} Karte": { eins: "{count} map", viele: "{n} maps" } },
  });
  assert.deepEqual(arten(schlecht), ["platzhalter", "platzhalter"]);
});

test("verwechselt eine Eigenschaft namens t und eine eigene Deklaration nicht mit dem Katalogaufruf", () => {
  const text = 'const x = obj.t("kein Schlüssel"); function t(text) { return text; } export const y = i18n?.t("auch nicht");';
  assert.deepEqual(sammleAufrufe(text).texte, []);
  assert.deepEqual(sammleAufrufe(text).nichtLiteral, []);
});

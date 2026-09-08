// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { beforeEach, describe, expect, it } from "vitest";
import * as Theme from "../../theme/src/index.ts";
import * as I18n from "../src/i18n.ts";
import { I18nStub, aktuelleSprache, locale, plural, setzeEnglischeQuelleFuerTests, setzeSprache, subscribe, t } from "../src/i18n.ts";

const KATALOG = {
  texte: {
    "Speichern": "Save",
    "Hallo {name}, du hast {anzahl} offene Anträge.": "Hello {name}, you have {anzahl} open requests.",
  },
  plural: { "{n} Vorschlag": { eins: "{n} suggestion", viele: "{n} suggestions" } },
};

describe("Nachricht als Schlüssel", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("liefert ohne geladenen Katalog den deutschen Quelltext", () => {
    expect(aktuelleSprache()).toBe("de");
    expect(locale()).toBe("de-DE");
    expect(t("Speichern")).toBe("Speichern");
  });

  it("füllt Platzhalter auch auf Deutsch und lässt unbekannte stehen", () => {
    expect(t("Hallo {name}, du hast {anzahl} offene Anträge.", { name: "Kaya", anzahl: 2 }))
      .toBe("Hallo Kaya, du hast 2 offene Anträge.");
    expect(t("Hallo {name}", {})).toBe("Hallo {name}");
  });

  it("übersetzt nach setzeSprache(\"en\") und füllt die Platzhalter der englischen Fassung", async () => {
    let ladungen = 0;
    setzeEnglischeQuelleFuerTests(async () => { ladungen++; return KATALOG; });
    await setzeSprache("en");
    expect(aktuelleSprache()).toBe("en");
    expect(locale()).toBe("en-GB");
    expect(t("Speichern")).toBe("Save");
    expect(t("Hallo {name}, du hast {anzahl} offene Anträge.", { name: "Kaya", anzahl: 2 }))
      .toBe("Hello Kaya, you have 2 open requests.");
    expect(ladungen).toBe(1);
  });

  it("fällt für fehlende Einträge auf den deutschen Quelltext zurück", async () => {
    setzeEnglischeQuelleFuerTests(async () => KATALOG);
    await setzeSprache("en");
    expect(t("Noch nicht übersetzt")).toBe("Noch nicht übersetzt");
  });

  it("lädt den englischen Katalog genau einmal", async () => {
    let ladungen = 0;
    setzeEnglischeQuelleFuerTests(async () => { ladungen++; return KATALOG; });
    await setzeSprache("en");
    await setzeSprache("de");
    await setzeSprache("en");
    expect(ladungen).toBe(1);
  });

  it("lehnt einen fehlgeschlagenen Import ab, bleibt deutsch und lässt den zweiten Versuch zu", async () => {
    let versuche = 0;
    setzeEnglischeQuelleFuerTests(async () => { if (++versuche === 1) throw new Error("import failed"); return KATALOG; });
    await expect(setzeSprache("en")).rejects.toThrow("import failed");
    expect(aktuelleSprache()).toBe("de");
    expect(t("Speichern")).toBe("Speichern");
    await setzeSprache("en");
    expect(versuche).toBe(2);
    expect(t("Speichern")).toBe("Save");
  });

  it("kehrt auf Deutsch zurück", async () => {
    setzeEnglischeQuelleFuerTests(async () => KATALOG);
    await setzeSprache("en");
    await setzeSprache("de");
    expect(aktuelleSprache()).toBe("de");
    expect(locale()).toBe("de-DE");
    expect(t("Speichern")).toBe("Speichern");
  });

  it("wählt beide Pluralformen, bindet {n} und schreibt die Zahl in der gewählten Sprache", async () => {
    expect(plural(1, "{n} Vorschlag", "{n} Vorschläge")).toBe("1 Vorschlag");
    expect(plural(3, "{n} Vorschlag", "{n} Vorschläge")).toBe("3 Vorschläge");
    expect(plural(1234, "{n} Vorschlag", "{n} Vorschläge")).toBe("1.234 Vorschläge");
    setzeEnglischeQuelleFuerTests(async () => KATALOG);
    await setzeSprache("en");
    expect(plural(1, "{n} Vorschlag", "{n} Vorschläge")).toBe("1 suggestion");
    expect(plural(3, "{n} Vorschlag", "{n} Vorschläge")).toBe("3 suggestions");
    expect(plural(1234, "{n} Vorschlag", "{n} Vorschläge")).toBe("1,234 suggestions");
    expect(plural(3, "{n} Karte", "{n} Karten")).toBe("3 Karten");
  });

  it("meldet Sprachwechsel an Abonnenten und beendet die Anmeldung", async () => {
    setzeEnglischeQuelleFuerTests(async () => KATALOG);
    let rufe = 0;
    const abmelden = subscribe(() => { rufe++; });
    await setzeSprache("en");
    expect(rufe).toBe(1);
    await setzeSprache("en");
    expect(rufe).toBe(1);
    abmelden();
    await setzeSprache("de");
    expect(rufe).toBe(1);
  });

  it("meldet auch die späte Ankunft des Katalogs bei schon gesetzter Startsprache", async () => {
    setzeEnglischeQuelleFuerTests(async () => KATALOG);
    I18n.initialisiereSprache("en");
    let rufe = 0;
    const abmelden = subscribe(() => { rufe++; });
    expect(t("Speichern")).toBe("Speichern");
    await setzeSprache("en");
    expect(rufe).toBe(1);
    expect(t("Speichern")).toBe("Save");
    abmelden();
  });

  it("lädt den echten Katalogordner ohne Fehler und lässt Unbekanntes deutsch", async () => {
    // Kein Satz aus dem echten Katalog: die acht Pakete landen unabhängig voneinander,
    // eine Erwartung auf einen bestimmten Eintrag wäre von ihrer Reihenfolge abhängig.
    const unbekannt = "__i18n_test_unbekannt__";
    await expect(setzeSprache("en")).resolves.toBeUndefined();
    expect(aktuelleSprache()).toBe("en");
    expect(locale()).toBe("en-GB");
    expect(t(unbekannt)).toBe(unbekannt);
    expect(t(unbekannt, { name: "Kaya" })).toBe(unbekannt);
    expect(plural(2, unbekannt, `${unbekannt}!`)).toBe(`${unbekannt}!`);
  });

  it("hält im Prüfstand-Stub Deutsch und interpoliert trotzdem", () => {
    expect(I18nStub.aktuelleSprache()).toBe("de");
    expect(I18nStub.locale()).toBe("de-DE");
    expect(I18nStub.t("Hallo {name}", { name: "Kaya" })).toBe("Hallo Kaya");
    expect(I18nStub.plural(2, "{n} Vorschlag", "{n} Vorschläge")).toBe("2 Vorschläge");
  });
});

/** Prüfstand wie in den übrigen Client-Suiten: die echten Komponenten laufen mit
 * kontrollierten Hooks, ohne DOM und ohne React. Der `key` überlebt die Elementfabrik,
 * weil genau er über den Neuaufbau des Baums entscheidet. */
function bauePruefstand() {
  const slots: any[] = [];
  let cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [];
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    Fragment: "Fragment",
    createContext: () => ({ Provider: "Provider" }),
    useContext: () => null,
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useMemo(fn: () => unknown) { return fn(); },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
    useLayoutEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
    useSyncExternalStore(anmelden: (h: () => void) => () => void, stand: () => unknown) {
      const i = cursor++; slots[i] ??= { ab: anmelden(() => { changed = true; }) };
      return stand();
    },
  };
  const element = (type: unknown, props: any, key?: unknown) => ({ type, props, key });
  return {
    lade(datei: string, mocks: Record<string, unknown>, umgebung: Record<string, unknown> = {}) {
      const quelle = readFileSync(new URL(`../src/features/${datei}`, import.meta.url), "utf8");
      const mod = { exports: {} as any };
      runInNewContext(transformSync(quelle, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
        module: mod, exports: mod.exports, ...umgebung,
        require: (name: string) => {
          if (name in mocks) return mocks[name];
          if (name === "react") return react;
          if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
          return new Proxy({}, { get: (_ziel, schluessel) => String(schluessel) });
        },
      });
      return mod.exports;
    },
    render(fn: (props: any) => any, props: any) {
      let baum: any;
      for (let runde = 0; runde < 30; runde++) {
        cursor = 0; changed = false; effects = [];
        baum = fn(props);
        for (const wirkung of effects) { slots[wirkung.i].cleanup?.(); slots[wirkung.i].cleanup = wirkung.fn(); }
        if (!changed) return baum;
      }
      throw new Error("Bauteil kam nicht zur Ruhe");
    },
  };
}

const knoten = (baum: any, passt: (node: any) => boolean): any[] => {
  const gefunden: any[] = [];
  const gehe = (node: any) => { if (Array.isArray(node)) node.forEach(gehe); else if (node?.props) { if (passt(node)) gefunden.push(node); gehe(node.props.children); } };
  gehe(baum); return gefunden;
};
const ruhe = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const FEHLERTEXT = "Das englische Sprachpaket konnte nicht geladen werden.";
const wurzelElement = () => ({ lang: "", style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {} });

describe("Sprachwahl in „Deine Darstellung“", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  function einstellungen(sprache: "de" | "en", bestaetigen: boolean, spracheWechseln: (s: string) => Promise<void>) {
    const stand = bauePruefstand();
    const gerufen: { update: unknown[]; confirm: string[] } = { update: [], confirm: [] };
    const darstellung = {
      preferences: { ...Theme.DEFAULT_ACCESSIBILITY_PREFERENCES, language: sprache },
      resolved: { basePreset: "Fantasy" }, spracheFehler: "", storageError: "",
      update: (naechste: unknown) => gerufen.update.push(naechste),
    };
    const modul = stand.lade("AppearanceSettings.tsx", {
      "@chronicle/theme": Theme,
      "@chronicle/ui": { Button: "Button", Notice: "Notice" },
      "../i18n": { ...I18nStub, setzeSprache: spracheWechseln },
      "./Appearance": { spracheFehlerText: () => FEHLERTEXT, useAppearance: () => darstellung },
    }, { window: { confirm: (frage: string) => { gerufen.confirm.push(frage); return bestaetigen; } } });
    const auswahl = () => knoten(stand.render(modul.AppearanceSettings, {}), node => node.type === "select" && node.props["aria-label"] === "Sprache")[0];
    return { stand, gerufen, auswahl, hinweise: () => knoten(stand.render(modul.AppearanceSettings, {}), node => node.type === "Notice" && node.props.error) };
  }

  it("fragt vor dem Sprachwechsel und bricht bei Nein ohne jede Wirkung ab", async () => {
    const gewechselt: string[] = [];
    const { gerufen, auswahl } = einstellungen("de", false, async s => { gewechselt.push(s); });
    expect(auswahl().props.value).toBe("de");
    auswahl().props.onChange({ target: { value: "en" } });
    await ruhe();
    expect(gerufen.confirm).toEqual(["Sprache wechseln? Ungespeicherte Entwürfe gehen dabei verloren."]);
    expect(gewechselt).toEqual([]);
    expect(gerufen.update).toEqual([]);
    expect(auswahl().props.value).toBe("de");
  });

  it("wechselt bei Ja erst nach geladenem Katalog und speichert die Wahl dann", async () => {
    const gewechselt: string[] = [];
    const { gerufen, auswahl } = einstellungen("de", true, async s => { gewechselt.push(s); });
    auswahl().props.onChange({ target: { value: "en" } });
    await ruhe();
    expect(gerufen.confirm).toHaveLength(1);
    expect(gewechselt).toEqual(["en"]);
    expect(gerufen.update).toEqual([{ ...Theme.DEFAULT_ACCESSIBILITY_PREFERENCES, language: "en" }]);
  });

  it("zeigt einen abgelehnten Katalog-Import als Fehler und speichert die Wahl nicht", async () => {
    const { gerufen, auswahl, hinweise } = einstellungen("de", true, async () => { throw new Error("import failed"); });
    auswahl().props.onChange({ target: { value: "en" } });
    await ruhe();
    expect(gerufen.update).toEqual([]);
    expect(hinweise().map(node => node.props.children)).toEqual([FEHLERTEXT]);
    expect(auswahl().props.value).toBe("de");
  });

  // Die Klartextobjekte des VM-Realms werden in den Realm des Parsers gebrückt, wie in
  // `authoring-review.test.ts`; sonst weist die geschlossene Prüfung sie als fremd zurück.
  const bruecke = (wert: unknown) => wert === undefined ? undefined : JSON.parse(JSON.stringify(wert));
  const ThemeBruecke = { ...Theme,
    resolveTheme: (manifest: unknown, preferences: unknown, system: unknown) => Theme.resolveTheme(bruecke(manifest), bruecke(preferences), bruecke(system)),
    parseAccessibilityPreferences: (input: unknown) => Theme.parseAccessibilityPreferences(typeof input === "string" ? input : bruecke(input)),
    serializeAccessibilityPreferences: (input: unknown) => Theme.serializeAccessibilityPreferences(typeof input === "string" ? input : bruecke(input)),
  };

  function provider(gespeichert: string, wurzel: ReturnType<typeof wurzelElement>) {
    const stand = bauePruefstand();
    const modul = stand.lade("Appearance.tsx", { "@chronicle/theme": ThemeBruecke, "../i18n": I18n }, {
      localStorage: { getItem: () => gespeichert, setItem() {} },
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      window: { addEventListener() {}, removeEventListener() {} },
      document: { documentElement: wurzel },
      navigator: { language: "de-DE" }, location: { search: "" },
    });
    return { stand, zeichne: () => stand.render(modul.AppearanceProvider, { children: "KINDER" }) };
  }
  const englischGespeichert = () => Theme.serializeAccessibilityPreferences({ ...Theme.DEFAULT_ACCESSIBILITY_PREFERENCES, language: "en" });

  it("startet mit gespeichertem Englisch ohne Neuaufbau des Baums", async () => {
    let loese: (katalog: typeof KATALOG) => void = () => {};
    setzeEnglischeQuelleFuerTests(() => new Promise(fertig => { loese = fertig; }));
    const wurzel = wurzelElement();
    const { zeichne } = provider(englischGespeichert(), wurzel);
    const schluessel: unknown[] = [];
    const male = () => { schluessel.push(zeichne().props.children.key); };
    male();
    expect(schluessel).toEqual(["en"]);
    expect(wurzel.lang).toBe("en");
    loese(KATALOG);
    await ruhe();
    male();
    // Der Katalog kommt an, der Schlüssel bleibt: React baut den Baum nicht neu auf.
    expect([...new Set(schluessel)]).toEqual(["en"]);
    expect(t("Speichern")).toBe("Save");
  });

  it("meldet einen fehlgeschlagenen Katalog-Import beim Start über den Kontext", async () => {
    setzeEnglischeQuelleFuerTests(async () => { throw new Error("import failed"); });
    const { zeichne } = provider(englischGespeichert(), wurzelElement());
    zeichne();
    await ruhe();
    expect(zeichne().props.value.spracheFehler).toBe(FEHLERTEXT);
  });
});

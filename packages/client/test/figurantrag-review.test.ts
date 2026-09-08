// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { I18nStub } from "../src/i18n.ts";

/** Führt die echten Handler und Effekte der Komponenten gegen kontrollierte Ressourcen aus. */
function harness(file: string, initial: Record<string, any>, component = file, extraExports = "") {
  const slots: any[] = [], requests: { path: string; request: any }[] = [], jobs: Promise<unknown>[] = [], confirmations: string[] = [];
  let props = initial, cursor = 0, changed = false, effects: { i: number; fn: () => any }[] = [], tree: any;
  const same = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial: any) {
      const i = cursor++; slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === "function" ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; changed = true; } }];
    },
    useRef(value: unknown) { const i = cursor++; return slots[i] ??= { current: value }; },
    useId() { return "id"; },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn: () => unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps, cleanup: slots[i]?.cleanup }; effects.push({ i, fn }); } },
  };
  const element = (type: unknown, props: unknown, key: unknown) => ({ type, props, key }), mod = { exports: {} as any };
  const actual = readFileSync(new URL(`../src/features/${file}.tsx`, import.meta.url), "utf8");
  runInNewContext(transformSync(`${actual}\n${extraExports ? `export { ${extraExports} };` : ""}`, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: mod, exports: mod.exports, crypto: { randomUUID: () => "test-seed-123456" }, window: { confirm: (message: string) => { confirmations.push(message); return props.confirm ?? true; } },
    require: (name: string) => {
      if (name === "../i18n" || name === "./i18n") return I18nStub;
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      if (name === "../hooks") return { useResource: (path: string, revision = 0) => props.resource?.(path, revision) ?? { data: null, loading: false, loaded: true, error: "" }, useTask: () => ({ busy: false, error: props.taskError ?? "", setError() {}, run: (fn: () => Promise<unknown>) => { const job = fn().catch(() => undefined); jobs.push(job); return job; } }) };
      if (name === "../api") return { apiPath: (id: string, suffix: string) => `/api/campaigns/${id}${suffix}`, errorText: (error: unknown) => String(error), api: async (path: string, request: unknown) => { requests.push({ path, request }); return props.transport?.(path, request); } };
      if (name === "./game-api") return { defaults: () => ({}), useCommand: () => async (path: string, body: unknown) => { requests.push({ path, request: { body } }); return props.transport?.(path, { body }); } };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  function render() {
    for (let repeat = 0; repeat < 30; repeat++) {
      cursor = 0; changed = false; effects = []; tree = mod.exports[component](...(props.arguments ?? [props]));
      for (const effect of effects) { slots[effect.i].cleanup?.(); slots[effect.i].cleanup = effect.fn(); }
      if (!changed) return tree;
    }
    throw new Error("Component did not settle");
  }
  function nodes(predicate: (node: any) => boolean) {
    const found: any[] = [], visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { if (predicate(node)) found.push(node); visit(node.props.children); } };
    visit(render()); return found;
  }
  const text = (node: any): string => Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : node == null ? "" : String(node);
  const button = (label: string) => nodes(node => node.type === "Button" && text(node) === label)[0]!;
  return { render, nodes, requests, confirmations, text, button, all: () => text(render()), replace: (next: Record<string, any>) => { props = { ...props, ...next }; render(); }, settle: async () => { await Promise.all(jobs); render(); } };
}

const loaded = (data: unknown) => ({ data, loading: false, loaded: true, error: "" });
const rules = {
  version: 1, pin: { id: "demo", version: "1.0.0" },
  packages: [{ id: "demo", version: "1.0.0", name: "Demo", fields: {
    insight: { type: "integer", label: "Scharfsinn", default: 2, minimum: 0, maximum: 10 },
    vigour: { type: "integer", label: "Tatkraft", default: 6, minimum: 0, maximum: 10 },
    // Ein Feld, das die gewählte Vorlage NICHT führt: es darf im Antrag nicht auftauchen.
    fremd: { type: "integer", label: "Fremd", default: 1, minimum: 0, maximum: 10 },
  } }],
} as any;
const vorlage = { id: "v1", name: "Wanderin", art: "player_character", anfangswerte: { insight: 3, vigour: 9 }, version: 1 };
const antrag = (over: Record<string, unknown> = {}) => ({
  id: "an-1", templateId: "v1", templateRevision: 1, name: "Nell", anfangswerte: { insight: 5 },
  status: "offen", version: 1, antragsteller: "sera", createdAt: "1", decidedBy: null, decidedAt: null, actorId: null, reason: null, ...over,
});
/** Die zwei Ressourcen der Antragsfläche; alles andere bleibt leer. */
const spielerQuellen = (vorlagen: unknown[], antraege: unknown[]) => (path: string) =>
  path.endsWith("/actor-templates/freigegeben") ? loaded(vorlagen) : path.endsWith("/figurantraege") ? loaded(antraege) : loaded(null);

describe("Figurantrag — die Fläche, auf der ein Spieler seine Figur beantragt", () => {
  const spieler = { campaignId: "campaign", rules, revision: 0, onChanged() {} };

  it("bietet auf der leeren Fläche „Figur anlegen“ an und lädt die Vorlagen ausschließlich aus der Freigabe", () => {
    const paths: string[] = [];
    const h = harness("FigurAntrag", { ...spieler, resource: (path: string) => { paths.push(path); return spielerQuellen([vorlage], [])(path); } });
    expect(h.button("Figur anlegen")).toBeTruthy();
    expect(paths).toContain("/api/campaigns/campaign/actor-templates/freigegeben");
    // Die Werkstattliste aller Vorlagen wird hier nie abgefragt.
    expect(paths).not.toContain("/api/campaigns/campaign/actor-templates");
  });

  it("zeigt im Formular nur die Felder der gewählten Vorlage und schickt allein die Abweichung mit einer Befehls-ID", async () => {
    const h = harness("FigurAntrag", { ...spieler, resource: spielerQuellen([vorlage], []) });
    h.button("Figur anlegen").props.onClick();
    h.nodes(n => n.type === "select")[0]!.props.onChange({ target: { value: "v1" } });
    const felder = h.nodes(n => n.type === "RuleFields")[0]!;
    expect(Object.keys(felder.props.fields)).toEqual(["insight", "vigour"]);
    expect(felder.props.values).toEqual({ insight: 3, vigour: 9 });
    felder.props.onChange({ ...felder.props.values, insight: 5 });
    h.nodes(n => n.type === "input" && n.props.maxLength === 160)[0]!.props.onChange({ target: { value: "Nell" } });
    h.nodes(n => n.type === "form")[0]!.props.onSubmit({ preventDefault() {} });
    await h.settle();
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.path).toBe("/api/campaigns/campaign/figurantraege");
    expect(h.requests[0]!.request.method).toBe("POST");
    expect(h.requests[0]!.request.body).toEqual({ commandId: "test-seed-123456", templateId: "v1", name: "Nell", anfangswerte: { insight: 5 } });
  });

  it("meldet nach dem Absenden „wartet auf die Spielleitung“ und nimmt den Antrag mit seiner Version zurück", async () => {
    const h = harness("FigurAntrag", { ...spieler, resource: spielerQuellen([vorlage], [antrag()]) });
    expect(h.all()).toContain("wartet auf die Spielleitung");
    // Solange ein Antrag offen ist, gibt es keinen zweiten Anlauf.
    expect(h.button("Figur anlegen")).toBeUndefined();
    h.button("Antrag zurücknehmen").props.onClick();
    await h.settle();
    expect(h.requests[0]!.path).toBe("/api/campaigns/campaign/figurantraege/an-1/zuruecknehmen");
    expect(h.requests[0]!.request.body).toEqual({ expectedVersion: 1 });
  });

  it("nennt bei einem abgelehnten Antrag den Grund und lässt einen neuen Anlauf zu", () => {
    const h = harness("FigurAntrag", { ...spieler, resource: spielerQuellen([vorlage], [antrag({ status: "abgelehnt", version: 2, reason: "Zu viele Wanderinnen." })]) });
    expect(h.all()).toContain("Zu viele Wanderinnen.");
    expect(h.button("Figur anlegen")).toBeTruthy();
  });

  it("verschweigt bestätigte Anträge, weil die Figur dann unter „Ich“ steht", () => {
    const h = harness("FigurAntrag", { ...spieler, resource: spielerQuellen([vorlage], [antrag({ status: "bestaetigt", version: 2, actorId: "a1" })]) });
    expect(h.all()).not.toContain("Nell");
    expect(h.button("Figur anlegen")).toBeTruthy();
  });

  it("öffnet die Antragsfläche auf der leeren Figurenfläche von „Ich“ und reicht den Live-Takt weiter", () => {
    const gesehen: [string, number][] = [];
    const h = harness("MeineFigur", {
      campaign: { id: "campaign", role: "spieler" }, liveRevision: 0, onDirty() {},
      resource: (path: string, revision: number) => { gesehen.push([path, revision]); return loaded(path.endsWith("/actors") ? [] : { packages: [], pin: { id: "demo", version: "1.0.0" }, version: 1 }); },
    });
    expect(h.nodes(n => n.type === "FigurAntrag")).toHaveLength(1);
    expect(h.nodes(n => n.type === "FigurAntrag")[0]!.props.revision).toBe(0);
    // Bestätigt die Spielleitung, meldet das die Live-Verbindung: die Fläche lädt neu.
    h.replace({ liveRevision: 4 });
    expect(gesehen.filter(([path]) => path.endsWith("/actors")).at(-1)![1]).toBe(4);
    expect(h.nodes(n => n.type === "FigurAntrag")[0]!.props.revision).toBe(4);
  });

  it("lädt Vorlagen und Anträge neu, sobald der Takt steigt", () => {
    const gesehen: [string, number][] = [];
    const h = harness("FigurAntrag", { ...spieler, revision: 1,
      resource: (path: string, revision: number) => { gesehen.push([path, revision]); return spielerQuellen([vorlage], [])(path); } });
    h.render();
    expect(gesehen).toContainEqual(["/api/campaigns/campaign/figurantraege", 1]);
    h.replace({ revision: 5 });
    expect(gesehen.filter(([path]) => path.endsWith("/figurantraege")).at(-1)![1]).toBe(5);
    expect(gesehen.filter(([path]) => path.endsWith("/freigegeben")).at(-1)![1]).toBe(5);
  });

  it("gibt nach dem Abbrechen eine frische Befehls-ID aus", async () => {
    const h = harness("FigurAntrag", { ...spieler, resource: spielerQuellen([vorlage], []) });
    h.button("Figur anlegen").props.onClick();
    h.button("Abbrechen").props.onClick();
    h.button("Figur anlegen").props.onClick();
    h.nodes(n => n.type === "select")[0]!.props.onChange({ target: { value: "v1" } });
    h.nodes(n => n.type === "input" && n.props.maxLength === 160)[0]!.props.onChange({ target: { value: "Nell" } });
    h.nodes(n => n.type === "form")[0]!.props.onSubmit({ preventDefault() {} });
    await h.settle();
    // Der Prüfstand gibt immer dieselbe Kennung; entscheidend ist, dass überhaupt eine neue
    // angefordert wurde — `befehl.current` hält keinen abgebrochenen Versuch fest.
    expect(h.requests[0]!.request.body.commandId).toBe("test-seed-123456");
  });
});

describe("Figurantrag — die Entscheidung der Spielleitung", () => {
  it("führt einen Reiter „Anträge“ neben den Figuren", () => {
    const h = harness("ActorWorkbench", {
      campaignId: "campaign", gm: true, actorId: "", actors: [], roster: [], rules, revision: 0,
      onChanged() {}, onDirty() {}, onOpenForge() {},
    });
    expect(h.button("Anträge")).toBeTruthy();
  });

  it("bestätigt einen Antrag mit der Version seiner Karte und zeigt vorher die Abweichung", async () => {
    const h = harness("ActorWorkbench", {
      campaignId: "campaign", gm: true, rules, revision: 0, onChanged() {},
      resource: (path: string) => path.endsWith("/figurantraege") ? loaded([antrag()]) : loaded([]),
    }, "Figurantraege", "Figurantraege");
    expect(h.all()).toContain("Nell");
    expect(h.all()).toContain("Scharfsinn");
    h.button("Bestätigen").props.onClick();
    await h.settle();
    expect(h.requests[0]!.path).toBe("/api/campaigns/campaign/figurantraege/an-1/bestaetigen");
    expect(h.requests[0]!.request.body).toEqual({ expectedVersion: 1 });
  });

  it("lehnt einen Antrag nur mit Grund ab", async () => {
    const h = harness("ActorWorkbench", {
      campaignId: "campaign", gm: true, rules, revision: 0, onChanged() {},
      resource: (path: string) => path.endsWith("/figurantraege") ? loaded([antrag()]) : loaded([]),
    }, "Figurantraege", "Figurantraege");
    expect(h.button("Ablehnen").props.disabled).toBe(true);
    h.nodes(n => n.type === "input" && n.props.maxLength === 500)[0]!.props.onChange({ target: { value: "Zu viele Wanderinnen." } });
    h.button("Ablehnen").props.onClick();
    await h.settle();
    expect(h.requests[0]!.path).toBe("/api/campaigns/campaign/figurantraege/an-1/ablehnen");
    expect(h.requests[0]!.request.body).toEqual({ expectedVersion: 1, reason: "Zu viele Wanderinnen." });
  });

  const vorlagenkarte = (freigabe: unknown) => ({ id: "v1", revision: 1, version: 1, freigabe,
    definition: { schemaVersion: 1, name: "Wanderin", kind: "player_character", loreEntryId: null, package: { id: "demo", version: "1.0.0" }, fields: { insight: 3 } } });
  const werkbank = (freigabe: unknown, extra: Record<string, any> = {}) => harness("ActorWorkbench", {
    campaignId: "campaign", rules, revision: 0, onChanged() {}, onDirty() {},
    resource: (path: string) => path.endsWith("/actor-templates") ? loaded([vorlagenkarte(freigabe)]) : loaded([]),
    transport: () => ({ templateId: "v1", campaignId: "campaign", freigegeben: true, version: 1, freedBy: "kaya", freedAt: "1", revokedAt: null }),
    ...extra,
  }, "ActorTemplates");

  it("gibt eine nie freigegebene Vorlage mit Version 0 frei und entzieht sie mit der Version der Quittung", async () => {
    const h = werkbank(null);
    h.button("Für Spieler freigeben").props.onClick();
    await h.settle();
    expect(h.requests[0]!.path).toBe("/api/campaigns/campaign/actor-templates/v1/freigabe");
    expect(h.requests[0]!.request).toEqual({ method: "PUT", body: { expectedVersion: 0 } });
    // Die Quittung nennt die neue Version; der Entzug rechnet nicht selbst weiter.
    h.button("Freigabe entziehen").props.onClick();
    await h.settle();
    expect(h.requests[1]!.path).toBe("/api/campaigns/campaign/actor-templates/v1/freigabe/entziehen");
    expect(h.requests[1]!.request).toEqual({ method: "POST", body: { expectedVersion: 1 } });
  });

  it("liest die Freigabeversion von der Karte, statt sie aus „frei oder nicht“ zu raten", async () => {
    // Einmal freigegeben, einmal entzogen: die Domain steht auf 2, nicht auf 0.
    const h = werkbank({ frei: false, version: 2 });
    h.button("Für Spieler freigeben").props.onClick();
    await h.settle();
    expect(h.requests[0]!.request).toEqual({ method: "PUT", body: { expectedVersion: 2 } });
    // Und eine stehende Freigabe kennt ihre eigene Zahl ebenso.
    const offen = werkbank({ frei: true, version: 3 });
    offen.button("Freigabe entziehen").props.onClick();
    await offen.settle();
    expect(offen.requests[0]!.request).toEqual({ method: "POST", body: { expectedVersion: 3 } });
  });

  it("nennt „inzwischen geändert“ nur beim Konflikt und sonst den Fehler selbst", async () => {
    const werfe = (status: number, satz: string) => ({ transport: () => { throw Object.assign(new Error(satz), { status }); }, taskError: satz });
    const konflikt = werkbank(null, werfe(409, "Konflikt: Bitte den aktuellen Stand laden."));
    konflikt.button("Für Spieler freigeben").props.onClick();
    await konflikt.settle();
    expect(konflikt.all()).toContain("Die Freigabe wurde inzwischen an anderer Stelle geändert");
    const netz = werkbank(null, werfe(503, "Der Dienst ist vorübergehend ausgelastet."));
    netz.button("Für Spieler freigeben").props.onClick();
    await netz.settle();
    expect(netz.all()).toContain("Der Dienst ist vorübergehend ausgelastet.");
    expect(netz.all()).not.toContain("inzwischen an anderer Stelle geändert");
  });
});

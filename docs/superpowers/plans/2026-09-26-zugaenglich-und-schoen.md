<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Zugänglich und schön — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Someone who has never seen Atlas Chronicles creates a rulebook, a character and a character request without guessing (main goal, Kaya 2026-09-26); on the way the screens pass WCAG 2.2 AA and read like a game product, not a form (secondary goal).

**Architecture:** Shared building blocks (`Notice` tones, `confirmAction` + `UiHost`, `announce`, `focusHeading`, `Tabs`, `StepList`) and one scale for type, spacing and radius go into `@chronicle/ui` and the client stylesheet first (wave 1). Three areas then change in parallel with strictly separate file ownership (wave 2 sheet, wave 3 forge, wave 4 character flow). Wave 5 cleans the language catalogs, turns the permanent accessibility test green, compares before/after screenshots and merges.

**Tech Stack:** React 19 + Vite client (`packages/client`), `@chronicle/ui` (`packages/ui/src/index.tsx`, `tokens.css`), vitest (client harness tests), Playwright + axe-core 4.13.0 (e2e), i18n catalogs `packages/client/src/i18n/en/*.json`.

**Spec:** `docs/superpowers/specs/2026-09-26-zugaenglich-und-schoen-design.md`

## Global Constraints

- Every visible string is plain German without jargon, written as the full sentence inside `t("…")`; each new key gets an English entry in the wave's own catalog file (`i18n/en/zugang-basis.json`, `zugang-bogen.json`, `zugang-schmiede.json`, `zugang-figuren.json`). Do not edit other catalog files; wave 5 removes orphans centrally.
- No new runtime dependency. `axe-core` 4.13.0 is a devDependency only.
- No colour literals in changed CSS; only tokens (`--text`, `--surface`, `--accent`, `--ok`, `--warning`, `--info`, `--danger`, … from `packages/ui/src/tokens.css`). Tokens `--ink`, `--border`, `--ink-muted`, `--surface-sunken` do not exist; never use them.
- No text below 12 px (`--text-xs`) in the scope files; touch targets ≥ 24 px, stepper buttons ≥ 32 px.
- The presentation tree (v3) is the one truth of a sheet: never reorder authored nodes.
- The server contract stays unchanged (`reason` stays required; the client fills a default).
- Parallel workers (waves 2–4) do NOT run `npm run build`, do NOT run Playwright, do NOT commit. They run `npx vitest run <their tests>` and `npx tsc -p packages/client/tsconfig.json --noEmit`. The coordinator builds, renders, commits.
- Files written by Python on Windows get CRLF; convert to LF before commit. Commit with explicit paths only.

## Review Focus

1. A confirmation requested while another is open: the first resolves `false`, the second shows; nothing hangs.
2. `confirmAction` with no `UiHost` mounted (tests, crash screen): falls back to `window.confirm`; with neither, resolves `false`.
3. A sheet number field cleared to empty: shows the plain error, keeps the value editable, stepper still works from the minimum.
4. A v3 sheet whose author placed the vitals last: they stay last (only legacy v1/v2 sheets get vitals first).
5. Stepper `+` at the maximum and `−` at the minimum: disabled with the reason in the accessible name, value never leaves the range.

---

## Wave 1 — Fundament (coordinator, sequential)

### Task 1: Building blocks in `@chronicle/ui`

**Files:**
- Modify: `packages/ui/src/index.tsx`
- Create: `packages/client/test/ui-bausteine.test.ts`
- Create: `packages/client/src/i18n/en/zugang-basis.json`, `zugang-bogen.json`, `zugang-schmiede.json`, `zugang-figuren.json` (each `{}` except basis)
- Modify: `packages/client/src/i18n.ts` (register the four files next to `regelwerkstatt.json`)
- Modify: `packages/client/src/App.tsx` (mount `<UiHost />` once; `.mobile-navigation` becomes `<nav aria-label={t("Bereichswahl")}>`)

**Interfaces (Produces):**
```ts
export type NoticeTone = "ok" | "info" | "warn" | "error";
export function Notice(props: { children: ReactNode; error?: boolean; tone?: NoticeTone }): JSX.Element;
export interface ConfirmRequest { message: string; title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
export function confirmAction(request: ConfirmRequest | string): Promise<boolean>;
export function announce(text: string): void;
export function focusHeading(id: string): void;          // focuses element by id on the next frame, adds tabindex=-1 if missing
export function UiHost(): JSX.Element;                     // mount once; renders the <dialog> and a polite live region
export function tabKeyTarget(key: string, index: number, count: number): number | null;
export interface TabItem { id: string; label: ReactNode; badge?: ReactNode }
export function Tabs(props: { label: string; idPrefix: string; items: readonly TabItem[]; value: string; onChange(id: string): void; className?: string }): JSX.Element;
export function TabPanel(props: { idPrefix: string; id: string; children: ReactNode; className?: string }): JSX.Element;
export interface StepItem { id: string; label: ReactNode; state: "done" | "current" | "todo"; onSelect?: () => void }
export function StepList(props: { label: string; steps: readonly StepItem[]; className?: string }): JSX.Element;
```

- [ ] **Step 1: Failing tests** in `packages/client/test/ui-bausteine.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Notice, StepList, Tabs, confirmAction, tabKeyTarget } from "@chronicle/ui";

describe("gemeinsame Bausteine", () => {
  it("führt Pfeiltasten, Pos1 und Ende im Kreis", () => {
    expect(tabKeyTarget("ArrowRight", 2, 3)).toBe(0);
    expect(tabKeyTarget("ArrowLeft", 0, 3)).toBe(2);
    expect(tabKeyTarget("Home", 2, 3)).toBe(0);
    expect(tabKeyTarget("End", 0, 3)).toBe(2);
    expect(tabKeyTarget("a", 0, 3)).toBeNull();
    expect(tabKeyTarget("ArrowRight", 0, 0)).toBeNull();
  });
  it("zeigt Warnungen nicht als Erfolg und Fehler als Alarm", () => {
    expect(renderToStaticMarkup(createElement(Notice, { tone: "warn" }, "x"))).toContain("notice-warn");
    expect(renderToStaticMarkup(createElement(Notice, { tone: "warn" }, "x"))).toContain('role="status"');
    expect(renderToStaticMarkup(createElement(Notice, { error: true }, "x"))).toContain('role="alert"');
  });
  it("verbindet Reiter und Felder und markiert nur den gewählten als erreichbar", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { label: "Ansicht", idPrefix: "v", value: "b", onChange() {}, items: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }));
    expect(html).toContain('role="tablist"'); expect(html).toContain('aria-controls="v-panel-b"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  });
  it("sagt erledigte Schritte an und markiert den aktuellen", () => {
    const html = renderToStaticMarkup(createElement(StepList, { label: "Weg", steps: [{ id: "1", label: "Name", state: "done" }, { id: "2", label: "Würfel", state: "current" }] }));
    expect(html).toContain("erledigt"); expect(html).toContain('aria-current="step"');
  });
  it("fällt ohne Host auf die Browser-Rückfrage zurück", async () => {
    const confirm = vi.fn(() => true); vi.stubGlobal("confirm", confirm);
    await expect(confirmAction({ title: "Löschen?", message: "Weg ist weg." })).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith("Löschen?\n\nWeg ist weg.");
    vi.unstubAllGlobals();
  });
});
```
- [ ] **Step 2:** `npx vitest run packages/client/test/ui-bausteine.test.ts` → FAIL (exports missing).
- [ ] **Step 3: Implement** in `packages/ui/src/index.tsx` (keep existing exports and `t`):
```tsx
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
export type NoticeTone = "ok" | "info" | "warn" | "error";
export function Notice({ children, error = false, tone }: { children: ReactNode; error?: boolean; tone?: NoticeTone }) {
  const resolved: NoticeTone = tone ?? (error ? "error" : "ok");
  return <div className={`notice notice-${resolved}`} role={resolved === "error" ? "alert" : "status"}>{children}</div>;
}
export interface ConfirmRequest { message: string; title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface Pending { request: ConfirmRequest; resolve(value: boolean): void }
let confirmSink: ((request: ConfirmRequest) => Promise<boolean>) | null = null;
let announceSink: ((text: string) => void) | null = null;
export function confirmAction(request: ConfirmRequest | string): Promise<boolean> {
  const value = typeof request === "string" ? { message: request } : request;
  if (confirmSink) return confirmSink(value);
  const native = (globalThis as { confirm?: (text: string) => boolean }).confirm;
  return Promise.resolve(typeof native === "function" ? native(value.title ? `${value.title}\n\n${value.message}` : value.message) : false);
}
export function announce(text: string): void { announceSink?.(text); }
export function focusHeading(id: string): void {
  const run = () => { const node = document.getElementById(id); if (!node) return; if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1"); node.focus(); };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run); else run();
}
export function UiHost() {
  const [pending, setPending] = useState<Pending | null>(null), [spoken, setSpoken] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<Element | null>(null), id = useId();
  useEffect(() => {
    confirmSink = request => new Promise<boolean>(resolve => {
      opener.current = document.activeElement;
      setPending(old => { old?.resolve(false); return { request, resolve }; });
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    announceSink = text => { setSpoken(""); clearTimeout(timer); timer = setTimeout(() => setSpoken(text), 60); };
    return () => { confirmSink = null; announceSink = null; clearTimeout(timer); };
  }, []);
  useEffect(() => {
    const node = dialog.current; if (!node) return;
    if (pending && !node.open) node.showModal();
    if (!pending && node.open) node.close();
  }, [pending]);
  const finish = (value: boolean) => {
    if (!pending) return;
    pending.resolve(value); setPending(null);
    const back = opener.current; opener.current = null;
    if (back instanceof HTMLElement && back.isConnected) back.focus();
  };
  const request = pending?.request;
  return <>
    <dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-t`} aria-describedby={`${id}-m`} onCancel={event => { event.preventDefault(); finish(false); }}>
      {request ? <form onSubmit={event => { event.preventDefault(); finish(true); }}>
        <h2 id={`${id}-t`}>{request.title ?? t("Bitte bestätigen")}</h2>
        <p id={`${id}-m`}>{request.message}</p>
        <div className="button-row">
          <Button autoFocus={!!request.danger} onClick={() => finish(false)}>{request.cancelLabel ?? t("Abbrechen")}</Button>
          <Button type="submit" autoFocus={!request.danger} variant={request.danger ? "danger" : "primary"}>{request.confirmLabel ?? t("Bestätigen")}</Button>
        </div>
      </form> : null}
    </dialog>
    <div className="sr-only" role="status" aria-live="polite">{spoken}</div>
  </>;
}
export function tabKeyTarget(key: string, index: number, count: number): number | null {
  if (count < 1) return null;
  switch (key) {
    case "ArrowRight": case "ArrowDown": return (index + 1) % count;
    case "ArrowLeft": case "ArrowUp": return (index - 1 + count) % count;
    case "Home": return 0;
    case "End": return count - 1;
    default: return null;
  }
}
export interface TabItem { id: string; label: ReactNode; badge?: ReactNode }
export function Tabs({ label, idPrefix, items, value, onChange, className = "" }: { label: string; idPrefix: string; items: readonly TabItem[]; value: string; onChange(id: string): void; className?: string }) {
  return <div role="tablist" aria-label={label} className={`tabs ${className}`}>{items.map((item, index) => {
    const selected = item.id === value;
    return <button key={item.id} type="button" role="tab" id={`${idPrefix}-tab-${item.id}`} aria-selected={selected} aria-controls={`${idPrefix}-panel-${item.id}`}
      tabIndex={selected ? 0 : -1} className={`tab${selected ? " is-active" : ""}`} onClick={() => onChange(item.id)}
      onKeyDown={event => {
        const next = tabKeyTarget(event.key, index, items.length); if (next === null) return;
        event.preventDefault(); const target = items[next]!; onChange(target.id);
        document.getElementById(`${idPrefix}-tab-${target.id}`)?.focus();
      }}>{item.label}{item.badge != null ? <span className="tab-badge">{item.badge}</span> : null}</button>;
  })}</div>;
}
export function TabPanel({ idPrefix, id, children, className = "" }: { idPrefix: string; id: string; children: ReactNode; className?: string }) {
  return <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className={className}>{children}</div>;
}
export interface StepItem { id: string; label: ReactNode; state: "done" | "current" | "todo"; onSelect?: () => void }
export function StepList({ label, steps, className = "" }: { label: string; steps: readonly StepItem[]; className?: string }) {
  return <ol className={`step-list ${className}`} aria-label={label}>{steps.map((step, index) => {
    const body = <><span className="step-mark" aria-hidden="true">{step.state === "done" ? "✓" : index + 1}</span><span className="step-label">{step.label}</span>{step.state === "done" ? <span className="sr-only">{t("erledigt")}</span> : null}</>;
    return <li key={step.id} className={`step step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>{step.onSelect ? <button type="button" onClick={step.onSelect}>{body}</button> : body}</li>;
  })}</ol>;
}
```
`notice-error` stays a class name because `notice-${resolved}` yields it for errors; existing CSS keeps working.
- [ ] **Step 4:** English catalog entries in `zugang-basis.json`: `"Bitte bestätigen": "Please confirm"`, `"Abbrechen": …` (check with `node tools/gate-sprache.mjs` whether a key already exists elsewhere; duplicates across files are allowed only if identical — reuse existing ones instead of re-adding), `"Bestätigen"`, `"erledigt": "done"`, `"Bereichswahl": "Choose an area"`.
- [ ] **Step 5:** Mount `<UiHost />` as the last child of the app shell in `App.tsx`; `.mobile-navigation` div → `<nav … aria-label={t("Bereichswahl")}>`.
- [ ] **Step 6:** `npx vitest run packages/client/test/ui-bausteine.test.ts` → PASS; `node tools/gate-sprache.mjs` → GREEN; `npm run typecheck`.

### Task 1b: Explain where you are — `ViewIntro`, `Begriff`, glossary

**Files:**
- Modify: `packages/ui/src/index.tsx` (add `ViewIntro`)
- Create: `packages/client/src/features/begriffe.ts`, `packages/client/src/features/Begriff.tsx`
- Test: `packages/client/test/ui-bausteine.test.ts` (extend), `packages/client/test/begriffe.test.ts` (new)
- Catalog: `zugang-basis.json`

**Interfaces (Produces):**
```ts
// @chronicle/ui
export function ViewIntro(props: { id: string; title: ReactNode; children: ReactNode; action?: ReactNode; steps?: readonly ReactNode[]; level?: 2 | 3 }): JSX.Element;
// features/begriffe.ts
export type BegriffId = "regelwerk" | "version" | "installieren" | "aktivieren" | "attribut" | "berechneter-wert" | "balken" | "aktion" | "faehigkeit" | "zustand" | "liste" | "bogen" | "figurvorlage" | "figur" | "antrag";
export const BEGRIFF_IDS: readonly BegriffId[];
export const BEGRIFF_LABEL: Readonly<Record<BegriffId, string>>;
export const BEGRIFF_ERKLAERUNG_LABEL: Readonly<Record<BegriffId, string>>;
// features/Begriff.tsx
export function Begriff(props: { id: BegriffId; children?: ReactNode }): JSX.Element;
```

- [ ] **Step 1: Failing tests.** `ui-bausteine.test.ts`: `ViewIntro` renders an `h2` with the given id and `tabindex="-1"`, the sentence, the action, and — only when `steps` is given — a `details` with an `ol`. `begriffe.test.ts`: every id has a label and an explanation; each explanation is at most two sentences (≤ 220 characters) and contains "zum Beispiel"; `Begriff` renders a `button` with `aria-expanded="false"` and the accessible name „Was bedeutet „Balken“?“, and the explanation element is `hidden` until opened.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `ViewIntro`:
```tsx
export function ViewIntro({ id, title, children, action, steps, level = 2 }: { id: string; title: ReactNode; children: ReactNode; action?: ReactNode; steps?: readonly ReactNode[]; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return <header className="view-intro">
    <div className="view-intro-text"><Heading id={id} tabIndex={-1}>{title}</Heading><p>{children}</p></div>
    {action ? <div className="view-intro-action">{action}</div> : null}
    {steps?.length ? <details className="view-intro-how"><summary>{t("Wie geht das?")}</summary><ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></details> : null}
  </header>;
}
```
`begriffe.ts` (labels are catalog keys; the gate recognises `*_LABEL` tables):
```ts
export const BEGRIFF_IDS = ["regelwerk", "version", "installieren", "aktivieren", "attribut", "berechneter-wert", "balken", "aktion", "faehigkeit", "zustand", "liste", "bogen", "figurvorlage", "figur", "antrag"] as const;
export type BegriffId = typeof BEGRIFF_IDS[number];
export const BEGRIFF_LABEL: Readonly<Record<BegriffId, string>> = Object.freeze({
  regelwerk: "Regelwerk", version: "Version", installieren: "Installieren", aktivieren: "Aktivieren", attribut: "Attribut",
  "berechneter-wert": "Berechneter Wert", balken: "Balken", aktion: "Aktion", faehigkeit: "Fähigkeit", zustand: "Zustand",
  liste: "Liste", bogen: "Bogen", figurvorlage: "Figurvorlage", figur: "Figur", antrag: "Antrag",
});
export const BEGRIFF_ERKLAERUNG_LABEL: Readonly<Record<BegriffId, string>> = Object.freeze({
  regelwerk: "Die Spielregeln eurer Runde: welche Werte eine Figur hat und wie gewürfelt wird. Chronicles Lite ist zum Beispiel ein fertiges Regelwerk.",
  version: "Ein festgehaltener Stand eines Regelwerks, zum Beispiel 1.0.0. Jede Änderung ergibt eine neue Version; bestehende Figuren behalten ihre, bis du umstellst.",
  installieren: "Legt eine Version in die Bibliothek deiner Runde, zum Beispiel Chronicles Lite 1.0.0. Sie gilt damit noch nicht, dafür musst du sie aktivieren.",
  aktivieren: "Macht eine installierte Version zum Regelwerk, nach dem ab jetzt gespielt wird, zum Beispiel beim Umstieg auf eine neue Version. Vorhandene Bögen werden übertragen.",
  attribut: "Ein Wert, den man auf dem Bogen einträgt, zum Beispiel Stärke 12 oder der Name der Figur.",
  "berechneter-wert": "Ein Wert, den das Regelwerk selbst ausrechnet, zum Beispiel Verteidigung = Geschick + 10. Man trägt ihn nicht ein.",
  balken: "Ein Vorrat, der im Spiel sinkt und steigt, zum Beispiel Leben 12 von 12. Er erscheint als farbiger Balken.",
  aktion: "Ein Wurf nach festen Regeln, zum Beispiel „Probe auf Stärke: 1W20 plus Stärke, ab 15 geschafft“.",
  faehigkeit: "Etwas Besonderes, das eine Figur lernen kann, zum Beispiel „Kraftschlag“. Fähigkeiten können Punkte kosten und Werte verändern.",
  zustand: "Etwas, das eine Figur gerade betrifft und wieder vergeht, zum Beispiel „Erschöpft: −2 auf alle Proben“.",
  liste: "Mehrere gleichartige Einträge auf dem Bogen, zum Beispiel die Ausrüstung mit Name und Gewicht je Gegenstand.",
  bogen: "Das Blatt einer Figur mit allen Werten, Balken und Fähigkeiten, zum Beispiel so, wie es am Tisch erscheint.",
  figurvorlage: "Ein Muster, aus dem du beliebig viele Figuren anlegst, zum Beispiel „Stadtwache“. Die Vorlage selbst spielt nicht mit.",
  figur: "Eine Person oder ein Wesen mit eigenem Bogen, zum Beispiel die Heldin einer Mitspielerin oder ein Wirt, den die Spielleitung führt.",
  antrag: "Der Wunsch von jemandem aus der Runde, eine Figur ins Spiel zu bringen, zum Beispiel mit Name und Werten. Die Spielleitung gibt ihn frei oder lehnt ab.",
});
```
`Begriff.tsx`:
```tsx
export function Begriff({ id, children }: { id: BegriffId; children?: ReactNode }) {
  const [open, setOpen] = useState(false), panel = useId(), word = t(BEGRIFF_LABEL[id]);
  return <span className="begriff">{children ?? word}
    <button type="button" className="begriff-hilfe" aria-expanded={open} aria-controls={panel}
      aria-label={t("Was bedeutet „{begriff}“?", { begriff: word })} onClick={() => setOpen(value => !value)}>?</button>
    <span id={panel} className="begriff-erklaerung" hidden={!open}>{t(BEGRIFF_ERKLAERUNG_LABEL[id])}</span>
  </span>;
}
```
CSS in `styles.css`: `.view-intro` (grid: text left, action right; wraps below 720 px; heading in `--font-display`), `.view-intro-how` (quiet, `--text-sm`), `.begriff-hilfe` (24 px round, `--line-strong` border, `--text-muted`), `.begriff-erklaerung` (block, `--surface-2`, `--radius-sm`, `--space-2` padding, `--text-sm`, max-width 42ch).
- [ ] **Step 4:** Catalog entries for all 30 glossary strings, „Wie geht das?“ and „Was bedeutet „{begriff}“?“ in `zugang-basis.json`; tests and `gate-sprache` green.

### Task 2: One scale and the global control fixes

**Files:**
- Modify: `packages/ui/src/tokens.css` (append scale tokens to `:root`)
- Modify: `packages/client/src/styles.css`

- [ ] **Step 1: Tokens** (append inside `:root`, after `--theme-space`):
```css
  /* Eine Leiter fuer Schrift, Abstand und Ecken. Abstaende folgen der Dichte des Looks
     (--theme-space), Ecken seiner Kantenform (--radius); Schrift beginnt bei 12 px. */
  --text-xs: 12px; --text-sm: 13px; --text-md: 15px; --text-lg: 18px; --text-xl: 24px;
  --space-1: calc(var(--theme-space) * .5); --space-2: var(--theme-space); --space-3: calc(var(--theme-space) * 1.5);
  --space-4: calc(var(--theme-space) * 2); --space-5: calc(var(--theme-space) * 3); --space-6: calc(var(--theme-space) * 4); --space-7: calc(var(--theme-space) * 6);
  --radius-sm: calc(var(--radius) * .5); --radius-lg: calc(var(--radius) * 1.5);
```
- [ ] **Step 2: Global rules** in `styles.css`, directly after the `input, textarea, select` rule:
```css
input[type="checkbox"], input[type="radio"] { width: 20px; height: 20px; min-height: 0; padding: 0; margin: 0; flex: none; accent-color: var(--accent); }
```
plus: `.notice-info { border-color: var(--info); background: var(--info-soft); color: var(--info); }`, `.notice-warn { border-color: var(--warning); background: var(--warning-soft); color: var(--warning); }`; `.confirm-dialog` (surface, `--radius-lg`, `--shadow-3`, max-width 32rem, `::backdrop { background: color-mix(in srgb, var(--overlay) 70%, transparent) }`, h2 in `--font-display` `--text-lg`); `.tabs`/`.tab`/`.tab.is-active`/`.tab-badge` (wraps on narrow screens, no hidden horizontal scroll); `.step-list`/`.step`/`.step-mark`/`.step-done`/`.step-current`; `html { scroll-padding-bottom: 96px; }` for sticky bars. `summary` gets `min-height: 32px`. The global `label` font-size goes from 12 px to `var(--text-sm)`.
- [ ] **Step 3:** `npx vitest run packages/theme` (tokens test stays green) and `npm run typecheck`.
- [ ] **Step 4:** `npm run build`, render the library, one sheet and the character request in both looks (`UX_AUDIT=1 UX_AUDIT_GROUP=forge,player npx playwright test e2e/ux-audit.spec.ts`) and LOOK at the checkbox rows. Commit tasks 1–2 together: `feat(ui): shared confirm, tabs, steps, notice tones and one scale`.

### Task 3: Prüfnetz

**Files:**
- Modify: `e2e/ux-audit.spec.ts` (tool only: `test.skip(!process.env.UX_AUDIT, "Bildwerkzeug, nur mit UX_AUDIT=1")` at the top of the file; output folder default `test-results/ux-audit`)
- Create: `e2e/zugaenglichkeit.spec.ts`

- [ ] **Step 1:** `zugaenglichkeit.spec.ts` reuses the seeding of `ux-audit.spec.ts` (`beforeAll`: GM + players, Lite and ChronicleHeroes campaigns, a Lite and a Heroes character, an open request) — copy that block, do not import from the tool. For each screen in `[library, wizard steps 1–6, bench tabs Paket/Attribute/Aktionen/Übernehmen, actors list, template form, figurantrag form, ich, tisch sheet]` × looks `[Fantasy default, Parchment]` × widths `[1440, 390]`:
```ts
const result = await page.evaluate(async tags => (window as any).axe.run(document, { runOnly: { type: "tag", values: tags } }), AXE_TAGS);
const blocking = result.violations.filter((v: any) => ["serious", "critical"].includes(v.impact) || ["region", "heading-order", "aria-prohibited-attr", "label", "button-name"].includes(v.id));
expect(blocking.map((v: any) => `${v.id}: ${v.nodes.map((n: any) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
const small = await page.evaluate(() => [...document.querySelectorAll("main *")].filter(el => {
  const style = getComputedStyle(el); if (style.visibility === "hidden" || el.closest(".sr-only")) return false;
  const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()); return text && parseFloat(style.fontSize) < 12 && (el as HTMLElement).offsetParent !== null;
}).map(el => el.className || el.tagName).slice(0, 5));
expect(small).toEqual([]);
```
plus a focus check after "Neues Regelwerk", after "Weiter" in the wizard and after "Als Regelentwurf öffnen": `expect(await page.evaluate(() => document.activeElement?.tagName)).toMatch(/^H[1-3]$/)`.
- [ ] **Step 1b:** `e2e/neulingsgang.spec.ts` — a fresh campaign created over HTTP (`POST /api/campaigns`, so Chronicles Lite is active), one GM and one invited player. Only `getByRole`/`getByLabel`/`getByText` with visible German names, no ids, no URL jumps after the entry URL:
  1. GM opens `stage=schmiede`, clicks "Regeln", "Neues Regelwerk", answers the six wizard steps with defaults plus a name, reaches "Fertig", goes to "Übernehmen", "Prüfen", "Version installieren", "Aktivieren"; expects the library card "Aktiv in dieser Runde".
  2. GM opens "Figuren & NPCs", follows the one highlighted button until a figure exists; expects its sheet.
  3. Player opens the app, follows the one highlighted button to request a figure, fills a name, submits; GM approves under "Anträge"; player sees the figure on "Ich", changes a value, saves.
  On every visited view: `expect(page.locator("main .button-primary:visible")).toHaveCount(1)` and the `ViewIntro` sentence (`.view-intro p`) is visible.
- [ ] **Step 2:** Run once, record the baseline failure list in the plan's wave-5 checklist (expected red). Commit with task 1–2 commit or separately: `test(e2e): accessibility net for forge, character flow and sheet`.

---

## Wave 2 — Bogen (worker "bogen", parallel)

### Task 4: The sheet reads like a sheet

**Files (owned):** `packages/client/src/features/RuleFields.tsx`, `HostRuleFields.tsx`, `RulePresentationView.tsx`, `CharacterSheet.tsx`, `CharacterProgress.tsx`, `CharacterPortrait.tsx`, `FaehigkeitenBogen.tsx`, `faehigkeiten-bogen.ts`, `Vitalanzeige.tsx` (API unchanged), `character-sheet.css`, `vitalanzeige.css`, `rule-categories.css`, create `rule-fields.css`; tests `packages/client/test/rule-fields-sheet.test.ts` (new), `faehigkeiten-bogen.test.ts`, `vitalanzeige.test.ts`, `character-english.test.ts`; catalog `i18n/en/zugang-bogen.json`.

**Interfaces:**
- Consumes: `Notice` tones, `confirmAction`, `announce` from Task 1; tokens from Task 2.
- Produces: `RuleFields` gains `layout?: "sheet" | "form"` (default `"sheet"`); forge callers that want the old look pass `layout="form"` (wave 3 owns those call sites and will add it). Exported pure helper `stepValue(field: FieldSchema, value: Scalar, direction: 1 | -1): number | null` in `rule-fields-model.ts` (new file, owned here). `HostRuleFields`, `RulePresentationView` and `RuleFields` accept `part?: "identity" | "values" | "all"` (default `"all"`): `identity` renders only string fields that are not ability/condition/collection storage (name, profession, notes …), `values` renders everything else; wave 4 uses it for the guided creation (E15). Helper `fieldPart(id: string, field: FieldSchema, runtime: RuleRuntime): "identity" | "values"` exported from `rule-fields-model.ts`.

- [ ] **Step 1: Failing tests** `rule-fields-sheet.test.ts` with `renderToStaticMarkup`:
  - sheet layout renders no "Pflichtfeld"/"optional" text; the range appears as `0–50` in an element with class `rule-field-range`; the long hint "Wert von 0 bis 50" is in an element with class `sr-only` referenced by `aria-describedby`.
  - two buttons per number field named `"{label} um eins senken"` / `"{label} um eins erhöhen"`; at maximum the raise button is `disabled`.
  - `stepValue({type:"integer",minimum:0,maximum:5,default:1,label:"x"}, 5, 1)` → `null`; `(…, "" , 1)` → `0` (empty starts at minimum); `(…, 2, -1)` → `1`; number fields with `step` decimals use step 1.
  - `layout="form"` still renders the old requirement text (forge unaffected until wave 3).
  - boolean field renders a checkbox inside `label.rule-field-toggle`.
  - text field shows the character counter only from 80 % fill (`maxLength 10`, value length 8 → counter "8 / 10").
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `RuleFields` sheet layout (`rule-field-tile` for numbers: label, `input type=number inputmode=numeric` 5ch centred `--text-lg`, −/+ `Button variant="quiet"` 32 px with `aria-label`s above, `.rule-field-range`; texts as full-width rows; enum as select row; boolean as toggle row), grid in `rule-fields.css`: `.rule-fields.is-sheet { display:grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--space-3); }`, text rows `grid-column: 1 / -1`, at ≤ 480px `minmax(9rem,1fr)`.
- [ ] **Step 4:** `HostRuleFields`/legacy path: vitals first under heading "Zustand der Figur"; computed values as `.stat-tiles` (`<dl>` with `display:grid`, value `--text-lg`); abilities as `.ability-card` list with buttons `t("{name} lernen", { name })` / `t("{name} verlernen", { name })`, disabled learn shows `t("Dafür fehlen Punkte oder eine Voraussetzung.")` via `aria-describedby`; conditions as chips (`label.condition-chip` with checkbox + name, description in `.field-help` below, `--text-sm`); "Kennungslisten korrigieren" only when a list holds ids unknown to the package (`ruleIdList(value).some(id => !known.has(id))`), labelled `t("Gespeicherte Liste reparieren")`; the same for `RulePresentationView` (keep authored order; only the node renderers change).
- [ ] **Step 5:** `CharacterSheet`: sticky save bar at the bottom of the sheet (`.sheet-savebar`, `position: sticky; bottom: 0`) with state text ("Alles gespeichert." / "Ungespeicherte Änderungen") and the save button; `window.confirm` → `await confirmAction({ … danger: true })` (3 places, `CharacterPortrait:85` too); defeat-pending notice → `tone="warn"`; package shown as `"{name}, Version {version}"` instead of `id@version`. `CharacterPortrait`: hidden native file input + `<label className="button">` "Porträt auswählen". `CharacterProgress`: "Skill-Punkte" → "Fertigkeitspunkte".
- [ ] **Step 6:** Replace 9–11 px sizes in owned CSS with `--text-xs`/`--text-sm`, literal radii with `--radius-sm/--radius`, spacing with `--space-*`.
- [ ] **Step 6b:** Tests for `part`: a Lite runtime with `part="identity"` renders name and role but no number tile; `part="values"` renders the tiles and vitals but not the name; a v3 presentation group whose children are all filtered out renders nothing (no empty fieldset). Empty ability list on a sheet → a short sentence what goes there with `Begriff id="faehigkeit"` (no example button on sheets; examples are forge-only).
- [ ] **Step 7:** `npx vitest run packages/client/test/rule-fields-sheet.test.ts packages/client/test/faehigkeiten-bogen.test.ts packages/client/test/vitalanzeige.test.ts packages/client/test/character-english.test.ts` + client tsc → green. Report changed files and new catalog keys.

---

## Wave 3 — Regelschmiede (worker "schmiede", parallel)

### Task 5: Focus, wizard, drawer, names

**Files (owned):** `RuleForge.tsx`, `RuleForgeNav.tsx`, `RuleForgePath.tsx`, `RuleForgePreview.tsx`, `RuleWizard.tsx`, `rule-wizard-model.ts`, `RuleEntryList.tsx`, `RuleEntryControls.tsx`, `RuleFieldList.tsx`, `RuleActionEditor.tsx`, `RuleAbilityEditor.tsx`, `RuleVitalEditor.tsx`, `RuleCollectionEditor.tsx`, `RuleDeclarativeEditor.tsx`, `RulePresentationEditor.tsx`, `RuleMap.tsx`, `FormulaField.tsx`, `FormulaLine.tsx`, `FormulaGraph.tsx`, `FormulaBlocks.tsx`, `RuleComputedFields.tsx`, `HostRuleActionFields.tsx`, `rule-forge.css`, `rule-forge-enhancements.css`, `rule-wizard.css`, `rule-map.css`, `formula-field.css`; tests `rule-forge-*.test.ts`, `rule-wizard-model.test.ts`, `rule-map.test.ts`, `formula-*.test.ts`, `rule-field-list.test.ts`, `rule-action-editor.test.ts`; e2e `rule-forge*.spec.ts`, `forge-clarity.spec.ts`, `universal-rules-v3.spec.ts`; catalog `zugang-schmiede.json`.

**Interfaces:** Consumes `confirmAction`, `announce`, `focusHeading`, `StepList`, `Notice` tones (Task 1). Call sites of `RuleFields` inside the forge (`RuleForgePreview`, `RuleCollectionEditor`, …) keep their look: pass `layout="form"` except the live sheet preview (`LiveSheet`), which uses the sheet layout.

- [ ] **Step 1: Harness update first.** In every harness test that maps modules, add
```ts
if (name === "@chronicle/ui") return new Proxy({ confirmAction: async (r: any) => { confirmations.push(typeof r === "string" ? r : r.message); return true; }, announce() {}, focusHeading() {}, tabKeyTarget: () => null }, { get: (target: any, key) => key in target ? target[key] : String(key) });
```
and keep `confirmations` assertions working (they now see the dialog message).
- [ ] **Step 2: Failing tests** (harness): after clicking "Neues Regelwerk" / "Als Regelentwurf öffnen" / "Weiter bearbeiten" / "Zur Bibliothek", the component called `focusHeading` with the id of the new view's `h2` (record calls in the stub); wizard "Weiter" calls `focusHeading("rw-question")` and `announce` with `"Schritt {n} von 6: {titel}"`; the discard flow uses `confirmAction` (no `window.confirm` in `RuleForge.tsx`: add a source test `expect(readFileSync(...)).not.toMatch(/window\.confirm/)` for all owned files).
- [ ] **Step 3: Implement** focus + announce; wizard radiogroups with roving tabindex and arrow keys (reuse `tabKeyTarget`); wizard steps via `StepList`; step labels "Name, Würfel, Attribute, Balken, Fertigkeiten, Fertig" with the everyday sentence in the question text; wizard footer inside the question column (not fixed over the preview), mobile: question first, preview in `<details>` "Bogen ansehen"; chips ≥ 24 px; engine errors via `explainValidationError` everywhere (`RuleWizard:57/91`, `RuleForgePreview:100`, `RuleComputedFields:36`, `HostRuleActionFields`).
- [ ] **Step 4:** Drawer: at ≥ 1280 px a grid column beside the editor; below, an in-flow section toggled by "Vorschau zeigen"; no fixed overlay. `scroll-padding-bottom` for the status bar.
- [ ] **Step 5:** Names: `FormulaField`/`FormulaLine` take the visible label as the input's accessible name (`aria-labelledby`); nav tabs include problem counts in their name (`"Attribute, 2 Probleme"`); field errors linked with `aria-describedby` in `RuleFieldList`; map node problems visible as text under the node, not only `title`; live regions in `RuleForge:277`, `FormulaLine:171`, `RuleForgePreview:143` debounced 700 ms; Escape in the suggestion list calls `event.stopPropagation()`; `RuleMap` visible "100 %" part of the button name; heading order fixed (`RuleForgePreview` h3, `RuleMap` h3, Aktionen "Ergebnis" h4); `MapContextMenu` reuse gets its own label ("Paketmenü").
- [ ] **Step 6: Declutter + words.** Library: header "Neues Regelwerk" (primary) + "Paket öffnen" (quiet); the start section drops the assistant card and keeps templates/blank/file; template buttons `variant="default"`; cards equal height, stats in one row; publish buttons in step order (Prüfen → Installieren → Aktivieren) matching the numbered list. "Für Fortgeschrittene" `<details>` for Kennung, Version, Engine, Würfelstart, Passagen, Migration texts; `id@version` → name + version; jargon from the audit replaced (Namensraum, Hexadezimal, deklarative Regelbausteine, `mod_ziel`, Knotennetz, Kennungslisten). Fähigkeiten tab: storage defaults to "Neues Attribut anlegen" instead of the first existing field.
- [ ] **Step 7:** Owned CSS onto the scale (no text < 12 px, `--radius*`, `--space-*`, no dark shadow literals, remove the dead 2 px `--accent` focus overrides, selection outline visibly different from focus: selection uses a 2 px `--accent` border, focus keeps the global 3 px `--focus` outline).
- [ ] **Step 7b: Beginner first (E10–E13).**
  - `RuleForgeNav`: mode „Das Wichtigste“ (default) vs „Alle Bereiche“. Core sections: package, attributes, bars, actions, abilities, sheet, try-out, publish (map to the ids the nav already uses). A non-core section is shown when the draft has content there or a problem there. Toggle button „Alle Bereiche zeigen“ / „Nur das Wichtigste zeigen“; remembered via `localStorage` key `atlas.forge.bereiche` (every access in try/catch). Pure helper `visibleSections(mode: "wichtig" | "alle", counts: Readonly<Record<SectionId, number>>, problems: Readonly<Record<SectionId, number>>): SectionId[]` in new `forge-navigation-model.ts`, tests: core always visible; conditions with count 1 visible in simple mode; migration with a problem visible; mode „alle“ returns all 14 in the existing order; the active section is always visible even if it would be hidden.
  - `ViewIntro` on the library and on each bench section: one sentence what it is, the one next step as `action`, and `steps` („Wie geht das?“) with three short steps. Sentences: Paket „Name und Beschreibung deines Regelwerks.“; Attribute „Die Werte, die man auf dem Bogen einträgt, zum Beispiel Stärke.“; Balken „Vorräte wie Leben oder Mana, die im Spiel sinken und steigen.“; Aktionen „Würfe nach festen Regeln, zum Beispiel eine Probe auf Stärke.“; Fähigkeiten „Besondere Dinge, die Figuren lernen können.“; Bogen „Wie der Charakterbogen aussieht und was wo steht.“; Ausprobieren „Würfle mit Testfiguren, bevor deine Runde damit spielt.“; Übernehmen „Prüfen, in die Bibliothek legen und für die Runde aktivieren.“; the six others analogously, one everyday sentence with an example each.
  - Teaching empty states with „Mit Beispiel beginnen“: Attribute (adds `staerke`, „Stärke“, integer 1–20, default 10), Balken (`leben`, „Leben“, max `10`, palette colour), Aktionen („Probe auf Stärke“, `1d20 + actor.staerke`, threshold 15 — adds the attribute first if missing), Fähigkeiten („Kraftschlag“), Zustände („Erschöpft“, −2 on all rolls), Listen („Ausrüstung“ with name + weight). Each example goes through the existing draft update path so Undo removes it; tests assert `validateDraft` stays valid after each example on a blank package.
  - `Begriff` at the first occurrence of each glossary term in the library, the bench section intros and the wizard questions.
- [ ] **Step 8:** Owned vitest files + client tsc green; update owned e2e specs' texts (do not run them). Report.


---

## Wave 4 — Figuren (worker "figuren", parallel)

### Task 6: Around the character

**Files (owned):** `ActorTemplatesHost.tsx`, `InstantiateActorHost.tsx`, `ActorWorkbench.tsx`, `ActorInventoryWorkbench.tsx`, `ChronicleHeroesTemplate.tsx`, `chronicle-heroes-display.ts`, `FigurAntrag.tsx`, `MeineFigur.tsx`, `actors.css`, `character-creation.css`, plus the "Anträge" view inside `ActorWorkbench`; tests `figurantrag-review.test.ts`, `actor-delete-review.test.ts`, `character-english.test.ts` (shared read-only with wave 2 — only wave 2 edits it), new `figuren-ablauf.test.ts`; e2e `actors.spec.ts`, `actor-drafts.spec.ts`, `actor-template-abort*.spec.ts`, `meine-figur.spec.ts`, `character-completion.spec.ts`, `campaign.spec.ts`; catalog `zugang-figuren.json`.

**Interfaces:** Consumes `confirmAction`, `Tabs`/`TabPanel`, `StepList`, `Notice` tones. Produces `defaultReason(kind: "bogen" | "inventar" | "figur" | "vorlage"): string` in new `figuren-gruende.ts` (returns `t("Bogen bearbeitet")` etc.).

- [ ] **Step 1: Failing tests** `figuren-ablauf.test.ts`: no `window.confirm` in any owned file (source scan); `defaultReason("bogen")` is non-empty and passes the server pattern `/\S/` and ≤ 500 chars; `ChronicleHeroesTemplate` renders at most one `button-primary`.
- [ ] **Step 2: Implement:**
  - All `window.confirm` (ActorInventoryWorkbench ×9, ActorTemplatesHost ×4, ActorWorkbench ×3, MeineFigur ×1) → `await confirmAction({ title, message, confirmLabel, danger })` with clear verbs ("Gegenstand entfernen", "Vorlage archivieren").
  - Tabs in `ActorWorkbench` (`view-tabs`) and `forge-task-tabs` → `Tabs`/`TabPanel`; "Anträge" tab badge with the number of open requests.
  - One step indicator in the template flow (`StepList`), "Figurvorlage speichern" primary and first, "Verwerfen" quiet.
  - "Grund der Änderung" optional: label `t("Grund (freiwillig, erscheint im Verlauf)")`; on submit `reason.trim() || defaultReason(kind)`.
  - Disabled archive/reject/control buttons get a visible reason linked by `aria-describedby`.
  - Figurantrag: submit button `t("Figur beantragen")` at normal width, disabled reason visible; template field "Name" hidden when the form has "Name deiner Figur" (write the chosen name into the template's name field on submit); waiting state `StepList` with 01/02 done; rejected requests: newest visible, older in `<details>` "Frühere Anträge".
  - GM request card: package as name + version; reject reason field directly above "Ablehnen".
  - `MeineFigur`: one "Deine Figur" picker at the top driving sheet and inventory; the reader perspective picker moves below with label `t("Aus wessen Sicht liest du Chronik und Atlas?")`; money shown once; on 390 px the first screen shows name, portrait and vitals (picker compact in one row with the refresh button).
  - Instantiate preview: notes in body font; name placeholder = template name.
  - `ChronicleHeroesTemplate`: heading levels (h3 inside the h2 section), one primary button; engine error via `explainValidationError`.
  - Owned CSS onto the scale.
  - **E14 First steps** in the `ForgeWorkbench` overview: component `ErsteSchritte` (new `features/ErsteSchritte.tsx`) with pure model `features/erste-schritte.ts`: `ersteSchritte(stand: { regelwerkAktiv: boolean; vorlagen: number; mitspieler: number; figuren: number; offeneAntraege: number }): { id: "regelwerk" | "vorlage" | "einladen" | "figuren"; erledigt: boolean; hinweis?: string }[]`. Data from endpoints the overview can already reach (rules pin, actor templates, roster, actors, requests); while loading or on failure the list shows without check marks — never an error wall. Each item is a `StepList` row with a button that navigates (`onSectionChange("rules" | "actors")`, invitations → the existing Runde/members stage). All done → one line „Deine Runde ist startklar.“ with „Liste zeigen“. Model tests: fresh campaign with Lite → only `regelwerk` done; `offeneAntraege: 2` → `figuren` not done with hinweis „2 Anträge warten“.
  - **E15 Guided creation** in `InstantiateActorHost` (GM) and `FigurAntrag` (player): `StepList` „Wer ist die Figur?“, „Was kann sie?“, „Fertig“; step 1 renders `HostRuleFields part="identity"` plus the figure name (and portrait where the flow supports it); step 2 `part="values"` with the points overview (`CharacterProgress`, where the package has a budget); step 3 a summary (name, key values, learned abilities) and the submit button. Live sheet preview beside the steps from 1024 px, below that inside `<details>` „Bogen ansehen“. „Zurück auf die Vorgaben“ resets values to the runtime defaults (after `confirmAction`). Zurück/Weiter buttons; Weiter disabled with a visible reason while the step has invalid values.
  - **E11/E12** `ViewIntro` on Figuren & NPCs, Figurvorlagen, Figur anlegen, Figurantrag, Ich. Empty template list → „Mit Beispiel beginnen“ creates a template „Beispielfigur“ from the active rulebook's defaults. Empty figure list explains the three ways (players request one, the GM creates one from a template, the GM creates one directly) with exactly one primary button.
- [ ] **Step 3:** Owned vitest + client tsc green; update owned e2e texts. Report.


---

## Wave 5 — Nachweis und Merge (coordinator)

### Task 7: Clean, prove, merge

- [ ] `node tools/gate-sprache.mjs`; delete every orphan key it lists from the old catalogs; add missing English entries.
- [ ] `node tools/gate-boundaries.mjs`, `npm run typecheck`, `npx vitest run packages/client packages/ui packages/rules`.
- [ ] `npm run build`; `npx playwright test e2e/neulingsgang.spec.ts e2e/zugaenglichkeit.spec.ts` green; the owned e2e specs of waves 3–4 green.
- [ ] `UX_AUDIT=1 npx playwright test e2e/ux-audit.spec.ts` → after-images; look at library, wizard 3, sheet (Lite + Heroes), figurantrag, ich — both looks, both widths; fix what looks wrong.
- [ ] `npm run desktop:build`; commit per wave with explicit paths, LF; push `main` (Kaya 2026-09-26: merge and push without asking); tell the release session (project-atlas-ef) the commit list; update memory; report to Kaya with before/after images.

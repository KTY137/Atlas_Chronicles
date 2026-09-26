// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * Der Sprachzustand gehoert dem Client, die Paketrichtung bleibt `client -> ui`.
 *
 * Dieses Paket kennt weder Katalog noch gewaehlte Sprache; es laesst sich einen Uebersetzer
 * reichen. Ohne Registrierung ist jeder Text seine eigene Antwort — ein Baustein ohne
 * angeschlossenen Client bleibt damit vollstaendig deutsch statt leer.
 */
let uebersetzer: (text: string) => string = text => text;
export function registriereUebersetzer(fn: (text: string) => string): void { uebersetzer = fn; }
/** Absichtlich `t`: derselbe Name wie im Client, damit das Sprachgate die Stelle als
 * Literalschluessel erkennt und `packages/ui/src` mitpruefen kann. */
const t = (text: string) => uebersetzer(text);

export function Button({ children, className = "", variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "quiet" }) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

/** Vier Töne statt zwei: vorher erschien jede Warnung („Niederlage steht an“) in Erfolgsgrün. */
export type NoticeTone = "ok" | "info" | "warn" | "error";
export function Notice({ children, error = false, tone }: { children: ReactNode; error?: boolean; tone?: NoticeTone }) {
  const resolved: NoticeTone = tone ?? (error ? "error" : "ok");
  return <div className={`notice notice-${resolved}`} role={resolved === "error" ? "alert" : "status"}>{children}</div>;
}
export function EmptyState({ title, children, action, level = 2 }: { title: string; children: ReactNode; action?: ReactNode; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return <div className="empty-state"><span className="empty-glyph" aria-hidden="true">✧</span><Heading>{title}</Heading><p>{children}</p>{action}</div>;
}
export function Loading({ text }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true" />{text ?? t("Wird geladen …")}</div>;
}

/**
 * Der Kopf jeder Ansicht beantwortet drei Fragen: Was ist das hier? Was mache ich jetzt? Und —
 * aufklappbar — wie geht das? Die Überschrift ist per `focusHeading` erreichbar, damit ein
 * Ansichtswechsel dort landet, wo die neue Ansicht beginnt.
 */
export function ViewIntro({ id, title, children, action, steps, level = 2 }: { id: string; title: ReactNode; children: ReactNode; action?: ReactNode; steps?: readonly ReactNode[]; level?: 1 | 2 | 3 }) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return <header className="view-intro">
    <div className="view-intro-text"><Heading id={id} tabIndex={-1}>{title}</Heading><p>{children}</p></div>
    {action ? <div className="view-intro-action">{action}</div> : null}
    {steps?.length ? <details className="view-intro-how"><summary>{t("Wie geht das?")}</summary><ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol></details> : null}
  </header>;
}

/**
 * Rückfrage im Look statt `window.confirm`. Die Browser-Box ignoriert jeden Look und hat unter
 * Electron den Fokus verloren (2026-09-23). `confirmAction` ist bewusst eine Funktion, kein Hook:
 * sie funktioniert aus jedem Ablauf heraus, auch nach einem `await`. Ohne eingehängten
 * `UiHost` (Tests, Absturzschirm) fällt sie auf die Browser-Rückfrage zurück, ohne beides auf Nein.
 */
export interface ConfirmRequest { message: string; title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
interface PendingConfirm { request: ConfirmRequest; resolve(value: boolean): void }
let confirmSink: ((request: ConfirmRequest) => Promise<boolean>) | null = null;
let announceSink: ((text: string) => void) | null = null;
export function confirmAction(request: ConfirmRequest | string): Promise<boolean> {
  const value = typeof request === "string" ? { message: request } : request;
  if (confirmSink) return confirmSink(value);
  const native = (globalThis as { confirm?: unknown }).confirm;
  return Promise.resolve(typeof native === "function" ? !!native(value.title ? `${value.title}\n\n${value.message}` : value.message) : false);
}
/** Sagt einen Satz über die ruhige Live-Region an (Schrittwechsel, Gespeichert). */
export function announce(text: string): void { announceSink?.(text); }
/** Setzt den Fokus im nächsten Bild auf das Element mit dieser Kennung, meist die neue Überschrift. */
export function focusHeading(id: string): void {
  const run = () => {
    const node = document.getElementById(id); if (!node) return;
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    node.focus();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run); else run();
}
/** Einmal einhängen: der Dialog für `confirmAction` und die Live-Region für `announce`. */
export function UiHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null), [spoken, setSpoken] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<Element | null>(null), id = useId();
  useEffect(() => {
    confirmSink = request => new Promise<boolean>(resolve => {
      opener.current = document.activeElement;
      // Eine zweite Rückfrage ersetzt die erste; die erste gilt dann als abgelehnt, nichts hängt.
      setPending(old => { old?.resolve(false); return { request, resolve }; });
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Erst leeren, dann setzen: derselbe Satz zweimal hintereinander wird sonst nicht erneut angesagt.
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
    <dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-titel`} aria-describedby={`${id}-text`} onCancel={event => { event.preventDefault(); finish(false); }}>
      {request ? <form onSubmit={event => { event.preventDefault(); finish(true); }}>
        <h2 id={`${id}-titel`}>{request.title ?? t("Bitte bestätigen")}</h2>
        <p id={`${id}-text`}>{request.message}</p>
        <div className="button-row">
          <Button autoFocus={!!request.danger} onClick={() => finish(false)}>{request.cancelLabel ?? t("Abbrechen")}</Button>
          <Button type="submit" autoFocus={!request.danger} variant={request.danger ? "danger" : "primary"}>{request.confirmLabel ?? t("Bestätigen")}</Button>
        </div>
      </form> : null}
    </dialog>
    <div className="sr-only" role="status" aria-live="polite">{spoken}</div>
  </>;
}

/** Pfeiltasten, Pos1 und Ende für Reiter und Optionsgruppen; `null` heißt: diese Taste gehört nicht uns. */
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

/** Eine Schrittanzeige für alle geführten Wege (Assistent, Figur anlegen, Antrag, Erste Schritte). */
export interface StepItem { id: string; label: ReactNode; state: "done" | "current" | "todo"; onSelect?: () => void }
export function StepList({ label, steps, className = "" }: { label: string; steps: readonly StepItem[]; className?: string }) {
  return <ol className={`step-list ${className}`} aria-label={label}>{steps.map((step, index) => {
    const body = <><span className="step-mark" aria-hidden="true">{step.state === "done" ? "✓" : index + 1}</span><span className="step-label">{step.label}</span>{step.state === "done" ? <span className="sr-only">{", "}{t("erledigt")}</span> : null}</>;
    return <li key={step.id} className={`step step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>{step.onSelect ? <button type="button" onClick={step.onSelect}>{body}</button> : body}</li>;
  })}</ol>;
}

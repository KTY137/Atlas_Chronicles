// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@chronicle/ui";
import { completionsAt, type Completion, type FormulaAnalysis, type FormulaOptions, type FormulaSources } from "./formula-sugar";

export interface FormulaLineProps {
  id: string; label: string; help?: string; text: string; analysis: FormulaAnalysis;
  sources: FormulaSources; options: FormulaOptions; status: ReactNode; disabled?: boolean;
  onText(next: string): void;
}
export const CHEAT_SHEET: readonly { title: string; text: string }[] = [
  { title: "Wurf plus Attribut", text: "1d20 + @geschick" }, { title: "Zwei Würfel, den besseren nehmen", text: "2d20kh1 + @geschick" },
  { title: "Wenn … dann … sonst", text: "if(@geschick >= 12, 1d20 + 2, 1d20)" }, { title: "Erfolg ab 15", text: "1d20 + @geschick >= 15" },
  { title: "Abrunden", text: "floor(@geschick / 2)" }, { title: "Mindestens 1", text: "max(1, @geschick - 3)" },
];
const HINT_KEY = "atlas.formula-hint-seen";
const readFlag = (key: string): boolean => { try { return localStorage.getItem(key) === "1"; } catch { return true; } };
const writeFlag = (key: string) => { try { localStorage.setItem(key, "1"); } catch { /* browser storage may be blocked; the hint simply shows again */ } };

/** Coloured copy of the typed text laid under a real input, so caret, selection and undo stay native. */
function Overlay({ text, analysis, overlayRef }: { text: string; analysis: FormulaAnalysis; overlayRef: RefObject<HTMLDivElement | null> }) {
  const error = analysis.error, pieces: ReactNode[] = []; let cursor = 0;
  const inError = (start: number, end: number) => !!error && error.start < error.end && start < error.end && end > error.start;
  for (const [i, span] of analysis.spans.entries()) {
    if (span.start > cursor) pieces.push(text.slice(cursor, span.start));
    const classes = ["ff-tok", `ff-tok-${span.kind}`, span.missing ? "ff-tok-missing" : "", inError(span.start, span.end) ? "ff-tok-error" : ""].filter(Boolean).join(" ");
    pieces.push(<span key={i} className={classes} {...(span.title ? { title: span.title } : {})}>{text.slice(span.start, span.end)}</span>);
    cursor = span.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  if (error && error.start === error.end && error.start >= text.length) pieces.push(<span key="end" className="ff-tok ff-tok-end ff-tok-error" aria-hidden="true"> </span>);
  return <div ref={overlayRef} className="ff-line-overlay" aria-hidden="true">{pieces}{text.length ? null : <span className="ff-line-placeholder">1d20 + @attribut</span>}</div>;
}

export function FormulaLine({ id, label, help, text, analysis, sources, options, status, disabled = false, onText }: FormulaLineProps) {
  const input = useRef<HTMLInputElement>(null), overlay = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDetailsElement>(null);
  const [completion, setCompletion] = useState<Completion | null>(null), [active, setActive] = useState(0);
  const [hintSeen, setHintSeen] = useState(true);
  useEffect(() => { setHintSeen(readFlag(HINT_KEY)); }, []);
  // The overlay is a plain absolutely-positioned block; only the real input scrolls its content
  // to follow the caret. Without this, a formula wider than the field types into what still looks
  // like its own beginning once the input has scrolled but the overlay has not.
  const syncScroll = () => { if (input.current && overlay.current) overlay.current.scrollLeft = input.current.scrollLeft; };
  const refresh = (value: string, caret: number) => { const next = completionsAt(value, caret, sources, options); setCompletion(next); setActive(0); };
  const accept = (index: number) => {
    const item = completion?.items[index]; if (!completion || !item || !item.insert) { setCompletion(null); return; }
    const next = text.slice(0, completion.start) + item.insert + text.slice(completion.end), caret = completion.start + item.insert.length;
    onText(next); setCompletion(null);
    // Accepting a completion moves the caret programmatically, which can scroll the input without
    // firing the input's own scroll handler in time — sync explicitly once the DOM has settled.
    requestAnimationFrame(() => { input.current?.setSelectionRange(caret, caret); input.current?.focus(); syncScroll(); });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!completion) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(value => (value + 1) % completion.items.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(value => (value + completion.items.length - 1) % completion.items.length); }
    else if (event.key === "Enter" || event.key === "Tab") { if (completion.items[active]?.insert) { event.preventDefault(); accept(active); } }
    else if (event.key === "Escape") { event.preventDefault(); setCompletion(null); }
  };
  const listId = `${id}-list`, statusId = `${id}-status`, error = analysis.error;
  return <div className={`ff-line${error ? " ff-line-invalid" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {!hintSeen ? <p className="ff-hint">Tippe @ für Attribute, ? für Parameter, Zahlen und Würfel wie 1d20 direkt. <Button variant="quiet" aria-label="Hinweis schließen" onClick={() => { writeFlag(HINT_KEY); setHintSeen(true); }}><X size={13} /></Button></p> : null}
    <div className="ff-line-stack">
      <Overlay text={text} analysis={analysis} overlayRef={overlay} />
      <input ref={input} id={id} className="ff-line-input" value={text} disabled={disabled} autoComplete="off" spellCheck={false} maxLength={4096}
        role="combobox" aria-autocomplete="list" aria-expanded={!!completion} aria-controls={listId} aria-activedescendant={completion ? `${listId}-${active}` : undefined}
        aria-describedby={statusId} aria-invalid={error ? true : undefined}
        onChange={event => { onText(event.target.value); refresh(event.target.value, event.target.selectionStart ?? event.target.value.length); syncScroll(); }}
        onKeyDown={onKeyDown} onBlur={() => setTimeout(() => setCompletion(null), 120)}
        onScroll={syncScroll}
        onSelect={event => { const target = event.currentTarget; if (completion) refresh(target.value, target.selectionStart ?? target.value.length); }} />
      {completion ? <ul id={listId} className="ff-completion" role="listbox" aria-label="Vorschläge">{completion.items.map((item, i) => <li key={`${item.kind}-${item.insert || item.title}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={`ff-completion-${item.kind}${i === active ? " is-active" : ""}`} onMouseDown={event => { event.preventDefault(); accept(i); }}><strong>{item.title}</strong><small>{item.detail}</small></li>)}</ul> : null}
    </div>
    <p id={statusId} className="ff-line-status" aria-live="polite">{error ? <span className="ff-error">{error.message}</span> : status}</p>
    {help ? <small className="ff-help">{help}</small> : null}
    <details ref={sheet} className="ff-line-tools">
      <summary><BookOpen size={14} aria-hidden="true" />Spickzettel</summary>
      <ul className="ff-cheat-sheet" aria-label="Beispiele zum Einsetzen">{CHEAT_SHEET.map(item => <li key={item.text}><button type="button" disabled={disabled} onClick={() => { onText(item.text); if (sheet.current) sheet.current.open = false; }}><strong>{item.title}</strong><code>{item.text}</code></button></li>)}</ul>
    </details>
  </div>;
}

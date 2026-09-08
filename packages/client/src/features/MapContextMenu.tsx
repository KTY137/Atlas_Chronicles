// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { t } from "../i18n";
import "./map-context-menu.css";

export interface MapContextAction {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly danger?: boolean;
}

/** One menu for a visible map target: pointer, keyboard and touch use the same actions. */
export function MapContextMenu({ label, actions, children, className = "", popup }: {
  label: string; actions: readonly MapContextAction[]; children?: ReactNode; className?: string;
  /** A canvas hit opens a fresh instance at its pointer position; the target remains explicit. */
  popup?: { x: number; y: number; onDismiss: () => void };
}) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(popup ?? null);
  const close = (restore: boolean) => {
    setAt(null);
    if (restore) (origin.current?.isConnected && origin.current !== document.body ? origin.current : trigger.current)?.focus({ preventScroll:true });
    popup?.onDismiss();
  };
  const open = (x?: number, y?: number) => {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
    const bounds = trigger.current!.getBoundingClientRect();
    setAt({ x: x ?? bounds.left, y: y ?? bounds.bottom + 4 });
  };
  useLayoutEffect(() => {
    if (!at || !menu.current) return;
    const bounds = menu.current.getBoundingClientRect();
    menu.current.style.left = `${Math.max(8,Math.min(at.x,window.innerWidth-bounds.width-8))}px`;
    menu.current.style.top = `${Math.max(8,Math.min(at.y,window.innerHeight-bounds.height-8))}px`;
    // The popup is already clamped to the viewport. Native focus scrolling can otherwise
    // move a tall editor and immediately trigger our normal scroll-dismiss handler.
    menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll:true });
  }, [at]);
  useEffect(() => {
    if (!at) return;
    const dismiss = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false); };
    const viewportChanged = () => close(false);
    document.addEventListener("pointerdown",dismiss,true);
    window.addEventListener("resize",viewportChanged);
    window.addEventListener("scroll",viewportChanged,true);
    return () => { document.removeEventListener("pointerdown",dismiss,true); window.removeEventListener("resize",viewportChanged); window.removeEventListener("scroll",viewportChanged,true); };
  }, [at]);
  // A popup has no layout box: an empty grid/flex child would add a gap, move the canvas,
  // and dismiss its own menu through browser scroll anchoring.
  return <div className={`map-context-target ${className}`} style={popup ? { display:"contents" } : undefined} onContextMenu={event => {
    if (popup) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault(); event.stopPropagation(); open(event.clientX,event.clientY);
  }} onKeyDown={event => {
    if (popup) return;
    if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10") { event.preventDefault(); event.stopPropagation(); open(); }
  }}>
    {children}
    {!popup ? <button type="button" ref={trigger} className="map-context-trigger" aria-label={t("Aktionen für {label}", { label })} title={t("Aktionen für {label}", { label })}
      aria-haspopup="menu" aria-expanded={!!at} aria-controls={at ? id : undefined} onClick={() => at ? close(true) : open()}><MoreHorizontal size={19} aria-hidden="true" /></button> : null}
    {at ? createPortal(<div id={id} ref={menu} className="map-context-menu" role="menu" aria-label={t("Karte {label}", { label })} style={{ left: at.x, top: at.y }} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (event.key === "Tab") { close(true); return; }
      const buttons = [...menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length-1 : event.key === "ArrowDown" ? (index+1)%buttons.length : event.key === "ArrowUp" ? (index-1+buttons.length)%buttons.length : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
    }}><strong className="map-context-caption" role="presentation">{label}</strong>{actions.map(action => <button type="button" key={action.id} role="menuitem" tabIndex={-1} disabled={action.disabled} className={action.danger ? "map-context-danger" : undefined}
      onClick={() => { close(true); action.onSelect(); }}>{action.label}</button>)}</div>,document.body) : null}
  </div>;
}

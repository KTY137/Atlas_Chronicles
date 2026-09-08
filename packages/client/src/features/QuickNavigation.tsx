// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { t } from "../i18n";
import { isQuickNavigationShortcut, navigationCommands, searchNavigationCommands, type NavigationCommand } from "./quick-navigation";
import "./quick-navigation.css";

export function QuickNavigation({ gm, onNavigate }: {
  gm: boolean;
  /** False means the existing unsaved-draft guard refused navigation. */
  onNavigate: (command: NavigationCommand) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const focusContent = useRef(false);
  const id = useId();
  const results = searchNavigationCommands(navigationCommands(gm, t), query);
  const selected = results[Math.min(activeIndex, results.length - 1)];
  const optionId = (command: NavigationCommand) => `${id}-${command.id}`;

  const show = () => {
    setQuery(""); setActiveIndex(0); focusContent.current = false; setOpen(true);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) { element.showModal(); input.current?.focus(); }
    if (!open && element.open) {
      element.close();
      if (focusContent.current) {
        document.getElementById("main-content")?.focus();
        focusContent.current = false;
      }
    }
  }, [open]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!isQuickNavigationShortcut(event)) return;
      // Do not stack over an upload/editor dialog or steal its shortcuts.
      const modal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
      if (modal && modal !== dialog.current) return;
      // Rich-text editors often reserve Ctrl+K for inserting a link.
      if (!open && event.target instanceof HTMLElement && event.target.isContentEditable) return;
      event.preventDefault();
      if (open) setOpen(false); else show();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [open]);

  useEffect(() => {
    if (open && selected) document.getElementById(optionId(selected))?.scrollIntoView({ block: "nearest" });
  }, [open, selected?.id]);

  const choose = (command: NavigationCommand) => {
    // Re-check the current role immediately before dispatch, not only when opening.
    if (!navigationCommands(gm, t).some(available => available.id === command.id)) return;
    if (!onNavigate(command)) { input.current?.focus(); return; }
    focusContent.current = true;
    setOpen(false);
  };
  const keyboard = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length) {
      event.preventDefault();
      const index = Math.min(activeIndex, results.length - 1);
      setActiveIndex((index + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (event.key === "Enter" && selected) {
      event.preventDefault(); choose(selected);
    }
  };
  const clear = () => { setQuery(""); setActiveIndex(0); input.current?.focus(); };

  return <>
    <button type="button" className="quick-navigation-trigger" aria-label={t("Schnellzugriff öffnen")}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} aria-keyshortcuts="Control+k Meta+k"
      title={t("Schnellzugriff · Strg / ⌘ K")} onClick={show}>
      <Search size={17} aria-hidden="true" /><span>{t("Schnellzugriff")}</span><kbd aria-hidden="true">{t("Strg / ⌘ K")}</kbd>
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} className="quick-navigation" aria-labelledby={`${id}-title`}
      onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }}
      onCancel={event => { event.preventDefault(); setOpen(false); }}
      onClose={() => { if (!dialog.current?.open) setOpen(false); }}>
      <header className="quick-navigation-heading">
        <div><p className="eyebrow">Atlas Chronicles</p><h2 id={`${id}-title`}>{t("Schnellzugriff")}</h2></div>
        <button type="button" className="quick-navigation-close" aria-label={t("Schnellzugriff schließen")} onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="quick-navigation-search">
        <Search size={20} aria-hidden="true" />
        <input ref={input} type="text" role="combobox" aria-label={t("Bereich oder Werkzeug suchen")}
          aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-results`}
          aria-activedescendant={open && selected ? optionId(selected) : undefined} aria-describedby={`${id}-hint`}
          placeholder={t("Zum Beispiel: Loot, Kampf oder Karte …")} autoComplete="off" spellCheck={false} maxLength={120}
          value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={keyboard} />
        {query ? <button type="button" className="quick-navigation-close" aria-label={t("Suche leeren")} onClick={clear}><X size={17} aria-hidden="true" /></button> : null}
      </div>
      <p id={`${id}-hint`} className="quick-navigation-hint">{t("Sucht Bereiche und Werkzeuge, keine Kampagneninhalte.")}</p>
      <div id={`${id}-results`} className="quick-navigation-results" role="listbox" aria-label={t("Navigationsziele")}>
        {results.map(command => <button key={command.id} id={optionId(command)} type="button" role="option" tabIndex={-1}
          aria-label={command.label} aria-describedby={`${optionId(command)}-description`} aria-selected={selected?.id === command.id}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(command)}>
          <span className="quick-navigation-result-copy"><strong>{command.label}</strong><small id={`${optionId(command)}-description`}>{command.description}</small></span>
          <span className="quick-navigation-group">{command.group}</span><ArrowRight size={16} aria-hidden="true" />
        </button>)}
      </div>
      {results.length === 0 ? <div className="quick-navigation-empty"><strong>{t("Keine passenden Ziele")}</strong><p>{t("Versuche einen anderen Begriff oder leere die Suche.")}</p><button type="button" onClick={clear}>{t("Alle Ziele anzeigen")}</button></div> : null}
      <footer className="quick-navigation-footer"><span role="status">{t("{n} Ziele verfügbar", { n: results.length })}</span><span>{t("Mit ↑ ↓ wählen, mit Enter öffnen.")}</span></footer>
    </dialog>
  </>;
}

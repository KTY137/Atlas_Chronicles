// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type ReactNode } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";

export interface EntryRow { key: string; name: string; detail: string }
const MAX_ROWS = 80;

/**
 * Die linke Hälfte von „Liste und Detail“: kompakt, durchsuchbar, ein Eintrag ist ausgewählt.
 * Auswahl und Suche bleiben auch bei einer schreibgeschützten Version bedienbar; nur das
 * Hinzufügen sperrt `disabled`. Eine leere Liste sagt, was hineingehört, und bietet mit `onExample`
 * einen fertigen Beispieleintrag an (Spec E12).
 */
export function RuleEntryList({ title, help, rows, current, onSelect, onAdd, addLabel, searchLabel, disabled = false, empty, extra, onExample }: {
  title: string; help?: string; rows: readonly EntryRow[]; current: string | undefined; onSelect(key: string): void;
  onAdd?: () => void; addLabel?: string; searchLabel: string; disabled?: boolean; empty: string; extra?: ReactNode; onExample?: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("de");
  const shown = rows.filter(row => !needle || `${row.name} ${row.detail}`.toLocaleLowerCase("de").includes(needle));
  return <nav className="rf-list" aria-label={title}>
    <div className="rf-section-heading"><h3>{title}</h3>{onAdd && addLabel ? <Button disabled={disabled} onClick={() => { setQuery(""); onAdd(); }}><Plus size={15} />{addLabel}</Button> : null}</div>
    {help ? <p className="rf-help">{help}</p> : null}
    {extra}
    {rows.length >= 8 || query ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input type="search" aria-label={searchLabel} value={query} placeholder={t("Name oder Kennung")} onChange={event => setQuery(event.target.value)} /></label> : null}
    <ul>{shown.slice(0, MAX_ROWS).map(row => <li key={row.key}><button type="button" aria-current={row.key === current ? "true" : undefined} onClick={() => onSelect(row.key)}><strong>{row.name || t("Ohne Namen")}</strong><small>{row.detail}</small></button></li>)}</ul>
    {shown.length > MAX_ROWS ? <p className="rf-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: shown.length - MAX_ROWS })}</p> : null}
    {!rows.length ? <ExampleStart text={empty} disabled={disabled} onExample={onExample} /> : null}
    {needle && !shown.length ? <div className="rf-search-empty" role="status"><p>{t("Keine passenden Einträge gefunden.")}</p><Button variant="quiet" onClick={() => setQuery("")}>{t("Suche zurücksetzen")}</Button></div> : null}
  </nav>;
}

/** Die leere Liste lehrt: ein Satz, was hineingehört, und ein fertiger Beispieleintrag auf Knopfdruck. */
export function ExampleStart({ text, disabled = false, onExample }: { text: string; disabled?: boolean; onExample?: (() => void) | undefined }) {
  return <div className="rf-example-start"><p className="rf-help">{text}</p>{onExample ? <Button disabled={disabled} onClick={onExample}><Sparkles size={15} aria-hidden="true" />{t("Mit Beispiel beginnen")}</Button> : null}</div>;
}

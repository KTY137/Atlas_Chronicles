// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import { objectKey, type MapObject } from "./tactical-entities";

export function TacticalObjectList({ objects, selected, onSelect, onOpenEntry }: {
  objects: readonly MapObject[]; selected: string; onSelect(key: string): void; onOpenEntry?: (id: string) => void;
}) {
  const [query, setQuery] = useState(""), [page, setPage] = useState(0);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("de"); return objects.filter(o => `${o.label} ${o.kind === "place" ? t("Ort") : t("Kartenobjekt")} ${o.id}`.toLocaleLowerCase("de").includes(q)); }, [objects, query]);
  const last = Math.max(0, Math.ceil(filtered.length / 100) - 1), current = Math.min(page, last);
  const choice = objects.find(o => objectKey(o) === selected);
  return <div className="tactical-objects"><label>{t("Orte und Kartenobjekte suchen")}<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
    <p className="field-help">{t("{sichtbar} von {gesamt} Objekten in dieser Ansicht.", { sichtbar: filtered.length, gesamt: objects.length })}</p>
    {choice ? <div className="tactical-object-selected" role="status"><strong>{choice.label}</strong><span>{choice.kind === "place" ? t("Ort") : t("Kartenobjekt")} · {choice.x.toFixed(1)}, {choice.y.toFixed(1)}</span>{choice.entryId && onOpenEntry ? <Button onClick={() => onOpenEntry(choice.entryId!)}>{t("Artikel öffnen")}</Button> : null}</div> : null}
    <ul className="tactical-object-list">{filtered.slice(current * 100, (current + 1) * 100).map(o => <li key={objectKey(o)}><Button aria-pressed={selected === objectKey(o)} onClick={() => onSelect(objectKey(o))}>{o.kind === "place" ? t("Ort") : t("Kartenobjekt")}: {o.label}</Button><small>{o.x.toFixed(1)}, {o.y.toFixed(1)}</small></li>)}</ul>
    {filtered.length > 100 ? <div className="button-row"><Button disabled={current === 0} onClick={() => setPage(current - 1)}>{t("Vorherige Objekte")}</Button><span>{t("Seite {seite} von {gesamt}", { seite: current + 1, gesamt: last + 1 })}</span><Button disabled={current >= last} onClick={() => setPage(current + 1)}>{t("Weitere Objekte")}</Button></div> : null}
    {!filtered.length ? <p>{t("Keine passenden Orte oder Kartenobjekte.")}</p> : null}
  </div>;
}

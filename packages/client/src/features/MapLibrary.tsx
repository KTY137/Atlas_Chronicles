// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Map, Search } from "lucide-react";
import type { MapReference } from "@chronicle/protocol";
import { t } from "../i18n";
import { MapContextMenu } from "./MapContextMenu";

export interface MapLibraryItem extends MapReference { name: string; revision?: number }
export function MapLibrary({ items, selected, onOpen, onEdit, onDelete, disabled = false }: {
  items: readonly MapLibraryItem[]; selected?: MapReference; onOpen: (map: MapLibraryItem) => void;
  onEdit: (map: MapLibraryItem) => void; onDelete: (map: MapLibraryItem) => void; disabled?: boolean;
}) {
  const [query,setQuery] = useState("");
  const visible = useMemo(() => items.filter(map => map.name.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"))),[items,query]);
  return <section className="map-library" aria-label={t("Kartenbibliothek")}><div className="map-library-heading"><h2>{t("Kartenbibliothek")} <small>{items.length}</small></h2>
    <label><Search size={16} aria-hidden="true" /><input type="search" aria-label={t("Karten suchen")} placeholder={t("Karte suchen …")} value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <ul className="map-library-list">{visible.map(map => <li key={`${map.kind}:${map.id}`}><MapContextMenu label={map.name} className="map-library-row" actions={[
      { id: "open", label: t("Karte öffnen"), disabled, onSelect: () => onOpen(map) },
      { id: "edit", label: t("Karte bearbeiten"), disabled, onSelect: () => onEdit(map) },
      { id: "delete", label: t("Karte löschen …"), danger: true, disabled, onSelect: () => onDelete(map) },
    ]}><button type="button" className="map-library-open" disabled={disabled} aria-pressed={selected?.kind === map.kind && selected.id === map.id} onClick={() => onOpen(map)}><Map size={18} aria-hidden="true" /><span>{map.name}<small>{map.kind === "atlas" ? t("Weltkarte") : t("Orts- oder Gebäudekarte")}{map.revision ? ` · ${t("Revision {revision}", { revision: map.revision })}` : ""}</small></span></button></MapContextMenu></li>)}</ul>
    {!visible.length ? <p className="field-help">{items.length ? t("Keine passende Karte. Ändere die Suche.") : t("Noch keine gespeicherten Karten.")}</p> : null}
  </section>;
}

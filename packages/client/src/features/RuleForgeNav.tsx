// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KeyboardEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { t } from "../i18n";
import type { RuleDraft } from "./rule-forge-model";

/**
 * Die eine Navigation der Werkbank. Sie ersetzt Weg, Zählkacheln, Banner und Reiterzeile: vier
 * Gruppen, jede Sektion ein Reiter mit Anzahl und Warnzeichen am vermuteten Fehlerort.
 */
export type ForgeSection = "package" | "map" | "fields" | "computed" | "vitals" | "collections" | "sheet" | "actions" | "abilities" | "conditions" | "constraints" | "try" | "migrations" | "publish";
type GroupId = "overview" | "figure" | "table" | "finish";
export const SECTION_GROUPS: readonly { id: GroupId; sections: readonly ForgeSection[] }[] = [
  { id: "overview", sections: ["package", "map"] },
  { id: "figure", sections: ["fields", "computed", "vitals", "collections", "sheet"] },
  { id: "table", sections: ["actions", "abilities", "conditions", "constraints"] },
  { id: "finish", sections: ["try", "migrations", "publish"] },
];
export const SECTIONS: readonly ForgeSection[] = SECTION_GROUPS.flatMap(group => group.sections);

function groupLabel(id: GroupId): string {
  switch (id) { case "overview": return t("Überblick"); case "figure": return t("Die Figur"); case "table": return t("Am Tisch"); case "finish": return t("Fertigstellen"); }
}
export function sectionLabel(id: ForgeSection): string {
  switch (id) {
    case "package": return t("Paket");
    case "map": return t("Regelkarte");
    case "fields": return t("Attribute");
    case "computed": return t("Abgeleitete Werte");
    case "vitals": return t("Balken");
    case "collections": return t("Listen");
    case "sheet": return t("Bogen");
    case "actions": return t("Aktionen");
    case "abilities": return t("Fähigkeiten");
    case "conditions": return t("Zustände");
    case "constraints": return t("Bogenregeln");
    case "try": return t("Ausprobieren");
    case "migrations": return t("Migration");
    case "publish": return t("Übernehmen");
  }
}
export function sectionDescription(id: ForgeSection): string {
  switch (id) {
    case "package": return t("Name, Version, Kennung und Lizenz: die Grunddaten dieses Regelwerks.");
    case "map": return t("Regelkarte: das ganze Regelwerk als ein Bild, mit Verbindungen von den Attributen zu allem, was sie benutzt.");
    case "fields": return t("Attribute: die Werte, die jede Figur trägt, zum Beispiel Geschick oder Lebenspunkte.");
    case "computed": return t("Abgeleitete Werte: Zahlen, die sich aus Attributen ergeben, zum Beispiel ein Bonus. Sie werden angezeigt, nicht gespeichert.");
    case "vitals": return t("Balken: Leben, Mana, Ausdauer und alles andere, was im Spiel voll und leer wird.");
    case "collections": return t("Listen: wiederholbare Einträge wie Waffen, Zauber oder Sprachen.");
    case "sheet": return t("Bogen: wie alles auf dem Charakterbogen angeordnet ist, mit Vorschau.");
    case "actions": return t("Aktionen: was eine Figur tun kann und wie dafür gewürfelt wird.");
    case "abilities": return t("Fähigkeiten: was eine Figur lernen kann, mit Rang, Vorstufen, Voraussetzung, Preis und einer Wirkung auf Würfe.");
    case "conditions": return t("Zustände: was eine Figur vorübergehend belastet oder beflügelt und wie das in Würfe hineinrechnet.");
    case "constraints": return t("Bogenregeln: was ein gültiger Bogen erfüllen muss, bevor er gespeichert wird.");
    case "try": return t("Ausprobieren: mit Testfiguren würfeln und Beispiele als Pakettests festhalten.");
    case "migrations": return t("Migration: wie vorhandene Bögen beim Wechsel auf diese Version übernommen werden.");
    case "publish": return t("Übernehmen: diese Version installieren, prüfen, was sich für vorhandene Figuren ändert, und für die Runde aktivieren.");
  }
}
export function sectionCount(id: ForgeSection, draft: RuleDraft): number | null {
  switch (id) {
    case "fields": return draft.fields.length;
    case "computed": return draft.computed?.length ?? 0;
    case "vitals": return draft.vitals?.length ?? 0;
    case "collections": return draft.collections?.length ?? 0;
    case "actions": return draft.actions.length;
    case "abilities": return draft.abilities?.length ?? 0;
    case "conditions": return draft.conditions?.length ?? 0;
    case "constraints": return draft.constraints?.length ?? 0;
    case "try": return draft.selfTests.length;
    case "migrations": return draft.migrations.length;
    default: return null;
  }
}

export function RuleForgeNav({ draft, current, warning, onChange }: { draft: RuleDraft; current: ForgeSection; warning: ForgeSection | null; onChange(section: ForgeSection): void }) {
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, id: ForgeSection) => {
    const index = SECTIONS.indexOf(id);
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (index + 1) % SECTIONS.length : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (index + SECTIONS.length - 1) % SECTIONS.length : event.key === "Home" ? 0 : event.key === "End" ? SECTIONS.length - 1 : -1;
    if (next < 0) return; event.preventDefault(); const target = SECTIONS[next]!; onChange(target); document.getElementById(`rf-tab-${target}`)?.focus();
  };
  return <div className="rf-nav" role="tablist" aria-orientation="vertical" aria-label={t("Regelpaket bearbeiten")}>
    {SECTION_GROUPS.map(group => <div className="rf-nav-group" key={group.id} role="presentation">
      <span className="rf-nav-group-label" aria-hidden="true">{groupLabel(group.id)}</span>
      {group.sections.map(id => { const count = sectionCount(id, draft); return <button key={id} type="button" role="tab" id={`rf-tab-${id}`} aria-selected={current === id} aria-controls={`rf-panel-${id}`} aria-label={sectionLabel(id)}
        tabIndex={current === id ? 0 : -1} title={sectionDescription(id)} onKeyDown={event => navigate(event, id)} onClick={() => onChange(id)}>
        <span>{sectionLabel(id)}</span>
        {warning === id ? <TriangleAlert size={13} aria-hidden="true" className="rf-nav-warning" /> : null}
        {count !== null ? <small aria-hidden="true">{count}</small> : null}
      </button>; })}
    </div>)}
  </div>;
}

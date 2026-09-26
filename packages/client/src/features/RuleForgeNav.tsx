// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ViewIntro, tabKeyTarget } from "@chronicle/ui";
import { t } from "../i18n";
import { Begriff } from "./Begriff";
import type { BegriffId } from "./begriffe";
import { SECTIONS, SECTION_GROUPS, readSectionMode, sectionCount, sectionCounts, visibleSections, writeSectionMode, type ForgeSection, type SectionGroupId, type SectionMode, type SectionNumbers } from "./forge-navigation-model";
import type { RuleDraft } from "./rule-forge-model";

export { SECTIONS, SECTION_GROUPS, sectionCount, type ForgeSection } from "./forge-navigation-model";

/**
 * Die eine Navigation der Werkbank: vier Gruppen, jeder Bereich ein Reiter mit Anzahl und
 * Warnzeichen am vermuteten Fehlerort. Beim ersten Öffnen stehen nur die acht Bereiche da, mit
 * denen ein Regelwerk entsteht (Spec E10); „Alle Bereiche zeigen“ holt den Rest dazu.
 */
function groupLabel(id: SectionGroupId): string {
  switch (id) { case "overview": return t("Überblick"); case "figure": return t("Die Figur"); case "table": return t("Am Tisch"); case "finish": return t("Fertigstellen"); }
}
export function sectionLabel(id: ForgeSection): string {
  switch (id) {
    case "package": return t("Paket");
    case "map": return t("Regelkarte");
    case "fields": return t("Attribute");
    case "computed": return t("Berechnete Werte");
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
/** Was dieser Bereich ist, in einem Satz mit Beispiel (Spec E11). */
export function sectionDescription(id: ForgeSection): string {
  switch (id) {
    case "package": return t("Name und Urheberschaft deines Regelwerks. So erscheint es in der Bibliothek deiner Runde.");
    case "map": return t("Das ganze Regelwerk als ein Bild, zum Beispiel welche Würfe Stärke benutzen.");
    case "fields": return t("Die Werte, die man auf dem Bogen einträgt, zum Beispiel Stärke.");
    case "computed": return t("Werte, die das Regelwerk selbst ausrechnet, zum Beispiel Verteidigung = Geschick + 10.");
    case "vitals": return t("Vorräte wie Leben oder Mana, die im Spiel sinken und steigen.");
    case "collections": return t("Mehrere gleichartige Einträge auf dem Bogen, zum Beispiel die Ausrüstung mit Name und Gewicht.");
    case "sheet": return t("Wie der Charakterbogen aussieht und was wo steht.");
    case "actions": return t("Würfe nach festen Regeln, zum Beispiel eine Probe auf Stärke.");
    case "abilities": return t("Besondere Dinge, die Figuren lernen können, zum Beispiel Kraftschlag.");
    case "conditions": return t("Was eine Figur gerade betrifft und wieder vergeht, zum Beispiel „Erschöpft: −2 auf alle Proben“.");
    case "constraints": return t("Was ein Bogen erfüllen muss, bevor er gespeichert wird, zum Beispiel höchstens 30 verteilte Punkte.");
    case "try": return t("Würfle mit Testfiguren, bevor deine Runde damit spielt.");
    case "migrations": return t("Wie vorhandene Figuren beim Wechsel auf diese Version ihre Werte behalten, zum Beispiel wenn ein Attribut umbenannt wurde.");
    case "publish": return t("Prüfen, in die Bibliothek legen und für die Runde aktivieren.");
  }
}
/** „Wie geht das?“: drei kurze Schritte je Bereich. */
export function sectionSteps(id: ForgeSection): string[] {
  switch (id) {
    case "package": return [t("Gib deinem Regelwerk einen Namen."), t("Trage ein, wer es geschrieben hat."), t("Version und Kennung stehen unter „Für Fortgeschrittene“; die Vorgaben passen meist.")];
    case "map": return [t("Wähle oben Übersicht, Karte oder Karte mit Rechenwegen."), t("Klicke einen Teil an, um zu sehen, was mit ihm zusammenhängt."), t("Ändere ihn rechts oder öffne seinen Bereich.")];
    case "fields": return [t("Lege ein Attribut an oder beginne mit dem Beispiel Stärke."), t("Gib ihm einen Namen und einen erlaubten Bereich, zum Beispiel 1 bis 20."), t("Würfe benutzen es danach mit @, zum Beispiel @staerke.")];
    case "computed": return [t("Lege einen Wert an."), t("Schreibe die Berechnung, zum Beispiel @geschick + 10."), t("Der Wert steht auf dem Bogen und rechnet sich selbst.")];
    case "vitals": return [t("Lege mit einem Klick Leben, Mana oder Ausdauer an."), t("Stelle den Höchststand ein, zum Beispiel 10 oder @konstitution * 5."), t("Daneben siehst du den Balken so, wie er am Tisch erscheint.")];
    case "collections": return [t("Lege eine Liste an, zum Beispiel Ausrüstung."), t("Bestimme die Felder jedes Eintrags, zum Beispiel Name und Gewicht."), t("Auf dem Bogen trägt die Figur dann beliebig viele Einträge ein.")];
    case "sheet": return [t("Links steht der Aufbau des Bogens von oben nach unten."), t("Wähle einen Eintrag, um ihn zu verschieben oder in eine Kategorie zu legen."), t("Daneben siehst du den Bogen einer Testfigur.")];
    case "actions": return [t("Lege eine Aktion an oder beginne mit der Probe auf Stärke."), t("Schreibe den Wurf, zum Beispiel 1d20 + @staerke."), t("Lege fest, ab welchem Ergebnis sie gelingt, zum Beispiel ab 15.")];
    case "abilities": return [t("Beginne mit dem Beispiel Kraftschlag oder lege eine eigene Fähigkeit an."), t("Lege Preis und Voraussetzungen fest."), t("Figuren lernen sie danach auf ihrem Bogen.")];
    case "conditions": return [t("Beginne mit dem Beispiel Erschöpft oder lege einen eigenen Zustand an."), t("Beschreibe in einem Satz, was er bewirkt."), t("Am Tisch schaltet man ihn auf dem Bogen ein und aus.")];
    case "constraints": return [t("Lege eine Regel an."), t("Schreibe die Bedingung, zum Beispiel @punkte <= 30."), t("Schreibe die Meldung, die erscheint, wenn die Regel verletzt ist.")];
    case "try": return [t("Wähle eine Aktion."), t("Ändere die Werte der Testfiguren und sieh, wie sich das Ergebnis ändert."), t("Speichere ein Beispiel als Pakettest, damit es beim Installieren geprüft wird.")];
    case "migrations": return [t("Lege für jede frühere Version einen Weg an."), t("Füge Schritte hinzu: umbenennen, hinzufügen, archivieren oder umrechnen."), t("„Aktivierung prüfen“ zeigt, was mit vorhandenen Figuren passiert.")];
    case "publish": return [t("Prüfe, was sich für vorhandene Figuren ändert."), t("Installiere die Version: Sie liegt dann unveränderlich in der Bibliothek."), t("Aktiviere sie: Ab dann gilt sie am Tisch.")];
  }
}
/** Der Begriff, den der Titel eines Bereichs erklärt (Spec E13). */
const SECTION_TERM: Partial<Record<ForgeSection, BegriffId>> = {
  package: "regelwerk", fields: "attribut", computed: "berechneter-wert", vitals: "balken", collections: "liste", sheet: "bogen",
  actions: "aktion", abilities: "faehigkeit", conditions: "zustand",
};
/** Der Kopf eines Bereichs: Titel mit Erklärung, ein Satz, der eine nächste Schritt, „Wie geht das?“. */
export function SectionIntro({ id, action, children }: { id: ForgeSection; action?: ReactNode; children?: ReactNode }) {
  const term = SECTION_TERM[id];
  return <ViewIntro level={3} id="rf-section-title" title={term ? <Begriff id={term}>{sectionLabel(id)}</Begriff> : sectionLabel(id)} steps={sectionSteps(id)} action={action}>
    {sectionDescription(id)}{children}
  </ViewIntro>;
}
/** Der Name eines Reiters für Bildschirmleser: mit der Zahl der Probleme, die dort warten. */
export function sectionTabName(id: ForgeSection, problems: number): string {
  if (problems <= 0) return sectionLabel(id);
  return problems === 1 ? t("{name}, ein Problem", { name: sectionLabel(id) }) : t("{name}, {anzahl} Probleme", { name: sectionLabel(id), anzahl: problems });
}

export function RuleForgeNav({ draft, current, problems, onChange }: { draft: RuleDraft; current: ForgeSection; problems: SectionNumbers; onChange(section: ForgeSection): void }) {
  const [mode, setMode] = useState<SectionMode>(readSectionMode);
  const shown = visibleSections(mode, sectionCounts(draft), problems, current), hidden = SECTIONS.length - shown.length;
  const toggle = () => { const next: SectionMode = mode === "alle" ? "wichtig" : "alle"; setMode(next); writeSectionMode(next); };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, id: ForgeSection) => {
    const next = tabKeyTarget(event.key, shown.indexOf(id), shown.length);
    if (next === null) return;
    event.preventDefault(); const target = shown[next]!; onChange(target); document.getElementById(`rf-tab-${target}`)?.focus();
  };
  return <div className="rf-nav">
    <div className="rf-nav-tabs" role="tablist" aria-orientation="vertical" aria-label={t("Bereiche des Regelwerks")}>
      {SECTION_GROUPS.map(group => {
        const ids = group.sections.filter(id => shown.includes(id));
        if (!ids.length) return null;
        return <div className="rf-nav-group" key={group.id} role="presentation">
          <span className="rf-nav-group-label" aria-hidden="true">{groupLabel(group.id)}</span>
          {ids.map(id => { const count = sectionCount(id, draft), problem = problems[id] ?? 0; return <button key={id} type="button" role="tab" id={`rf-tab-${id}`} aria-selected={current === id} aria-controls={`rf-panel-${id}`} aria-label={sectionTabName(id, problem)}
            tabIndex={current === id ? 0 : -1} title={sectionDescription(id)} onKeyDown={event => navigate(event, id)} onClick={() => onChange(id)}>
            <span>{sectionLabel(id)}</span>
            {problem > 0 ? <TriangleAlert size={13} aria-hidden="true" className="rf-nav-warning" /> : null}
            {count !== null ? <small aria-hidden="true">{count}</small> : null}
          </button>; })}
        </div>;
      })}
    </div>
    {mode === "alle" || hidden > 0 ? <Button variant="quiet" className="rf-nav-mode" onClick={toggle}>{mode === "alle" ? t("Nur das Wichtigste zeigen") : t("Alle Bereiche zeigen ({anzahl} weitere)", { anzahl: hidden })}</Button> : null}
  </div>;
}

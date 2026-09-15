// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@chronicle/ui";
import type { RuleCapabilities } from "@chronicle/rules";
import { t } from "../i18n";

/**
 * Der Wegweiser der Regelwerkstatt: fünf Stationen von der Grundlage bis zur aktiven Runde.
 * Jede Station kennt ihren Zustand (erledigt, dran, offen), erklärt sich in einem Satz und
 * springt an die Stelle, an der sie erledigt wird. Die Zustände kommen aus dem Editor; hier
 * wird nichts berechnet, was das Regelwerk betrifft.
 */
export type ForgePathTarget = "start" | "fields" | "actions" | "preview" | "publish";
export interface ForgePathState {
  /** Ein bearbeitbarer Entwurf ist offen (kein schreibgeschütztes, installiertes Paket). */
  readonly editable: boolean;
  readonly valid: boolean;
  readonly fields: number;
  readonly actions: number;
  readonly tests: number;
  readonly testsPass: boolean;
  /** Genau dieser Entwurf liegt als unveränderliche Version in der Bibliothek. */
  readonly installed: boolean;
  /** Die Vorschau der Aktivierung passt zu genau diesem Entwurf. */
  readonly reviewed: boolean;
  readonly active: boolean;
}
type Station = "todo" | "current" | "done";
interface Step { readonly id: ForgePathTarget; readonly title: string; readonly text: string; readonly state: Station; readonly jump: string }
export function forgePathSteps(s: ForgePathState): readonly Step[] {
  const foundation: Station = s.editable ? "done" : "current";
  const shaped = s.valid && s.fields > 0 && s.actions > 0;
  const rules: Station = !s.editable ? "todo" : shaped ? "done" : "current";
  // Viewing an installed version proposes nothing to try; its tests are either there or not.
  const tried: Station = !s.editable ? (s.tests > 0 && s.testsPass ? "done" : "todo") : !shaped ? "todo" : s.tests > 0 && s.testsPass ? "done" : "current";
  const installed: Station = !shaped || !s.testsPass ? "todo" : s.installed ? "done" : tried === "done" ? "current" : "todo";
  const activated: Station = s.active ? "done" : s.installed ? "current" : "todo";
  return [
    { id: "start", state: foundation, title: t("Grundlage wählen"), jump: t("Zu den Vorlagen"),
      text: s.editable ? t("Dein Entwurf ist offen.") : t("Du siehst eine installierte Version. Beginne mit einer Vorlage, einem leeren Paket oder einer Datei, um ein eigenes Regelwerk zu gestalten.") },
    { id: "fields", state: rules, title: t("Bogen und Regeln gestalten"), jump: t("Zu den Attributen"),
      text: !s.editable ? t("Attribute, Bogen, Aktionen und alles, was daraus folgt.") : shaped ? t("{attribute} Attribute und {aktionen} Aktionen, der Entwurf ist gültig.", { attribute: s.fields, aktionen: s.actions }) : t("Der Entwurf braucht mindestens ein Attribut und eine Aktion und darf keine markierte Stelle mehr haben.") },
    { id: "preview", state: tried, title: t("Ausprobieren"), jump: t("Zur Testtafel"),
      text: tried === "done" ? t("{n} Pakettests bestanden.", { n: s.tests }) : t("Würfle unten auf der Testtafel mit Beispielfiguren und speichere Beispiele als Pakettest.") },
    { id: "publish", state: installed, title: t("Installieren"), jump: t("Zur Übernahme"),
      text: s.installed ? t("Diese Version liegt unveränderlich in der Bibliothek.") : t("Speichert diese Version unveränderlich in der Bibliothek. Spätere Änderungen werden eine neue Version.") },
    { id: "publish", state: activated, title: t("Für die Runde aktivieren"), jump: t("Zur Übernahme"),
      text: s.active ? t("Dieses Regelwerk gilt am Tisch.") : t("Erst prüfen, was sich für vorhandene Figuren ändert, dann gilt das Regelwerk am Tisch.") },
  ];
}
export function RuleForgePath({ state, onJump }: { state: ForgePathState; onJump(target: ForgePathTarget): void }) {
  const steps = forgePathSteps(state);
  return <ol className="rf-path" aria-label={t("Der Weg zum eigenen Regelwerk")}>
    {steps.map((step, index) => <li key={`${step.id}-${index}`} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
      <span className="rf-path-number" aria-hidden="true">{step.state === "done" ? <Check size={14} /> : index + 1}</span>
      <div><strong>{step.title}</strong><small>{step.text}</small></div>
      {step.state !== "done" ? <Button variant="quiet" onClick={() => onJump(step.id)}>{step.jump}<ArrowRight size={14} aria-hidden="true" /></Button> : null}
    </li>)}
  </ol>;
}

/** „Was dieses Regelwerk kann“: das abgeleitete Profil in Alltagsworten, ohne Systemnamen. */
export function RuleCapabilityCard({ capabilities }: { capabilities: RuleCapabilities }) {
  const c = capabilities;
  const rows: { label: string; value: string }[] = [
    { label: t("Attribute"), value: String(c.attributes) },
    { label: t("Abgeleitete Werte"), value: String(c.computed) },
    { label: t("Regeln für einen gültigen Bogen"), value: String(c.constraints) },
    { label: t("Balken wie Lebenspunkte"), value: String(c.vitals) },
    { label: t("Listen wie Ausrüstung oder Zauber"), value: String(c.collections) },
    { label: t("Fähigkeiten zum Lernen"), value: String(c.abilities) },
    { label: t("Zustände"), value: String(c.conditions) },
    { label: t("Aktionen"), value: String(c.actions) },
    { label: t("Würfel"), value: c.diceFamilies.length ? c.diceFamilies.join(", ") : t("keine") },
    { label: t("Abgestufte Ergebnisse"), value: c.gradedOutcomes ? t("ja") : t("nein") },
    { label: t("Proben mit mehreren Würfen"), value: c.multiRollChecks ? t("ja") : t("nein") },
    { label: t("Bogen mit verschachtelten Kategorien"), value: c.categoryDepth > 1 ? t("ja, {n} Ebenen", { n: c.categoryDepth }) : t("nein") },
    { label: t("Eigene Anordnung des Bogens"), value: c.presentationTree ? t("ja") : t("nein") },
    { label: t("Migrationswege"), value: String(c.migrations) },
    { label: t("Pakettests"), value: String(c.selfTests) },
  ];
  return <section className="rf-card rf-capabilities" aria-label={t("Was dieses Regelwerk kann")}>
    <h3>{t("Was dieses Regelwerk kann")}</h3>
    <p className="rf-help">{t("Aus dem Paket selbst abgelesen. Die Oberfläche richtet sich danach, nicht nach dem Namen des Systems.")}</p>
    <dl className="rf-value-list rf-capability-list">{rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
  </section>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { createChronicleHeroesPackage, CHRONICLE_DEFAULT_SKILLS, CHRONICLE_FIELDS, CHRONICLE_FIELD_LABELS, CHRONICLE_HEROES_PACKAGE, CHRONICLE_RULE_GUIDANCE, type ChronicleSkill, type RulePackageV2 } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { RuleAttribution } from "./RuleComputedFields";
import { uniqueId } from "./rule-forge-model";

export function ChronicleHeroesTemplate({ disabled, onCreate }: { disabled: boolean; onCreate(pkg: RulePackageV2): void }) {
  const [open, setOpen] = useState(false), [skills, setSkills] = useState<readonly ChronicleSkill[]>(CHRONICLE_DEFAULT_SKILLS);
  const prepared = useMemo(() => { try { return { pkg: createChronicleHeroesPackage({ skills }), error: "" }; } catch (error) { return { pkg: null, error: error instanceof Error ? error.message : t("Der Katalog ist noch nicht gültig.") }; } }, [skills]);
  const change = (index: number, values: Partial<ChronicleSkill>) => setSkills(old => old.map((skill, i) => i === index ? { ...skill, ...values } : skill));
  return <section className="rf-card chronicle-template" aria-label={t("ChronicleHeroes Vorlage")}><div className="rf-section-heading"><div><h2>ChronicleHeroes</h2><p>{t("Das mitgelieferte Regelwerk von Atlas Chronicles")}</p></div><Button disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>{t("Vorlage anpassen")}</Button></div>
    <p>{t("W100-Proben, drei Felder mit eigenem Talent, Rüstung und Funken. Der Fertigkeitskatalog gilt für die ganze Runde; jede Figur verteilt ihre eigenen Punkte. Für eine neue Runde lässt sich das Regelwerk direkt aktivieren. Vorhandene Bögen benötigen eine ausdrückliche Migration.")}</p>
    <ul className="rf-value-list">
      <li>{CHRONICLE_RULE_GUIDANCE.probe}</li>
      <li>{CHRONICLE_RULE_GUIDANCE.armour}</li>
      <li>{CHRONICLE_RULE_GUIDANCE.funken}</li>
    </ul>
    <RuleAttribution pkg={CHRONICLE_HEROES_PACKAGE} />
    {open ? <fieldset disabled={disabled}><legend>{t("Fertigkeitskatalog der Runde")}</legend><p>{t("1 bis 24 frei gewählte Fertigkeiten. Die Beispiele sind Vorschläge; das Regelwerk schreibt keinen festen Katalog vor.")}</p>
      <div className="button-row"><Button onClick={() => setSkills([])}>{t("Ohne Beispiele beginnen")}</Button><Button onClick={() => setSkills(CHRONICLE_DEFAULT_SKILLS)}>{t("Beispielkatalog laden")}</Button></div>
      {skills.map((skill, i) => <fieldset className="rf-card" key={i}><legend>{t("Fertigkeit {nummer}", { nummer: i + 1 })}</legend><div className="rf-form-grid">
        <label>{t("Name")}<input value={skill.label} maxLength={80} onChange={e => change(i, { label: e.target.value })} /></label>
        <label>{t("Stabile Kennung")}<input value={skill.id} maxLength={48} onChange={e => change(i, { id: e.target.value })} /></label>
        <label>{t("Feld")}<select aria-label={t("Feld für Fertigkeit {nummer}", { nummer: i + 1 })} value={skill.field} onChange={e => change(i, { field: e.target.value as ChronicleSkill["field"] })}>{CHRONICLE_FIELDS.map(field => <option key={field} value={field}>{t(CHRONICLE_FIELD_LABELS[field])}</option>)}</select></label>
      </div><Button onClick={() => setSkills(old => old.filter((_, index) => index !== i))}>{t("Fertigkeit {nummer} entfernen", { nummer: i + 1 })}</Button></fieldset>)}
      <Button disabled={skills.length >= 24} onClick={() => setSkills(old => [...old, { id: uniqueId("fertigkeit", old.map(skill => skill.id)), label: "Neue Fertigkeit", field: "koerper" }])}>{t("Fertigkeit hinzufügen")}</Button>
      {prepared.error ? <Notice error>{prepared.error}</Notice> : null}
      <p>{t("Der nächste Schritt öffnet einen bearbeitbaren Entwurf. Installation und Aktivierung bestätigst du anschließend in der Regelwerkstatt.")}</p>
      <Button variant="primary" disabled={!prepared.pkg} onClick={() => { if (prepared.pkg) onCreate(prepared.pkg); }}>{t("ChronicleHeroes als Regelentwurf öffnen")}</Button>
    </fieldset> : null}
  </section>;
}

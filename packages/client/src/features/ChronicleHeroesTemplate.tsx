// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import {
  createChronicleHeroesPackage, CHRONICLE_DEFAULT_SKILLS, CHRONICLE_FIELDS, CHRONICLE_FIELD_LABELS,
  CHRONICLE_HEROES_PACKAGE, CHRONICLE_MAX_SKILLS, CHRONICLE_RULE_GUIDANCE, CHRONICLE_SKILL_LIBRARY,
  UNIVERSAL_REFERENCE_PACKAGES,
  type ChronicleSkill, type RulePackageV2,
} from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { RuleAttribution } from "./RuleComputedFields";
import { uniqueId } from "./rule-forge-model";
import { chronicleSkillLabel } from "./chronicle-heroes-display";
import "./rule-forge-enhancements.css";

const references = UNIVERSAL_REFERENCE_PACKAGES;
function referenceCopy(id: string): { summary: string; proof: string } {
  switch (id) {
    case "org.atlas-chronicles.reference.d20": return {
      summary: t("W20 plus Attributsmodifikator, abgeleitete Werte, Ressourcen und verschachtelte Wertebereiche."),
      proof: t("Strukturstart für D20-Familien mit Attributen, Kampfwerten und einzelnen W20-Proben."),
    };
    case "org.atlas-chronicles.reference.5e-compatible": return {
      summary: t("5E-kompatible Struktur mit Stufenbonus, sechs Attributen, Angriffen, Fertigkeiten, Merkmalen und Zauberlisten."),
      proof: t("Zeigt einen vollständigen Bogen mit Stufen, Listen für Angriffe und Zauber und einem Magiebereich, der nur bei Bedarf erscheint."),
    };
    case "org.atlas-chronicles.srd.5e": return {
      summary: t("Vollständiger 5E-SRD-Charakterbogen mit Vorteil und Nachteil, Übungsbonus, Fertigkeiten, Rettungswürfen, Kampf, Todesrettungswürfen, Zaubern, Zauberplätzen, Ausrüstung, Merkmalen und Ressourcen."),
      proof: t("Basiert auf dem SRD 5.1 unter der Lizenz CC-BY-4.0 und rechnet mit denselben Regelbausteinen wie jedes andere Paket."),
    };
    case "org.atlas-chronicles.reference.3d20": return {
      summary: t("Drei unabhängige W20 gegen unterschiedliche Attribute, gemeinsamer Talentvorrat und getrennte Talentkategorien."),
      proof: t("Zeigt Proben mit drei Würfen und einen völlig anderen Charakterbogen, gebaut nur aus Regelbausteinen."),
    };
    case "org.atlas-chronicles.chronicles-lite": return {
      summary: t("W50-Proben auf einhundert allgemeine Fertigkeiten unter Handeln, Wissen und Soziales."),
      proof: t("Zeigt einen großen Fertigkeitsbogen mit einhundert einzeln würfelbaren Proben."),
    };
    default: return {
      summary: t("Eine Vorlage, die sich zu jedem Regelwerk umbauen lässt."),
      proof: t("Kann als bearbeitbarer Ausgangspunkt in der Regelschmiede verwendet werden."),
    };
  }
}

/**
 * Die Regelmaschine meldet einen ungültigen Fertigkeitskatalog in ihrer eigenen, englischen
 * Kurzform. Hier wird daraus ein Satz, der sagt, was zu tun ist; `explainValidationError` der
 * Regelschmiede kennt diese Katalogmeldungen nicht.
 */
function katalogFehler(message: string): string {
  if (/catalogue.*required/.test(message)) return t("Der Katalog braucht mindestens eine Fertigkeit. Lade den Beispielkatalog oder füge eine eigene hinzu.");
  if (/duplicate id/.test(message)) return t("Zwei Fertigkeiten haben dieselbe Kennung. Gib jeder Fertigkeit eine eigene.");
  if (/^skill\.id/.test(message)) return t("Eine Kennung passt nicht: nur Kleinbuchstaben, Ziffern, „_“ und „-“, am Anfang ein Buchstabe, höchstens 48 Zeichen.");
  if (/^skill\.label/.test(message)) return t("Jede Fertigkeit braucht einen Namen mit höchstens 80 Zeichen.");
  if (/^skill catalogue/.test(message)) return t("Der Katalog trägt höchstens {gesamt} Fertigkeiten.", { gesamt: CHRONICLE_MAX_SKILLS });
  return t("Der Katalog ist noch nicht gültig.");
}

export function ChronicleHeroesTemplate({ disabled, onCreate }: { disabled: boolean; onCreate(pkg: RulePackageV2): void }) {
  const [open, setOpen] = useState(false), [skills, setSkills] = useState<readonly ChronicleSkill[]>(CHRONICLE_DEFAULT_SKILLS);
  const prepared = useMemo(() => { try { return { pkg: createChronicleHeroesPackage({ skills }), error: "" }; } catch (error) { return { pkg: null, error: katalogFehler(error instanceof Error ? error.message : "") }; } }, [skills]);
  const change = (index: number, values: Partial<ChronicleSkill>) => setSkills(old => old.map((skill, i) => i === index ? { ...skill, ...values } : skill));
  return <>
    <section className="rf-card chronicle-template" aria-label={t("ChronicleHeroes Vorlage")}><div className="rf-section-heading"><div><h4>ChronicleHeroes</h4><p>{t("Das mitgelieferte Regelwerk von Atlas Chronicles")}</p></div><Button disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>{t("Vorlage anpassen")}</Button></div>
      <p>{t("W100-Proben, drei Felder mit eigenem Talent, Rüstung und Funken. Der Fertigkeitskatalog gilt für die ganze Runde; jede Figur verteilt ihre eigenen Punkte. Für eine neue Runde lässt sich das Regelwerk direkt aktivieren. Vorhandene Bögen benötigen eine ausdrückliche Migration.")}</p>
      <ul className="rf-value-list">
        <li>{t(CHRONICLE_RULE_GUIDANCE.probe)}</li>
        <li>{t(CHRONICLE_RULE_GUIDANCE.armour)}</li>
        <li>{t(CHRONICLE_RULE_GUIDANCE.funken)}</li>
      </ul>
      <RuleAttribution pkg={CHRONICLE_HEROES_PACKAGE} />
      {open ? <fieldset disabled={disabled}><legend>{t("Fertigkeitskatalog der Runde")}</legend><p>{t("Wähle aus der Sammlung oder trag eigene Fertigkeiten ein. Das Regelwerk schreibt keinen festen Katalog vor.")}</p>
        <div className="button-row"><Button onClick={() => setSkills([])}>{t("Ohne Beispiele beginnen")}</Button><Button onClick={() => setSkills(CHRONICLE_DEFAULT_SKILLS)}>{t("Beispielkatalog laden")}</Button></div>
        {skills.map((skill, i) => <fieldset className="rf-card" key={i}><legend>{t("Fertigkeit {nummer}", { nummer: i + 1 })}</legend><div className="rf-form-grid">
          <label>{t("Name")}<input value={chronicleSkillLabel(skill)} maxLength={80} onChange={e => change(i, { label: e.target.value })} /></label>
          <label>{t("Feld")}<select aria-label={t("Feld für Fertigkeit {nummer}", { nummer: i + 1 })} value={skill.field} onChange={e => change(i, { field: e.target.value as ChronicleSkill["field"] })}>{CHRONICLE_FIELDS.map(field => <option key={field} value={field}>{t(CHRONICLE_FIELD_LABELS[field])}</option>)}</select></label>
        </div><details className="rf-advanced"><summary>{t("Für Fortgeschrittene")}</summary>
          <label>{t("Stabile Kennung")}<input value={skill.id} maxLength={48} onChange={e => change(i, { id: e.target.value })} /></label>
          <p className="field-help">{t("Die Kennung verbindet die Fertigkeit mit den Bögen. Ändere sie nur, bevor jemand damit spielt.")}</p></details>
        <Button onClick={() => setSkills(old => old.filter((_, index) => index !== i))}>{t("Fertigkeit {nummer} entfernen", { nummer: i + 1 })}</Button></fieldset>)}
        <label className="rf-form-grid">{t("Aus der Sammlung wählen")}<select aria-label={t("Fertigkeit aus der Sammlung")} value="" disabled={skills.length >= CHRONICLE_MAX_SKILLS} onChange={event => { const chosen = CHRONICLE_SKILL_LIBRARY.find(skill => skill.id === event.target.value); if (chosen) setSkills(old => [...old, chosen]); }}>
          <option value="">{t("{offen} von {gesamt} Plätzen frei", { offen: CHRONICLE_MAX_SKILLS - skills.length, gesamt: CHRONICLE_MAX_SKILLS })}</option>
          {CHRONICLE_FIELDS.map(field => <optgroup key={field} label={t(CHRONICLE_FIELD_LABELS[field])}>
            {CHRONICLE_SKILL_LIBRARY.filter(skill => skill.field === field && !skills.some(chosen => chosen.id === skill.id)).map(skill => <option key={skill.id} value={skill.id}>{chronicleSkillLabel(skill)}</option>)}
          </optgroup>)}
        </select></label>
        <p className="field-help">{t("Die Sammlung enthält einhundert Fertigkeiten. Gleichzeitig trägt ein Katalog höchstens {gesamt}; mehr Bogenfelder verarbeitet die Regelmaschine nicht. Das Talent eines Feldes rechnet mit dem Durchschnitt, ein großer Katalog verzerrt es also nicht.", { gesamt: CHRONICLE_MAX_SKILLS })}</p>
        <Button disabled={skills.length >= CHRONICLE_MAX_SKILLS} onClick={() => setSkills(old => [...old, { id: uniqueId("fertigkeit", old.map(skill => skill.id)), label: t("Neue Fertigkeit"), field: "koerper" }])}>{t("Eigene Fertigkeit hinzufügen")}</Button>
        {prepared.error ? <Notice error>{prepared.error}</Notice> : null}
        <p>{t("Der nächste Schritt öffnet einen bearbeitbaren Entwurf. Installation und Aktivierung bestätigst du anschließend in der Regelwerkstatt.")}</p>
        <Button variant="primary" disabled={!prepared.pkg} onClick={() => { if (prepared.pkg) onCreate(prepared.pkg); }}>{t("ChronicleHeroes als Regelentwurf öffnen")}</Button>
      </fieldset> : null}
    </section>
    <section className="rf-reference-templates" aria-label={t("Universelle Referenzsysteme")}>
      <div className="rf-section-heading"><div><h4>{t("Weitere Vorlagen")}</h4><p className="rf-help">{t("Vorlagen für ganz unterschiedliche Spielsysteme. Jede lässt sich als eigener Entwurf öffnen und frei umbauen.")}</p></div></div>
      <div className="rf-template-grid">{references.map(pkg => { const copy = referenceCopy(pkg.id); return <article className="rf-card" key={pkg.id}>
        <h5>{pkg.name}</h5><p>{copy.summary}</p><p className="rf-help">{copy.proof}</p>
        <dl className="rf-value-list"><div><dt>{t("Bogenfelder")}</dt><dd>{Object.keys(pkg.fields).length}</dd></div><div><dt>{t("Aktionen")}</dt><dd>{pkg.actions.length}</dd></div><div><dt>{t("Kategorien")}</dt><dd>{pkg.layout.sections.length}</dd></div></dl>
        <RuleAttribution pkg={pkg} />
        <Button disabled={disabled} onClick={() => onCreate(pkg)}>{t("Als Regelentwurf öffnen")}</Button>
      </article>; })}</div>
    </section>
  </>;
}

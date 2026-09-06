import { useMemo, useState } from "react";
import { createHowToBeAHeroPackage, HTBAH_DEFAULT_SKILLS, HTBAH_EDITION, HTBAH_GROUPS, HTBAH_GROUP_LABELS, HOW_TO_BE_A_HERO_PACKAGE, type HtbahSkill, type RulePackageV2 } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { RuleAttribution } from "./RuleComputedFields";
import { uniqueId } from "./rule-forge-model";

export function HtbahTemplate({ disabled, onCreate }: { disabled: boolean; onCreate(pkg: RulePackageV2): void }) {
  const [open, setOpen] = useState(false), [skills, setSkills] = useState<readonly HtbahSkill[]>(HTBAH_DEFAULT_SKILLS);
  const prepared = useMemo(() => { try { return { pkg: createHowToBeAHeroPackage({ skills }), error: "" }; } catch (error) { return { pkg: null, error: error instanceof Error ? error.message : "Der Katalog ist noch nicht gültig." }; } }, [skills]);
  const change = (index: number, values: Partial<HtbahSkill>) => setSkills(old => old.map((skill, i) => i === index ? { ...skill, ...values } : skill));
  return <section className="rf-card htbah-template" aria-label="How to be a Hero Vorlage"><div className="rf-section-heading"><div><h2>How to be a Hero</h2><p>{HTBAH_EDITION}</p></div><Button disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>HTBAH-Vorlage anpassen</Button></div>
    <p>W100-Proben, Begabungen, Geistesblitze und Lebenspunkte. Der Fertigkeitskatalog gilt für die ganze Runde; jede Figur verteilt ihre eigenen Punkte. Für eine neue Runde lässt sich das Regelwerk direkt aktivieren. Vorhandene Bögen benötigen eine ausdrückliche Migration.</p>
    <RuleAttribution pkg={HOW_TO_BE_A_HERO_PACKAGE} />
    {open ? <fieldset disabled={disabled}><legend>Fertigkeitskatalog der Runde</legend><p>1 bis 24 frei gewählte Fertigkeiten. Die Beispiele sind eigene Vorschläge; das Regelwerk schreibt keinen festen Katalog vor.</p>
      <div className="button-row"><Button onClick={() => setSkills([])}>Ohne Beispiele beginnen</Button><Button onClick={() => setSkills(HTBAH_DEFAULT_SKILLS)}>Beispielkatalog laden</Button></div>
      {skills.map((skill, i) => <fieldset className="rf-card" key={i}><legend>Fertigkeit {i + 1}</legend><div className="rf-form-grid">
        <label>Name<input value={skill.label} maxLength={80} onChange={e => change(i, { label: e.target.value })} /></label>
        <label>Stabile Kennung<input value={skill.id} maxLength={48} onChange={e => change(i, { id: e.target.value })} /></label>
        <label>Begabung<select aria-label={`Begabung für Fertigkeit ${i + 1}`} value={skill.group} onChange={e => change(i, { group: e.target.value as HtbahSkill["group"] })}>{HTBAH_GROUPS.map(group => <option key={group} value={group}>{HTBAH_GROUP_LABELS[group]}</option>)}</select></label>
      </div><Button onClick={() => setSkills(old => old.filter((_, index) => index !== i))}>Fertigkeit {i + 1} entfernen</Button></fieldset>)}
      <Button disabled={skills.length >= 24} onClick={() => setSkills(old => [...old, { id: uniqueId("fertigkeit", old.map(skill => skill.id)), label: "Neue Fertigkeit", group: "handeln" }])}>Fertigkeit hinzufügen</Button>
      {prepared.error ? <Notice error>{prepared.error}</Notice> : null}
      <p>Der nächste Schritt öffnet einen bearbeitbaren Entwurf. Installation und Aktivierung bestätigst du anschließend in der Regelwerkstatt.</p>
      <Button variant="primary" disabled={!prepared.pkg} onClick={() => { if (prepared.pkg) onCreate(prepared.pkg); }}>HTBAH als Regelentwurf öffnen</Button>
    </fieldset> : null}
  </section>;
}

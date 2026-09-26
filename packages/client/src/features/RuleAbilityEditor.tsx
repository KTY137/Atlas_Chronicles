// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS, type RuleAbility, type RuleCondition, type RuleModifier } from "@chronicle/rules";
import { locale, t } from "../i18n";
import { ExpressionInput } from "./RuleDeclarativeEditor";
import type { RuleDraft } from "./rule-forge-model";
import { prerequisiteCandidates } from "./rule-ability-references";
import { RuleEntryIdentifier, RuleEntryRemoval } from "./RuleEntryControls";
import { ExampleStart } from "./RuleEntryList";
import { NEUES_ATTRIBUT, enableAbilities, listenAttribute, newAbility, newCondition, newModifier, withExampleAbility, withExampleCondition, zielAktionen } from "./rule-ability-model";

const artLabel = (kind: RuleAbility["kind"]) => kind === "dauerhaft" ? t("Dauerhaft") : kind === "einsatz" ? t("Einsatz") : t("Reaktion");
const zielLabel = (target: RuleModifier["target"]) => target === "ziel" ? t("Zielwert der Probe") : t("Ergebnis des Wurfs");
const MAX_LISTE = 80;
/** Ein optionaler Eintrag verschwindet ganz, statt leer stehenzubleiben — ein unverändertes Paket bleibt so byteidentisch. */
function ohne<T extends object>(value: T, key: keyof T): T { const kopie = { ...value }; delete kopie[key]; return kopie; }

/**
 * Solange ein Regelwerk keine Fähigkeiten kennt: einschalten. Ohne Wahl legt die Schmiede zwei eigene
 * Attribute an, in denen der Bogen Gelerntes und Aktives festhält; wer schon passende Textattribute
 * hat, wählt sie aus. „Mit Beispiel beginnen“ schaltet ein und legt gleich einen Eintrag an.
 */
function Einschalten({ draft, onChange, onExample, exampleText }: { draft: RuleDraft; onChange(draft: RuleDraft): void; onExample(): void; exampleText: string }) {
  const kandidaten = listenAttribute(draft);
  const [gelernt, setGelernt] = useState(NEUES_ATTRIBUT), [aktiv, setAktiv] = useState(NEUES_ATTRIBUT);
  const gleich = gelernt !== NEUES_ATTRIBUT && gelernt === aktiv;
  const auswahl = (value: string, set: (value: string) => void, label: string) => <label>{label}<select value={value} onChange={event => set(event.target.value)}>
    <option value={NEUES_ATTRIBUT}>{t("Neues Attribut anlegen")}</option>{kandidaten.map(feld => <option key={feld.localId} value={feld.id}>{feld.label || feld.id}</option>)}</select></label>;
  return <section><h4>{t("Fähigkeiten und Zustände einschalten")}</h4>
    <p className="rf-help">{t("Dieses Regelwerk kennt noch keine Fähigkeiten und Zustände. Einschalten legt zwei Attribute an, in denen der Bogen festhält, was eine Figur gelernt hat und was sie gerade betrifft. Die Figur tippt dort nie von Hand; der Bogen zeigt dafür eigene Listen.")}</p>
    <ExampleStart text={exampleText} onExample={onExample} />
    <details className="rf-advanced"><summary>{t("Für Fortgeschrittene: vorhandene Attribute benutzen")}</summary>
      <div className="rf-form-grid">{auswahl(gelernt, setGelernt, t("Attribut für gelernte Fähigkeiten"))}{auswahl(aktiv, setAktiv, t("Attribut für aktive Zustände"))}</div>
      {gleich ? <p className="rf-help" id="rf-einschalten-grund">{t("Wähle zwei verschiedene Attribute.")}</p> : null}
    </details>
    <Button disabled={gleich} aria-describedby={gleich ? "rf-einschalten-grund" : undefined} onClick={() => onChange(enableAbilities(draft, gelernt, aktiv))}>{t("Fähigkeiten und Zustände einschalten")}</Button>
  </section>;
}

/** Wirkungen einer Fähigkeit oder eines Zustands: eine Zahl, die in bestimmte Aktionen hineinrechnet. */
function Wirkungen({ draft, werte, onChange }: { draft: RuleDraft; werte: readonly RuleModifier[]; onChange(werte: RuleModifier[]): void }) {
  const update = (index: number, patch: Partial<RuleModifier>) => onChange(werte.map((wert, i) => i === index ? { ...wert, ...patch } : wert));
  return <section><h5>{t("Wirkung auf Würfe")}</h5>
    <p className="rf-help">{t("Eine Wirkung rechnet eine Zahl in bestimmte Aktionen hinein: in den Zielwert einer Probe oder in das Ergebnis eines Wurfs, zum Beispiel −2 auf jede Probe.")}</p>
    <details className="rf-advanced"><summary>{t("Für Fortgeschrittene: welche Aktionen eine Wirkung annehmen")}</summary><p className="rf-help">{t("Eine Aktion nimmt Wirkungen an, wenn sie einen Zahlen-Parameter mod_ziel (für den Zielwert) oder mod_ergebnis (für das Ergebnis) hat und ihn in ihrer Formel benutzt, zum Beispiel 1d20 + @staerke + ?mod_ergebnis.")}</p></details>
    {werte.map((wert, i) => {
      const moeglich = zielAktionen(draft, wert.target);
      return <fieldset className="rf-card" key={i}><legend>{t("Wirkung {n}", { n: i + 1 })}</legend>
        <label>{t("Wirkt auf")}<select value={wert.target} onChange={event => update(i, { target: event.target.value as RuleModifier["target"], actions: [] })}><option value="ziel">{zielLabel("ziel")}</option><option value="ergebnis">{zielLabel("ergebnis")}</option></select></label>
        <fieldset><legend>{t("Aktionen")}</legend>
          {moeglich.map(action => <label key={action.localId} className="rf-check"><input type="checkbox" checked={wert.actions.includes(action.id)} onChange={event => update(i, { actions: event.target.checked ? [...wert.actions, action.id] : wert.actions.filter(kennung => kennung !== action.id) })} />{action.name || action.id}</label>)}
          {wert.actions.filter(muster => muster.endsWith("*")).map(muster => <p key={muster} className="rf-help">{t("Dazu jede Aktion, deren Kennung mit {anfang} beginnt.", { anfang: muster.slice(0, -1) })}</p>)}
          {!moeglich.length ? <p className="rf-help">{t("Noch nimmt keine Aktion diese Wirkung an. Wie eine Aktion sie annimmt, steht oben unter „Für Fortgeschrittene“.")}</p> : null}
        </fieldset>
        <ExpressionInput label={t("Wert")} help={t("Eine Zahl oder eine Rechnung aus Attributen, zum Beispiel 10 oder @stufe * 2. Würfel sind hier nicht erlaubt.")} value={wert.value} onChange={value => update(i, { value })} draft={draft} />
        <Button onClick={() => onChange(werte.filter((_, index) => index !== i))}>{t("Wirkung entfernen")}</Button>
      </fieldset>;
    })}
    <Button disabled={werte.length >= RULE_LIMITS.modifiers} onClick={() => onChange([...werte, newModifier(zielAktionen(draft, "ziel"))])}><Plus size={15} />{t("Wirkung hinzufügen")}</Button>
  </section>;
}

/** Name, Kennung und eine Liste zum Auswählen — dieselbe Form wie der Reiter „Aktionen“. */
function Auswahlliste<T extends { id: string; name: string }>({ eintraege, aktuell, unterzeile, titel, hinzufuegen, suchLabel, onWaehlen, onNeu, disabled, leer, onBeispiel }: {
  eintraege: readonly T[]; aktuell: number; unterzeile(eintrag: T): string; titel: string; hinzufuegen: string; suchLabel: string; onWaehlen(index: number): void; onNeu(): void; disabled: boolean;
  leer: string; onBeispiel(): void;
}) {
  const [suche, setSuche] = useState("");
  const nadel = suche.trim().toLowerCase();
  const treffer = eintraege.map((eintrag, index) => [eintrag, index] as const).filter(([eintrag]) => !nadel || `${eintrag.name} ${eintrag.id} ${unterzeile(eintrag)}`.toLowerCase().includes(nadel));
  return <nav className="rf-list" aria-label={titel}>
    <div className="rf-section-heading"><h3>{titel}</h3><Button disabled={disabled} onClick={() => { if (!disabled) { setSuche(""); onNeu(); } }}><Plus size={15} />{hinzufuegen}</Button></div>
    <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input type="search" aria-label={suchLabel} value={suche} placeholder={t("Name, Kennung oder Gruppe")} onChange={event => setSuche(event.target.value)} /></label>
    <ul>{treffer.slice(0, MAX_LISTE).map(([eintrag, index]) => <li key={`${eintrag.id}-${index}`}><button type="button" aria-current={index === aktuell ? "true" : undefined} onClick={() => onWaehlen(index)}><strong>{eintrag.name || t("Ohne Namen")}</strong><small>{unterzeile(eintrag)}</small></button></li>)}</ul>
    {treffer.length > MAX_LISTE ? <p className="rf-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: treffer.length - MAX_LISTE })}</p> : null}
    {!eintraege.length ? <ExampleStart text={leer} disabled={disabled} onExample={onBeispiel} /> : null}
    {nadel && !treffer.length ? <div className="rf-search-empty" role="status"><p>{t("Keine passenden Einträge gefunden.")}</p><Button variant="quiet" onClick={() => setSuche("")}>{t("Suche zurücksetzen")}</Button></div> : null}
  </nav>;
}

export function RuleAbilityEditor({ draft, onChange, disabled = false }: { draft: RuleDraft; onChange(draft: RuleDraft): void; disabled?: boolean }) {
  const [index, setIndex] = useState(0);
  const beispiel = () => { const next = withExampleAbility(draft); onChange(next); setIndex((next.abilities?.length ?? 1) - 1); };
  const leer = t("Noch keine Fähigkeit. Eine Fähigkeit ist etwas Besonderes, das eine Figur lernen kann, zum Beispiel Kraftschlag.");
  if (draft.schemaVersion !== 2 || !draft.abilityRules) return <fieldset className="rf-editor-fields" disabled={disabled}><Einschalten draft={draft} onChange={onChange} onExample={beispiel} exampleText={leer} /></fieldset>;
  const regeln = draft.abilityRules, liste = draft.abilities ?? [], aktuell = Math.min(index, liste.length - 1), ability = liste[aktuell];
  const setze = (next: RuleAbility) => onChange({ ...draft, abilities: liste.map((eintrag, i) => i === aktuell ? next : eintrag) });
  return <>
    <div className="rf-split">
      <Auswahlliste disabled={disabled || liste.length >= RULE_LIMITS.abilities} eintraege={liste} aktuell={aktuell} titel={t("Fähigkeiten")} hinzufuegen={t("Fähigkeit")} suchLabel={t("Fähigkeit suchen")}
        unterzeile={eintrag => `${eintrag.group} · ${t("Rang {rang}", { rang: eintrag.rank })}`} onWaehlen={setIndex} leer={leer} onBeispiel={beispiel}
        onNeu={() => { if (liste.length < RULE_LIMITS.abilities) { onChange({ ...draft, abilities: [...liste, newAbility(liste.map(eintrag => eintrag.id))] }); setIndex(liste.length); } }} />
      {ability ? <section className="rf-detail" aria-label={t("Fähigkeit")}><fieldset className="rf-editor-fields" disabled={disabled}>
        <div className="rf-section-heading"><h4>{ability.name || t("Ohne Namen")}</h4><RuleEntryRemoval key={ability.id} draft={draft} kind="ability" id={ability.id} onChange={onChange} onRemoved={() => setIndex(0)} /></div>
        <div className="rf-form-grid">
          <label>{t("Name")}<input value={ability.name} maxLength={RULE_LIMITS.label} onChange={event => setze({ ...ability, name: event.target.value })} /></label>
          <label>{t("Gruppe")}<input value={ability.group} maxLength={RULE_LIMITS.label} onChange={event => setze({ ...ability, group: event.target.value })} /></label>
          <label>{t("Rang")}<input type="number" min={0} max={RULE_LIMITS.rank} step={1} value={ability.rank} onChange={event => setze({ ...ability, rank: Number.isFinite(event.target.valueAsNumber) ? Math.max(0, Math.min(RULE_LIMITS.rank, Math.trunc(event.target.valueAsNumber))) : 0 })} /><small>{t("Eine Zahl von 0 bis {hoechstens}, zum Beispiel Zaubergrad oder Stufe.", { hoechstens: RULE_LIMITS.rank.toLocaleString(locale()) })}</small></label>
          <label>{t("Art")}<select value={ability.kind} onChange={event => setze({ ...ability, kind: event.target.value as RuleAbility["kind"] })}><option value="dauerhaft">{artLabel("dauerhaft")}</option><option value="einsatz">{artLabel("einsatz")}</option><option value="reaktion">{artLabel("reaktion")}</option></select><small>{t("Dauerhaft wirkt immer. Einsatz und Reaktion wählt die Figur beim Würfeln.")}</small></label>
          <label>{t("Preis")}<input type="number" min={0} max={RULE_LIMITS.price} value={ability.price} onChange={event => setze({ ...ability, price: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0 })} /><small>{t("Was das Lernen vom Budget kostet.")}</small></label>
          <label>{t("Funken beim Einsatz")}<input type="number" min={0} max={RULE_LIMITS.cost} value={ability.cost} onChange={event => setze({ ...ability, cost: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0 })} /></label>
        </div>
        <label>{t("Beschreibung")}<textarea value={ability.text} maxLength={RULE_LIMITS.longText} rows={3} onChange={event => setze({ ...ability, text: event.target.value })} /></label>
        <details className="rf-advanced"><summary>{t("Für Fortgeschrittene")}</summary><RuleEntryIdentifier key={ability.id} draft={draft} kind="ability" id={ability.id} onChange={onChange} /></details>
        <fieldset><legend>{t("Vorstufen")}</legend><p className="rf-help">{t("Fähigkeiten, die vorher gelernt sein müssen.")}</p>
          <label>{t("Vorstufe hinzufügen")}<select value="" disabled={(ability.requires?.length ?? 0) >= RULE_LIMITS.requires} onChange={event => { if (prerequisiteCandidates(draft, ability.id).some(candidate => candidate.id === event.target.value)) setze({ ...ability, requires: [...(ability.requires ?? []), event.target.value] }); }}><option value="">{t("Fähigkeit wählen")}</option>{prerequisiteCandidates(draft, ability.id).map(eintrag => <option key={eintrag.id} value={eintrag.id}>{eintrag.name}</option>)}</select></label>
          {(ability.requires ?? []).map(vorstufe => <Button key={vorstufe} variant="quiet" onClick={() => { const rest = ability.requires!.filter(kennung => kennung !== vorstufe); setze(rest.length ? { ...ability, requires: rest } : ohne(ability, "requires")); }}><Trash2 size={13} />{liste.find(eintrag => eintrag.id === vorstufe)?.name ?? vorstufe}</Button>)}
        </fieldset>
        <label className="rf-check"><input type="checkbox" checked={ability.prerequisite !== undefined} onChange={event => setze(event.target.checked ? { ...ability, prerequisite: "true" } : ohne(ability, "prerequisite"))} />{t("Hat eine Voraussetzung")}</label>
        {ability.prerequisite !== undefined ? <ExpressionInput label={t("Voraussetzung")} help={t("Muss wahr sein, damit die Figur die Fähigkeit lernen kann, zum Beispiel @athletik >= 30.")} value={ability.prerequisite} onChange={prerequisite => setze({ ...ability, prerequisite })} draft={draft} /> : null}
        <Wirkungen draft={draft} werte={ability.modifiers ?? []} onChange={modifiers => setze(modifiers.length ? { ...ability, modifiers } : ohne(ability, "modifiers"))} />
      </fieldset></section> : null}
    </div>
    <fieldset className="rf-card" disabled={disabled}><legend>{t("Budget für Fähigkeiten")}</legend>
      <p className="rf-help">{t("Die Summe der Preise aller gelernten Fähigkeiten darf dieses Budget nicht übersteigen. Ohne Budget ist Lernen nur durch Vorstufen und Voraussetzungen begrenzt.")}</p>
      <label className="rf-check"><input type="checkbox" checked={regeln.budget !== undefined} onChange={event => onChange({ ...draft, abilityRules: event.target.checked ? { ...regeln, budget: "10" } : ohne(regeln, "budget") })} />{t("Budget begrenzen")}</label>
      {regeln.budget !== undefined ? <ExpressionInput label={t("Budget")} help={t("Eine Zahl oder eine Rechnung aus Attributen, zum Beispiel 9 + @erfahrung.")} value={regeln.budget} onChange={budget => onChange({ ...draft, abilityRules: { ...regeln, budget } })} draft={draft} /> : null}
    </fieldset>
  </>;
}

export function RuleConditionEditor({ draft, onChange, disabled = false }: { draft: RuleDraft; onChange(draft: RuleDraft): void; disabled?: boolean }) {
  const [index, setIndex] = useState(0);
  const beispiel = () => { const next = withExampleCondition(draft); onChange(next); setIndex((next.conditions?.length ?? 1) - 1); };
  const leer = t("Noch kein Zustand. Ein Zustand betrifft eine Figur gerade und vergeht wieder, zum Beispiel „Erschöpft: −2 auf alle Proben“.");
  if (draft.schemaVersion !== 2 || !draft.abilityRules) return <fieldset className="rf-editor-fields" disabled={disabled}><Einschalten draft={draft} onChange={onChange} onExample={beispiel} exampleText={leer} /></fieldset>;
  const liste = draft.conditions ?? [], aktuell = Math.min(index, liste.length - 1), zustand = liste[aktuell];
  const setze = (next: RuleCondition) => onChange({ ...draft, conditions: liste.map((eintrag, i) => i === aktuell ? next : eintrag) });
  return <div className="rf-split">
    <Auswahlliste disabled={disabled || liste.length >= RULE_LIMITS.conditions} eintraege={liste} aktuell={aktuell} titel={t("Zustände")} hinzufuegen={t("Zustand")} suchLabel={t("Zustand suchen")} unterzeile={eintrag => eintrag.text} onWaehlen={setIndex} leer={leer} onBeispiel={beispiel}
      onNeu={() => { if (liste.length < RULE_LIMITS.conditions) { onChange({ ...draft, conditions: [...liste, newCondition(liste.map(eintrag => eintrag.id))] }); setIndex(liste.length); } }} />
    {zustand ? <section className="rf-detail" aria-label={t("Zustand")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{zustand.name || t("Ohne Namen")}</h4><RuleEntryRemoval key={zustand.id} draft={draft} kind="condition" id={zustand.id} onChange={onChange} onRemoved={() => setIndex(0)} /></div>
      <label>{t("Name")}<input value={zustand.name} maxLength={RULE_LIMITS.label} onChange={event => setze({ ...zustand, name: event.target.value })} /></label>
      <label>{t("Beschreibung")}<textarea value={zustand.text} maxLength={RULE_LIMITS.longText} rows={3} onChange={event => setze({ ...zustand, text: event.target.value })} /></label>
      <details className="rf-advanced"><summary>{t("Für Fortgeschrittene")}</summary><RuleEntryIdentifier key={zustand.id} draft={draft} kind="condition" id={zustand.id} onChange={onChange} /></details>
      <Wirkungen draft={draft} werte={zustand.modifiers ?? []} onChange={modifiers => setze(modifiers.length ? { ...zustand, modifiers } : ohne(zustand, "modifiers"))} />
    </fieldset></section> : null}
  </div>;
}

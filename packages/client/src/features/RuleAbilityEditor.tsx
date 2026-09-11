// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import type { RuleAbility, RuleCondition, RuleModifier } from "@chronicle/rules";
import { t } from "../i18n";
import { ExpressionInput } from "./RuleDeclarativeEditor";
import type { RuleDraft } from "./rule-forge-model";
import { prerequisiteCandidates } from "./rule-ability-references";
import { RuleEntryIdentifier, RuleEntryRemoval } from "./RuleEntryControls";
import { listenAttribute, newAbility, newCondition, newModifier, zielAktionen } from "./rule-ability-model";

const artLabel = (kind: RuleAbility["kind"]) => kind === "dauerhaft" ? t("Dauerhaft") : kind === "einsatz" ? t("Einsatz") : t("Reaktion");
const zielLabel = (target: RuleModifier["target"]) => target === "ziel" ? t("Zielwert der Probe") : t("Ergebnis des Wurfs");
const MAX_LISTE = 80;
/** Ein optionaler Eintrag verschwindet ganz, statt leer stehenzubleiben — ein unverändertes Paket bleibt so byteidentisch. */
function ohne<T extends object>(value: T, key: keyof T): T { const kopie = { ...value }; delete kopie[key]; return kopie; }

/** Solange ein Regelwerk keine Fähigkeiten kennt: zwei Textattribute wählen und einschalten. */
function Einschalten({ draft, onChange }: { draft: RuleDraft; onChange(draft: RuleDraft): void }) {
  const kandidaten = listenAttribute(draft);
  const [gelernt, setGelernt] = useState(kandidaten[0]?.id ?? ""), [aktiv, setAktiv] = useState(kandidaten[1]?.id ?? "");
  return <section><h3>{t("Fähigkeiten und Zustände einschalten")}</h3>
    <p className="rf-help">{t("Gelernte Fähigkeiten und aktive Zustände stehen je in einem Textattribut des Bogens. Die Figur tippt sie nie von Hand; der Bogen zeigt dafür eigene Listen.")}</p>
    {kandidaten.length < 2 ? <Notice>{t("Lege im Reiter „Attribute“ zuerst zwei Textattribute mit mindestens 64 Zeichen an, zum Beispiel faehigkeiten und zustaende.")}</Notice> : <>
      <div className="rf-form-grid">
        <label>{t("Attribut für gelernte Fähigkeiten")}<select value={gelernt} onChange={event => setGelernt(event.target.value)}>{kandidaten.map(feld => <option key={feld.localId} value={feld.id}>{feld.label || feld.id}</option>)}</select></label>
        <label>{t("Attribut für aktive Zustände")}<select value={aktiv} onChange={event => setAktiv(event.target.value)}>{kandidaten.map(feld => <option key={feld.localId} value={feld.id}>{feld.label || feld.id}</option>)}</select></label>
      </div>
      <Button disabled={!gelernt || !aktiv || gelernt === aktiv} onClick={() => onChange({ ...draft, schemaVersion: 2, abilityRules: { abilityField: gelernt, conditionField: aktiv }, abilities: draft.abilities ?? [], conditions: draft.conditions ?? [] })}>{t("Fähigkeiten und Zustände einschalten")}</Button>
    </>}
  </section>;
}

/** Wirkungen einer Fähigkeit oder eines Zustands: eine Zahl, die in bestimmte Aktionen hineinrechnet. */
function Wirkungen({ draft, werte, onChange }: { draft: RuleDraft; werte: readonly RuleModifier[]; onChange(werte: RuleModifier[]): void }) {
  const update = (index: number, patch: Partial<RuleModifier>) => onChange(werte.map((wert, i) => i === index ? { ...wert, ...patch } : wert));
  return <section><h5>{t("Wirkung auf Würfe")}</h5>
    <p className="rf-help">{t("Eine Wirkung rechnet eine Zahl in bestimmte Aktionen hinein: in den Zielwert einer Probe oder in das Ergebnis eines Wurfs. Die Aktion braucht dafür den Parameter mod_ziel oder mod_ergebnis.")}</p>
    {werte.map((wert, i) => {
      const moeglich = zielAktionen(draft, wert.target);
      return <fieldset className="rf-card" key={i}><legend>{t("Wirkung {n}", { n: i + 1 })}</legend>
        <label>{t("Wirkt auf")}<select value={wert.target} onChange={event => update(i, { target: event.target.value as RuleModifier["target"], actions: [] })}><option value="ziel">{zielLabel("ziel")}</option><option value="ergebnis">{zielLabel("ergebnis")}</option></select></label>
        <fieldset><legend>{t("Aktionen")}</legend>
          {moeglich.map(action => <label key={action.localId} className="rf-check"><input type="checkbox" checked={wert.actions.includes(action.id)} onChange={event => update(i, { actions: event.target.checked ? [...wert.actions, action.id] : wert.actions.filter(kennung => kennung !== action.id) })} />{action.name || action.id}</label>)}
          {wert.actions.filter(muster => muster.endsWith("*")).map(muster => <p key={muster} className="rf-help">{t("Dazu jede Aktion, deren Kennung mit {anfang} beginnt.", { anfang: muster.slice(0, -1) })}</p>)}
          {!moeglich.length ? <p className="rf-help">{t("Keine Aktion nimmt diese Wirkung an. Gib einer Aktion zuerst den Parameter mod_ziel oder mod_ergebnis.")}</p> : null}
        </fieldset>
        <ExpressionInput label={t("Wert")} help={t("Eine Zahl oder eine Rechnung aus Attributen, zum Beispiel 10 oder @stufe * 2. Würfel sind hier nicht erlaubt.")} value={wert.value} onChange={value => update(i, { value })} draft={draft} />
        <Button onClick={() => onChange(werte.filter((_, index) => index !== i))}>{t("Wirkung entfernen")}</Button>
      </fieldset>;
    })}
    <Button disabled={werte.length >= 4} onClick={() => onChange([...werte, newModifier(zielAktionen(draft, "ziel"))])}><Plus size={15} />{t("Wirkung hinzufügen")}</Button>
  </section>;
}

/** Name, Kennung und eine Liste zum Auswählen — dieselbe Form wie der Reiter „Aktionen“. */
function Auswahlliste<T extends { id: string; name: string }>({ eintraege, aktuell, unterzeile, titel, hinzufuegen, suchLabel, onWaehlen, onNeu }: {
  eintraege: readonly T[]; aktuell: number; unterzeile(eintrag: T): string; titel: string; hinzufuegen: string; suchLabel: string; onWaehlen(index: number): void; onNeu(): void;
}) {
  const [suche, setSuche] = useState("");
  const nadel = suche.trim().toLowerCase();
  const treffer = eintraege.map((eintrag, index) => [eintrag, index] as const).filter(([eintrag]) => !nadel || `${eintrag.name} ${eintrag.id} ${unterzeile(eintrag)}`.toLowerCase().includes(nadel));
  return <nav className="rf-list" aria-label={titel}>
    <div className="rf-section-heading"><h3>{titel}</h3><Button onClick={onNeu}><Plus size={15} />{hinzufuegen}</Button></div>
    <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label={suchLabel} value={suche} placeholder={t("Name, Kennung oder Gruppe")} onChange={event => setSuche(event.target.value)} /></label>
    <ul>{treffer.slice(0, MAX_LISTE).map(([eintrag, index]) => <li key={`${eintrag.id}-${index}`}><button type="button" aria-current={index === aktuell ? "true" : undefined} onClick={() => onWaehlen(index)}><strong>{eintrag.name || t("Ohne Namen")}</strong><small>{unterzeile(eintrag)}</small></button></li>)}</ul>
    {treffer.length > MAX_LISTE ? <p className="rf-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: treffer.length - MAX_LISTE })}</p> : null}
  </nav>;
}

export function RuleAbilityEditor({ draft, onChange }: { draft: RuleDraft; onChange(draft: RuleDraft): void }) {
  const [index, setIndex] = useState(0);
  if (draft.schemaVersion !== 2 || !draft.abilityRules) return <Einschalten draft={draft} onChange={onChange} />;
  const regeln = draft.abilityRules, liste = draft.abilities ?? [], aktuell = Math.min(index, liste.length - 1), ability = liste[aktuell];
  const setze = (next: RuleAbility) => onChange({ ...draft, abilities: liste.map((eintrag, i) => i === aktuell ? next : eintrag) });
  return <>
    <div className="rf-split">
      <Auswahlliste eintraege={liste} aktuell={aktuell} titel={t("Fähigkeiten")} hinzufuegen={t("Fähigkeit")} suchLabel={t("Fähigkeit suchen")}
        unterzeile={eintrag => `${eintrag.group} · ${t("Rang {rang}", { rang: eintrag.rank })}`} onWaehlen={setIndex}
        onNeu={() => { if (liste.length < 512) { onChange({ ...draft, abilities: [...liste, newAbility(liste.map(eintrag => eintrag.id))] }); setIndex(liste.length); } }} />
      {ability ? <section className="rf-detail" aria-label={t("Fähigkeit")}>
        <div className="rf-section-heading"><h4>{ability.name || t("Ohne Namen")}</h4><RuleEntryRemoval key={ability.id} draft={draft} kind="ability" id={ability.id} onChange={onChange} onRemoved={() => setIndex(0)} /></div>
        <div className="rf-form-grid">
          <label>{t("Name")}<input value={ability.name} maxLength={120} onChange={event => setze({ ...ability, name: event.target.value })} /></label>
          <RuleEntryIdentifier key={ability.id} draft={draft} kind="ability" id={ability.id} onChange={onChange} />
          <label>{t("Gruppe")}<input value={ability.group} maxLength={80} onChange={event => setze({ ...ability, group: event.target.value })} /></label>
          <label>{t("Rang")}<select value={ability.rank} onChange={event => setze({ ...ability, rank: Number(event.target.value) as RuleAbility["rank"] })}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></label>
          <label>{t("Art")}<select value={ability.kind} onChange={event => setze({ ...ability, kind: event.target.value as RuleAbility["kind"] })}><option value="dauerhaft">{artLabel("dauerhaft")}</option><option value="einsatz">{artLabel("einsatz")}</option><option value="reaktion">{artLabel("reaktion")}</option></select><small>{t("Dauerhaft wirkt immer. Einsatz und Reaktion wählt die Figur beim Würfeln.")}</small></label>
          <label>{t("Preis")}<input type="number" min={0} max={99} value={ability.price} onChange={event => setze({ ...ability, price: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0 })} /><small>{t("Was das Lernen vom Budget kostet.")}</small></label>
          <label>{t("Funken beim Einsatz")}<input type="number" min={0} max={9} value={ability.cost} onChange={event => setze({ ...ability, cost: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0 })} /></label>
        </div>
        <label>{t("Beschreibung")}<textarea value={ability.text} maxLength={600} rows={3} onChange={event => setze({ ...ability, text: event.target.value })} /></label>
        <fieldset><legend>{t("Vorstufen")}</legend><p className="rf-help">{t("Fähigkeiten, die vorher gelernt sein müssen, höchstens vier.")}</p>
          <label>{t("Vorstufe hinzufügen")}<select value="" disabled={(ability.requires?.length ?? 0) >= 4} onChange={event => { if (prerequisiteCandidates(draft, ability.id).some(candidate => candidate.id === event.target.value)) setze({ ...ability, requires: [...(ability.requires ?? []), event.target.value] }); }}><option value="">{t("Fähigkeit wählen")}</option>{prerequisiteCandidates(draft, ability.id).map(eintrag => <option key={eintrag.id} value={eintrag.id}>{eintrag.name}</option>)}</select></label>
          {(ability.requires ?? []).map(vorstufe => <Button key={vorstufe} variant="quiet" onClick={() => { const rest = ability.requires!.filter(kennung => kennung !== vorstufe); setze(rest.length ? { ...ability, requires: rest } : ohne(ability, "requires")); }}><Trash2 size={13} />{liste.find(eintrag => eintrag.id === vorstufe)?.name ?? vorstufe}</Button>)}
        </fieldset>
        <label className="rf-check"><input type="checkbox" checked={ability.prerequisite !== undefined} onChange={event => setze(event.target.checked ? { ...ability, prerequisite: "true" } : ohne(ability, "prerequisite"))} />{t("Hat eine Voraussetzung")}</label>
        {ability.prerequisite !== undefined ? <ExpressionInput label={t("Voraussetzung")} help={t("Muss wahr sein, damit die Figur die Fähigkeit lernen kann, zum Beispiel @athletik >= 30.")} value={ability.prerequisite} onChange={prerequisite => setze({ ...ability, prerequisite })} draft={draft} /> : null}
        <Wirkungen draft={draft} werte={ability.modifiers ?? []} onChange={modifiers => setze(modifiers.length ? { ...ability, modifiers } : ohne(ability, "modifiers"))} />
      </section> : <p>{t("Noch keine Fähigkeit. Lege links die erste an.")}</p>}
    </div>
    <section className="rf-card"><h4>{t("Budget für Fähigkeiten")}</h4>
      <p className="rf-help">{t("Die Summe der Preise aller gelernten Fähigkeiten darf dieses Budget nicht übersteigen. Ohne Budget ist Lernen nur durch Vorstufen und Voraussetzungen begrenzt.")}</p>
      <label className="rf-check"><input type="checkbox" checked={regeln.budget !== undefined} onChange={event => onChange({ ...draft, abilityRules: event.target.checked ? { ...regeln, budget: "10" } : ohne(regeln, "budget") })} />{t("Budget begrenzen")}</label>
      {regeln.budget !== undefined ? <ExpressionInput label={t("Budget")} help={t("Eine Zahl oder eine Rechnung aus Attributen, zum Beispiel 9 + @erfahrung.")} value={regeln.budget} onChange={budget => onChange({ ...draft, abilityRules: { ...regeln, budget } })} draft={draft} /> : null}
    </section>
  </>;
}

export function RuleConditionEditor({ draft, onChange }: { draft: RuleDraft; onChange(draft: RuleDraft): void }) {
  const [index, setIndex] = useState(0);
  if (draft.schemaVersion !== 2 || !draft.abilityRules) return <Einschalten draft={draft} onChange={onChange} />;
  const liste = draft.conditions ?? [], aktuell = Math.min(index, liste.length - 1), zustand = liste[aktuell];
  const setze = (next: RuleCondition) => onChange({ ...draft, conditions: liste.map((eintrag, i) => i === aktuell ? next : eintrag) });
  return <div className="rf-split">
    <Auswahlliste eintraege={liste} aktuell={aktuell} titel={t("Zustände")} hinzufuegen={t("Zustand")} suchLabel={t("Zustand suchen")} unterzeile={eintrag => eintrag.id} onWaehlen={setIndex}
      onNeu={() => { if (liste.length < 32) { onChange({ ...draft, conditions: [...liste, newCondition(liste.map(eintrag => eintrag.id))] }); setIndex(liste.length); } }} />
    {zustand ? <section className="rf-detail" aria-label={t("Zustand")}>
      <div className="rf-section-heading"><h4>{zustand.name || t("Ohne Namen")}</h4><RuleEntryRemoval key={zustand.id} draft={draft} kind="condition" id={zustand.id} onChange={onChange} onRemoved={() => setIndex(0)} /></div>
      <div className="rf-form-grid">
        <label>{t("Name")}<input value={zustand.name} maxLength={120} onChange={event => setze({ ...zustand, name: event.target.value })} /></label>
        <RuleEntryIdentifier key={zustand.id} draft={draft} kind="condition" id={zustand.id} onChange={onChange} />
      </div>
      <label>{t("Beschreibung")}<textarea value={zustand.text} maxLength={600} rows={3} onChange={event => setze({ ...zustand, text: event.target.value })} /></label>
      <Wirkungen draft={draft} werte={zustand.modifiers ?? []} onChange={modifiers => setze(modifiers.length ? { ...zustand, modifiers } : ohne(zustand, "modifiers"))} />
    </section> : <p>{t("Noch kein Zustand. Lege links den ersten an.")}</p>}
  </div>;
}

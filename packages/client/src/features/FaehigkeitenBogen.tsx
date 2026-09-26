// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, useMemo, useState } from "react";
import type { AnyRulePackage, RuleAbility, Scalar } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { Begriff } from "./Begriff";
import { displayRulePackage } from "./chronicle-heroes-display";
import { einsatzKandidaten, faehigkeitenListe, grundNichtLernbar, uebersichtVon, verlernen, wirktMit, type NichtLernbar } from "./faehigkeiten-bogen";
import "./rule-fields.css";

const artText = (kind: RuleAbility["kind"]) => kind === "dauerhaft" ? t("Dauerhaft") : kind === "einsatz" ? t("Einsatz") : t("Reaktion");
function grundText(grund: NichtLernbar): string {
  switch (grund.art) {
    case "gelernt": return t("Schon gelernt.");
    case "vorstufe": return t("Braucht zuerst: {namen}.", { namen: grund.fehlend.join(", ") });
    case "erfahrung": return t("Es fehlen {n} Erfahrung.", { n: grund.fehlt });
    case "voraussetzung": return t("Die Voraussetzung ist noch nicht erfüllt.");
    case "bogen": return t("Erst die Fehler im Bogen beheben.");
  }
}
const MAX_TREFFER = 40;

/**
 * Fähigkeiten und Zustände am Bogen: gelernt, lernen, verlernen, Budget, Zustände anhaken. Alles ändert
 * nur den Entwurf; die Engine prüft ihn wie jedes andere Bogenfeld, und am Tisch gilt erst der gespeicherte Stand.
 */
export function FaehigkeitenBogen({ pkg: original, fields, onChange, disabled }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>>; onChange: (next: Record<string, Scalar>) => void; disabled?: boolean }) {
  const pkg = displayRulePackage(original);
  const [suche, setSuche] = useState(""), [nurLernbar, setNurLernbar] = useState(true), prefix = useId();
  const regeln = pkg.schemaVersion === 2 ? pkg.abilityRules : undefined;
  const uebersicht = useMemo(() => regeln ? uebersichtVon(pkg, fields) : null, [pkg, fields, regeln]);
  const gelernt = regeln ? faehigkeitenListe(fields[regeln.abilityField]) : [];
  const treffer = useMemo(() => {
    if (pkg.schemaVersion !== 2 || !regeln) return [];
    const nadel = suche.trim().toLowerCase(), lernbar = new Set(uebersicht?.learnable ?? []), schonGelernt = new Set(faehigkeitenListe(fields[regeln.abilityField]));
    return (pkg.abilities ?? []).filter(ability => !schonGelernt.has(ability.id) && (!nurLernbar || lernbar.has(ability.id))
      && (!nadel || `${ability.name} ${ability.group} ${ability.text}`.toLowerCase().includes(nadel)));
  }, [pkg, regeln, fields, suche, nurLernbar, uebersicht]);
  if (pkg.schemaVersion !== 2 || !regeln) return null;
  const nachKennung = new Map((pkg.abilities ?? []).map(ability => [ability.id, ability]));
  const aktiv = regeln.conditionField ? faehigkeitenListe(fields[regeln.conditionField]) : [];
  const setzeListe = (feld: string, ids: readonly string[]) => onChange({ [feld]: ids.join(", ") });
  const gezeigt = treffer.slice(0, MAX_TREFFER);
  const meta = (ability: RuleAbility) => `${ability.group} · ${t("Rang {rang}", { rang: ability.rank })} · ${artText(ability.kind)}`;
  return <section className="faehigkeiten-bogen sheet-block" aria-label={t("Fähigkeiten und Zustände")}>
    <h3>{t("Fähigkeiten")}</h3>
    {!uebersicht ? <Notice error>{t("Erst die Fehler im Bogen beheben.")}</Notice> : <p className="field-help" role="status">{uebersicht.budget === null
      ? t("{n} Erfahrung für Fähigkeiten ausgegeben.", { n: uebersicht.spent })
      : t("{ausgegeben} von {budget} Erfahrung für Fähigkeiten ausgegeben.", { ausgegeben: uebersicht.spent, budget: uebersicht.budget })}</p>}
    <p className="field-help">{t("Dauerhafte Fähigkeiten wirken bei jedem passenden Wurf. Einsatz- und Reaktionsfähigkeiten wählst du am Tisch beim Würfeln. Was du hier lernst oder verlernst, gilt am Tisch erst nach „Bogen speichern“.")}</p>
    {gelernt.length ? <ul className="ability-cards">{gelernt.map(id => {
      const ability = nachKennung.get(id), name = ability?.name ?? id;
      return <li key={id} className="ability-card is-learned"><strong className="ability-card-name">{name}</strong>
        {ability ? <span className="ability-card-meta">{meta(ability)}</span> : null}{ability ? <p>{ability.text}</p> : null}
        <Button disabled={disabled} onClick={() => setzeListe(regeln.abilityField, verlernen(pkg, gelernt, id))}>{t("{name} verlernen", { name })}</Button></li>;
    })}</ul> : <p className="ability-empty"><Begriff id="faehigkeit">{t("Noch keine Fähigkeit gelernt.")}</Begriff> {t("Unter „Neue Fähigkeit lernen“ suchst du eine aus.")}</p>}
    <details><summary>{t("Neue Fähigkeit lernen")}</summary>
      <div className="ability-search"><label>{t("Fähigkeit suchen")}<input type="search" value={suche} onChange={event => setSuche(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={nurLernbar} onChange={event => setNurLernbar(event.target.checked)} /> {t("Nur jetzt lernbare zeigen")}</label></div>
      <ul className="ability-cards">{gezeigt.map(ability => {
        const grund = grundNichtLernbar(pkg, fields, ability.id, uebersicht), grundId = `${prefix}-${ability.id}`;
        return <li key={ability.id} className="ability-card"><strong className="ability-card-name">{ability.name}</strong>
          <span className="ability-card-meta">{meta(ability)} · {t("{preis} Erfahrung", { preis: ability.price })}{ability.cost ? ` · ${t("{kosten} Funken beim Einsatz", { kosten: ability.cost })}` : ""}</span>
          <p>{ability.text}</p>{grund ? <p id={grundId} className="ability-card-reason">{grundText(grund)}</p> : null}
          <Button disabled={disabled || grund !== null} aria-describedby={grund ? grundId : undefined} onClick={() => setzeListe(regeln.abilityField, [...gelernt, ability.id])}>{t("{name} lernen", { name: ability.name })}</Button></li>;
      })}</ul>
      {treffer.length > gezeigt.length ? <p className="field-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: treffer.length - gezeigt.length })}</p> : !treffer.length ? <p className="muted">{t("Keine passende Fähigkeit.")}</p> : null}
    </details>
    {regeln.conditionField && pkg.conditions?.length ? <>
      <h3><Begriff id="zustand">{t("Zustände")}</Begriff></h3>
      <p className="field-help">{t("Die Spielleitung hakt Zustände an und wieder ab. Aktive Zustände rechnen bei jedem passenden Wurf mit.")}</p>
      <div className="condition-chips">{pkg.conditions.map(zustand => {
        const an = aktiv.includes(zustand.id), textId = `${prefix}-zustand-${zustand.id}`;
        return <div className="condition-chip-item" key={zustand.id}>
          <label className={an ? "condition-chip is-active" : "condition-chip"}><input type="checkbox" disabled={disabled} checked={an} aria-describedby={zustand.text ? textId : undefined}
            onChange={event => setzeListe(regeln.conditionField!, event.target.checked ? [...aktiv, zustand.id] : aktiv.filter(kennung => kennung !== zustand.id))} /><span>{zustand.name}</span></label>
          {zustand.text ? <p id={textId} className="field-help">{zustand.text}</p> : null}
        </div>;
      })}</div>
    </> : null}
  </section>;
}

const vorzeichen = (wert: string) => /^\d/.test(wert) ? `+${wert}` : wert;
/**
 * Am Tisch: die gelernten Einsatz- und Reaktionsfähigkeiten, die diese Aktion treffen, als Häkchen — und
 * was ohnehin mitwirkt. Grundlage ist der gespeicherte Bogen, denn nur mit ihm rechnet der Server.
 */
export function EinsatzWahl({ pkg: original, fields, actionId, einsatz, onEinsatz, disabled }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>> | undefined; actionId: string; einsatz: string; onEinsatz: (value: string) => void; disabled?: boolean }) {
  const pkg = displayRulePackage(original);
  if (!fields || pkg.schemaVersion !== 2 || !pkg.abilityRules) return null;
  const kandidaten = einsatzKandidaten(pkg, fields, actionId), mit = wirktMit(pkg, fields, actionId);
  if (!kandidaten.length && !mit.length) return null;
  const gewaehlt = faehigkeitenListe(einsatz);
  return <fieldset className="einsatz-wahl"><legend>{t("Fähigkeiten und Zustände")}</legend>
    {mit.length ? <p className="field-help">{t("Wirkt ohnehin mit: {liste}", { liste: mit.map(eintrag => `${eintrag.name} ${vorzeichen(eintrag.wert)}`).join(", ") })}</p> : null}
    {kandidaten.map(ability => <label key={ability.id} className="check-label"><input type="checkbox" disabled={disabled} checked={gewaehlt.includes(ability.id)}
      onChange={event => onEinsatz((event.target.checked ? [...gewaehlt, ability.id] : gewaehlt.filter(kennung => kennung !== ability.id)).join(", "))} /> <span><strong>{ability.name}</strong>{ability.cost ? ` · ${t("{kosten} Funken", { kosten: ability.cost })}` : ""} <small>{ability.text}</small></span></label>)}
    {kandidaten.some(ability => ability.cost > 0) ? <p className="field-help">{t("Funken für eingesetzte Fähigkeiten hakst du danach am Bogen ab.")}</p> : null}
  </fieldset>;
}

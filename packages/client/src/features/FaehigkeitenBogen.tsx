// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import type { AnyRulePackage, RuleAbility, Scalar } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { einsatzKandidaten, faehigkeitenListe, grundNichtLernbar, uebersichtVon, verlernen, wirktMit, type NichtLernbar } from "./faehigkeiten-bogen";

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
export function FaehigkeitenBogen({ pkg, fields, onChange, disabled }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>>; onChange: (next: Record<string, Scalar>) => void; disabled?: boolean }) {
  const [suche, setSuche] = useState(""), [nurLernbar, setNurLernbar] = useState(true);
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
  return <section className="faehigkeiten-bogen" aria-label={t("Fähigkeiten und Zustände")}>
    <h3>{t("Fähigkeiten")}</h3>
    {!uebersicht ? <Notice error>{t("Erst die Fehler im Bogen beheben.")}</Notice> : <p className="field-help" role="status">{uebersicht.budget === null
      ? t("{n} Erfahrung für Fähigkeiten ausgegeben.", { n: uebersicht.spent })
      : t("{ausgegeben} von {budget} Erfahrung für Fähigkeiten ausgegeben.", { ausgegeben: uebersicht.spent, budget: uebersicht.budget })}</p>}
    <p className="field-help">{t("Dauerhafte Fähigkeiten wirken bei jedem passenden Wurf. Einsatz- und Reaktionsfähigkeiten wählst du am Tisch beim Würfeln. Was du hier lernst oder verlernst, gilt am Tisch erst nach „Bogen speichern“.")}</p>
    {gelernt.length ? <ul className="faehigkeiten-liste">{gelernt.map(id => {
      const ability = nachKennung.get(id);
      return <li key={id}><div><strong>{ability?.name ?? id}</strong>{ability ? <small> · {ability.group} · {t("Rang {rang}", { rang: ability.rank })} · {artText(ability.kind)}</small> : null}{ability ? <p>{ability.text}</p> : null}</div>
        <Button disabled={disabled} onClick={() => setzeListe(regeln.abilityField, verlernen(pkg, gelernt, id))}>{t("Verlernen")}</Button></li>;
    })}</ul> : <p className="muted">{t("Noch keine Fähigkeit gelernt.")}</p>}
    <details><summary>{t("Neue Fähigkeit lernen")}</summary>
      <div className="rule-fields"><label>{t("Fähigkeit suchen")}<input type="search" value={suche} onChange={event => setSuche(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={nurLernbar} onChange={event => setNurLernbar(event.target.checked)} /> {t("Nur jetzt lernbare zeigen")}</label></div>
      <ul className="faehigkeiten-liste">{gezeigt.map(ability => {
        const grund = grundNichtLernbar(pkg, fields, ability.id, uebersicht);
        return <li key={ability.id}><div><strong>{ability.name}</strong><small> · {ability.group} · {t("Rang {rang}", { rang: ability.rank })} · {artText(ability.kind)} · {t("{preis} Erfahrung", { preis: ability.price })}{ability.cost ? ` · ${t("{kosten} Funken beim Einsatz", { kosten: ability.cost })}` : ""}</small>
          <p>{ability.text}</p>{grund ? <p className="field-help">{grundText(grund)}</p> : null}</div>
          <Button disabled={disabled || grund !== null} onClick={() => setzeListe(regeln.abilityField, [...gelernt, ability.id])}>{t("Lernen")}</Button></li>;
      })}</ul>
      {treffer.length > gezeigt.length ? <p className="field-help">{t("{n} weitere Treffer. Grenze die Suche ein.", { n: treffer.length - gezeigt.length })}</p> : !treffer.length ? <p className="muted">{t("Keine passende Fähigkeit.")}</p> : null}
    </details>
    {regeln.conditionField && pkg.conditions?.length ? <>
      <h3>{t("Zustände")}</h3>
      <p className="field-help">{t("Die Spielleitung hakt Zustände an und wieder ab. Aktive Zustände rechnen bei jedem passenden Wurf mit.")}</p>
      <div className="zustaende-liste">{pkg.conditions.map(zustand => <label key={zustand.id} className="check-label"><input type="checkbox" disabled={disabled} checked={aktiv.includes(zustand.id)}
        onChange={event => setzeListe(regeln.conditionField!, event.target.checked ? [...aktiv, zustand.id] : aktiv.filter(kennung => kennung !== zustand.id))} /> <span><strong>{zustand.name}</strong> <small>{zustand.text}</small></span></label>)}</div>
    </> : null}
  </section>;
}

const vorzeichen = (wert: string) => /^\d/.test(wert) ? `+${wert}` : wert;
/**
 * Am Tisch: die gelernten Einsatz- und Reaktionsfähigkeiten, die diese Aktion treffen, als Häkchen — und
 * was ohnehin mitwirkt. Grundlage ist der gespeicherte Bogen, denn nur mit ihm rechnet der Server.
 */
export function EinsatzWahl({ pkg, fields, actionId, einsatz, onEinsatz, disabled }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>> | undefined; actionId: string; einsatz: string; onEinsatz: (value: string) => void; disabled?: boolean }) {
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

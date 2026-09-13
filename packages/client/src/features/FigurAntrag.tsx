// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { FigurantragCard, FreigegebeneVorlageCard } from "@chronicle/protocol";
import type { Scalar } from "@chronicle/rules";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { HostRuleFields } from "./HostRuleFields";
import { useHostRules } from "./useHostRules";
import type { RulesState } from "./game-api";
import "./character-creation.css";

/**
 * `FigurAntrag` — der Weg vom leeren Bereich „Ich" zur eigenen Figur.
 *
 * **Die Auswahl kommt ausschließlich aus `/actor-templates/freigegeben`.** Die Werkstattliste
 * aller Vorlagen ist Spielleitungswissen: sie nennt Beutetabellen und Artikelverweise, die ein
 * Spieler nicht sehen soll. Diese Fläche fragt sie deshalb gar nicht erst ab, statt sie zu laden
 * und danach zu filtern.
 *
 * **Die Anfangswerte sind eine Abweichung, kein Bogen.** Gezeigt werden nur die Felder, die die
 * gewählte Vorlage führt, vorbelegt mit ihren Werten; abgeschickt wird nur, was daran anders
 * ist. Ein vollständiger Bogen hätte die Vorlage stillschweigend ersetzt — die Spielleitung
 * bestätigte dann etwas, das sie so nie entworfen hat.
 *
 * **Ein offener Antrag schließt den nächsten aus.** Der Server hält dieselbe Regel
 * (`figurantraege_ein_offener`); hier ist sie sichtbar, statt sich als Konflikt zu melden.
 */
export function FigurAntrag({ campaignId, rules, revision, onChanged, onDirty }: {
  campaignId: string; rules: RulesState; revision: number; onChanged: () => void; onDirty?: (dirty: boolean) => void;
}) {
  const vorlagen = useResource<FreigegebeneVorlageCard[]>(apiPath(campaignId, "/actor-templates/freigegeben"), revision);
  const antraege = useResource<FigurantragCard[]>(apiPath(campaignId, "/figurantraege"), revision);
  const [formular, setFormular] = useState(false), [templateId, setTemplateId] = useState("");
  const [name, setName] = useState(""), [werte, setWerte] = useState<Record<string, Scalar> | null>(null);
  // Ein Netzfehler wiederholt denselben Befehl; erst die angekommene Antwort gibt eine neue Kennung frei.
  const befehl = useRef<string | null>(null);
  const task = useTask();

  const eigene = antraege.data ?? [];
  const wartend = eigene.find(a => a.status === "offen") ?? null;
  const abgelehnt = eigene.filter(a => a.status === "abgelehnt");
  const vorlage = vorlagen.data?.find(v => v.id === templateId) ?? null;
  const basis = (vorlage?.anfangswerte ?? {}) as Record<string, Scalar>;
  const editor = useHostRules(campaignId, vorlage?.package ?? rules.pin, vorlage ? (werte ?? basis) : null);
  const gewaehlt = werte ?? basis;
  const abweichung = Object.fromEntries(Object.entries(gewaehlt).filter(([key, wert]) => !Object.is(wert, basis[key])));
  const dirty = formular && !wartend && (!!templateId || !!name || werte !== null);
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);

  const beantragen = () => { if (!vorlage) return; void task.run(async () => {
    befehl.current ??= crypto.randomUUID();
    await api(apiPath(campaignId, "/figurantraege"), { method: "POST", body: { commandId: befehl.current, templateId: vorlage.id, name: name.trim(), anfangswerte: abweichung } });
    befehl.current = null; setFormular(false); setTemplateId(""); setName(""); setWerte(null); onChanged();
  }); };
  const zuruecknehmen = (offen: FigurantragCard) => void task.run(async () => {
    await api(apiPath(campaignId, `/figurantraege/${encodeURIComponent(offen.id)}/zuruecknehmen`), { method: "POST", body: { expectedVersion: offen.version } });
    onChanged();
  });

  return <section className="panel figur-antrag creation-request">
    <h2>{t("Deine eigene Figur")}</h2>
    <p className="field-help">{t("Deine Figur beginnt mit einer Vorlage. Du bestimmst den Namen und schlägst Werte vor; die Spielleitung gibt den Bogen frei.")}</p>
    <ol className="creation-path" aria-label={t("Der Weg zu deiner Figur")}>
      <li aria-current={!wartend && !vorlage ? "step" : undefined}><span>01</span><div><strong>{t("Vorlage wählen")}</strong><small>{t("Von der Spielleitung freigegeben")}</small></div></li>
      <li aria-current={!wartend && vorlage ? "step" : undefined}><span>02</span><div><strong>{t("Figur gestalten")}</strong><small>{t("Name und eigene Wünsche")}</small></div></li>
      <li aria-current={wartend ? "step" : undefined}><span>03</span><div><strong>{t("Freigabe abwarten")}</strong><small>{t("Danach ist dein Bogen bereit")}</small></div></li>
    </ol>
    {vorlagen.error || antraege.error ? <Notice error>{vorlagen.error || antraege.error}</Notice> : null}
    {task.error ? <Notice error>{task.error} {t("Lade die Anträge erneut, falls die Spielleitung inzwischen entschieden hat.")}</Notice> : null}
    {vorlagen.loading || antraege.loading ? <Loading /> : null}
    {abgelehnt.map(a => <Notice key={a.id} error>{t("Dein Antrag für „{name}“ wurde abgelehnt: {grund}", { name: a.name, grund: a.reason ?? "" })}</Notice>)}
    {wartend
      ? <div className="figur-antrag-status creation-instance-preview" role="status">
        <h3>{t("„{name}“ wartet auf die Spielleitung.", { name: wartend.name })}</h3>
        <p className="field-help">{t("Sobald sie bestätigt, findest du den Bogen deiner Figur hier auf dieser Fläche.")}</p>
        <Button disabled={task.busy} onClick={() => zuruecknehmen(wartend)}>{t("Antrag zurücknehmen")}</Button>
      </div>
      : formular
      ? <form onSubmit={event => { event.preventDefault(); beantragen(); }}><fieldset className="actor-command-fields" disabled={task.busy}>
        <section className="creation-form-section"><h3>{t("Vorlage & Name")}</h3><div className="creation-identity-fields">
        <label>{t("Figurvorlage")}<select required value={templateId} onChange={event => { setTemplateId(event.target.value); setWerte(null); }}>
          <option value="">{t("Vorlage wählen")}</option>
          {vorlagen.data?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select></label>
        <label>{t("Name deiner Figur")}<input required maxLength={160} value={name} placeholder={vorlage?.name ?? ""} onChange={event => setName(event.target.value)} /></label>
        </div></section>
        {vorlage ? <section className="creation-form-section"><h3>{t("Anfangswerte")}</h3>
          <p className="field-help">{t("Vorbelegt mit den Werten der Vorlage. Nur was du änderst, steht als Wunsch im Antrag.")}</p>
          <HostRuleFields state={editor} onChange={setWerte} />
        </section> : null}
        {vorlage ? <section className="creation-instance-preview" aria-label={t("Zusammenfassung deines Antrags")}><small>{t("Dein Antrag an die Spielleitung")}</small><h3>{name.trim() || t("Deine Figur braucht noch einen Namen")}</h3><p className="field-help">{t("Vorlage: {name}", { name: vorlage.name })}</p>
          {Object.keys(abweichung).length ? <><p className="field-help">{t("Diese Wünsche schickst du mit:")}</p><dl className="creation-stat-preview">{Object.entries(abweichung).map(([key, value]) => <div key={key}><dt>{editor.manifest?.fields[key]?.label ?? key}</dt><dd>{typeof value === "boolean" ? value ? t("Ja") : t("Nein") : String(value)}</dd></div>)}</dl><Button variant="quiet" onClick={() => setWerte(null)}>{t("Werte der Vorlage wiederherstellen")}</Button></> : <p className="field-help">{t("Alle Anfangswerte bleiben wie in der Vorlage.")}</p>}
        </section> : null}
        <div className="creation-save-actions"><div className="button-row"><Button type="submit" variant="primary" disabled={task.busy || !vorlage || !name.trim() || !editor.canSave}>{task.busy ? t("Antrag wird gesendet …") : t("Antrag absenden")}</Button>
        <Button onClick={() => { befehl.current = null; setFormular(false); setTemplateId(""); setName(""); setWerte(null); }}>{t("Abbrechen")}</Button></div></div>
      </fieldset></form>
      : <><EmptyState title={t("Noch führst du keine Figur.")}>
        {vorlagen.data?.length
          ? t("Wähle eine freigegebene Vorlage, gib deiner Figur einen Namen und schicke den Antrag an die Spielleitung.")
          : t("Deine Spielleitung hat noch keine Vorlage für Spieler freigegeben. Sobald sie das tut, kannst du hier eine Figur beantragen.")}
      </EmptyState>
      <Button variant="primary" disabled={!vorlagen.data?.length} onClick={() => setFormular(true)}>{t("Figur anlegen")}</Button></>}
  </section>;
}

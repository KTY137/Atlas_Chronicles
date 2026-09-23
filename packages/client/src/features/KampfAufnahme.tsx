// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Plus } from "lucide-react";
import type { ActorCard, ActorTemplateData, KampfSeite, TemplateCard } from "@chronicle/protocol";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useTask } from "../hooks";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { AUFNAHMEN, AUFNAHME_LABEL, SEITEN, SEITE_LABEL, juengsterInitiativwurf, type Aufnahme } from "./kampftisch-model";

/**
 * „Wer kämpft mit?“ — drei Wege auf den Tisch: aus einer Figurvorlage (auch mehrere auf einmal),
 * eine Figur, die schon am Tisch sitzt, oder nur ein Name für das, was keine Werte braucht.
 * Wer eine Figur wählt, übernimmt deren Namen: zwei Namen für dieselbe Person wären genau die
 * Doppelung, die am Tisch niemand auflösen kann.
 */
export function KampfAufnahme({ campaignId, kampfId, actors, vorlagen, wuerfe, onChanged }: {
  campaignId: string; kampfId: string; actors: readonly ActorCard[]; vorlagen: readonly TemplateCard<ActorTemplateData>[];
  wuerfe: readonly ActionCard[]; onChanged: () => void;
}) {
  const [art, setArt] = useState<Aufnahme>("vorlage"), [actorId, setActorId] = useState(""), [vorlageId, setVorlageId] = useState("");
  const [anzahl, setAnzahl] = useState(1), [name, setName] = useState(""), [seite, setSeite] = useState<KampfSeite>("gegner");
  const [initiative, setInitiative] = useState(10), [lage, setLage] = useState<"feld" | "hand">("feld"), [beleg, setBeleg] = useState<string | null>(null);
  const task = useTask();
  const offene = vorlagen.filter(v => v.archivedAt === null), vorlage = offene.find(v => v.id === vorlageId) ?? null;
  const wurf = art === "figur" ? juengsterInitiativwurf(wuerfe, actorId || null) : null;
  const vorlagenName = name.trim() || vorlage?.definition.name || "";
  const bereit = !Number.isNaN(initiative) && (art === "vorlage" ? vorlage !== null : art === "figur" ? actorId !== "" : name.trim() !== "");

  const waehleArt = (neu: Aufnahme) => { setArt(neu); setBeleg(null); setSeite(neu === "figur" ? "gefaehrten" : "gegner"); };
  const waehleFigur = (id: string) => { setActorId(id); setBeleg(null); const figur = actors.find(a => a.id === id); if (figur) setName(figur.name); };
  const absenden = () => void task.run(async () => {
    const pfad = `/kaempfe/${encodeURIComponent(kampfId)}/teilnehmer`;
    if (art === "vorlage" && vorlage) await api(apiPath(campaignId, `${pfad}/aus-vorlage`), { method: "POST", body: {
      commandId: crypto.randomUUID(), templateId: vorlage.id, templateRevision: vorlage.revision, anzahl,
      ...(name.trim() ? { name: name.trim() } : {}), seite, initiative, lage } });
    else await api(apiPath(campaignId, pfad), { method: "POST", body: {
      name: name.trim(), seite, initiative, lage, actorId: art === "figur" ? actorId : null, initiativeRollId: art === "figur" ? beleg : null } });
    setName(""); setActorId(""); setBeleg(null); setAnzahl(1); onChanged();
  });

  return <form className="kampftisch-fach kampf-aufnahme" onSubmit={event => { event.preventDefault(); absenden(); }}>
    <h4><Plus size={16} aria-hidden="true" /> {t("Wer kämpft mit?")}</h4>
    <div className="kampf-aufnahme-wahl" role="group" aria-label={t("Woher kommt die Karte?")}>
      {AUFNAHMEN.map(a => <button key={a} type="button" aria-pressed={art === a} onClick={() => waehleArt(a)}>{t(AUFNAHME_LABEL[a])}</button>)}
    </div>
    {art === "figur" ? <label>{t("Figur am Tisch")}<select value={actorId} onChange={event => waehleFigur(event.target.value)}>
      <option value="">{t("Figur wählen")}</option>{actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label> : null}
    {art === "vorlage" ? offene.length ? <div className="kampf-felder">
      <label>{t("Vorlage")}<select value={vorlageId} onChange={event => setVorlageId(event.target.value)}>
        <option value="">{t("Vorlage wählen")}</option>{offene.map(v => <option key={v.id} value={v.id}>{v.definition.name}</option>)}</select></label>
      <label>{t("Anzahl")}<input type="number" min={1} max={12} value={anzahl}
        onChange={event => setAnzahl(Math.min(12, Math.max(1, Math.trunc(event.target.valueAsNumber) || 1)))} /></label>
    </div> : <p className="field-help">{t("Noch keine Figurvorlage. Lege in der Schmiede eine an, zum Beispiel „Wolf“; danach stellst du hier mehrere auf einmal auf.")}</p> : null}
    {art !== "figur" ? <label>{art === "vorlage" ? t("Name (leer lassen für den Namen der Vorlage)") : t("Name auf der Karte")}
      <input value={name} onChange={event => setName(event.target.value)} maxLength={art === "vorlage" ? 150 : 160}
        placeholder={art === "name" ? t("z. B. Einstürzende Decke") : undefined} /></label> : null}
    <div className="kampf-felder">
      <label>{t("Seite")}<select value={seite} onChange={event => setSeite(event.target.value as KampfSeite)}>
        {SEITEN.map(s => <option key={s} value={s}>{t(SEITE_LABEL[s])}</option>)}</select></label>
      <label>{t("Initiative")}<input type="number" value={Number.isNaN(initiative) ? "" : initiative}
        onChange={event => { setInitiative(event.target.valueAsNumber); setBeleg(null); }} /></label>
      <label>{t("Wohin?")}<select value={lage} onChange={event => setLage(event.target.value as "feld" | "hand")}>
        <option value="feld">{t("Gleich aufs Feld")}</option><option value="hand">{t("Verdeckt in deine Hand")}</option></select></label>
    </div>
    {wurf ? <p className="kampf-wurf">{t("Diese Figur hat Initiative gewürfelt:")} <strong>{Math.trunc(wurf.receipt.total)}</strong>.{" "}
      {beleg === wurf.id ? <span className="kampfkarte-beleg">{t("übernommen")}</span>
        : <Button onClick={() => { setInitiative(Math.trunc(wurf.receipt.total)); setBeleg(wurf.id); }}>{t("Wert übernehmen")}</Button>}</p> : null}
    {art === "vorlage" && vorlage ? <p className="field-help">{anzahl > 1
      ? t("Legt „{name} 1“ bis „{name} {n}“ als eigene Figuren an. Nur du siehst sie in der Figurenliste.", { name: vorlagenName, n: anzahl })
      : t("Legt „{name}“ als eigene Figur an. Nur du siehst sie in der Figurenliste.", { name: vorlagenName })}</p> : null}
    <p className="field-help">{t("Höhere Initiative handelt zuerst. Bei Gleichstand entscheidet, wer zuerst aufgestellt wurde — und das bleibt so.")}</p>
    <Button type="submit" variant="primary" disabled={task.busy || !bereit}>{t("Auf den Tisch legen")}</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}

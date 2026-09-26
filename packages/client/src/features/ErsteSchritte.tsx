// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type ReactNode } from "react";
import type { ActorCard, ActorTemplateData, FigurantragCard, TemplateCard } from "@chronicle/protocol";
import { Button, StepList, type StepItem } from "@chronicle/ui";
import { apiPath, type Member } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import type { RulesState } from "./game-api";
import { alleErledigt, ersteSchritte, type ErsterSchrittId } from "./erste-schritte";
import "./erste-schritte.css";

/**
 * „So startet deine Runde“ — die Checkliste der Spielleitung in der Übersicht der Schmiede (E14).
 *
 * Jeder Punkt hakt sich aus dem echten Stand ab und führt mit einem Knopf dorthin, wo er erledigt
 * wird. Die Zahlen kommen aus denselben Abfragen, die die Bereiche selbst benutzen. Lädt eine davon
 * noch oder scheitert sie, bleibt ihr Punkt ohne Haken — keine Fehlerwand über der Übersicht.
 */
/**
 * Der Stand der Checkliste, einmal geladen. „Heute“ fragt ihn selbst ab, um zu wissen, ob die Runde
 * startklar ist (dann ist der Spieltisch der hervorgehobene Schritt), und reicht ihn der Liste
 * weiter; ohne `campaignId` fragt der Hook nichts ab.
 */
export function useErsteSchritte(campaignId: string | null, revision: number) {
  const pfad = (suffix: string) => campaignId ? apiPath(campaignId, suffix) : null;
  const rules = useResource<RulesState>(pfad("/rules"), revision);
  const vorlagen = useResource<TemplateCard<ActorTemplateData>[]>(pfad("/actor-templates"), revision);
  const runde = useResource<Member[]>(pfad("/roster"), revision);
  const figuren = useResource<ActorCard[]>(pfad("/actors"), revision);
  const antraege = useResource<FigurantragCard[]>(pfad("/figurantraege"), revision);
  const anzahl = <T,>(data: readonly T[] | null | undefined) => data ? data.length : null;
  const schritte = ersteSchritte({
    regelwerkAktiv: rules.data ? !!rules.data.pin : null,
    vorlagen: anzahl(vorlagen.data),
    freigegebeneVorlagen: vorlagen.data ? vorlagen.data.filter(karte => karte.freigabe?.frei).length : null,
    mitspieler: runde.data ? runde.data.filter(member => member.role !== "leitung").length : null,
    figuren: anzahl(figuren.data),
    offeneAntraege: anzahl(antraege.data),
  });
  const aktiv = rules.data ? rules.data.packages.find(pkg => pkg.id === rules.data!.pin.id && pkg.version === rules.data!.pin.version) : undefined;
  return {
    schritte, aktiv, warten: (antraege.data?.length ?? 0) > 0, fertig: alleErledigt(schritte),
    geladen: campaignId !== null && [rules, vorlagen, runde, figuren, antraege].every(resource => !resource.loading),
  };
}
export type ErsteSchritteStand = ReturnType<typeof useErsteSchritte>;

export function ErsteSchritte({ campaignId, revision, onSectionChange, onOpenRound, onOpenTable, stand }: {
  campaignId: string; revision: number; onSectionChange: (section: "rules" | "actors") => void; onOpenRound?: () => void; onOpenTable?: () => void;
  /** Schon geladener Stand (etwa von „Heute“); dann fragt die Liste nicht noch einmal ab. */
  stand?: ErsteSchritteStand;
}) {
  const eigen = useErsteSchritte(stand ? null : campaignId, revision);
  const { schritte, aktiv, warten } = stand ?? eigen;
  const [offen, setOffen] = useState(false);
  const naechster = schritte.find(schritt => !schritt.erledigt)?.id;
  // Ohne Rücksprung zur Runde (ältere Einbettung) führt ein gewöhnlicher Link dorthin.
  const zurRunde = (() => { try { const url = new URL(location.href); url.searchParams.set("stage", "runde"); for (const key of ["forge", "tab", "door"]) url.searchParams.delete(key); return url.toString(); } catch { return "?stage=runde"; } })();

  const inhalt = (id: ErsterSchrittId): { titel: string; text: string; aktion: string; ziel: () => void } => {
    switch (id) {
      case "regelwerk": return { titel: t("Regelwerk festlegen"), text: aktiv ? t("Aktiv: {name}, Version {version}. Du kannst es so lassen oder ein eigenes bauen.", { name: aktiv.name, version: aktiv.version }) : t("Lege fest, nach welchen Regeln ihr spielt."), aktion: t("Regeln öffnen"), ziel: () => onSectionChange("rules") };
      case "vorlage": return { titel: t("Figurvorlage anlegen und freigeben"), text: t("Ein Muster für Figuren, zum Beispiel „Stadtwache“. Freigegeben können deine Mitspieler daraus eine Figur beantragen."), aktion: t("Figurvorlagen öffnen"), ziel: () => onSectionChange("actors") };
      case "einladen": return { titel: t("Mitspieler einladen"), text: t("Erzeuge unter „Runde“ einen Einladungslink und schick ihn deiner Gruppe."), aktion: t("Zur Runde"), ziel: () => { if (onOpenRound) onOpenRound(); else location.assign(zurRunde); } };
      default: return warten && onOpenTable
        ? { titel: t("Figuren anlegen oder Anträge freigeben"), text: t("Deine Mitspieler haben Figuren beantragt. Du findest sie am Tisch unter „Figuren“, Reiter „Anträge“."), aktion: t("Anträge ansehen"), ziel: onOpenTable }
        : { titel: t("Figuren anlegen oder Anträge freigeben"), text: t("Lege Figuren für eure Runde an, oder gib die Anträge deiner Mitspieler frei."), aktion: t("Figur anlegen"), ziel: () => onSectionChange("actors") };
    }
  };
  const fertig = (stand ?? eigen).fertig;
  const steps: StepItem[] = schritte.map(schritt => {
    const { titel, text, aktion, ziel } = inhalt(schritt.id);
    const label: ReactNode = <span className="erster-schritt">
      <span className="erster-schritt-text"><strong>{titel}</strong><span>{text}</span>{schritt.hinweis ? <span className="erster-schritt-hinweis">{schritt.hinweis}</span> : null}</span>
      <Button variant={schritt.id === naechster ? "primary" : "quiet"} onClick={ziel}>{aktion}</Button>
    </span>;
    return { id: schritt.id, label, state: schritt.erledigt ? "done" : schritt.id === naechster ? "current" : "todo" };
  });
  return <section className="erste-schritte" aria-labelledby="erste-schritte-titel">
    <div className="erste-schritte-kopf"><h2 id="erste-schritte-titel">{t("So startet deine Runde")}</h2>
      {fertig && !offen ? null : <p>{t("Vier Schritte bis zum ersten Spielabend. Erledigtes hakt sich von selbst ab.")}</p>}</div>
    {fertig && !offen
      ? <p className="erste-schritte-fertig"><span aria-hidden="true">✓</span> {t("Deine Runde ist startklar.")} <Button variant="quiet" onClick={() => setOffen(true)}>{t("Liste zeigen")}</Button></p>
      : <StepList label={t("So startet deine Runde")} className="erste-schritte-liste" steps={steps} />}
  </section>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ReaderPerspective as Perspective } from "@chronicle/protocol";
import { PackageOpen, RefreshCw } from "lucide-react";
import { Button, Loading, Notice, ViewIntro, confirmAction } from "@chronicle/ui";
import { apiPath, type Campaign } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import { CharacterSheet } from "./CharacterSheet";
import { FigurAntrag } from "./FigurAntrag";
import { Inventory } from "./ActorWorkbench";
import { ReaderPerspective } from "./ReaderPerspective";
import type { RulesState } from "./game-api";
import "./gameplay.css";
import "./actors.css";

/**
 * `Ich` — die eigene Figur, ohne Umweg über den Spielabend.
 *
 * Bogen und Inventar sind dieselben Komponenten, die auch am Tisch laufen; diese Fläche
 * erfindet keine zweite Fassung und keine zweite Route. Sie beantwortet nur die Frage, die
 * unter der Woche zuerst gestellt wird und für die der Tisch der falsche Ort war:
 * *Was habe ich, und was kann ich?*
 *
 * Ein Figurwähler oben steuert Bogen und Inventar (E8, 2026-09-26). Vorher standen hier drei
 * Wähler: die Lesesicht der App, dieser und die Inventarwahl. Die Lesesicht steht jetzt darunter
 * und sagt, wofür sie gilt; das Inventar folgt der gewählten Figur, und Geld steht einmal — am Bogen.
 */
export function MeineFigur({ campaign, liveRevision = 0, onDirty }: { campaign: Campaign; liveRevision?: number; onDirty: (value: boolean) => void }) {
  const inventory = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0), [chosen, setChosen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState({ sheet: false, inventory: false, request: false });
  const dirty = drafts.sheet || drafts.inventory || drafts.request;
  const reportSheet = useCallback((value: boolean) => setDrafts(old => ({ ...old, sheet: value })), []);
  const reportInventory = useCallback((value: boolean) => setDrafts(old => ({ ...old, inventory: value })), []);
  const reportRequest = useCallback((value: boolean) => setDrafts(old => ({ ...old, request: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  // Der eigene Takt und der Live-Takt der Anwendung sind derselbe Anlass, neu zu laden: bestätigt
  // die Spielleitung einen Antrag, soll hier die Figur stehen und nicht weiter „wartet auf …".
  const takt = revision + liveRevision;
  const rules = useResource<RulesState>(apiPath(campaign.id, "/rules"), takt);
  const actors = useResource<ActorCard[]>(apiPath(campaign.id, "/actors"), takt);
  const perspective = useResource<Perspective>(apiPath(campaign.id, "/reader-perspective"), takt);
  const meine = actors.data?.filter(actor => actor.canControl) ?? [];
  // Die erste Wahl wird einmal festgehalten. Eine spätere Freigabe darf keinen offenen Entwurf umhängen.
  useEffect(() => { if (!dirty && meine.length && !meine.some(actor => actor.id === chosen)) setChosen(meine[0]!.id); }, [chosen, dirty, meine]);
  const actorId = meine.find(actor => actor.id === chosen)?.id ?? "";
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const gm = campaign.role === "leitung";
  const openInventory = () => {
    const target = inventory.current, stage = target?.closest<HTMLElement>(".main-stage");
    if (!target || !stage) return;
    // Only move the content pane; scrollIntoView can also move the outer document.
    stage.scrollTo({ top: stage.scrollTop + target.getBoundingClientRect().top - stage.getBoundingClientRect().top - 20 });
    target.focus({ preventScroll: true });
  };
  const waehle = async (next: string) => {
    if (next === actorId) return;
    // Die Auswahl springt sofort auf die gültige Figur zurück (gesteuertes Feld); erst ein Ja wechselt.
    if (dirty && !await confirmAction({ title: t("Ungespeicherte Änderungen verwerfen?"), message: t("Was du an dieser Figur geändert und noch nicht gespeichert hast, geht verloren."), confirmLabel: t("Verwerfen und wechseln"), cancelLabel: t("Hierbleiben"), danger: true })) {
      setDrafts(d => ({ ...d }));
      return;
    }
    setDrafts({ sheet: false, inventory: false, request: false }); setChosen(next);
  };
  // Die Lesesicht wechselt nur Chronik und Atlas; Bogen und Inventar hier bleiben davon unberührt.
  // Für die Spielleitung ist derselbe Wähler die Brieffigur; dort bleibt seine eigene Beschriftung.
  const lesesicht = useCallback(() => true, []);
  return <section className="page-content table-page meine-figur">
    <ViewIntro id="ich-titel" level={1} title={t("Deine Figur")}
      action={<div className="meine-figur-wahl">
        {meine.length > 1 ? <label className="actor-picker">{t("Deine Figur")}
          <select value={actorId} onChange={event => void waehle(event.target.value)}>
            {meine.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
          </select></label> : null}
        {actorId ? <Button variant="quiet" onClick={openInventory}><PackageOpen size={17} aria-hidden="true" /> {t("Zum Inventar")}</Button> : null}
        <Button variant="quiet" aria-label={t("Figur aktualisieren")} onClick={refresh}><RefreshCw size={16} aria-hidden="true" /></Button>
      </div>}
      steps={actorId ? [
        t("Ändere Werte direkt auf dem Bogen und speichere sie."),
        t("Unter dem Bogen findest du alles, was deine Figur trägt."),
        t("Am Tisch würfelst du mit genau diesem Bogen."),
      ] : undefined}>
      {actorId ? t("Der Bogen deiner Figur und alles, was sie trägt. Es ist derselbe Bogen, der am Tisch gilt.")
        : t("Hier steht der Bogen deiner Figur, sobald du eine hast.")}</ViewIntro>
    {rules.error || actors.error ? <Notice error>{rules.error || actors.error}</Notice> : null}
    {rules.loading || actors.loading ? <Loading />
      : !actorId ? (gm || !rules.data
        // Die leere Fläche einer Spielerin ist keine Sackgasse mehr: sie kann hier selbst eine
        // Figur beantragen. Für die Spielleitung bleibt sie, was sie war — sie erschafft Figuren
        // in der Schmiede, nicht über einen Antrag an sich selbst.
        ? <p className="field-help">{gm ? t("Als Spielleitung legst du Figuren in der Schmiede an. Sobald du selbst eine steuerst, steht ihr Bogen hier.") : t("Sobald deine Spielleitung dir eine Figur anvertraut, findest du hier ihren Bogen und alles, was sie trägt.")}</p>
        : <FigurAntrag campaignId={campaign.id} rules={rules.data} revision={takt} onChanged={refresh} onDirty={reportRequest} />)
      : rules.data ? <>
        <CharacterSheet key={actorId} campaignId={campaign.id} actorId={actorId} rules={rules.data} gm={gm} liveRevision={takt} onDirty={reportSheet} onChanged={refresh} />
        <div ref={inventory} tabIndex={-1} className="character-inventory"><Inventory key={actorId} campaignId={campaign.id} actorId={actorId} actors={actors.data ?? []} gm={false} waehlbar={false} mitGeld={false} revision={takt} onChanged={refresh} onDirty={reportInventory} /></div>
      </> : null}
    {/* Die Lesesicht ändert man selten; sie steht deshalb unter dem Bogen, nicht vor ihm (auf dem Handy
        sonst der ganze erste Bildschirm ohne ein Stück Figur). */}
    {perspective.data ? <ReaderPerspective campaignId={campaign.id} gm={gm} current={perspective.data} revision={takt} guard={lesesicht} onChanged={refresh}
      label={gm ? undefined : t("Aus wessen Sicht liest du Chronik und Atlas?")} /> : null}
  </section>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard } from "@chronicle/protocol";
import { PackageOpen, RefreshCw } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import { CharacterSheet } from "./CharacterSheet";
import { FigurAntrag } from "./FigurAntrag";
import { Inventory } from "./ActorWorkbench";
import type { RulesState } from "./game-api";
import "./gameplay.css";

/**
 * `Ich` — die eigene Figur, ohne Umweg über den Spielabend.
 *
 * Bogen und Inventar sind dieselben Komponenten, die auch am Tisch laufen; diese Fläche
 * erfindet keine zweite Fassung und keine zweite Route. Sie beantwortet nur die Frage, die
 * unter der Woche zuerst gestellt wird und für die der Tisch der falsche Ort war:
 * *Was habe ich, und was kann ich?*
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
  return <section className="page-content table-page"><div className="page-heading"><div>
      <p className="eyebrow">{t("Was du hältst und was du kannst")}</p><h1>{t("Deine Figur")}</h1>
      <p className="muted">{t("Bogen und Inventar — dieselben, die am Tisch gelten.")}</p>
    </div><div className="button-row">{actorId ? <Button onClick={openInventory}><PackageOpen size={17} /> {t("Zum Inventar")}</Button> : null}<Button aria-label={t("Figur aktualisieren")} onClick={refresh}><RefreshCw size={16} /></Button></div></div>
    {rules.error || actors.error ? <Notice error>{rules.error || actors.error}</Notice> : null}
    {meine.length > 1 ? <div className="table-controls"><label className="actor-picker">{t("Deine Figur")}
      <select value={actorId} onChange={event => {
        if (event.target.value === actorId || (dirty && !window.confirm(t("Ungespeicherte Änderungen dieser Figur verwerfen?")))) return;
        setDrafts({ sheet: false, inventory: false, request: false }); setChosen(event.target.value);
      }}>
        {meine.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
      </select></label></div> : null}
    {rules.loading || actors.loading ? <Loading />
      : !actorId ? (gm || !rules.data
        // Die leere Fläche einer Spielerin ist keine Sackgasse mehr: sie kann hier selbst eine
        // Figur beantragen. Für die Spielleitung bleibt sie, was sie war — sie erschafft Figuren
        // in der Schmiede, nicht über einen Antrag an sich selbst.
        ? <EmptyState title={t("Noch führst du keine Figur.")}>{t("Sobald deine Spielleitung dir eine Figur anvertraut, findest du hier ihren Bogen und alles, was sie trägt.")}</EmptyState>
        : <FigurAntrag campaignId={campaign.id} rules={rules.data} revision={takt} onChanged={refresh} onDirty={reportRequest} />)
      : rules.data ? <>
        <CharacterSheet key={actorId} campaignId={campaign.id} actorId={actorId} rules={rules.data} gm={gm} liveRevision={takt} onDirty={reportSheet} onChanged={refresh} />
        <div ref={inventory} tabIndex={-1} className="character-inventory"><Inventory key={actorId} campaignId={campaign.id} actorId={actorId} actors={actors.data ?? []} gm={false} revision={takt} onChanged={refresh} onDirty={reportInventory} /></div>
      </> : null}
  </section>;
}

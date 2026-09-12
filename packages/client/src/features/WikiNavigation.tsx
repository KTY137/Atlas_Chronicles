// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createContext, useContext, useState } from "react";
import type { MoveNavigationEntryBody, NavigationDestinationValue } from "@chronicle/protocol";
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, Home } from "lucide-react";
import { Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError } from "../api";
import { useResource, useTask } from "../hooks";
import { plural, t } from "../i18n";
import { artTitel, baueNavigation, brotkrumen, NAVIGATION_ARTEN, type Gruppe, type NavigationArtikel, type NavigationDaten } from "./wiki-navigation-model";
import { MapContextMenu } from "./MapContextMenu";
import "./wiki-navigation.css";

export type { NavigationDaten } from "./wiki-navigation-model";

interface DraggedEntry { artikel: NavigationArtikel; fromCategoryId: string | null }
interface NavigationMoves {
  busy: boolean; dragged: DraggedEntry | null; over: string | null;
  targets: readonly { label: string; destination: NavigationDestinationValue }[];
  start(value: DraggedEntry | null): void; hover(id: string | null): void;
  move(value: DraggedEntry, destination: NavigationDestinationValue): void;
}
const MoveContext = createContext<NavigationMoves | null>(null);
const groupDestination = (gruppe: Gruppe): NavigationDestinationValue => gruppe.herkunft === "kategorie"
  ? { kind: "category", id: gruppe.id } : { kind: "art", art: gruppe.id.slice(4) as (typeof NAVIGATION_ARTEN)[number] };

export function useNavigation(campaignId: string, revision: number) {
  return useResource<NavigationDaten>(apiPath(campaignId, "/navigation"), revision);
}

/** „2 von 12 bekannt" — die Silhouette in Worten. Bei Vollständigkeit nur die Zahl. */
function Zaehler({ bekannt, gesamt }: { bekannt: number; gesamt: number }) {
  return bekannt === gesamt
    ? <span className="nav-zaehler">{gesamt}</span>
    : <span className="nav-zaehler nav-zaehler-teil" title={t("{bekannt} von {gesamt} bekannt", { bekannt, gesamt })}>{bekannt}<i>/{gesamt}</i></span>;
}

function ArtikelZeile({ artikel, aktiv, onEntry, fromCategoryId }: { artikel: NavigationArtikel; aktiv: boolean; onEntry: (id: string) => void; fromCategoryId: string | null }) {
  const moves = useContext(MoveContext);
  // Ein unbekannter Artikel ist kein Ziel: keine Schaltfläche, kein Name, aber ein Platz.
  if (!artikel.bekannt) return <li className="nav-artikel nav-silhouette" aria-label={t("Ein Artikel, den du noch nicht kennst")}>···</li>;
  const button = <button type="button" className={aktiv ? "nav-artikel-knopf aktiv" : "nav-artikel-knopf"}
      draggable={!!moves && !moves.busy}
      onDragStart={event => {
        if (!moves || moves.busy) { event.preventDefault(); return; }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-chronicle-entry", artikel.id);
        moves.start({ artikel, fromCategoryId });
      }} onDragEnd={() => moves?.start(null)}
      aria-current={aktiv ? "page" : undefined} onClick={() => onEntry(artikel.id)}>
      <BookOpen size={13} /><span>{artikel.titel}</span>
      {artikel.ungelesen ? <em className="nav-ungelesen" title={t("Ungelesene Passagen")}>{artikel.ungelesen}</em> : null}
    </button>;
  return <li className="nav-artikel" data-entry-id={artikel.id}>
    {moves ? <MapContextMenu label={artikel.titel ?? ""} className="nav-artikel-actions" actions={moves.targets.map(target => ({
      id: target.destination.kind === "category" ? target.destination.id : `art:${target.destination.art}`,
      label: target.label, disabled: moves.busy || (target.destination.kind === "category" ? target.destination.id === fromCategoryId : fromCategoryId === null && target.destination.art === artikel.art),
      onSelect: () => moves.move({ artikel, fromCategoryId }, target.destination),
    }))}>{button}</MapContextMenu> : button}
  </li>;
}

function GruppenZeile({ gruppe, tiefe, ausgewaehlt, onEntry }: { gruppe: Gruppe; tiefe: number; ausgewaehlt: string | null; onEntry: (id: string) => void }) {
  const moves = useContext(MoveContext);
  // Auf oberster Ebene offen, tiefer zu: der erste Blick zeigt die Ordnung, nicht alles darin.
  const [offen, setOffen] = useState(tiefe === 0);
  const leer = gruppe.artikel.length === 0 && gruppe.kinder.length === 0;
  return <li className={`nav-gruppe${moves?.over === gruppe.id ? " nav-drop-target" : ""}`} style={{ "--tiefe": tiefe } as React.CSSProperties}
    data-group-id={gruppe.id}
    onDragOver={event => { if (!moves?.dragged || moves.busy) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; moves.hover(gruppe.id); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) moves?.hover(null); }}
    onDrop={event => { if (!moves?.dragged || moves.busy) return; event.preventDefault(); event.stopPropagation(); setOffen(true); moves.move(moves.dragged, groupDestination(gruppe)); }}>
    <button type="button" className="nav-gruppe-kopf" aria-expanded={offen} disabled={leer && !moves} onClick={() => setOffen(wert => !wert)}>
      {leer ? <span className="nav-chevron-leer" /> : offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <span className="nav-gruppe-titel">{gruppe.titel}</span>
      <Zaehler bekannt={gruppe.bekannt} gesamt={gruppe.gesamt} />
    </button>
    {offen ? <ul className="nav-kinder">
      {gruppe.kinder.map(kind => <GruppenZeile key={kind.id} gruppe={kind} tiefe={tiefe + 1} ausgewaehlt={ausgewaehlt} onEntry={onEntry} />)}
      {gruppe.artikel.map((artikel, index) => <ArtikelZeile key={artikel.bekannt ? artikel.id : `silhouette-${gruppe.id}-${index}`}
        artikel={artikel} aktiv={artikel.id === ausgewaehlt} onEntry={onEntry} fromCategoryId={gruppe.herkunft === "kategorie" ? gruppe.id : null} />)}
    </ul> : null}
  </li>;
}

/** Die gruppierte Navigation der Seitenleiste. Beim Suchen tritt sie zurück — dann ist Ordnung im Weg. */
export function NavigationBaum({ daten, ausgewaehlt, onEntry, campaignId, onMoved }: { daten: NavigationDaten; ausgewaehlt: string | null; onEntry: (id: string) => void; campaignId?: string; onMoved?: () => void }) {
  const task = useTask(), [dragged, setDragged] = useState<DraggedEntry | null>(null), [over, setOver] = useState<string | null>(null), [notice, setNotice] = useState("");
  const baum = baueNavigation(daten);
  const targets: NavigationMoves["targets"] = [
    ...daten.kategorien.map(category => ({ label: t("Verschieben nach {kategorie}", { kategorie: category.titel }), destination: { kind: "category" as const, id: category.id } })),
    ...NAVIGATION_ARTEN.map(art => ({ label: t("Als {art} ohne Kategorie einsortieren", { art: artTitel(art) }), destination: { kind: "art" as const, art } })),
  ];
  const start = (value: DraggedEntry | null) => { setDragged(value); setOver(null); };
  const move: NavigationMoves["move"] = (value, destination) => {
    start(null); if (!campaignId) return;
    void task.run(async () => {
      setNotice("");
      const body: MoveNavigationEntryBody = { fromCategoryId: value.fromCategoryId, destination, expectedCategoryIds: [...value.artikel.kategorieIds], expectedArt: value.artikel.art as MoveNavigationEntryBody["expectedArt"] };
      try { await api(apiPath(campaignId, `/entries/${encodeURIComponent(value.artikel.id)}/navigation`), { method: "POST", body }); }
      catch (error) {
        if (error instanceof ApiError && error.status === 409) { onMoved?.(); throw new Error(t("Die Zuordnung wurde inzwischen geändert. Die aktuelle Ordnung wird neu geladen; verschiebe den Artikel danach erneut.")); }
        throw error;
      }
      setNotice(t("„{titel}“ wurde verschoben.", { titel: value.artikel.titel ?? "" })); onMoved?.();
    });
  };
  const visible = dragged ? [...baum, ...NAVIGATION_ARTEN.filter(art => !baum.some(group => group.id === `art:${art}`)).map(art => ({ id: `art:${art}`, titel: artTitel(art), herkunft: "art" as const, bekannt: 0, gesamt: 0, kinder: [], artikel: [] }))] : baum;
  if (baum.length === 0) return null;
  return <MoveContext.Provider value={campaignId ? { busy: task.busy, dragged, over, targets, start, hover: setOver, move } : null}>
    <nav className="nav-baum" aria-label={t("Ordnung der Chronik")} aria-busy={task.busy}>
      {campaignId ? <p className="nav-move-hint">{t("Ziehe Artikel in eine Kategorie oder wähle das Ziel über ihr Aktionsmenü.")}</p> : null}
      {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <p className="nav-move-hint" role="status">{notice}</p> : null}
      <ul>{visible.map(gruppe => <GruppenZeile key={gruppe.id} gruppe={gruppe} tiefe={0} ausgewaehlt={ausgewaehlt} onEntry={onEntry} />)}</ul>
    </nav>
  </MoveContext.Provider>;
}

/** Die Übersicht: die Landefläche des Wikis, wenn kein Artikel gewählt ist. */
export function WikiUebersicht({ daten, onEntry }: { daten: NavigationDaten; onEntry: (id: string) => void }) {
  const baum = baueNavigation(daten);
  const bekannt = daten.artikel.filter(artikel => artikel.bekannt).length;
  return <section className="uebersicht" aria-label={t("Übersicht der Chronik")}>
    <header className="uebersicht-kopf">
      {/* Nicht noch einmal „Die Chronik": so heißt schon die Seitenleiste, und zwei gleiche
          Überschriften auf einer Seite lassen den Leser raten, welche gemeint ist. */}
      <p className="eyebrow">{t("Übersicht")}</p>
      <h1>{t("Die Ordnung der Welt")}</h1>
      <p className="muted">{bekannt === daten.artikel.length
        ? t("{bekannt} Artikel in {bereiche} Bereichen.", { bekannt, bereiche: baum.length })
        : t("{bekannt} von {gesamt} Artikeln sind dir bekannt, verteilt auf {bereiche} Bereiche.", { bekannt, gesamt: daten.artikel.length, bereiche: baum.length })}</p>
    </header>
    <div className="uebersicht-gitter">
      {baum.map(gruppe => <article key={gruppe.id} className="uebersicht-karte">
        <h2>{gruppe.herkunft === "kategorie" ? <FolderOpen size={15} /> : <Home size={15} />}{gruppe.titel}</h2>
        <p className="uebersicht-zahl"><Zaehler bekannt={gruppe.bekannt} gesamt={gruppe.gesamt} /> {plural(gruppe.gesamt, "Artikel", "Artikel")}</p>
        <ul>
          {gruppe.artikel.filter(artikel => artikel.bekannt).slice(0, 5).map(artikel =>
            <li key={artikel.id}><button type="button" onClick={() => onEntry(artikel.id)}>{artikel.titel}</button></li>)}
          {gruppe.kinder.slice(0, 3).map(kind => <li key={kind.id} className="uebersicht-unter">{kind.titel} <Zaehler bekannt={kind.bekannt} gesamt={kind.gesamt} /></li>)}
        </ul>
        {gruppe.bekannt < gruppe.gesamt
          ? <p className="uebersicht-rest">{t("{rest} weitere, die du noch nicht kennst.", { rest: gruppe.gesamt - gruppe.bekannt })}</p>
          : null}
      </article>)}
    </div>
  </section>;
}

/** Brotkrumen entlang der Elternkette; ein unbekannter Vorfahre bleibt namenlos statt unsichtbar. */
export function Brotkrumen({ daten, entryId, onEntry }: { daten: NavigationDaten; entryId: string; onEntry: (id: string) => void }) {
  const kette = brotkrumen(entryId, daten.artikel);
  if (kette.length < 2) return null;
  return <nav className="brotkrumen" aria-label={t("Pfad")}>
    {kette.map((krume, index) => <span key={krume.id}>
      {index > 0 ? <i aria-hidden="true">/</i> : null}
      {krume.id === entryId ? <b>{krume.titel}</b>
        : krume.bekannt ? <button type="button" onClick={() => onEntry(krume.id)}>{krume.titel}</button>
        : <span className="brotkrume-unbekannt" title={t("Eine Ebene, die du noch nicht kennst")}>···</span>}
    </span>)}
  </nav>;
}

/** Die Kategorien eines Artikels als Chips unter dem Titel. */
export function KategorieChips({ daten, entryId }: { daten: NavigationDaten; entryId: string }) {
  const artikel = daten.artikel.find(eintrag => eintrag.id === entryId);
  const kategorien = (artikel?.kategorieIds ?? []).map(id => daten.kategorien.find(kategorie => kategorie.id === id)).filter(Boolean);
  if (kategorien.length === 0) return null;
  return <p className="kategorie-chips">{kategorien.map(kategorie =>
    <span key={kategorie!.id} className="kategorie-chip"><FolderOpen size={11} />{kategorie!.titel}</span>)}</p>;
}

/** Lade- und Fehlerhülle, damit die Seitenleiste bei einem Ausfall auf die flache Liste zurückfällt. */
export function NavigationHuelle({ zustand, children }: { zustand: { loading: boolean; error: string }; children: React.ReactNode }) {
  if (zustand.loading) return <Loading text={t("Die Ordnung wird gelesen …")} />;
  if (zustand.error) return <Notice error>{zustand.error}</Notice>;
  return <>{children}</>;
}

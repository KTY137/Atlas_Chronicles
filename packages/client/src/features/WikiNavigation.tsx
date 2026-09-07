import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, Home } from "lucide-react";
import { Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";
import { baueNavigation, brotkrumen, type Gruppe, type NavigationArtikel, type NavigationDaten } from "./wiki-navigation-model";
import "./wiki-navigation.css";

export type { NavigationDaten } from "./wiki-navigation-model";

export function useNavigation(campaignId: string, revision: number) {
  return useResource<NavigationDaten>(apiPath(campaignId, "/navigation"), revision);
}

/** „2 von 12 bekannt" — die Silhouette in Worten. Bei Vollständigkeit nur die Zahl. */
function Zaehler({ bekannt, gesamt }: { bekannt: number; gesamt: number }) {
  return bekannt === gesamt
    ? <span className="nav-zaehler">{gesamt}</span>
    : <span className="nav-zaehler nav-zaehler-teil" title={`${bekannt} von ${gesamt} bekannt`}>{bekannt}<i>/{gesamt}</i></span>;
}

function ArtikelZeile({ artikel, aktiv, onEntry }: { artikel: NavigationArtikel; aktiv: boolean; onEntry: (id: string) => void }) {
  // Ein unbekannter Artikel ist kein Ziel: keine Schaltfläche, kein Name, aber ein Platz.
  if (!artikel.bekannt) return <li className="nav-artikel nav-silhouette" aria-label="Ein Artikel, den du noch nicht kennst">···</li>;
  return <li className="nav-artikel">
    <button type="button" className={aktiv ? "nav-artikel-knopf aktiv" : "nav-artikel-knopf"}
      aria-current={aktiv ? "page" : undefined} onClick={() => onEntry(artikel.id)}>
      <BookOpen size={13} /><span>{artikel.titel}</span>
      {artikel.ungelesen ? <em className="nav-ungelesen" title="Ungelesene Passagen">{artikel.ungelesen}</em> : null}
    </button>
  </li>;
}

function GruppenZeile({ gruppe, tiefe, ausgewaehlt, onEntry }: { gruppe: Gruppe; tiefe: number; ausgewaehlt: string | null; onEntry: (id: string) => void }) {
  // Auf oberster Ebene offen, tiefer zu: der erste Blick zeigt die Ordnung, nicht alles darin.
  const [offen, setOffen] = useState(tiefe === 0);
  const leer = gruppe.artikel.length === 0 && gruppe.kinder.length === 0;
  return <li className="nav-gruppe" style={{ "--tiefe": tiefe } as React.CSSProperties}>
    <button type="button" className="nav-gruppe-kopf" aria-expanded={offen} disabled={leer} onClick={() => setOffen(wert => !wert)}>
      {leer ? <span className="nav-chevron-leer" /> : offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <span className="nav-gruppe-titel">{gruppe.titel}</span>
      <Zaehler bekannt={gruppe.bekannt} gesamt={gruppe.gesamt} />
    </button>
    {offen ? <ul className="nav-kinder">
      {gruppe.kinder.map(kind => <GruppenZeile key={kind.id} gruppe={kind} tiefe={tiefe + 1} ausgewaehlt={ausgewaehlt} onEntry={onEntry} />)}
      {gruppe.artikel.map((artikel, index) => <ArtikelZeile key={artikel.bekannt ? artikel.id : `silhouette-${gruppe.id}-${index}`}
        artikel={artikel} aktiv={artikel.id === ausgewaehlt} onEntry={onEntry} />)}
    </ul> : null}
  </li>;
}

/** Die gruppierte Navigation der Seitenleiste. Beim Suchen tritt sie zurück — dann ist Ordnung im Weg. */
export function NavigationBaum({ daten, ausgewaehlt, onEntry }: { daten: NavigationDaten; ausgewaehlt: string | null; onEntry: (id: string) => void }) {
  const baum = baueNavigation(daten);
  if (baum.length === 0) return null;
  return <nav className="nav-baum" aria-label="Ordnung der Chronik">
    <ul>{baum.map(gruppe => <GruppenZeile key={gruppe.id} gruppe={gruppe} tiefe={0} ausgewaehlt={ausgewaehlt} onEntry={onEntry} />)}</ul>
  </nav>;
}

/** Die Übersicht: die Landefläche des Wikis, wenn kein Artikel gewählt ist. */
export function WikiUebersicht({ daten, onEntry }: { daten: NavigationDaten; onEntry: (id: string) => void }) {
  const baum = baueNavigation(daten);
  const bekannt = daten.artikel.filter(artikel => artikel.bekannt).length;
  return <section className="uebersicht" aria-label="Übersicht der Chronik">
    <header className="uebersicht-kopf">
      {/* Nicht noch einmal „Die Chronik": so heißt schon die Seitenleiste, und zwei gleiche
          Überschriften auf einer Seite lassen den Leser raten, welche gemeint ist. */}
      <p className="eyebrow">Übersicht</p>
      <h1>Die Ordnung der Welt</h1>
      <p className="muted">{bekannt === daten.artikel.length
        ? `${bekannt} Artikel in ${baum.length} Bereichen.`
        : `${bekannt} von ${daten.artikel.length} Artikeln sind dir bekannt, verteilt auf ${baum.length} Bereiche.`}</p>
    </header>
    <div className="uebersicht-gitter">
      {baum.map(gruppe => <article key={gruppe.id} className="uebersicht-karte">
        <h2>{gruppe.herkunft === "kategorie" ? <FolderOpen size={15} /> : <Home size={15} />}{gruppe.titel}</h2>
        <p className="uebersicht-zahl"><Zaehler bekannt={gruppe.bekannt} gesamt={gruppe.gesamt} /> {gruppe.gesamt === 1 ? "Artikel" : "Artikel"}</p>
        <ul>
          {gruppe.artikel.filter(artikel => artikel.bekannt).slice(0, 5).map(artikel =>
            <li key={artikel.id}><button type="button" onClick={() => onEntry(artikel.id)}>{artikel.titel}</button></li>)}
          {gruppe.kinder.slice(0, 3).map(kind => <li key={kind.id} className="uebersicht-unter">{kind.titel} <Zaehler bekannt={kind.bekannt} gesamt={kind.gesamt} /></li>)}
        </ul>
        {gruppe.bekannt < gruppe.gesamt
          ? <p className="uebersicht-rest">{gruppe.gesamt - gruppe.bekannt} weitere, die du noch nicht kennst.</p>
          : null}
      </article>)}
    </div>
  </section>;
}

/** Brotkrumen entlang der Elternkette; ein unbekannter Vorfahre bleibt namenlos statt unsichtbar. */
export function Brotkrumen({ daten, entryId, onEntry }: { daten: NavigationDaten; entryId: string; onEntry: (id: string) => void }) {
  const kette = brotkrumen(entryId, daten.artikel);
  if (kette.length < 2) return null;
  return <nav className="brotkrumen" aria-label="Pfad">
    {kette.map((krume, index) => <span key={krume.id}>
      {index > 0 ? <i aria-hidden="true">/</i> : null}
      {krume.id === entryId ? <b>{krume.titel}</b>
        : krume.bekannt ? <button type="button" onClick={() => onEntry(krume.id)}>{krume.titel}</button>
        : <span className="brotkrume-unbekannt" title="Eine Ebene, die du noch nicht kennst">···</span>}
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
  if (zustand.loading) return <Loading text="Die Ordnung wird gelesen …" />;
  if (zustand.error) return <Notice error>{zustand.error}</Notice>;
  return <>{children}</>;
}

import { BookOpen, CalendarRange, Home } from "lucide-react";
import { EmptyState } from "@chronicle/ui";
import { baueNavigation, type Gruppe, type NavigationDaten } from "./wiki-navigation-model";
import "./wiki-kopf.css";

/** Was die Kopfleiste gerade zeigt. `null` heißt: der Artikel selbst. */
export type Kopfansicht = { art: "uebersicht" } | { art: "zeitstrahl" } | { art: "gruppe"; id: string } | null;

/**
 * Die Kopfleiste der Chronik — die waagerechte Ordnung, die ein Wiki oben hat.
 *
 * Sie erfindet **keine zweite Ordnung**: die Einträge sind genau die obersten Gruppen aus
 * `baueNavigation`, also die Kategorien des Quellwikis, sobald welche importiert wurden, und
 * bis dahin die Arten der Artikel. Ohne diesen Rückfall wäre die Leiste in einem Bestand ohne
 * Kategorien leer — und genau so ein Bestand ist der häufige Fall direkt nach dem ersten
 * Import.
 *
 * Die Zähler sind dieselbe Silhouette wie im Baum: `2/12` heißt „zwölf gibt es, zwei kennst
 * du". Verschwiegen wird nichts, benannt auch nicht.
 */
export function WikiKopf({ daten, ansicht, onAnsicht }: {
  daten: NavigationDaten; ansicht: Kopfansicht; onAnsicht: (ansicht: Kopfansicht) => void;
}) {
  const gruppen = baueNavigation(daten);
  const aktiv = (art: string, id?: string) => ansicht?.art === art && (id === undefined || (ansicht.art === "gruppe" && ansicht.id === id));
  return <nav className="wiki-kopf" aria-label="Ordnung der Chronik">
    <button type="button" className={aktiv("uebersicht") ? "kopf-knopf aktiv" : "kopf-knopf"}
      aria-current={aktiv("uebersicht") ? "page" : undefined} onClick={() => onAnsicht({ art: "uebersicht" })}>
      <Home size={14} /> Übersicht
    </button>
    <span className="kopf-trenner" aria-hidden="true" />
    <div className="kopf-gruppen">{gruppen.map(gruppe => <button key={gruppe.id} type="button"
      className={aktiv("gruppe", gruppe.id) ? "kopf-knopf aktiv" : "kopf-knopf"}
      aria-current={aktiv("gruppe", gruppe.id) ? "page" : undefined}
      onClick={() => onAnsicht({ art: "gruppe", id: gruppe.id })}>
      {gruppe.titel}<em className="kopf-zaehler">{gruppe.bekannt === gruppe.gesamt ? gruppe.gesamt : `${gruppe.bekannt}/${gruppe.gesamt}`}</em>
    </button>)}</div>
    <span className="kopf-trenner" aria-hidden="true" />
    <button type="button" className={aktiv("zeitstrahl") ? "kopf-knopf aktiv" : "kopf-knopf"}
      aria-current={aktiv("zeitstrahl") ? "page" : undefined} onClick={() => onAnsicht({ art: "zeitstrahl" })}>
      <CalendarRange size={14} /> Zeitstrahl
    </button>
  </nav>;
}

const finde = (gruppen: readonly Gruppe[], id: string): Gruppe | null => {
  for (const gruppe of gruppen) {
    if (gruppe.id === id) return gruppe;
    const treffer = finde(gruppe.kinder, id);
    if (treffer) return treffer;
  }
  return null;
};

/** Die Seite einer Gruppe: alles darin, mit den Untergruppen als eigene Abschnitte. */
export function WikiGruppenseite({ daten, gruppeId, onEntry, onAnsicht }: {
  daten: NavigationDaten; gruppeId: string; onEntry: (id: string) => void; onAnsicht: (ansicht: Kopfansicht) => void;
}) {
  const gruppe = finde(baueNavigation(daten), gruppeId);
  if (!gruppe) return <EmptyState title="Diese Ordnung gibt es nicht mehr.">Wähle oben eine andere.</EmptyState>;
  const liste = (eintraege: Gruppe["artikel"]) => <ul className="gruppen-artikel">{eintraege.map((artikel, index) =>
    artikel.bekannt
      ? <li key={artikel.id}><button type="button" onClick={() => onEntry(artikel.id)}><BookOpen size={14} /> {artikel.titel}</button></li>
      : <li key={`silhouette-${index}`} className="gruppen-silhouette" aria-label="Ein Artikel, den du noch nicht kennst">···</li>)}
  </ul>;
  return <section className="wiki-gruppenseite page-content" aria-label={gruppe.titel}>
    <div className="page-heading"><div>
      <p className="eyebrow">{gruppe.herkunft === "kategorie" ? "Kategorie" : "Art"}</p>
      <h1>{gruppe.titel}</h1>
      <p className="muted">{gruppe.bekannt === gruppe.gesamt
        ? `${gruppe.gesamt} Artikel.`
        : `${gruppe.bekannt} von ${gruppe.gesamt} Artikeln kennst du. Die übrigen stehen als Platz, nicht als Name.`}</p>
    </div></div>
    {gruppe.artikel.length ? liste(gruppe.artikel) : null}
    {gruppe.kinder.map(kind => <section key={kind.id} className="gruppen-untergruppe">
      <h2><button type="button" onClick={() => onAnsicht({ art: "gruppe", id: kind.id })}>{kind.titel}</button></h2>
      {liste(kind.artikel)}
    </section>)}
    {!gruppe.artikel.length && !gruppe.kinder.length
      ? <EmptyState title="Hier steht noch nichts.">Sobald ein Artikel dieser Ordnung zugeordnet ist, findest du ihn hier.</EmptyState> : null}
  </section>;
}

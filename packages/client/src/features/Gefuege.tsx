import { useMemo, useState } from "react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import "./gefuege.css";

type Art = "elternteil_von" | "verheiratet_mit" | "geschwister_von" | "buendnis_mit" | "feindschaft_mit" | "lehen_von" | "mitglied_von";
type Graph = "stammbaum" | "politogramm";
interface Knoten { entryId: string; titel: string; slug: string; bekannt: boolean }
interface Kante { id: string; passageId: string; vonEntryId: string; nachEntryId: string; art: Art; rolle: string | null; graph: Graph; gerichtet: boolean }
interface Gefuegedaten { knoten: readonly Knoten[]; kanten: readonly Kante[] }

const artLabel: Record<Art, string> = {
  elternteil_von: "Elternteil von", verheiratet_mit: "Verheiratet mit", geschwister_von: "Geschwister von",
  buendnis_mit: "Bündnis mit", feindschaft_mit: "Feindschaft mit", lehen_von: "Lehen von", mitglied_von: "Mitglied von",
};
const arten: { graph: Graph; werte: Art[] }[] = [
  { graph: "stammbaum", werte: ["elternteil_von", "verheiratet_mit", "geschwister_von"] },
  { graph: "politogramm", werte: ["buendnis_mit", "feindschaft_mit", "lehen_von", "mitglied_von"] },
];
const graphLabel: Record<Graph, string> = { stammbaum: "Stammbaum", politogramm: "Politogramm" };

const BREITE = 760, KNOTENBREITE = 158, KNOTENHOEHE = 42, ZEILE = 108;

/**
 * Zwei Anordnungen, beide ohne Fremdbibliothek und beide erklärbar.
 *
 * Der Stammbaum wird nach Generationen geschichtet: wer kein Elternteil im sichtbaren Ausschnitt
 * hat, steht oben. Das Politogramm legt seine Knoten auf einen Kreis — bei politischen Kanten
 * gibt es keine Richtung, die eine Schichtung rechtfertigen würde, und ein Kreis lügt darüber
 * nicht.
 */
function anordnen(knoten: readonly Knoten[], kanten: readonly Kante[], graph: Graph): Map<string, { x: number; y: number }> {
  const platz = new Map<string, { x: number; y: number }>();
  if (!knoten.length) return platz;
  if (graph === "politogramm") {
    const radius = Math.max(96, Math.min(190, knoten.length * 26));
    const mitte = { x: BREITE / 2, y: radius + KNOTENHOEHE };
    knoten.forEach((item, index) => {
      const winkel = (index / knoten.length) * Math.PI * 2 - Math.PI / 2;
      platz.set(item.entryId, { x: mitte.x + Math.cos(winkel) * radius, y: mitte.y + Math.sin(winkel) * radius });
    });
    return platz;
  }
  const eltern = new Map<string, string[]>(knoten.map(item => [item.entryId, []]));
  for (const kante of kanten) if (kante.art === "elternteil_von") eltern.get(kante.nachEntryId)?.push(kante.vonEntryId);
  const ebene = new Map<string, number>();
  const tiefe = (id: string, pfad: Set<string>): number => {
    if (ebene.has(id)) return ebene.get(id)!;
    if (pfad.has(id)) return 0;
    pfad.add(id);
    const werte = (eltern.get(id) ?? []).map(parent => tiefe(parent, pfad) + 1);
    pfad.delete(id);
    const wert = werte.length ? Math.max(...werte) : 0;
    ebene.set(id, wert); return wert;
  };
  for (const item of knoten) tiefe(item.entryId, new Set());
  const proEbene = new Map<number, Knoten[]>();
  for (const item of knoten) {
    const stufe = ebene.get(item.entryId) ?? 0;
    proEbene.set(stufe, [...(proEbene.get(stufe) ?? []), item]);
  }
  for (const [stufe, reihe] of proEbene) reihe.forEach((item, index) =>
    platz.set(item.entryId, { x: (BREITE / (reihe.length + 1)) * (index + 1), y: KNOTENHOEHE + stufe * ZEILE }));
  return platz;
}

/**
 * `Das Gefüge` — Stammbaum und Politogramm, am Artikel verankert.
 *
 * Was hier ankommt, hat der Server bereits durch das Wissen der Leserin gefiltert: eine Kante
 * erscheint genau dann, wenn ihre Passage gehalten wird. Diese Komponente blendet nichts aus
 * und kennt keine zweite Sicht — sie zeichnet, was sie bekommt.
 */
export function Gefuege({ campaignId, entryId, gm, onOpenEntry, onClose }: {
  campaignId: string; entryId: string; gm: boolean; onOpenEntry: (id: string) => void; onClose: () => void;
}) {
  const [graph, setGraph] = useState<Graph>("stammbaum"), [ganz, setGanz] = useState(false), [revision, setRevision] = useState(0);
  const daten = useResource<Gefuegedaten>(apiPath(campaignId, ganz ? "/gefuege" : `/entries/${encodeURIComponent(entryId)}/gefuege`), revision);
  const kanten = useMemo(() => daten.data?.kanten.filter(kante => kante.graph === graph) ?? [], [daten.data, graph]);
  const knoten = useMemo(() => {
    const beteiligt = new Set(kanten.flatMap(kante => [kante.vonEntryId, kante.nachEntryId]));
    return daten.data?.knoten.filter(item => beteiligt.has(item.entryId)) ?? [];
  }, [daten.data, kanten]);
  const platz = useMemo(() => anordnen(knoten, kanten, graph), [knoten, kanten, graph]);
  const hoehe = Math.max(240, ...[...platz.values()].map(punkt => punkt.y + KNOTENHOEHE * 2));
  const titel = (id: string) => daten.data?.knoten.find(item => item.entryId === id)?.titel ?? "";

  return <section className="gefuege panel" aria-label="Das Gefüge">
    <div className="section-heading"><div>
      <p className="eyebrow">Wer mit wem, und woher du das weißt</p><h2>Das Gefüge</h2>
    </div><div className="button-row">
      <Button aria-pressed={ganz} onClick={() => setGanz(value => !value)}>{ganz ? "Nur dieser Eintrag" : "Ganze Kampagne"}</Button>
      <Button onClick={onClose}>Schließen</Button>
    </div></div>
    <div className="view-tabs" role="tablist" aria-label="Graphen">{(["stammbaum", "politogramm"] as const).map(id =>
      <button key={id} role="tab" aria-selected={graph === id} tabIndex={graph === id ? 0 : -1} onClick={() => setGraph(id)}>{graphLabel[id]}</button>)}</div>
    {daten.error ? <Notice error>{daten.error}</Notice> : null}
    {daten.loading ? <Loading text="Das Gefüge wird hergeleitet …" />
      : !kanten.length ? <EmptyState title={`Hier ist noch kein ${graphLabel[graph]}.`}>{gm
        ? "Trag unten eine Beziehung ein. Sie hängt an einer Passage — wer die Passage nicht hält, für den gibt es die Beziehung nicht."
        : "Sobald du erfährst, wie diese Namen zusammenhängen, erscheinen ihre Verbindungen hier."}</EmptyState>
      : <>
        <svg className="gefuege-leinwand" viewBox={`0 0 ${BREITE} ${hoehe}`} role="img"
          aria-label={`${graphLabel[graph]} mit ${knoten.length} Namen und ${kanten.length} Verbindungen`}>
          <defs><marker id="gefuege-pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
          {kanten.map(kante => {
            const von = platz.get(kante.vonEntryId), nach = platz.get(kante.nachEntryId);
            if (!von || !nach) return null;
            return <g key={kante.id} className={`gefuege-kante ${kante.art}`} data-art={kante.art}>
              <line x1={von.x} y1={von.y} x2={nach.x} y2={nach.y} markerEnd={kante.gerichtet ? "url(#gefuege-pfeil)" : undefined} />
              <title>{`${titel(kante.vonEntryId)} — ${kante.rolle || artLabel[kante.art]} — ${titel(kante.nachEntryId)}`}</title>
            </g>;
          })}
          {knoten.map(item => {
            const punkt = platz.get(item.entryId)!;
            return <g key={item.entryId} className={item.bekannt ? "gefuege-knoten bekannt" : "gefuege-knoten fremd"}>
              <rect x={punkt.x - KNOTENBREITE / 2} y={punkt.y - KNOTENHOEHE / 2} width={KNOTENBREITE} height={KNOTENHOEHE} rx={8} />
              <text x={punkt.x} y={punkt.y + 4} textAnchor="middle">{item.titel}</text>
              <title>{item.bekannt ? item.titel : `${item.titel} — diesen Eintrag kennst du noch nicht`}</title>
            </g>;
          })}
        </svg>
        <ul className="gefuege-liste">{kanten.map(kante => <li key={kante.id} data-art={kante.art}>
          <strong>{titel(kante.vonEntryId)}</strong> <span className="kanten-art">{kante.rolle || artLabel[kante.art]}</span> <strong>{titel(kante.nachEntryId)}</strong>
          {daten.data?.knoten.filter(item => [kante.vonEntryId, kante.nachEntryId].includes(item.entryId) && item.bekannt)
            .map(item => <Button key={item.entryId} variant="quiet" onClick={() => onOpenEntry(item.entryId)}>{item.titel} öffnen</Button>)}
        </li>)}</ul>
      </>}
    {gm ? <Eintragen campaignId={campaignId} entryId={entryId} graph={graph} onGespeichert={() => setRevision(value => value + 1)} /> : null}
  </section>;
}

/** Die Autorenfläche der Spielleitung: erst die Passage, die es sagt, dann die Beziehung. */
function Eintragen({ campaignId, entryId, graph, onGespeichert }: { campaignId: string; entryId: string; graph: Graph; onGespeichert: () => void }) {
  const [passageId, setPassageId] = useState(""), [nachEntryId, setNachEntryId] = useState(""), [rolle, setRolle] = useState("");
  const werte = arten.find(eintrag => eintrag.graph === graph)!.werte;
  const [art, setArt] = useState<Art>(werte[0]!);
  const task = useTask();
  const artikel = useResource<{ passagen: { pid: string; inhalt: { kind: string } }[] }>(apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}`));
  const eintraege = useResource<{ id: string; title: string }[]>(apiPath(campaignId, "/entries"));
  // Beim Wechsel des Graphen gilt wieder dessen erste Art; kein Zustand, der die Tabs ueberdauert.
  const aktuelleArt = werte.includes(art) ? art : werte[0]!;
  return <form className="panel gefuege-eintragen" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    await api(apiPath(campaignId, "/beziehungen"), { method: "POST", body: { passageId, vonEntryId: entryId, nachEntryId, art: aktuelleArt, ...(rolle.trim() ? { rolle: rolle.trim() } : {}) } });
    setRolle(""); setNachEntryId(""); onGespeichert();
  }); }}>
    <h3>Beziehung eintragen</h3>
    <p className="field-help">Jede Beziehung hängt an der Passage, die sie behauptet. Wer diese Passage nicht hält, sieht die Beziehung nicht — auch nicht als Lücke.</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <div className="rule-fields">
      <label>Passage, die es sagt<select required value={passageId} onChange={event => setPassageId(event.target.value)}>
        <option value="">Passage wählen</option>
        {artikel.data?.passagen.map((passage, index) => <option key={passage.pid} value={passage.pid}>Passage {index + 1}</option>)}
      </select></label>
      <label>Art<select value={aktuelleArt} onChange={event => setArt(event.target.value as Art)}>
        {werte.map(wert => <option key={wert} value={wert}>{artLabel[wert]}</option>)}
      </select></label>
      <label>Verbunden mit<select required value={nachEntryId} onChange={event => setNachEntryId(event.target.value)}>
        <option value="">Eintrag wählen</option>
        {eintraege.data?.filter(eintrag => eintrag.id !== entryId).map(eintrag => <option key={eintrag.id} value={eintrag.id}>{eintrag.title}</option>)}
      </select></label>
      <label>Beschriftung <small>(freiwillig)</small><input value={rolle} maxLength={160} onChange={event => setRolle(event.target.value)} placeholder="Mutter, Vasall seit dem Frostjahr …" /></label>
    </div>
    <Button type="submit" variant="primary" disabled={task.busy || !passageId || !nachEntryId}>Beziehung eintragen</Button>
  </form>;
}

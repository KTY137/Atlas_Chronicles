// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ChevronRight, Flag, Plus, Swords, Trash2 } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import type { ActorCard } from "@chronicle/protocol";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import type { ActionCard } from "./game-api";
import "./kampfbuehne.css";

/**
 * Die Kampfbühne — zwei gegenüberliegende Reihen, jeder Kämpfende eine Karte.
 *
 * Sie ist die abstrakte Schwester der Szenenkarte nebenan: kein Gelände, keine Koordinaten,
 * nur die Frage, wer wann dran ist. Deshalb steht sie als eigener Reiter am Tisch und nicht in
 * der Karte — wer Gelände braucht, nimmt die Karte.
 *
 * Die Reihenfolge kommt vollständig vom Server. Diese Fläche sortiert nichts nach und zählt
 * keine Runde mit: gäbe es hier eine zweite Rechnung, wäre sie die unzuverlässige.
 */

type Seite = "gefaehrten" | "gegner" | "neutral";
interface Teilnehmer { id: string; name: string; seite: Seite; actorId: string | null; initiative: number; ordnung: number; initiativeRollId: string | null; amZug: boolean }
interface Kampf { id: string; name: string; zustand: "vorbereitet" | "laufend" | "beendet"; runde: number; erstelltAm: number; beendetAm: number | null; teilnehmer: Teilnehmer[] }

const SEITENTITEL: Record<Seite, string> = { gegner: "Gegner", neutral: "Dazwischen", gefaehrten: "Gefährten" };
const ZUSTANDSTEXT: Record<Kampf["zustand"], string> = { vorbereitet: "Vorbereitet", laufend: "Läuft", beendet: "Beendet" };

export function Kampfbuehne({ campaignId, gm, actors, revision, onChanged }: {
  campaignId: string; gm: boolean; actors: ActorCard[]; revision: number; onChanged: () => void;
}) {
  const kaempfe = useResource<Kampf[]>(apiPath(campaignId, "/kaempfe"), revision, 4000);
  // Dieselbe Wurfliste, die der Reiter „Aktionen" zeigt — kein zweiter Kanal für dieselbe Sache.
  const wuerfe = useResource<ActionCard[]>(apiPath(campaignId, "/rolls"), revision, 6000);
  const [offen, setOffen] = useState<string>("");
  const task = useTask();
  const liste = kaempfe.data ?? [];
  // Ohne eigene Wahl steht der jüngste nicht beendete Kampf vorn — der, um den es gerade geht.
  const gewaehlt = liste.find(k => k.id === offen) ?? liste.find(k => k.zustand === "laufend") ?? liste.find(k => k.zustand !== "beendet") ?? liste[0];

  const fuehren = (pfad: string, body?: unknown, method: "POST" | "DELETE" = "POST") => void task.run(async () => {
    await api(apiPath(campaignId, pfad), method === "DELETE" ? { method } : { method, body: body ?? {} });
    onChanged();
  });

  return <div className="kampf-buehne">
    <div className="page-heading kampf-kopf">
      <div><p className="eyebrow">Wer ist dran</p><h2>Die Kampfbühne</h2>
        <p className="muted">Zwei Reihen, eine Reihenfolge. Für Gelände und Marken ist die Szenenkarte nebenan zuständig.</p></div>
      {gm ? <NeuerKampf campaignId={campaignId} onAngelegt={id => { setOffen(id); onChanged(); }} /> : null}
    </div>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {kaempfe.error ? <Notice error>{kaempfe.error}</Notice> : null}

    {liste.length > 1 ? <div className="kampf-wahl" role="tablist" aria-label="Kämpfe dieser Runde">
      {liste.map(k => <button key={k.id} role="tab" aria-selected={k.id === gewaehlt?.id}
        className={k.id === gewaehlt?.id ? "kampf-reiter aktiv" : "kampf-reiter"} onClick={() => setOffen(k.id)}>
        {k.name}<small>{ZUSTANDSTEXT[k.zustand]}</small></button>)}
    </div> : null}

    {kaempfe.loading && !kaempfe.data ? <Loading /> : !gewaehlt
      ? <EmptyState title="Noch ist es ruhig.">{gm
        ? "Stell eine Bühne auf, setz die Kämpfenden darauf und eröffne — die Reihenfolge führt danach der Server."
        : "Sobald deine Spielleitung einen Kampf eröffnet, siehst du hier, wer wann dran ist."}</EmptyState>
      : <Buehne kampf={gewaehlt} campaignId={campaignId} gm={gm} actors={actors} wuerfe={wuerfe.data ?? []} busy={task.busy} fuehren={fuehren} onChanged={onChanged} />}
  </div>;
}

function Buehne({ kampf, campaignId, gm, actors, wuerfe, busy, fuehren, onChanged }: {
  kampf: Kampf; campaignId: string; gm: boolean; actors: ActorCard[]; wuerfe: ActionCard[]; busy: boolean;
  fuehren: (pfad: string, body?: unknown, method?: "POST" | "DELETE") => void; onChanged: () => void;
}) {
  const dran = kampf.teilnehmer.find(t => t.amZug) ?? null;
  const reihe = (seite: Seite) => kampf.teilnehmer.filter(t => t.seite === seite);
  const pfad = `/kaempfe/${encodeURIComponent(kampf.id)}`;

  return <section className="panel buehne-tafel">
    <header className="buehne-leiste">
      <div><h3>{kampf.name}</h3>
        <p className="muted">{ZUSTANDSTEXT[kampf.zustand]}{kampf.runde > 0 ? ` · Runde ${kampf.runde}` : ""}</p></div>
      {/* Die eine Aussage, für die diese Fläche existiert — deshalb steht sie groß und allein. */}
      <p className="buehne-dran" aria-live="polite">{dran ? <><span className="muted">Am Zug</span><strong>{dran.name}</strong></>
        : kampf.zustand === "beendet" ? <span className="muted">Der Kampf ist vorbei.</span>
        : <span className="muted">Noch nicht eröffnet.</span>}</p>
      {gm ? <div className="button-row">
        {kampf.zustand === "vorbereitet"
          ? <Button variant="primary" disabled={busy || !kampf.teilnehmer.length} onClick={() => fuehren(`${pfad}/eroeffnen`)}><Swords size={16} /> Eröffnen</Button>
          : null}
        {kampf.zustand === "laufend" && dran
          ? <Button variant="primary" disabled={busy} onClick={() => fuehren(`${pfad}/zug`, { von: dran.id })}><ChevronRight size={16} /> Nächster Zug</Button>
          : null}
        {kampf.zustand !== "beendet"
          ? <Button disabled={busy} onClick={() => fuehren(`${pfad}/beenden`)}><Flag size={16} /> Beenden</Button>
          : null}
      </div> : null}
    </header>

    {kampf.zustand === "vorbereitet" && !kampf.teilnehmer.length
      ? <EmptyState title="Die Bühne ist leer.">{gm ? "Setz die erste Kämpfende darauf. Eröffnen lässt sich erst, wenn jemand darauf steht." : "Die Spielleitung stellt gerade auf."}</EmptyState>
      : <div className="buehne-reihen">
        {(["gegner", "neutral", "gefaehrten"] as const).filter(seite => reihe(seite).length).map(seite =>
          <div key={seite} className={`buehne-reihe seite-${seite}`}>
            <h4>{SEITENTITEL[seite]}</h4>
            <ul>{reihe(seite).map(t => <li key={t.id}>
              <article className={t.amZug ? "kampfkarte amzug" : "kampfkarte"} aria-current={t.amZug ? "step" : undefined}>
                <span className="kampfkarte-initiative" title="Initiative">{t.initiative}</span>
                <strong className="kampfkarte-name">{t.name}</strong>
                <span className="kampfkarte-fuss">
                  {t.actorId ? <span className="kampfkarte-figur">Figur am Tisch</span> : <span className="muted">Ohne Bogen</span>}
                  {/* Ein Wert ohne Beleg sagt das, statt es zu verschweigen. */}
                  {t.initiativeRollId ? <span className="kampfkarte-beleg" title="Aus einem Wurf">gewürfelt</span> : <span className="kampfkarte-beleg gesetzt" title="Von der Spielleitung gesetzt">gesetzt</span>}
                </span>
                {t.amZug ? <span className="kampfkarte-marke">am Zug</span> : null}
                {gm && kampf.zustand !== "beendet" ? <button className="kampfkarte-weg" aria-label={`${t.name} von der Bühne nehmen`} disabled={busy}
                  onClick={() => fuehren(`${pfad}/teilnehmer/${encodeURIComponent(t.id)}`, undefined, "DELETE")}><Trash2 size={14} /></button> : null}
              </article></li>)}</ul>
          </div>)}
      </div>}

    {gm && kampf.zustand !== "beendet"
      ? <NeuerTeilnehmer campaignId={campaignId} kampfId={kampf.id} actors={actors} wuerfe={wuerfe} onChanged={onChanged} /> : null}
  </section>;
}

function NeuerKampf({ campaignId, onAngelegt }: { campaignId: string; onAngelegt: (id: string) => void }) {
  const [name, setName] = useState(""), task = useTask();
  return <form className="kampf-neu" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    const kampf = await api<Kampf>(apiPath(campaignId, "/kaempfe"), { method: "POST", body: { name } });
    setName(""); onAngelegt(kampf.id);
  }); }}>
    <label className="sr-only" htmlFor="kampf-name">Name des Kampfes</label>
    <input id="kampf-name" value={name} onChange={e => setName(e.target.value)} required maxLength={160} placeholder="z. B. Der Hinterhalt am Pass" />
    <Button type="submit" variant="primary" disabled={task.busy || !name.trim()}><Plus size={16} /> Bühne aufstellen</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}

/**
 * Eine Karte auf die Bühne stellen. Wer eine Figur wählt, übernimmt deren Namen — zwei Namen
 * für dieselbe Person wären genau die Doppelung, die am Tisch niemand auflösen kann.
 */
function NeuerTeilnehmer({ campaignId, kampfId, actors, wuerfe, onChanged }: { campaignId: string; kampfId: string; actors: ActorCard[]; wuerfe: ActionCard[]; onChanged: () => void }) {
  const [name, setName] = useState(""), [seite, setSeite] = useState<Seite>("gegner");
  const [initiative, setInitiative] = useState(10), [actorId, setActorId] = useState("");
  // Der Beleg gehoert zur Zahl. Wer die Zahl von Hand aendert, verliert ihn — eine Karte, die
  // einen Wurf behauptet, den sie nicht zeigt, waere schlimmer als eine ohne Beleg.
  const [beleg, setBeleg] = useState<string | null>(null);
  const task = useTask();
  // Ausdruecklich der juengste: sich auf die Reihenfolge der Liste zu verlassen hiesse, eine
  // Zusicherung anzunehmen, die niemand gegeben hat.
  const wurf = actorId ? [...wuerfe].filter(karte => karte.actorId === actorId && karte.receipt.action?.id === "initiative")
    .sort((a, b) => b.preparedAt - a.preparedAt)[0] ?? null : null;
  const waehleFigur = (id: string) => {
    setActorId(id); setBeleg(null);
    const figur = actors.find(a => a.id === id);
    if (figur) { setName(figur.name); setSeite("gefaehrten"); }
  };
  const setzeVonHand = (wert: number) => { setInitiative(wert); setBeleg(null); };
  const uebernimm = () => { if (wurf) { setInitiative(Math.trunc(wurf.receipt.total)); setBeleg(wurf.id); } };
  return <form className="panel kampf-aufnahme" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    await api(apiPath(campaignId, `/kaempfe/${encodeURIComponent(kampfId)}/teilnehmer`), { method: "POST",
      body: { name, seite, initiative, actorId: actorId || null, initiativeRollId: beleg } });
    setName(""); setActorId(""); setInitiative(10); setBeleg(null); onChanged();
  }); }}>
    <h4><Plus size={17} /> Wer kämpft mit?</h4>
    <div className="kampf-felder">
      <label>Figur am Tisch<select value={actorId} onChange={e => waehleFigur(e.target.value)}>
        <option value="">Ohne Bogen (Gegner, Tier, Ding)</option>
        {actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label>Name auf der Karte<input value={name} onChange={e => setName(e.target.value)} required maxLength={160} placeholder="z. B. Wolf im Unterholz" /></label>
      <label>Seite<select value={seite} onChange={e => setSeite(e.target.value as Seite)}>
        {(["gefaehrten", "gegner", "neutral"] as const).map(s => <option key={s} value={s}>{SEITENTITEL[s]}</option>)}
      </select></label>
      <label>Initiative<input type="number" value={initiative} onChange={e => setzeVonHand(e.target.valueAsNumber)} required /></label>
    </div>
    {wurf ? <p className="kampf-wurf">Diese Figur hat Initiative gewürfelt: <strong>{Math.trunc(wurf.receipt.total)}</strong>.{" "}
      {beleg === wurf.id ? <span className="kampfkarte-beleg">übernommen</span>
        : <Button onClick={uebernimm}>Wert übernehmen</Button>}</p> : null}
    <p className="field-help">Höhere Initiative handelt zuerst. Bei Gleichstand entscheidet, wer zuerst aufgestellt wurde — und das bleibt so.{actorId && !wurf ? " Für diese Figur liegt noch kein Initiativwurf vor; der Wert gilt dann als gesetzt." : ""}</p>
    <Button type="submit" variant="primary" disabled={task.busy || !name.trim() || Number.isNaN(initiative)}>Auf die Bühne stellen</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}

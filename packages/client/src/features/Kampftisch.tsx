// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ChevronRight, Eye, Flag, Plus, Swords } from "lucide-react";
import type { ActorCard, ActorTemplateData, KampfFuerRunde, TemplateCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { KampfAufnahme } from "./KampfAufnahme";
import { BeendenRueckfrage } from "./KampfFenster";
import { Kampfkarte } from "./Kampfkarte";
import { SEITE_LABEL, istLeitungssicht, juengsterInitiativwurf, reihen, tischAnsicht,
  type Kampf, type KartenAktionen, type KartenAnsicht } from "./kampftisch-model";
import "./tabletop.css";
import "./kampftisch.css";

/**
 * Der Kampftisch — Gegner oben, Gefährten unten, jede Figur eine Karte mit allen Balken.
 *
 * Die abstrakte Schwester der Szenenkarte: kein Gelände, keine Koordinaten, nur wer liegt wo und
 * wer ist dran. Die Reihenfolge und alles, was die Runde sieht, kommt vom Server; diese Fläche
 * sortiert nichts nach und rechnet keine Wortstufe aus. Gäbe es hier eine zweite Rechnung, wäre
 * sie die unzuverlässige — und die, die etwas verrät.
 */
const zustandstext = (zustand: Kampf["zustand"]): string =>
  zustand === "vorbereitet" ? t("Vorbereitet") : zustand === "laufend" ? t("Läuft") : t("Beendet");

export function Kampftisch({ campaignId, gm, actors, revision, onChanged, onOpenInventory }: {
  campaignId: string; gm: boolean; actors: ActorCard[]; revision: number; onChanged: () => void; onOpenInventory?: (actorId: string) => void;
}) {
  const kaempfe = useResource<Kampf[]>(apiPath(campaignId, "/kaempfe"), revision, 4000);
  // Dieselbe Wurfliste wie im Reiter „Aktionen“ — kein zweiter Kanal für dieselbe Sache.
  const wuerfe = useResource<ActionCard[]>(gm ? apiPath(campaignId, "/rolls") : null, revision, 6000);
  const vorlagen = useResource<TemplateCard<ActorTemplateData>[]>(gm ? apiPath(campaignId, "/actor-templates") : null, revision);
  const [offen, setOffen] = useState(""), [vorschau, setVorschau] = useState(false);
  const task = useTask();
  const liste = kaempfe.data ?? [];
  // Ohne eigene Wahl steht der jüngste nicht beendete Kampf vorn — der, um den es gerade geht.
  const gewaehlt = liste.find(k => k.id === offen) ?? liste.find(k => k.zustand === "laufend") ?? liste.find(k => k.zustand !== "beendet") ?? liste[0];
  const alsRunde = useResource<KampfFuerRunde>(gm && vorschau && gewaehlt ? apiPath(campaignId, `/kaempfe/${encodeURIComponent(gewaehlt.id)}/als-runde`) : null, revision);

  const fuehren = (pfad: string, body?: unknown, method: "POST" | "PUT" | "DELETE" = "POST") => void task.run(async () => {
    // Auch ein abgewiesener Befehl lädt neu: wer einen alten Stand hatte, sieht danach den neuen.
    try { await api(apiPath(campaignId, pfad), method === "DELETE" ? { method } : { method, body: body ?? {} }); }
    finally { onChanged(); }
  });

  return <div className="kampftisch">
    <div className="page-heading kampftisch-seitenkopf">
      <div><p className="eyebrow">{t("Wer ist dran")}</p><h2>{t("Der Kampftisch")}</h2>
        <p className="muted">{t("Gegner oben, Gefährten unten, jede Figur eine Karte. Für Gelände und Marken ist die Szenenkarte nebenan zuständig.")}</p></div>
      {gm ? <NeuerKampf campaignId={campaignId} onAngelegt={id => { setOffen(id); onChanged(); }} /> : null}
    </div>
    {task.error ? <Notice error>{task.status === 409 ? t("Das hat sich inzwischen geändert — hier ist der neue Stand.") : task.error}</Notice> : null}
    {kaempfe.error ? <Notice error>{kaempfe.error}</Notice> : null}

    {liste.length > 1 ? <div className="kampf-wahl" role="tablist" aria-label={t("Kämpfe dieser Runde")}>
      {liste.map(k => <button key={k.id} type="button" role="tab" aria-selected={k.id === gewaehlt?.id}
        className={k.id === gewaehlt?.id ? "kampf-reiter aktiv" : "kampf-reiter"} onClick={() => setOffen(k.id)}>
        {k.name}<small>{zustandstext(k.zustand)}</small></button>)}
    </div> : null}

    {kaempfe.loading && !kaempfe.data ? <Loading /> : !gewaehlt
      ? <EmptyState title={t("Noch ist es ruhig.")}>{gm
        ? t("Leg einen Kampf an, leg die Kämpfenden auf den Tisch und eröffne. Wer dran ist, führt das Programm danach für dich.")
        : t("Sobald deine Spielleitung einen Kampf eröffnet, siehst du hier, wer wann dran ist.")}</EmptyState>
      : <Tisch kampf={gewaehlt} vorschau={vorschau ? alsRunde.data : null} vorschauAn={vorschau}
          vorschauLaedt={vorschau && alsRunde.loading} vorschauFehler={vorschau ? alsRunde.error : ""} gm={gm} busy={task.busy}
          campaignId={campaignId} actors={actors} vorlagen={vorlagen.data ?? []} wuerfe={wuerfe.data ?? []} fuehren={fuehren}
          onVorschau={gm ? () => setVorschau(an => !an) : null} onChanged={onChanged} onOpenInventory={onOpenInventory} />}
  </div>;
}

function Tisch({ kampf, vorschau, vorschauAn, vorschauLaedt, vorschauFehler, gm, busy, campaignId, actors, vorlagen, wuerfe, fuehren, onVorschau, onChanged, onOpenInventory }: {
  kampf: Kampf; vorschau: KampfFuerRunde | null; vorschauAn: boolean; vorschauLaedt: boolean; vorschauFehler: string; gm: boolean; busy: boolean; campaignId: string;
  actors: readonly ActorCard[]; vorlagen: readonly TemplateCard<ActorTemplateData>[]; wuerfe: readonly ActionCard[];
  fuehren: (pfad: string, body?: unknown, method?: "POST" | "PUT" | "DELETE") => void; onVorschau: (() => void) | null;
  onChanged: () => void; onOpenInventory?: ((actorId: string) => void) | undefined;
}) {
  const [beenden, setBeenden] = useState(false);
  // Waehrend die Vorschau an ist, zaehlt NUR ihre eigene Nutzlast als Sicht der Runde: ein
  // Ladezustand oder ein Fehler der Vorschau darf nie auf die Karten der Spielleitung
  // zurueckfallen, sonst zeigt das Banner „So sieht die Runde…“ kurzzeitig echte Namen,
  // Hand und genaue Werte.
  const { leitung, karten } = tischAnsicht(kampf, vorschauAn, vorschau);
  const dran = karten.find(k => k.amZug) ?? null;
  const pfad = `/kaempfe/${encodeURIComponent(kampf.id)}`, teil = (id: string) => `${pfad}/teilnehmer/${encodeURIComponent(id)}`;
  const bildUrl = (karteId: string, version: number) => apiPath(campaignId, `${teil(karteId)}/bild?v=${version}`);
  const angelegt = istLeitungssicht(kampf) ? kampf.teilnehmer.filter(k => k.vomKampfAngelegt && k.actorId !== null).length : 0;
  const aktionen: KartenAktionen = {
    lage: (karte, lage) => fuehren(`${teil(karte.id)}/lage`, { lage, expectedVersion: karte.version }),
    sicht: (karte, sicht, nameFuerRunde) => fuehren(`${teil(karte.id)}/sicht`, { sicht, nameFuerRunde, expectedVersion: karte.version }),
    // Nur die Balken der Karte, wie sie JETZT im Bogen stehen, tragen eine eigene Einstellung
    // weiter — eine stehengebliebene Kennung aus einem älteren Regelpaket würde sonst mit jeder
    // Änderung mitgeschleppt, bis der Datensatz die Grenze von acht Einträgen reißt und jede
    // weitere Änderung der Maske mit 400 abgewiesen wird.
    maske: (karte, vital, maske) => {
      const bekannt = new Set(karte.balken.map(b => b.id));
      const bestehend = Object.fromEntries(Object.entries(karte.sicht.balken).filter(([id]) => bekannt.has(id)));
      return fuehren(`${teil(karte.id)}/sicht`, {
        sicht: { ...karte.sicht, balken: { ...bestehend, [vital]: maske } }, nameFuerRunde: karte.nameFuerRunde, expectedVersion: karte.version });
    },
    initiative: (karte, initiative, initiativeRollId) => fuehren(`${teil(karte.id)}/initiative`, { initiative, initiativeRollId }),
    loeschen: karte => fuehren(teil(karte.id), undefined, "DELETE"),
    wert: (actorId, vital, wert, expectedVersion) =>
      fuehren(`/actors/${encodeURIComponent(actorId)}/sheet/vitals/${encodeURIComponent(vital)}`, { wert, expectedVersion }, "PUT"),
    ...(onOpenInventory ? { inventar: onOpenInventory } : {}),
  };
  const zeige = (karte: KartenAnsicht, klein = false) => <li key={karte.id}><Kampfkarte karte={karte} leitung={leitung} klein={klein} busy={busy}
    aktionen={aktionen} bildUrl={bildUrl} wurf={leitung ? juengsterInitiativwurf(wuerfe, karte.roh?.actorId ?? null) : null} /></li>;
  const alleReihen = reihen(karten), oben = alleReihen.filter(r => r.seite !== "gefaehrten"), unten = alleReihen.filter(r => r.seite === "gefaehrten");
  const reihe = (r: (typeof alleReihen)[number]) => <div key={r.seite} className={`kampftisch-reihe seite-${r.seite}`}>
    <h4 className="kampftisch-reihe-kopf">{t(SEITE_LABEL[r.seite])}</h4><ul className="kampftisch-karten">{r.karten.map(k => zeige(k))}</ul></div>;
  const hand = karten.filter(k => k.lage === "hand"), ablage = karten.filter(k => k.lage === "ablage");

  return <section className="kampftisch-tafel">
    <header className="panel kampftisch-kopf">
      <div><h3>{kampf.name}</h3><p className="muted">{zustandstext(kampf.zustand)}{kampf.runde > 0 ? ` · ${t("Runde {n}", { n: kampf.runde })}` : ""}</p></div>
      <p className="kampftisch-dran" aria-live="polite">{dran ? <><span className="muted">{t("Am Zug")}</span><strong>{dran.name}</strong></>
        : kampf.zustand === "beendet" ? <span className="muted">{t("Der Kampf ist vorbei.")}</span>
        : kampf.zustand === "laufend" ? <span className="muted">{t("Niemand ist am Zug. Die nächste Karte, die aufs Feld kommt, beginnt.")}</span>
        : <span className="muted">{t("Noch nicht eröffnet.")}</span>}</p>
      {gm ? <div className="button-row">
        {leitung && kampf.zustand === "vorbereitet" ? <Button variant="primary" disabled={busy || !karten.some(k => k.lage === "feld")}
          onClick={() => fuehren(`${pfad}/eroeffnen`)}><Swords size={16} /> {t("Eröffnen")}</Button> : null}
        {leitung && kampf.zustand === "laufend" && dran ? <Button variant="primary" disabled={busy}
          onClick={() => fuehren(`${pfad}/zug`, { von: dran.id, runde: kampf.runde })}><ChevronRight size={16} /> {t("Nächster Zug")}</Button> : null}
        {onVorschau ? <Button aria-pressed={vorschauAn} onClick={onVorschau}><Eye size={16} /> {t("Mit den Augen der Runde")}</Button> : null}
        {leitung && kampf.zustand !== "beendet" ? <span className="kampf-anker">
          <Button disabled={busy} onClick={() => setBeenden(true)}><Flag size={16} /> {t("Beenden")}</Button>
          {beenden ? <BeendenRueckfrage angelegt={angelegt} onClose={() => setBeenden(false)}
            onBeenden={archivieren => { setBeenden(false); fuehren(`${pfad}/beenden`, { archivieren }); }} /> : null}</span> : null}
      </div> : null}
    </header>
    {vorschauAn ? <p className="kampftisch-vorschau" role="status">{t("So sieht die Runde den Tisch gerade. Deine Hand, die Ablage und verborgene Werte fehlen dort ganz, und nichts verrät, dass etwas fehlt.")}</p> : null}
    <div className={leitung ? "kampftisch-flaeche mit-leiste" : "kampftisch-flaeche"}>
      <div className="tabletop-furniture kampftisch-holz"><section className="tabletop-felt kampftisch-filz" aria-label={t("Spieltisch")}>
        {vorschauAn && vorschauLaedt ? <Loading />
          : vorschauAn && vorschauFehler ? <Notice error>{vorschauFehler}</Notice>
          : !oben.length && !unten.length
          ? <p className="kampftisch-leer">{leitung ? t("Noch liegt keine Karte auf dem Feld. Stell Kämpfende auf oder spiel eine aus deiner Hand aus.") : t("Die Spielleitung stellt gerade auf.")}</p>
          : <>{oben.map(reihe)}
            <div className="kampftisch-mitte">{kampf.runde > 0 ? t("Runde {n}", { n: kampf.runde }) : t("Noch nicht eröffnet.")}</div>
            {unten.map(reihe)}</>}
      </section></div>
      {leitung ? <aside className="kampftisch-leiste" aria-label={t("Nur für dich sichtbar")}>
        <section className="kampftisch-fach"><h4>{t("Deine Hand")} <small>{t("nur du siehst sie")}</small></h4>
          <p className="field-help">{t("Verdeckte Karten sind noch nicht im Spiel und kommen nicht an die Reihe. Spiel sie aus, wenn es so weit ist.")}</p>
          {hand.length ? <ul className="kampftisch-hand">{hand.map(k => zeige(k, true))}</ul> : <p className="muted">{t("Keine verdeckten Karten.")}</p>}
        </section>
        <section className="kampftisch-fach"><h4>{t("Ablage")} <small>{t("vom Feld genommen")}</small></h4>
          {ablage.length ? <ul className="kampftisch-ablage">{ablage.map(k => <li key={k.id}><span>{k.name}</span><span className="button-row">
            <Button variant="quiet" disabled={busy} onClick={() => aktionen.lage(k.roh!, "hand")}>{t("In die Hand")}</Button>
            <Button variant="quiet" disabled={busy} onClick={() => aktionen.lage(k.roh!, "feld")}>{t("Aufs Feld")}</Button></span></li>)}</ul>
            : <p className="muted">{t("Leer.")}</p>}
        </section>
        {kampf.zustand !== "beendet" ? <KampfAufnahme campaignId={campaignId} kampfId={kampf.id} actors={actors} vorlagen={vorlagen} wuerfe={wuerfe} onChanged={onChanged} /> : null}
      </aside> : null}
    </div>
  </section>;
}

function NeuerKampf({ campaignId, onAngelegt }: { campaignId: string; onAngelegt: (id: string) => void }) {
  const [name, setName] = useState(""), task = useTask();
  return <form className="kampf-neu" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    const kampf = await api<{ id: string }>(apiPath(campaignId, "/kaempfe"), { method: "POST", body: { name } });
    setName(""); onAngelegt(kampf.id);
  }); }}>
    <label className="sr-only" htmlFor="kampf-name">{t("Name des Kampfes")}</label>
    <input id="kampf-name" value={name} onChange={event => setName(event.target.value)} required maxLength={160} placeholder={t("z. B. Der Hinterhalt am Pass")} />
    <Button type="submit" variant="primary" disabled={task.busy || !name.trim()}><Plus size={16} /> {t("Kampf anlegen")}</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}

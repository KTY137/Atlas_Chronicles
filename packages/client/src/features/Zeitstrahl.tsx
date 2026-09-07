// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";
import "./zeitstrahl.css";

type Art = "geburt" | "tod" | "gruendung" | "datum" | "praegung";
interface Ereignis {
  id: string; art: Art; jahr: number | null; genau: boolean; roh: string;
  entryId: string; titel: string; passageId: string; spieltag?: string; siegel?: string;
}
interface Zeitleistendaten { ereignisse: readonly Ereignis[]; ohneJahr: readonly Ereignis[] }
/** Ein Vorschlag des Chronisten: was gefunden wurde, und die Passagen, die es belegen. */
interface Befund { art: "tod_vor_geburt" | "widerspruechliche_jahre" | "unlesbares_datum"; entryId: string; titel: string; text: string; passagen: readonly string[] }
const befundLabel: Record<Befund["art"], string> = {
  tod_vor_geburt: "Widerspruch", widerspruechliche_jahre: "Widerspruch", unlesbares_datum: "Lücke",
};

const artLabel: Record<Art, string> = {
  geburt: "Geboren", tod: "Gestorben", gruendung: "Gegründet", datum: "Datiert", praegung: "Am Tisch geprägt",
};

/** „819 n. K." bleibt „819 n. K." — die gelesene Zahl steht daneben, nicht an ihrer Stelle. */
function Jahr({ ereignis }: { ereignis: Ereignis }) {
  if (ereignis.jahr === null) return <span className="zeit-jahr zeit-jahr-offen">ohne Jahr</span>;
  const zeichen = ereignis.jahr < 0 ? `${Math.abs(ereignis.jahr)} v. K.` : `${ereignis.jahr}`;
  return <span className={ereignis.genau ? "zeit-jahr" : "zeit-jahr zeit-jahr-ungefaehr"}
    title={ereignis.genau ? undefined : `Die Quelle sagt „${ereignis.roh}“ — daraus gelesen: ${zeichen}`}>
    {ereignis.genau ? zeichen : `~ ${zeichen}`}
  </span>;
}

/**
 * `Berechnete Zeitleiste aus Prägedaten` — kein von Hand gepflegter Strang.
 *
 * Was hier steht, hat der Server aus zwei vorhandenen Beständen errechnet und bereits durch
 * das Wissen der Leserin gefiltert: Datumsfelder der Artikel und bestätigte Prägungen vom
 * Tisch. Diese Fläche rechnet nichts nach und blendet nichts aus.
 *
 * **Der Rohtext der Quelle steht immer dabei.** Ein erfundener Kalender ist nicht parsbar; wo
 * neben der Jahreszahl noch etwas stand („Winter 866"), sagt die Tilde, dass wir gelesen und
 * nicht verstanden haben.
 */
export function Zeitstrahl({ campaignId, onOpenEntry, onClose }: {
  campaignId: string; onOpenEntry: (id: string) => void; onClose: () => void;
}) {
  const daten = useResource<Zeitleistendaten>(apiPath(campaignId, "/zeitleiste"));
  const ereignisse = daten.data?.ereignisse ?? [], ohneJahr = daten.data?.ohneJahr ?? [];
  const zeile = (ereignis: Ereignis) => <li key={ereignis.id} className="zeit-ereignis" data-art={ereignis.art}>
    <Jahr ereignis={ereignis} />
    <span className="zeit-marke" aria-hidden="true" />
    <div className="zeit-inhalt">
      <button type="button" className="zeit-titel" onClick={() => onOpenEntry(ereignis.entryId)}>{ereignis.titel}</button>
      <span className="zeit-art">{artLabel[ereignis.art]}</span>
      <span className="zeit-roh">„{ereignis.roh || "ohne Angabe"}“</span>
      {ereignis.spieltag ? <span className="zeit-spieltag">Spieltag {ereignis.spieltag}</span> : null}
    </div>
  </li>;
  return <section className="zeitstrahl panel" aria-label="Zeitstrahl">
    <div className="section-heading"><div>
      <p className="eyebrow">Errechnet, nicht gepflegt</p><h2>Zeitstrahl</h2>
    </div><Button onClick={onClose}>Schließen</Button></div>
    {daten.error ? <Notice error>{daten.error}</Notice> : null}
    <Chronist campaignId={campaignId} onOpenEntry={onOpenEntry} />
    {daten.loading ? <Loading text="Die Zeitleiste wird errechnet …" />
      : !ereignisse.length && !ohneJahr.length
        ? <EmptyState title="Noch hat eure Welt keine Daten.">Der Zeitstrahl rechnet sich aus zwei Quellen: den Datumsfeldern eurer Artikel (Geburt, Tod, Gründung) und den Würfen und Aussagen, die ihr am Tisch zu Kanon macht. Sobald eines davon vorliegt, steht es hier.</EmptyState>
        : <>
          <p className="field-help">Aus den Datumsfeldern eurer Artikel und den bestätigten Prägungen am Tisch. Du siehst genau die Ereignisse, deren Passage du hältst.</p>
          <ol className="zeit-liste">{ereignisse.map(zeile)}</ol>
          {ohneJahr.length ? <details className="zeit-ohne-jahr"><summary>{ohneJahr.length} ohne lesbare Jahresangabe</summary>
            <ol className="zeit-liste">{ohneJahr.map(zeile)}</ol>
          </details> : null}
        </>}
  </section>;
}

/**
 * Was der Chronist vorschlägt.
 *
 * **Er schreibt nichts.** Was hier steht, ist ein Vorschlag; entschieden wird am Tisch — nichts
 * wird automatisch Kanon. Jeder Fund nennt den Artikel, in dem er steckt, damit man ihn
 * unmittelbar öffnen und beheben kann.
 *
 * **Und er rät nicht.** Gemeldet wird nur, was sicher falsch ist: ein Tod vor der Geburt, zwei
 * verschiedene Jahre für dieselbe Aussage, ein Datumsfeld ohne lesbares Jahr. „Ein Jahrhundert
 * ohne Ereignis" wäre ein Urteil über eine erfundene Welt — und ein Prüfwerkzeug, das Urteile
 * fällt, wird abgeschaltet.
 */
function Chronist({ campaignId, onOpenEntry }: { campaignId: string; onOpenEntry: (entryId: string) => void }) {
  const befunde = useResource<Befund[]>(apiPath(campaignId, "/chronist"));
  if (befunde.error) return <Notice error>{befunde.error}</Notice>;
  if (!befunde.data?.length) return null;
  return <section className="chronist" aria-label="Vorschläge des Chronisten">
    <h3>Der Chronist schlägt vor</h3>
    <p className="field-help">Gefunden im Bestand, nicht geraten: {befunde.data.length === 1 ? "ein Punkt" : `${befunde.data.length} Punkte`}, die einander widersprechen oder unlesbar sind. Entschieden wird am Tisch.</p>
    <ul>{befunde.data.map((befund, i) => <li key={`${befund.entryId}-${befund.art}-${i}`}>
      <span className={befund.art === "unlesbares_datum" ? "chronist-marke luecke" : "chronist-marke"}>{befundLabel[befund.art]}</span>
      <div><strong>{befund.titel}</strong><p>{befund.text}</p></div>
      <Button onClick={() => onOpenEntry(befund.entryId)}>Artikel öffnen</Button>
    </li>)}</ul>
  </section>;
}

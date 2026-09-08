// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";
import { plural, t } from "../i18n";
import "./zeitstrahl.css";

type Art = "geburt" | "tod" | "gruendung" | "datum" | "praegung";
interface Ereignis {
  id: string; art: Art; jahr: number | null; genau: boolean; roh: string;
  entryId: string; titel: string; passageId: string; spieltag?: string; siegel?: string;
}
interface Zeitleistendaten { ereignisse: readonly Ereignis[]; ohneJahr: readonly Ereignis[] }
/** Ein Vorschlag des Chronisten: was gefunden wurde, und die Passagen, die es belegen. */
interface Befund { art: "tod_vor_geburt" | "widerspruechliche_jahre" | "unlesbares_datum"; entryId: string; titel: string; text: string; passagen: readonly string[] }
/** `art` ist der Datenschlüssel des Servers; hier steht nur, wie er heißt. */
const befundLabel = (art: Befund["art"]): string => art === "unlesbares_datum" ? t("Lücke") : t("Widerspruch");

const artLabel = (art: Art): string =>
  art === "geburt" ? t("Geboren")
    : art === "tod" ? t("Gestorben")
      : art === "gruendung" ? t("Gegründet")
        : art === "datum" ? t("Datiert")
          : t("Am Tisch geprägt");

/** „819 n. K." bleibt „819 n. K." — die gelesene Zahl steht daneben, nicht an ihrer Stelle. */
function Jahr({ ereignis }: { ereignis: Ereignis }) {
  if (ereignis.jahr === null) return <span className="zeit-jahr zeit-jahr-offen">{t("ohne Jahr")}</span>;
  // Die Ärenmarke gehört dem Kalender eurer Welt, nicht dieser Oberfläche: sie bleibt stehen.
  const zeichen = ereignis.jahr < 0 ? `${Math.abs(ereignis.jahr)} v. K.` : `${ereignis.jahr}`;
  return <span className={ereignis.genau ? "zeit-jahr" : "zeit-jahr zeit-jahr-ungefaehr"}
    title={ereignis.genau ? undefined : t("Die Quelle sagt „{roh}“ — daraus gelesen: {zeichen}", { roh: ereignis.roh, zeichen })}>
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
      <span className="zeit-art">{artLabel(ereignis.art)}</span>
      <span className="zeit-roh">„{ereignis.roh || t("ohne Angabe")}“</span>
      {ereignis.spieltag ? <span className="zeit-spieltag">{t("Spieltag {tag}", { tag: ereignis.spieltag })}</span> : null}
    </div>
  </li>;
  return <section className="zeitstrahl panel" aria-label={t("Zeitstrahl")}>
    <div className="section-heading"><div>
      <p className="eyebrow">{t("Errechnet, nicht gepflegt")}</p><h2>{t("Zeitstrahl")}</h2>
    </div><Button onClick={onClose}>{t("Schließen")}</Button></div>
    {daten.error ? <Notice error>{daten.error}</Notice> : null}
    <Chronist campaignId={campaignId} onOpenEntry={onOpenEntry} />
    {daten.loading ? <Loading text={t("Die Zeitleiste wird errechnet …")} />
      : !ereignisse.length && !ohneJahr.length
        ? <EmptyState title={t("Noch hat eure Welt keine Daten.")}>{t("Der Zeitstrahl rechnet sich aus zwei Quellen: den Datumsfeldern eurer Artikel (Geburt, Tod, Gründung) und den Würfen und Aussagen, die ihr am Tisch zu Kanon macht. Sobald eines davon vorliegt, steht es hier.")}</EmptyState>
        : <>
          <p className="field-help">{t("Aus den Datumsfeldern eurer Artikel und den bestätigten Prägungen am Tisch. Du siehst genau die Ereignisse, deren Passage du hältst.")}</p>
          <ol className="zeit-liste">{ereignisse.map(zeile)}</ol>
          {ohneJahr.length ? <details className="zeit-ohne-jahr"><summary>{t("{n} ohne lesbare Jahresangabe", { n: ohneJahr.length })}</summary>
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
  return <section className="chronist" aria-label={t("Vorschläge des Chronisten")}>
    <h3>{t("Der Chronist schlägt vor")}</h3>
    <p className="field-help">{t("Gefunden im Bestand, nicht geraten: {punkte}, die einander widersprechen oder unlesbar sind. Entschieden wird am Tisch.", { punkte: plural(befunde.data.length, "ein Punkt", "{n} Punkte") })}</p>
    <ul>{befunde.data.map((befund, i) => <li key={`${befund.entryId}-${befund.art}-${i}`}>
      <span className={befund.art === "unlesbares_datum" ? "chronist-marke luecke" : "chronist-marke"}>{befundLabel(befund.art)}</span>
      <div><strong>{befund.titel}</strong><p>{befund.text}</p></div>
      <Button onClick={() => onOpenEntry(befund.entryId)}>{t("Artikel öffnen")}</Button>
    </li>)}</ul>
  </section>;
}

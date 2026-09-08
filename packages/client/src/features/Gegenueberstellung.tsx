// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import type { ActorCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type ProjectedPassage } from "../api";
import { useResource } from "../hooks";
import { BlockReader } from "../Reader";
import { t } from "../i18n";
import "./gegenueberstellung.css";

type Seite = "nur-links" | "nur-rechts" | "beide";
interface Spalte { actorId: string; name: string; passagen: readonly ProjectedPassage[] }
interface Vergleich { entryId: string; slug: string; titel: string; links: Spalte; rechts: Spalte; zeilen: readonly { pid: string; ord: number; seite: Seite }[] }

/** `seite` ist ein Datenschlüssel; nur die Beschriftung daneben ist Oberfläche. */
const beschriftung = (seite: Seite): string =>
  seite === "nur-links" ? t("Nur links bekannt")
    : seite === "nur-rechts" ? t("Nur rechts bekannt")
      : t("Beide halten diese Passage");

/**
 * `Die Gegenüberstellung` — derselbe Artikel nebeneinander für zwei Figuren.
 *
 * Der Leserwechsel ist ein Serverroundtrip, kein clientseitiger Filter: dieser Client
 * bekommt genau die zwei Projektionen, die der Server hergeleitet hat, und keine
 * Sichtbarkeitsmarke über eine dritte. Was keine der beiden Figuren hält, kommt hier
 * nicht an — deshalb gibt es hier auch nichts auszublenden.
 */
export function Gegenueberstellung({ campaignId, entryId, onClose }: { campaignId: string; entryId: string; onClose: () => void }) {
  const actors = useResource<ActorCard[]>(apiPath(campaignId, "/actors"));
  const figuren = (actors.data ?? []).filter(actor => !actor.archivedAt);
  const [links, setLinks] = useState(""), [rechts, setRechts] = useState("");
  const linkeFigur = links || figuren[0]?.id || "", rechteFigur = rechts || figuren[1]?.id || "";
  const bereit = Boolean(linkeFigur && rechteFigur && linkeFigur !== rechteFigur);
  const vergleich = useResource<Vergleich>(bereit
    ? apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}/gegenueberstellung?links=${encodeURIComponent(linkeFigur)}&rechts=${encodeURIComponent(rechteFigur)}`)
    : null);
  const seiten = new Map(vergleich.data?.zeilen.map(zeile => [zeile.pid, zeile.seite]) ?? []);
  const auswahl = (label: string, value: string, onChange: (id: string) => void) =>
    <label>{label}<select value={value} aria-label={label} onChange={event => onChange(event.target.value)}>
      {figuren.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
    </select></label>;
  const spalte = (spalte: Spalte | undefined) => <section className="spalte">
    <h3>{spalte?.name ?? ""}</h3>
    {spalte?.passagen.length ? spalte.passagen.map(passage => {
      const seite = seiten.get(passage.pid) ?? "beide";
      return <article key={passage.pid} className={`vergleichs-passage ${seite}`} data-seite={seite}>
        <span className="seiten-marke">{beschriftung(seite)}</span>
        <BlockReader block={passage.inhalt} campaignId={campaignId} />
      </article>;
    }) : <p className="muted">{t("Diese Figur hält in diesem Artikel noch nichts.")}</p>}
  </section>;
  return <section className="gegenueberstellung panel" aria-label={t("Gegenüberstellung")}>
    <div className="section-heading"><div>
      <p className="eyebrow">{t("Zwei Bücher, ein Server")}</p>
      <h2>{t("Gegenüberstellung")}</h2>
    </div><Button onClick={onClose}>{t("Schließen")}</Button></div>
    {actors.error ? <Notice error>{actors.error}</Notice> : null}
    {figuren.length < 2
      ? <EmptyState title={t("Dafür braucht es zwei Figuren.")}>{t("Sobald eure Runde eine zweite Figur führt, kannst du denselben Artikel aus beiden Blickwinkeln nebeneinander lesen.")}</EmptyState>
      : <><div className="figurenwahl">{auswahl(t("Linke Figur"), linkeFigur, setLinks)}{auswahl(t("Rechte Figur"), rechteFigur, setRechts)}</div>
        {!bereit ? <p className="field-help">{t("Wähle zwei verschiedene Figuren.")}</p>
          : vergleich.loading ? <Loading text={t("Beide Sichten werden hergeleitet …")} />
          : vergleich.error ? <Notice error>{vergleich.error}</Notice>
          : vergleich.data ? <><p className="field-help">{t("Was keine der beiden Figuren hält, erscheint in keiner Spalte — auch nicht als Lücke.")}</p>
            <div className="vergleich-spalten">{spalte(vergleich.data.links)}{spalte(vergleich.data.rechts)}</div></> : null}</>}
  </section>;
}

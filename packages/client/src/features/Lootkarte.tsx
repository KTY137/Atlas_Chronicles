import { ImageOff } from "lucide-react";
import type { ItemContract, LootRarityValue } from "@chronicle/protocol";
import { assetPath } from "../api";
import "./lootkarte.css";

/**
 * Die Lootkarte — ein Gegenstand als Sammelkarte.
 *
 * Rein darstellend. Sie rechnet nichts, sie fragt nichts ab: sie bekommt eine
 * Gegenstandsdefinition und zeigt sie. Die Karte ist damit an genau einer Stelle definiert und
 * kann überall auftauchen, wo ein Gegenstand vorkommt — Vorlagenwerkstatt, Bestand, Inventar.
 *
 * **Eine Vorlage der Fassung 1 hat kein Kartengesicht und behauptet auch keines.** Sie zeigt,
 * was sie hat — Name und Etiketten —, und sagt, dass das Gesicht fehlt. Sie stillschweigend mit
 * erfundenen Voreinstellungen aufzufüllen wäre eine Aussage über einen Gegenstand, die niemand
 * getroffen hat.
 */

export const SELTENHEIT_TEXT: Readonly<Record<LootRarityValue, string>> = Object.freeze({
  gewoehnlich: "Gewöhnlich", ungewoehnlich: "Ungewöhnlich", selten: "Selten",
  episch: "Episch", legendaer: "Legendär",
});

export function Lootkarte({ definition, campaignId, klein = false }: { definition: ItemContract; campaignId: string; klein?: boolean }) {
  const gesicht = definition.schemaVersion === 2 ? definition : null;
  const seltenheit = gesicht?.seltenheit ?? "gewoehnlich";
  return <article className={`lootkarte${klein ? " klein" : ""}`} data-seltenheit={seltenheit}
    aria-label={`${definition.name}${gesicht ? ` — ${SELTENHEIT_TEXT[gesicht.seltenheit]}` : ""}`}>
    <header className="lootkarte-kopf">
      <h4>{definition.name}</h4>
      {gesicht ? <span className="lootkarte-seltenheit">{SELTENHEIT_TEXT[gesicht.seltenheit]}</span> : null}
    </header>
    <div className="lootkarte-bild">
      {gesicht?.bildAssetId
        ? <img src={assetPath(campaignId, gesicht.bildAssetId)} alt="" loading="lazy" />
        : <span className="lootkarte-ohne-bild" aria-hidden="true"><ImageOff size={22} /></span>}
    </div>
    {gesicht?.kategorie ? <p className="lootkarte-art">{gesicht.kategorie}</p> : null}
    <div className="lootkarte-text">
      {gesicht?.spruch ? <p className="lootkarte-spruch">{gesicht.spruch}</p> : null}
      {gesicht?.zeilen.length
        ? <dl className="lootkarte-zeilen">{gesicht.zeilen.map((zeile, i) =>
          <div key={`${zeile.label}-${i}`}><dt>{zeile.label}</dt><dd>{zeile.wert}</dd></div>)}</dl>
        : null}
      {!gesicht ? <p className="lootkarte-ohne-gesicht">Diese Vorlage hat noch kein Kartengesicht. Beim nächsten Überarbeiten lässt sich eines anlegen.</p> : null}
    </div>
    {definition.tags.length ? <footer className="lootkarte-etiketten">{definition.tags.map(tag => <span key={tag}>{tag}</span>)}</footer> : null}
  </article>;
}

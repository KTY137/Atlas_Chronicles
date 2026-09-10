// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Boxes, MousePointer2, RotateCw, Search, Trash2 } from "lucide-react";
import { ASSET_ARTEN, ASSET_GENRES, ASSET_GENRE_LABEL, type AssetArt, type AssetpaketV1, type Stamp, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { Button, Loading, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { useResource } from "../hooks";
import { artworkBrush, artworkGenre, artworkMatches, artworkName, type ArtworkBrush } from "./map-artwork";
import "./map-artwork.css";

const ART_LABEL: Record<AssetArt, string> = { boden: "Böden", wand: "Wände", tuer: "Türen", aufbau: "Aufbauten & Stadt", moebel: "Einrichtung", gefaess: "Behälter", licht: "Lichter", marke: "Zeichen", figur: "Figuren" };
const PACK_LABEL: Record<string, string> = { "pk.genres": "Genre-Archiv · zwölf Welten", "pk.zeitwelten": "Zeitwelten · Gegenwart & Science-Fiction", "pk.gemalt": "Gemalt", "pk.grundriss": "Grundriss", "pk.atlas": "Weltatlas", "pk.natur": "Natur · Bäume, Felsen, Schilf & Boote" };
interface PackSummary { id: string; version: string; assetCount: number }

export function MapArtworkPalette({ document, brush, onBrush, selected, onSelect, onUpdate, onRemove }: {
  document: TacticalMapDocumentV1; brush: ArtworkBrush | null; onBrush(brush: ArtworkBrush | null): void;
  selected: string; onSelect(id: string): void; onUpdate(stamp: Stamp): void; onRemove(id: string): void;
}) {
  const [packId, setPackId] = useState(() => document.geometry.stamps.some(stamp => stamp.a.startsWith("pk.genres/")) ? "pk.genres" : "pk.zeitwelten"), [query, setQuery] = useState(""), [category, setCategory] = useState("all"), [era, setEra] = useState("all");
  const [genre, setGenre] = useState("all");
  const packs = useResource<PackSummary[]>("/api/packs");
  const manifest = useResource<AssetpaketV1>(`/api/packs/${encodeURIComponent(packId)}/manifest`);
  const [placedQuery, setPlacedQuery] = useState("");
  const genres = useMemo(() => ASSET_GENRES.filter(id => manifest.data?.assets.some(asset => artworkGenre(asset) === id)), [manifest.data]);
  const visible = useMemo(() => (manifest.data?.assets ?? []).filter(asset => artworkMatches(asset, query, category, era, genre)), [manifest.data, query, category, era, genre]);
  const chosen = document.geometry.stamps.find(stamp => stamp.id === selected);
  const placed = useMemo(() => document.geometry.stamps.filter(stamp => stamp.l > -90 && (!placedQuery.trim()
    || artworkName(stamp.a.split("/")[1] ?? stamp.a).toLocaleLowerCase("de").includes(placedQuery.trim().toLocaleLowerCase("de")))), [document.geometry.stamps, placedQuery]);
  return <section className="map-artwork" aria-label={t("Kartenassets")}>
    <div className="map-artwork-heading"><div><h3><Boxes size={19} /> {t("Einrichtung & Kartenassets")}</h3><p className="field-help">{t("Wähle ein Objekt und klicke auf die Karte. Es wird mit der Kartenrevision gespeichert.")}</p></div>
      {brush ? <Button aria-pressed onClick={() => onBrush(null)}><MousePointer2 size={15} /> {t("Platzieren beenden")}</Button> : null}</div>
    <div className="map-artwork-filters"><label>{t("Assetpaket")}<select value={packId} onChange={event => { setPackId(event.target.value); setGenre("all"); onBrush(null); }}>
      {!packs.data?.some(pack => pack.id === packId) ? <option value={packId}>{t(PACK_LABEL[packId] ?? packId)}</option> : null}
      {packs.data?.map(pack => <option key={pack.id} value={pack.id}>{t(PACK_LABEL[pack.id] ?? pack.id)} · {t("{anzahl} Assets", { anzahl: pack.assetCount })}</option>)}
    </select></label><label>{t("Kategorie")}<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">{t("Alle Kategorien")}</option>{ASSET_ARTEN.map(art => <option key={art} value={art}>{t(ART_LABEL[art])}</option>)}</select></label>
      <label>{t("Objekt-Setting")}<select value={era} onChange={event => setEra(event.target.value)}><option value="all">{t("Alle Settings")}</option><option value="gegenwart">{t("Gegenwart & neutrale Objekte")}</option><option value="scifi">{t("Science-Fiction & neutrale Objekte")}</option><option value="fantasy">{t("Fantasy & neutrale Objekte")}</option></select></label>
      <label>{t("Assets suchen")}<div className="map-artwork-search"><Search size={15} /><input value={query} placeholder={t("Objekt, Material oder Genre …")} onChange={event => setQuery(event.target.value)} /></div></label>
    </div>
    {genres.length ? <div className="map-artwork-genres"><label>{t("Genre")}<select value={genre} onChange={event => { setGenre(event.target.value); onBrush(null); }}><option value="all">{t("Alle Genres · {anzahl} Assets", { anzahl: manifest.data?.assets.length ?? 0 })}</option>{genres.map(id => <option value={id} key={id}>{t(ASSET_GENRE_LABEL[id])}</option>)}</select></label>
      <p className="field-help">{t("Zwölf Welten, jeweils mit Böden, Architektur und Einrichtung. Genre, Kategorie und Suche lassen sich kombinieren.")}</p></div> : null}
    {manifest.loading ? <Loading text={t("Objektkatalog wird geladen …")} /> : null}{manifest.error || packs.error ? <Notice error>{manifest.error || packs.error}</Notice> : null}
    {manifest.data ? <><p className="field-help">{t("{sichtbar} von {gesamt} Assets", { sichtbar: visible.length, gesamt: manifest.data.assets.length })} · {brush ? t("{name} ausgewählt – auf der Karte platzieren", { name: artworkName(brush.asset.name) }) : t("Objekt auswählen")}</p>
      <div className="map-artwork-grid">{visible.map(asset => {
        const active = brush?.packId === packId && brush.asset.name === asset.name;
        return <button type="button" key={asset.name} aria-pressed={active} title={t("{name} · {einheiten} Zellen", { name: artworkName(asset.name), einheiten: asset.einheiten.join(" × ") })} onClick={() => onBrush(active ? null : artworkBrush(manifest.data!, asset))}>
          <img loading="lazy" src={`/api/packs/${encodeURIComponent(packId)}/asset/${asset.datei.split("/").map(encodeURIComponent).join("/")}`} alt="" width={72} height={72} />
          <span>{artworkName(asset.name)}</span><small>{asset.einheiten.join(" × ")}</small>
        </button>;
      })}</div>{!visible.length ? <p>{t("Keine passenden Assets. Ändere die Suche oder die Kategorie.")}</p> : null}
    </> : null}
    <details className="map-placed-artwork"><summary>{t("Platzierte Einrichtung bearbeiten ({anzahl})", { anzahl: document.geometry.stamps.filter(stamp => stamp.l > -90).length })}</summary>
      <label>{t("Platzierte Objekte suchen")}<input value={placedQuery} placeholder={t("Name des Objekts")} onChange={event => setPlacedQuery(event.target.value)} /></label>
      <label>{t("Platziertes Asset")}<select value={placed.some(stamp => stamp.id === selected) ? selected : ""} onChange={event => { onBrush(null); onSelect(event.target.value); }}><option value="">{t("Objekt auswählen …")}</option>
        {placed.slice(0, 500).map(stamp => <option key={stamp.id} value={stamp.id}>{artworkName(stamp.a.split("/")[1] ?? stamp.a)} · {Math.round(stamp.x)}, {Math.round(stamp.y)}</option>)}
      </select></label>{placed.length > 500 ? <p className="field-help">{t("Die ersten 500 Treffer. Grenze die Suche ein.")}</p> : null}
      {chosen ? <div className="map-artwork-selected"><strong>{artworkName(chosen.a.split("/")[1] ?? chosen.a)}</strong><div className="map-numbers">
        {(["x", "y"] as const).map((axis, index) => <label key={axis}>{axis.toUpperCase()}<input type="number" min={0} max={document.geometry.size[index]} step="any" value={chosen[axis]} onChange={event => { const next = event.target.valueAsNumber; if (Number.isFinite(next) && next >= 0 && next <= document.geometry.size[index]!) onUpdate({ ...chosen, [axis]: next }); }} /></label>)}
        <label>{t("Größe")}<input type="number" min={.1} max={10} step={.1} value={chosen.s} onChange={event => { const next = event.target.valueAsNumber; if (Number.isFinite(next) && next >= .1 && next <= 10) onUpdate({ ...chosen, s: next }); }} /></label></div>
        <div className="button-row"><Button onClick={() => onUpdate({ ...chosen, r: (chosen.r + Math.PI / 2) % (2 * Math.PI) })}><RotateCw size={15} /> {t("90° drehen")}</Button>
          <Button onClick={() => onRemove(chosen.id)}><Trash2 size={15} /> {t("Asset entfernen")}</Button></div>
      </div> : null}
    </details>
  </section>;
}

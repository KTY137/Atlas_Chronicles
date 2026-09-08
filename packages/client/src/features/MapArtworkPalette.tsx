// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Boxes, MousePointer2, RotateCw, Search, Trash2 } from "lucide-react";
import { ASSET_ARTEN, ASSET_GENRES, ASSET_GENRE_LABEL, type AssetArt, type AssetpaketV1, type Stamp, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { Button, Loading, Notice } from "@chronicle/ui";
import { useResource } from "../hooks";
import { artworkBrush, artworkGenre, artworkMatches, artworkName, type ArtworkBrush } from "./map-artwork";
import "./map-artwork.css";

const ART_LABEL: Record<AssetArt, string> = { boden: "Böden", wand: "Wände", tuer: "Türen", aufbau: "Aufbauten & Stadt", moebel: "Einrichtung", gefaess: "Behälter", licht: "Lichter", marke: "Zeichen", figur: "Figuren" };
const PACK_LABEL: Record<string, string> = { "pk.genres": "Genre-Archiv · zwölf Welten", "pk.zeitwelten": "Zeitwelten · Gegenwart & Science-Fiction", "pk.gemalt": "Gemalt", "pk.grundriss": "Grundriss", "pk.atlas": "Weltatlas" };
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
  return <section className="map-artwork" aria-label="Kartenassets">
    <div className="map-artwork-heading"><div><h3><Boxes size={19} /> Einrichtung & Kartenassets</h3><p className="field-help">Wähle ein Objekt und klicke auf die Karte. Es wird mit der Kartenrevision gespeichert.</p></div>
      {brush ? <Button aria-pressed onClick={() => onBrush(null)}><MousePointer2 size={15} /> Platzieren beenden</Button> : null}</div>
    <div className="map-artwork-filters"><label>Assetpaket<select value={packId} onChange={event => { setPackId(event.target.value); setGenre("all"); onBrush(null); }}>
      {!packs.data?.some(pack => pack.id === packId) ? <option value={packId}>{PACK_LABEL[packId] ?? packId}</option> : null}
      {packs.data?.map(pack => <option key={pack.id} value={pack.id}>{PACK_LABEL[pack.id] ?? pack.id} · {pack.assetCount} Assets</option>)}
    </select></label><label>Kategorie<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Alle Kategorien</option>{ASSET_ARTEN.map(art => <option key={art} value={art}>{ART_LABEL[art]}</option>)}</select></label>
      <label>Objekt-Setting<select value={era} onChange={event => setEra(event.target.value)}><option value="all">Alle Settings</option><option value="gegenwart">Gegenwart & neutrale Objekte</option><option value="scifi">Science-Fiction & neutrale Objekte</option><option value="fantasy">Fantasy & neutrale Objekte</option></select></label>
      <label>Assets suchen<div className="map-artwork-search"><Search size={15} /><input value={query} placeholder="Objekt, Material oder Genre …" onChange={event => setQuery(event.target.value)} /></div></label>
    </div>
    {genres.length ? <div className="map-artwork-genres"><label>Genre<select value={genre} onChange={event => { setGenre(event.target.value); onBrush(null); }}><option value="all">Alle Genres · {manifest.data?.assets.length} Assets</option>{genres.map(id => <option value={id} key={id}>{ASSET_GENRE_LABEL[id]}</option>)}</select></label>
      <p className="field-help">Zwölf Welten, jeweils mit Böden, Architektur und Einrichtung. Genre, Kategorie und Suche lassen sich kombinieren.</p></div> : null}
    {manifest.loading ? <Loading text="Objektkatalog wird geladen …" /> : null}{manifest.error || packs.error ? <Notice error>{manifest.error || packs.error}</Notice> : null}
    {manifest.data ? <><p className="field-help">{visible.length} von {manifest.data.assets.length} Assets · {brush ? `${artworkName(brush.asset.name)} ausgewählt – auf der Karte platzieren` : "Objekt auswählen"}</p>
      <div className="map-artwork-grid">{visible.map(asset => {
        const active = brush?.packId === packId && brush.asset.name === asset.name;
        return <button type="button" key={asset.name} aria-pressed={active} title={`${artworkName(asset.name)} · ${asset.einheiten.join(" × ")} Zellen`} onClick={() => onBrush(active ? null : artworkBrush(manifest.data!, asset))}>
          <img loading="lazy" src={`/api/packs/${encodeURIComponent(packId)}/asset/${asset.datei.split("/").map(encodeURIComponent).join("/")}`} alt="" width={72} height={72} />
          <span>{artworkName(asset.name)}</span><small>{asset.einheiten.join(" × ")}</small>
        </button>;
      })}</div>{!visible.length ? <p>Keine passenden Assets. Ändere die Suche oder die Kategorie.</p> : null}
    </> : null}
    <details className="map-placed-artwork"><summary>Platzierte Einrichtung bearbeiten ({document.geometry.stamps.filter(stamp => stamp.l > -90).length})</summary>
      <label>Platzierte Objekte suchen<input value={placedQuery} placeholder="Name des Objekts" onChange={event => setPlacedQuery(event.target.value)} /></label>
      <label>Platziertes Asset<select value={placed.some(stamp => stamp.id === selected) ? selected : ""} onChange={event => { onBrush(null); onSelect(event.target.value); }}><option value="">Objekt auswählen …</option>
        {placed.slice(0, 500).map(stamp => <option key={stamp.id} value={stamp.id}>{artworkName(stamp.a.split("/")[1] ?? stamp.a)} · {Math.round(stamp.x)}, {Math.round(stamp.y)}</option>)}
      </select></label>{placed.length > 500 ? <p className="field-help">Die ersten 500 Treffer. Grenze die Suche ein.</p> : null}
      {chosen ? <div className="map-artwork-selected"><strong>{artworkName(chosen.a.split("/")[1] ?? chosen.a)}</strong><div className="map-numbers">
        {(["x", "y"] as const).map((axis, index) => <label key={axis}>{axis.toUpperCase()}<input type="number" min={0} max={document.geometry.size[index]} step="any" value={chosen[axis]} onChange={event => { const next = event.target.valueAsNumber; if (Number.isFinite(next) && next >= 0 && next <= document.geometry.size[index]!) onUpdate({ ...chosen, [axis]: next }); }} /></label>)}
        <label>Größe<input type="number" min={.1} max={10} step={.1} value={chosen.s} onChange={event => { const next = event.target.valueAsNumber; if (Number.isFinite(next) && next >= .1 && next <= 10) onUpdate({ ...chosen, s: next }); }} /></label></div>
        <div className="button-row"><Button onClick={() => onUpdate({ ...chosen, r: (chosen.r + Math.PI / 2) % (2 * Math.PI) })}><RotateCw size={15} /> 90° drehen</Button>
          <Button onClick={() => onRemove(chosen.id)}><Trash2 size={15} /> Asset entfernen</Button></div>
      </div> : null}
    </details>
  </section>;
}

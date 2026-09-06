import { useEffect, useId, useState } from "react";
import type { TacticalAnchor } from "@chronicle/protocol";
import { TACTICAL_MAP_LIMITS, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { Button, Notice } from "@chronicle/ui";
import { apiPath, plainText, type EntryDocument, type EntrySummary } from "../api";
import { useResource } from "../hooks";
import { TacticalObjectList } from "./TacticalObjectList";
import { objectKey, type MapObject } from "./tactical-entities";

export function TacticalEntitiesEditor({ campaignId, document, anchors, objects, entries, selected, onSelect, onChange, marking, onMarking }: {
  campaignId: string; document: TacticalMapDocumentV1; anchors: TacticalAnchor[]; objects: readonly MapObject[]; entries: readonly EntrySummary[];
  selected: string; onSelect(key: string): void; onChange(document: TacticalMapDocumentV1, anchors: TacticalAnchor[]): void;
  marking: boolean; onMarking(value: boolean): void;
}) {
  const controlId = useId();
  const target = objects.find(o => objectKey(o) === selected), binding = target && anchors.find(a => a.targetKind === target.kind && a.targetId === target.id);
  const [entryId, setEntryId] = useState(binding?.entryId ?? ""), [passageId, setPassageId] = useState(binding?.passageId ?? "");
  const [x, setX] = useState("0"), [y, setY] = useState("0");
  const article = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}`) : null);
  useEffect(() => { setEntryId(binding?.entryId ?? ""); setPassageId(binding?.passageId ?? ""); }, [selected, binding?.entryId, binding?.passageId]);
  useEffect(() => { if (target) { setX(String(target.x)); setY(String(target.y)); } }, [selected, target?.x, target?.y]);
  const validPosition = x.trim() !== "" && y.trim() !== "" && Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && Number(x) >= 0 && Number(y) >= 0 && Number(x) <= document.geometry.size[0] && Number(y) <= document.geometry.size[1];
  const add = () => { if (!validPosition || document.geometry.places.length >= TACTICAL_MAP_LIMITS.places) return; const id = crypto.randomUUID(); onChange({ ...document, geometry: { ...document.geometry, places: [...document.geometry.places, { id, x: Number(x), y: Number(y) }] } }, anchors); onSelect(`place:${id}`); onMarking(false); };
  return <section className="tactical-entity-editor"><h3>Orte & Kartenobjekte</h3><p className="field-help">Eine Wissensverknüpfung gibt selbst nichts frei. Der Marker erscheint erst mit dem verknüpften Wissen und innerhalb einer bekannten Region. Kartenobjekte erscheinen hier als Marker; ihre Assetgrafik bleibt Teil der getrennten Kartengestaltung.</p>
    <TacticalObjectList objects={objects} selected={selected} onSelect={onSelect} />
    <div className="rule-fields"><label>Ort X<input type="number" step="any" min={0} max={document.geometry.size[0]} value={x} onChange={e => setX(e.target.value)} /></label><label>Ort Y<input type="number" step="any" min={0} max={document.geometry.size[1]} value={y} onChange={e => setY(e.target.value)} /></label></div>
    <div className="button-row"><Button disabled={!validPosition || document.geometry.places.length >= TACTICAL_MAP_LIMITS.places} onClick={add}>Ort an diesen Koordinaten markieren</Button><Button aria-pressed={marking} disabled={document.geometry.places.length >= TACTICAL_MAP_LIMITS.places} onClick={() => onMarking(!marking)}>{marking ? "Markieren beenden" : "Ort auf Karte markieren"}</Button>
      {target?.kind === "place" ? <Button disabled={!validPosition} onClick={() => onChange({ ...document, geometry: { ...document.geometry, places: document.geometry.places.map(p => p.id === target.id ? { ...p, x: Number(x), y: Number(y) } : p) } }, anchors)}>Ortsposition übernehmen</Button> : null}</div>
    {marking ? <Notice>Ein Klick auf die Karte setzt einen neuen, zunächst privaten Ort.</Notice> : null}
    {target ? <><label htmlFor={`${controlId}-entry`}>Objektwissen aus Artikel</label><select id={`${controlId}-entry`} value={entryId} onChange={e => { setEntryId(e.target.value); setPassageId(""); }}><option value="">Artikel wählen</option>{entries.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
      <label htmlFor={`${controlId}-passage`}>Objekt benötigt Passage</label><select id={`${controlId}-passage`} value={passageId} onChange={e => setPassageId(e.target.value)}><option value="">Eine bekannte Passage des Artikels genügt</option>{article.data?.passagen.map((p, i) => <option key={p.pid} value={p.pid}>{i + 1}. {plainText(p.inhalt).slice(0, 100)}</option>)}</select>
      <div className="button-row"><Button disabled={!entryId || (!!passageId && !article.data?.passagen.some(p => p.pid === passageId))} onClick={() => onChange(document, [...anchors.filter(a => !(a.targetKind === target.kind && a.targetId === target.id)), { targetKind: target.kind, targetId: target.id, entryId, passageId: passageId || null }])}>Objekt mit Wissen verknüpfen</Button>
        <Button disabled={!binding} onClick={() => onChange(document, anchors.filter(a => !(a.targetKind === target.kind && a.targetId === target.id)))}>Objektverknüpfung lösen</Button>
        {target.kind === "place" ? <Button onClick={() => { if (!window.confirm("Diesen Ort und seine Verknüpfung aus dem Kartenentwurf entfernen?")) return; onChange({ ...document, geometry: { ...document.geometry, places: document.geometry.places.filter(p => p.id !== target.id) }, geometryElevation: document.geometryElevation.filter(e => !(e.targetKind === "place" && e.targetId === target.id)) }, anchors.filter(a => !(a.targetKind === "place" && a.targetId === target.id))); onSelect(""); }}>Ort entfernen</Button> : null}</div>
    </> : <p>Wähle ein vorhandenes Kartenobjekt oder markiere einen neuen Ort.</p>}{article.error ? <Notice error>{article.error}</Notice> : null}
  </section>;
}

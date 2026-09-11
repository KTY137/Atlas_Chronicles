// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useRef, useState, type PointerEvent } from "react";
import { ROAD_PLAN_LIMITS, type RoadPlan, type RoadPlanNode, type RoadPlanEdge, type TacticalMapDocumentV1, type TacticalCartographyV1 } from "@chronicle/szene";
import type { SiedlungBericht } from "@chronicle/forge";
import { locale, plural, t } from "../i18n";
import "./map-road-planner.css";

export interface RoadPlanningPreview { document: TacticalMapDocumentV1; cartography?: TacticalCartographyV1 }
const EMPTY: RoadPlan = { schemaVersion: 1, maxSteigung: 24, knoten: [], verbindungen: [] };
export function MapRoadPlanner({ value = EMPTY, onChange, preview }: { value?: RoadPlan; onChange: (plan: RoadPlan | undefined) => void; preview?: RoadPlanningPreview }) {
  const [selected, select] = useState(""), [edgeId, selectEdge] = useState("");
  const drag = useRef<string | null>(null);
  const node = value.knoten.find(n => n.id === selected), edge = value.verbindungen.find(e => e.id === edgeId);
  const commit = (plan: RoadPlan) => onChange(plan.knoten.length ? plan : undefined);
  const updateNode = (patch: Partial<RoadPlanNode>) => { if (node) commit({ ...value, knoten: value.knoten.map(n => n.id === node.id ? { ...n, ...patch } : n) }); };
  const updateEdge = (patch: Partial<RoadPlanEdge>) => { if (edge) commit({ ...value, verbindungen: value.verbindungen.map(e => e.id === edge.id ? { ...e, ...patch } : e) }); };
  const add = (position?: readonly [number, number]) => {
    if (value.knoten.length >= ROAD_PLAN_LIMITS.nodes) return;
    let number = 1; while (value.knoten.some(n => n.id === `ziel-${number}`)) number++;
    const id = `ziel-${number}`, p = position ?? (number === 1 ? [.1,.5] : number === 2 ? [.9,.5] : [(number % 6 + 1)/7, (Math.floor(number/6)+1)/6]);
    commit({ ...value, knoten: [...value.knoten, { id, name: t("Wegpunkt {nummer}", { nummer: number }), art: number === 1 ? "tor" : "wegpunkt", position: [p[0]!,p[1]!] }] }); select(id);
  };
  const addEdge = () => {
    if (value.verbindungen.length >= ROAD_PLAN_LIMITS.edges) return;
    const from = node ?? value.knoten[0], to = value.knoten.find(n => n.id !== from?.id && !value.verbindungen.some(e => e.von === from?.id && e.nach === n.id || e.nach === from?.id && e.von === n.id));
    if (!from || !to) return;
    let number = 1; while (value.verbindungen.some(e => e.id === `weg-${number}`)) number++;
    const id = `weg-${number}`;
    commit({ ...value, verbindungen: [...value.verbindungen, { id, von: from.id, nach: to.id, art: "hauptstrasse", bruecke: false }] }); selectEdge(id);
  };
  const point = (event: PointerEvent<SVGSVGElement>): readonly [number, number] => {
    const box = event.currentTarget.getBoundingClientRect(), clamp = (n: number) => Math.round(Math.max(0,Math.min(1,n))*1000)/1000;
    return [clamp((event.clientX-box.left)/box.width),clamp((event.clientY-box.top)/box.height)];
  };
  const move = (id: string, position: readonly [number,number]) => commit({ ...value, knoten: value.knoten.map(n => n.id === id ? { ...n, position } : n) });
  const roles = new Map(preview?.cartography?.regions.map(r => [r.regionId,r]));
  const width = preview?.document.geometry.size[0] ?? 100, height = preview?.document.geometry.size[1] ?? 100;
  const pairAvailable = (node ? [node] : value.knoten.slice(0,1)).some(a => value.knoten.some(b => a.id !== b.id && !value.verbindungen.some(e => e.von === a.id && e.nach === b.id || e.nach === a.id && e.von === b.id)));
  return <details className="map-road-planner"><summary>{t("Straßen & Verbindungen planen")}</summary>
    <p>{t("Setze Wegpunkte und verbinde sie. Ziehen verschiebt einen Punkt; Pfeiltasten bewegen den gewählten Punkt um ein Prozent.")}</p>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="group" aria-label={t("Straßenplan zeichnen")}
      onPointerDown={event => { if (event.button !== 0 || event.currentTarget.closest("fieldset:disabled")) return; event.preventDefault();
        const id = (event.target as Element).closest("[data-road-node]")?.getAttribute("data-road-node");
        if (id) { select(id); drag.current = id; event.currentTarget.setPointerCapture(event.pointerId); } else add(point(event));
      }}
      onPointerMove={event => { if (drag.current && !event.currentTarget.closest("fieldset:disabled")) move(drag.current, point(event)); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <rect width="100" height="100" className="road-paper" />
      {preview?.document.geometry.regions.map(r => { const role=roles.get(r.id); if(!role || !["water","road","building"].includes(role.role) && !(role.role === "terrain" && role.material === "rock")) return null;
        return <polygon key={r.id} className={`road-background ${role.role}`} points={r.punkte.map(([x,y])=>`${x/width*100},${y/height*100}`).join(" ")} />; })}
      {value.verbindungen.map(e => { const a=value.knoten.find(n=>n.id===e.von),b=value.knoten.find(n=>n.id===e.nach); return a&&b ? <line key={e.id} className={`road-link ${e.art}${e.id===edgeId?" selected":""}`} x1={a.position[0]*100} y1={a.position[1]*100} x2={b.position[0]*100} y2={b.position[1]*100} /> : null; })}
      {value.knoten.map((n,i) => <g key={n.id} data-road-node={n.id} className={`road-node${n.id===selected?" selected":""}`} tabIndex={0} role="button" aria-label={t("Wegpunkt bearbeiten: {name}", { name:n.name })}
        onFocus={()=>select(n.id)} onKeyDown={e=>{if(e.currentTarget.closest("fieldset:disabled"))return;if(e.key==="Enter"||e.key===" "){e.preventDefault();select(n.id);return;}const d=({ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]} as Record<string,number[]>)[e.key];if(d){e.preventDefault();move(n.id,[Math.max(0,Math.min(1,n.position[0]+d[0]!)),Math.max(0,Math.min(1,n.position[1]+d[1]!))]);}}}>
        <circle cx={n.position[0]*100} cy={n.position[1]*100} r={2} /><text x={n.position[0]*100} y={n.position[1]*100}>{i+1}</text><title>{n.name}</title>
      </g>)}
    </svg>
    <p className="field-help">{preview ? t("Der Hintergrund zeigt die letzte Vorschau. Neue Verbindungen werden erst mit der nächsten Vorschau berechnet.") : t("Erzeuge zunächst eine Vorschau, um Gelände und vorhandene Straßen als Hintergrund zu sehen.")}</p>
    <div className="road-actions"><button type="button" onClick={()=>add()} disabled={value.knoten.length>=ROAD_PLAN_LIMITS.nodes}>{t("Wegpunkt hinzufügen")}</button>
      <button type="button" onClick={addEdge} disabled={!pairAvailable||value.verbindungen.length>=ROAD_PLAN_LIMITS.edges}>{t("Verbindung hinzufügen")}</button></div>
    <label>{t("Wegpunkt auswählen")}<select aria-label={t("Wegpunkt auswählen")} value={node?.id??""} onChange={e=>select(e.target.value)}><option value="">{t("Wegpunkt auswählen …")}</option>{value.knoten.map((n,i)=><option key={n.id} value={n.id}>{i+1}. {n.name}</option>)}</select></label>
    {node ? <div className="road-fields">
      <label>{t("Name des Wegpunkts")}<input maxLength={80} value={node.name} onChange={e=>updateNode({name:e.target.value})} /></label>
      <label>{t("Art des Wegpunkts")}<select aria-label={t("Art des Wegpunkts")} value={node.art} onChange={e=>updateNode({art:e.target.value as RoadPlanNode["art"]})}><option value="tor">{t("Zugang / Tor")}</option><option value="platz">{t("Platz")}</option><option value="wegpunkt">{t("Wegpunkt")}</option></select></label>
      <div className="road-coordinates">{([0,1] as const).map(axis=><label key={axis}>{axis===0?t("Wegpunkt X (%)"):t("Wegpunkt Y (%)")}<input type="number" min={0} max={100} step={1} value={Math.round(node.position[axis]*1000)/10} onChange={e=>{const v=e.target.valueAsNumber;if(Number.isFinite(v)&&v>=0&&v<=100)updateNode({position:axis===0?[v/100,node.position[1]]:[node.position[0],v/100]});}} /></label>)}</div>
      <button type="button" onClick={()=>{commit({...value,knoten:value.knoten.filter(n=>n.id!==node.id),verbindungen:value.verbindungen.filter(e=>e.von!==node.id&&e.nach!==node.id)});select("");}}>{t("Wegpunkt und Verbindungen entfernen")}</button>
    </div>:null}
    <label>{t("Verbindung auswählen")}<select aria-label={t("Verbindung auswählen")} value={edge?.id??""} onChange={e=>selectEdge(e.target.value)}><option value="">{t("Verbindung auswählen …")}</option>{value.verbindungen.map(e=><option key={e.id} value={e.id}>{value.knoten.find(n=>n.id===e.von)?.name} → {value.knoten.find(n=>n.id===e.nach)?.name}</option>)}</select></label>
    {edge?<div className="road-fields">
      {(["von","nach"] as const).map(key=><label key={key}>{key==="von"?t("Von Wegpunkt"):t("Zu Wegpunkt")}<select aria-label={key==="von"?t("Von Wegpunkt"):t("Zu Wegpunkt")} value={edge[key]} onChange={e=>updateEdge({[key]:e.target.value})}>{value.knoten.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>)}
      <label>{t("Straßenklasse")}<select aria-label={t("Straßenklasse")} value={edge.art} onChange={e=>updateEdge({art:e.target.value as RoadPlanEdge["art"]})}><option value="hauptstrasse">{t("Hauptstraße")}</option><option value="gasse">{t("Gasse")}</option></select></label>
      <label><input type="checkbox" checked={edge.bruecke} onChange={e=>updateEdge({bruecke:e.target.checked})} />{t("Flussbrücken für diese Verbindung erlauben")}</label>
      <button type="button" onClick={()=>{commit({...value,verbindungen:value.verbindungen.filter(e=>e.id!==edge.id)});selectEdge("");}}>{t("Verbindung entfernen")}</button>
    </div>:null}
    <label>{t("Maximaler Höhenwechsel")}<input type="number" min={1} max={64} step={1} value={value.maxSteigung} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isSafeInteger(n)&&n>=1&&n<=64)commit({...value,maxSteigung:n});}} /></label>
    <p className="field-help">{t("Höhenstufen je Rasterzelle, keine Prozentsteigung. Seen, Meer und Fels bleiben gesperrt. Nur Flüsse lassen sich ausdrücklich überbrücken.")}</p>
    <p className="field-help">{t("Bis zu 24 Wegpunkte und 32 Verbindungen ergänzen das automatische Straßennetz. Plätze halten Baufläche frei. Der Plan gilt für neue Karten und wird in Vorlagen gespeichert.")}</p>
  </details>;
}
export function RoadPlanReport({ report, plan, names }: { report: NonNullable<SiedlungBericht["verkehr"]>; plan: RoadPlan; names: ReadonlyMap<string,string> }) {
  const name=(id:string)=>plan.knoten.find(n=>n.id===id)?.name??id;
  return <section className="map-road-report" aria-label={t("Ergebnis der Straßenplanung")}><h4>{t("Ergebnis der Straßenplanung")}</h4>
    {report.routes.map(r=><p key={r.id}>{name(r.von)} → {name(r.nach)}: {r.status==="gebaut" ? plural(r.riverCrossings,"Gebaut: {laenge} Zellen, {n} Flussquerung","Gebaut: {laenge} Zellen, {n} Flussquerungen",{laenge:r.length.toLocaleString(locale())}) : r.status==="endpunkt"?t("Ziel oder Platz liegt in Wasser, Fels oder zu dicht an einem Hindernis."):r.status==="budget"?t("Das Straßenbudget ist erreicht. Vereinfache den Plan."):t("Kein zulässiger Weg. Prüfe Höhenwechsel, Hindernisse und die Brückenerlaubnis.")}</p>)}
    <p>{plural(report.components,"{n} Straßennetz auf der gesamten Karte.","{n} getrennte Straßennetze auf der gesamten Karte.")}</p>
    {report.unreachableNodes.length?<p role="alert">{t("Nicht erreichbare Wegpunkte: {namen}",{namen:report.unreachableNodes.map(name).join(", ")})}</p>:null}
    {report.unreachableBuildings.length?<details><summary>{plural(report.unreachableBuildings.length,"{n} Gebäude ohne Verbindung zu einem Zugang","{n} Gebäude ohne Verbindung zu einem Zugang")}</summary><p>{report.unreachableBuildings.map(id=>names.get(id)??id).join(", ")}</p></details>:null}
    {report.singleLinks.length?<p>{plural(report.singleLinks.length,"{n} Verbindung ohne Alternativweg im eigenen Plan. Das automatische Netz kann weitere Wege bieten.","{n} Verbindungen ohne Alternativweg im eigenen Plan. Das automatische Netz kann weitere Wege bieten.")}</p>:null}
  </section>;
}

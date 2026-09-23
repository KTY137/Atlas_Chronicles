// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useRef, useState, type PointerEvent } from "react";
import { SETTLEMENT_USES, SETTLEMENT_PLAN_LIMITS, parseSettlementPlan, planContains, type SettlementPlan, type SettlementZone, type PlanPoint } from "@chronicle/szene";
import { t } from "../i18n";
import "./map-zone-planner.css";

const ZONE_LABEL = { wohnen: "Wohnviertel", markt: "Marktviertel", handwerk: "Handwerksviertel", hafen: "Hafenviertel", adel: "Adelsviertel", arm: "Armenviertel", frei: "Freifläche", burg: "Burg", tempel: "Tempelbezirk" } as const;
/** Was jede Zone auf der Karte bewirkt — in einem Satz, ohne Fachwort. */
const ZONE_TITEL = {
  wohnen: "Häuserzeilen, hier und da eine Werkstatt.", markt: "Der Marktplatz; in einer Stadt steht das Rathaus darauf.",
  handwerk: "Schmieden, Werkstätten und Lager.", hafen: "Lagerhäuser und Stege — gebaut wird nur am Ufer.",
  adel: "Große Häuser mit Gärten.", arm: "Kleine, dicht gedrängte Häuser.", frei: "Hier wird nichts gebaut.",
  burg: "Eine Burg mit Bergfried, Kaserne und eigenem Hof.", tempel: "Ein großes Gotteshaus mit freiem Platz davor.",
} as const;
const EMPTY: SettlementPlan = { schemaVersion: 1, zonen: [] };
const rect = (x: number, y: number, w: number, h: number): readonly PlanPoint[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const box = (z: SettlementZone) => {
  const xs = z.polygon.map(p => p[0]), ys = z.polygon.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};
export function MapZonePlanner({ value = EMPTY, onChange, vorschlag }: { value?: SettlementPlan; onChange: (value: SettlementPlan | undefined) => void; vorschlag?: SettlementPlan | undefined }) {
  const [selected, setSelected] = useState(""), [message, setMessage] = useState("");
  const [drawing, setDrawing] = useState<{ start: PlanPoint; end: PlanPoint } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const zone = value.zonen.find(z => z.id === selected), bounds = zone ? box(zone) : null;
  const commit = (zonen: readonly SettlementZone[]) => {
    try { const next = parseSettlementPlan({ schemaVersion: 1, zonen }); setMessage(""); onChange(next.zonen.length ? next : undefined); }
    catch { setMessage(t("Die Zone muss innerhalb der Karte liegen und eine Fläche ohne Überschneidung ihrer Kanten bilden.")); }
  };
  const add = (polygon: readonly PlanPoint[] = rect(.15, .15, .35, .35)) => {
    if (value.zonen.length >= SETTLEMENT_PLAN_LIMITS.zones) return;
    let number = 1; while (value.zonen.some(z => z.id === `zone-${number}`)) number++;
    const id = `zone-${number}`;
    commit([...value.zonen, { id, name: t("Zone {nummer}", { nummer: number }), nutzung: "wohnen", dichte: 1, polygon }]); setSelected(id);
  };
  const update = (patch: Partial<SettlementZone>) => {
    if (!zone) return;
    const zonen = value.zonen.map(z => z.id === zone.id ? { ...z, ...patch } : z);
    // A text field must allow temporary empty values and spaces while typing. The shared
    // generation validator blocks preview/save until the complete plan is valid again.
    if (patch.name !== undefined) { onChange({ schemaVersion: 1, zonen }); setMessage(""); }
    else commit(zonen);
  };
  const point = (event: PointerEvent<SVGSVGElement>): PlanPoint => {
    const r = event.currentTarget.getBoundingClientRect();
    const snap = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000;
    return [snap((event.clientX - r.left) / r.width), snap((event.clientY - r.top) / r.height)];
  };
  const resize = (axis: "x" | "y" | "w" | "h", percent: number) => {
    if (!zone || !bounds || !Number.isFinite(percent)) return;
    const next = { ...bounds, [axis]: percent / 100 };
    if (next.x < 0 || next.y < 0 || next.w < .01 || next.h < .01 || next.x + next.w > 1 + 1e-10 || next.y + next.h > 1 + 1e-10) {
      setMessage(t("Position und Größe müssen zusammen innerhalb von 100 Prozent liegen.")); return;
    }
    update({ polygon: zone.polygon.map(([x, y]) => [Math.max(0, Math.min(1, next.x + (x - bounds.x) / bounds.w * next.w)), Math.max(0, Math.min(1, next.y + (y - bounds.y) / bounds.h * next.h))]) });
  };
  return <details className="map-zone-planner"><summary>{t("Viertel & Freiflächen planen")}</summary>
    <p>{t("Ziehe Rechtecke auf dem Plan oder füge eine Zone über den Knopf hinzu. Die Werte darunter lassen sich auch mit der Tastatur ändern.")}</p>
    <svg ref={svg} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={t("Zonenplan zeichnen")}
      onPointerDown={event => { if (event.currentTarget.closest("fieldset:disabled") || event.button !== 0 || value.zonen.length >= SETTLEMENT_PLAN_LIMITS.zones) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const start = point(event); setDrawing({ start, end: start }); }}
      onPointerMove={event => { if (drawing) setDrawing({ ...drawing, end: point(event) }); }}
      onPointerCancel={() => setDrawing(null)} onLostPointerCapture={() => setDrawing(null)}
      onPointerUp={event => { if (!drawing) return; const end = point(event), x = Math.min(end[0], drawing.start[0]), y = Math.min(end[1], drawing.start[1]), w = Math.abs(end[0] - drawing.start[0]), h = Math.abs(end[1] - drawing.start[1]); setDrawing(null);
        if (w >= .01 && h >= .01) add(rect(x, y, w, h)); else { const found = [...value.zonen].reverse().find(z => planContains(z.polygon, end)); if (found) setSelected(found.id); }
      }}>
      <rect width="100" height="100" className="map-zone-paper" />
      {value.zonen.map((z, i) => <g key={z.id} className={`map-zone ${z.nutzung}${z.id === selected ? " selected" : ""}`}><polygon points={z.polygon.map(p => `${p[0] * 100},${p[1] * 100}`).join(" ")} /><text x={(box(z).x + box(z).w / 2) * 100} y={(box(z).y + box(z).h / 2) * 100}>{i + 1}</text><title>{z.name}</title></g>)}
      {drawing ? <rect className="map-zone-draft" x={Math.min(drawing.start[0], drawing.end[0]) * 100} y={Math.min(drawing.start[1], drawing.end[1]) * 100} width={Math.abs(drawing.end[0] - drawing.start[0]) * 100} height={Math.abs(drawing.end[1] - drawing.start[1]) * 100} /> : null}
    </svg>
    <button type="button" disabled={value.zonen.length >= SETTLEMENT_PLAN_LIMITS.zones} onClick={() => add()}>{t("Zone hinzufügen")}</button>
    {vorschlag?.zonen.length ? <button type="button" onClick={() => { try { onChange(parseSettlementPlan(vorschlag)); setSelected(""); setMessage(t("Die Viertel der Vorschau sind jetzt Zonen. Verschiebe sie und erzeuge die Karte neu.")); } catch { setMessage(t("Die Viertel dieser Vorschau lassen sich nicht als Zonen übernehmen. Erzeuge eine neue Vorschau.")); } }}>{t("Viertel aus der Karte übernehmen")}</button> : null}
    <p className="field-help">{t("Bis zu 16 Zonen. Die letzte überlagerte Zone hat Vorrang; Freiflächen sperren Gebäude immer. Das Gelände bleibt, wie es ist; legst du den Markt woanders hin, führen die Hauptstraßen dorthin.")}</p>
    <details className="map-zone-legend"><summary>{t("Was bewirken die Zonen?")}</summary>
      <dl>{SETTLEMENT_USES.map(use => <div key={use}><dt>{t(ZONE_LABEL[use])}</dt><dd>{t(ZONE_TITEL[use])}</dd></div>)}</dl>
    </details>
    <label>{t("Zone auswählen")}<select aria-label={t("Zone auswählen")} value={zone?.id ?? ""} onChange={e => setSelected(e.target.value)}><option value="">{t("Zone auswählen …")}</option>{value.zonen.map((z, i) => <option key={z.id} value={z.id}>{i + 1}. {z.name}</option>)}</select></label>
    {zone && bounds ? <div className="map-zone-fields">
      <label>{t("Name des Viertels")}<input maxLength={80} value={zone.name} onChange={e => update({ name: e.target.value })} /></label>
      <label>{t("Nutzung der Zone")}<select aria-label={t("Nutzung der Zone")} value={zone.nutzung} onChange={e => update({ nutzung: e.target.value as SettlementZone["nutzung"] })}>{SETTLEMENT_USES.map(use => <option key={use} value={use}>{t(ZONE_LABEL[use])}</option>)}</select></label>
      <label>{t("Bebauungsdichte")} <output>{Math.round(zone.dichte * 100)} %</output><input type="range" min={0} max={1} step={.05} disabled={zone.nutzung === "frei"} value={zone.dichte} onChange={e => update({ dichte: e.target.valueAsNumber })} /></label>
      <div className="map-zone-numbers">{(["x", "y", "w", "h"] as const).map(axis => <label key={axis}>{axis === "x" ? t("Links (%)") : axis === "y" ? t("Oben (%)") : axis === "w" ? t("Breite (%)") : t("Höhe (%)")}<input type="number" min={axis === "w" || axis === "h" ? 1 : 0} max={100} step={1} value={Math.round(bounds[axis] * 1000) / 10} onChange={e => resize(axis, e.target.valueAsNumber)} /></label>)}</div>
      {zone.nutzung === "hafen" ? <p>{t("Hafengebäude benötigen Ufernähe. Ohne passendes Ufer bleibt die Zone unbebaut; im Science-Fiction-Setting entstehen Raumhafenbauten.")}</p>
        : zone.nutzung !== "wohnen" ? <p>{t(ZONE_TITEL[zone.nutzung])}</p> : null}
      <button type="button" onClick={() => { commit(value.zonen.filter(z => z.id !== zone.id)); setSelected(""); }}>{t("Zone entfernen")}</button>
    </div> : null}
    {message ? <p role="alert">{message}</p> : null}
    <p className="field-help">{t("Der Plan gilt für neue Vorschauen und wird mit Kartenvorlagen gespeichert. Vorhandene Karten werden nicht verändert.")}</p>
  </details>;
}

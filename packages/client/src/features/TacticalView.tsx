import { useCallback, useEffect, useMemo, useState } from "react";
import type { TacticalAck, TacticalMoveInput, TacticalToken, TacticalView as Board } from "@chronicle/protocol";
import { snapMapPoint, type MapPoint, type ProjectedMapScene } from "@chronicle/render";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { TacticalPreparation } from "./TacticalPreparation";
import { TacticalImport } from "./TacticalImport";
import "./tactical.css";

type Page = "live" | "prepare" | "import";
export function TacticalView({ campaignId, gm, revision, onDirty }: { campaignId: string; gm: boolean; revision: number; onDirty: (value: boolean) => void }) {
  const [page, setPage] = useState<Page>("live"), [dirty, setDirty] = useState(false), [local, setLocal] = useState(0);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const refresh = useCallback(() => setLocal(v => v + 1), []);
  useEffect(() => () => onDirty(false), [onDirty]);
  return <div className="tactical-workspace">{gm ? <div className="view-tabs" aria-label="Szenenkarte">{([[
    "live", "Laufende Szene"], ["prepare", "Karte & Vorbereitung"], ["import", "Karte importieren"],
  ] as const).map(([id, label]) => <Button key={id} aria-pressed={page === id} onClick={() => {
    if (page === id || (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?"))) return;
    report(false); setPage(id);
  }}>{label}</Button>)}</div> : null}
    {page === "prepare" && gm ? <TacticalPreparation campaignId={campaignId} revision={revision + local} onChanged={refresh} onDirty={report} />
      : page === "import" && gm ? <TacticalImport campaignId={campaignId} onChanged={refresh} onDirty={report} />
      : <LiveBoard campaignId={campaignId} revision={revision + local} onChanged={refresh} onDirty={report} />}
  </div>;
}

function LiveBoard({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const board = useResource<Board | null>(apiPath(campaignId, "/tactical/active"), revision, 6000);
  const [grid, setGrid] = useState(true), [snap, setSnap] = useState(true), [selected, setSelected] = useState(""), [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [epochs, setEpochs] = useState<Record<string, number>>({});
  const task = useTask(), command = useCommand();
  const report = useCallback((id: string, dirty: boolean) => setDrafts(old => ({ ...old, [id]: dirty })), []);
  useEffect(() => { onDirty(Object.values(drafts).some(Boolean)); }, [drafts, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const data = board.data;
  const scene = useMemo<ProjectedMapScene | null>(() => data ? {
    id: data.sessionId, width: data.size[0], height: data.size[1], rasterScope: data.rasterDigest,
    cells: data.regions.map(r => ({ id: r.id, polygon: r.points, fill: 0xd98e3b })), pins: [],
    tokens: data.tokens.map(t => ({ id: t.id, x: t.x, y: t.y, label: t.name, ...(t.version === null ? {} : { revision: t.version }), radius: Math.min(40, Math.max(7, 11 * t.scale)), movable: data.active && t.canMove && !task.busy, color: t.canMove ? 0xebc887 : 0x81b8d1 })),
    ...(grid ? { grid: data.grid } : {}), lines: data.gm ? data.walls?.map(w => ({ id: w.id, points: w.points })) : [],
  } : null, [data, grid, task.busy]);
  const move = async (token: TacticalToken, values: Omit<TacticalMoveInput, "commandId" | "expectedVersion">) => {
    if (!data || token.version === null) throw new Error("Diese Figur kann gerade nicht bewegt werden.");
    const result = await command<TacticalAck>(apiPath(campaignId, `/sessions/${data.sessionId}/tactical/tokens/${token.id}/move`), { ...values, expectedVersion: token.version });
    onChanged(); return result;
  };
  const drag = (id: string, to: MapPoint) => {
    const token = data?.tokens.find(t => t.id === id); if (!token || !data || task.busy) return;
    if (drafts[id] && !window.confirm("Ungespeicherte Positionswerte dieser Figur verwerfen?")) return;
    const at = snap ? snapMapPoint(to, data.grid) : to;
    void task.run(async () => { await move(token, { x: at[0], y: at[1], elevation: token.elevation, rotation: token.rotation, scale: token.scale }); setEpochs(v => ({ ...v, [id]: (v[id] ?? 0) + 1 })); });
  };
  if (board.loading) return <Loading text="Szenenkarte wird geladen …" />;
  return <div className="tactical-live">{board.error || task.error ? <Notice error>{board.error || task.error}</Notice> : null}
    {!data || !scene ? <EmptyState title="Noch keine Szenenkarte am Tisch.">Die Spielleitung kann eine Karte importieren, mit einer vorbereiteten Szene verbinden und diese Szene beginnen.</EmptyState> : <>
      <div className="page-heading"><div><h2>{data.map?.name ?? "Eure Szenenkarte"}</h2><p className="field-help">{data.gm ? "Ansicht der Spielleitung" : "Karte nach deinem gewählten Wissensblick"} · Höhe ist ein einzelner Wert, kein Stockwerk.</p></div><div className="button-row"><label className="check-label"><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /> Raster anzeigen</label><label className="check-label"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Beim Ziehen einrasten</label></div></div>
      <TacticalCanvas scene={scene} tileBase={apiPath(campaignId, `/sessions/${data.sessionId}/tactical/tiles`)} onMove={drag} onSelect={hit => setSelected(hit?.kind === "token" ? hit.id : "")} onScopeInvalidated={onChanged} />
      <section className="panel"><h3>Figuren auf der Karte</h3><p className="field-help">Diese Liste bietet dieselben Bewegungen wie die Karte. Änderungen gelten nach Bestätigung durch den Server. Bewegung allein gibt kein neues Wissen frei.</p>
        {data.tokens.length ? <div className="tactical-token-list">{data.tokens.map(token => <TokenEditor key={`${data.sessionId}:${token.id}:${epochs[token.id] ?? 0}`} token={token} selected={token.id === selected} active={data.active} busy={task.busy} onMove={move} onDirty={report} />)}</div> : <p>In dieser Ansicht sind noch keine Figuren sichtbar.</p>}
      </section>
      {data.portals?.length ? <section className="panel"><h3>Portale</h3><p className="field-help">Offen/geschlossen übernimmt die Kartendaten; Fenster und Türen lassen sich daraus nicht immer unterscheiden.</p><ul className="tactical-object-list">{data.portals.map((p, i) => <li key={p.id}><span>Portal {i + 1} · {p.closed ? "Geschlossen" : "Offen"}</span><Button disabled={task.busy || !data.active} onClick={() => void task.run(async () => { await command(apiPath(campaignId, `/sessions/${data.sessionId}/tactical/portals/${encodeURIComponent(p.id)}`), { expectedVersion: p.version, closed: !p.closed }); onChanged(); })}>{p.closed ? "Öffnen" : "Schließen"}</Button></li>)}</ul></section> : null}
      {data.undoTargets.length ? <section className="panel"><h3>Letzte Änderung zurücknehmen</h3><p className="field-help">Die Rücknahme ändert die Position oder den Portalzustand mit einer neuen Version. Wissen und Würfelbelege bleiben erhalten.</p><div className="button-row">{data.undoTargets.map(t => <Button key={t.commandId} disabled={task.busy || !data.active} onClick={() => void task.run(async () => { await command(apiPath(campaignId, `/sessions/${data.sessionId}/tactical/undo`), { targetCommandId: t.commandId, expectedVersion: t.version }); onChanged(); })}>Rücknahme: {data.tokens.find(token => token.id === t.subjectId)?.name ?? "Portal"}</Button>)}</div></section> : null}
    </>}
  </div>;
}

function TokenEditor({ token, active, busy, selected, onMove, onDirty }: {
  token: TacticalToken; active: boolean; busy: boolean; selected: boolean;
  onMove: (token: TacticalToken, values: Omit<TacticalMoveInput, "commandId" | "expectedVersion">) => Promise<TacticalAck>;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [baseline, setBaseline] = useState(token), [values, setValues] = useState({ x: token.x, y: token.y, elevation: token.elevation, rotation: token.rotation, scale: token.scale });
  const task = useTask(), dirty = Object.entries(values).some(([key, value]) => value !== baseline[key as keyof typeof values]);
  const replace = (next: TacticalToken) => { setBaseline(next); setValues({ x: next.x, y: next.y, elevation: next.elevation, rotation: next.rotation, scale: next.scale }); };
  useEffect(() => { onDirty(token.id, dirty); }, [token.id, dirty, onDirty]); useEffect(() => () => onDirty(token.id, false), [token.id, onDirty]);
  useEffect(() => { if (!token.canMove || (!dirty && token.version !== null && (baseline.version === null || token.version >= baseline.version))) replace(token); }, [token, dirty, baseline.version]);
  const changed = token.version !== null && baseline.version !== null && token.version > baseline.version;
  return <form className={selected ? "tactical-token selected" : "tactical-token"} onSubmit={e => { e.preventDefault(); void task.run(async () => { const ack = await onMove(baseline, values); replace({ ...baseline, ...values, version: ack.version }); }); }}>
    <h4>{token.name}</h4>{changed && dirty ? <Notice>Die Position wurde inzwischen geändert. <Button onClick={() => { if (window.confirm("Ungespeicherte Positionswerte verwerfen?")) replace(token); }}>Aktuelle Position übernehmen</Button></Notice> : null}
    <fieldset disabled={busy || task.busy || !token.canMove || !active} className="tactical-command-fields"><div className="rule-fields">{([[
      "x", "X"], ["y", "Y"], ["elevation", "Höhe"], ["rotation", "Drehung (Radiant)"], ["scale", "Größe"],
    ] as const).map(([id, label]) => <label key={id}>{label}<input type="number" step="any" required min={id === "scale" ? .001 : -1e9} max={id === "scale" ? 1e6 : 1e9} value={values[id]} onChange={e => setValues(v => ({ ...v, [id]: e.target.valueAsNumber }))} /></label>)}</div>
      {token.canMove ? <Button type="submit" disabled={!dirty}>Position speichern</Button> : null}
    </fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}

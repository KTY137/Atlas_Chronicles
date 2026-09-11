// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { MapFloorView, MapStudioAck, RoomFogView, TacticalMapCard } from "@chronicle/protocol";
import { floorRoomAnchor, type MapFloorLinkKind } from "@chronicle/szene";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { useCommand } from "./game-api";
import "./map-floors-fog.css";

export interface FloorDestination { id: string; title: string; focus?: { id: string; x: number; y: number } }
const kindLabel = (kind: MapFloorLinkKind) => kind === "stairs" ? t("Treppe") : kind === "lift" ? t("Aufzug") : t("Durchbruch");
function LinkOptions() { return <><option value="stairs">{t("Treppe")}</option><option value="lift">{t("Aufzug")}</option><option value="opening">{t("Durchbruch")}</option></>; }

export function MapFloorsPanel({ campaignId, current, revision, disabled = false, onChanged, onOpen }: {
  campaignId: string; current: TacticalMapCard; revision: number; disabled?: boolean;
  onChanged: () => void; onOpen: (destination: FloorDestination) => void;
}) {
  const base = apiPath(campaignId, `/tactical/maps/${encodeURIComponent(current.id)}`), [epoch, setEpoch] = useState(0);
  const floors = useResource<MapFloorView>(`${base}/floors`, revision + epoch, 10000);
  const rooms = useResource<RoomFogView>(`${base}/fog?revision=${current.revision}`, revision + epoch);
  const [name, setName] = useState(""), [level, setLevel] = useState(1), [kind, setKind] = useState<MapFloorLinkKind>("stairs");
  const [roomId, setRoomId] = useState(""), [copyContents, setCopyContents] = useState(false);
  const [rename, setRename] = useState(""), [targetId, setTargetId] = useState(""), [targetRoom, setTargetRoom] = useState("");
  const [linkName, setLinkName] = useState(""), [position, setPosition] = useState<[number, number] | null>(null);
  const target = useResource<RoomFogView>(targetId ? apiPath(campaignId, `/tactical/maps/${encodeURIComponent(targetId)}/fog`) : null, revision + epoch);
  const task = useTask(), command = useCommand(), pending = useRef(false);
  const stack = floors.data?.stack, floor = stack?.floors.find(f => f.mapId === current.id);
  const sourceRoom = rooms.data?.rooms.find(r => r.id === roomId) ?? rooms.data?.rooms[0];
  const destinationRoom = target.data?.rooms.find(r => r.id === targetRoom) ?? target.data?.rooms[0];
  const anchor = position ?? (sourceRoom ? floorRoomAnchor(sourceRoom.points) : [0, 0]);
  useEffect(() => { if (floor) setLevel(floor.level + 1); }, [floor?.level, current.id]);
  const refresh = () => { setEpoch(v => v + 1); onChanged(); };
  const send = (suffix: string, body: Record<string, unknown>, after?: (ack: MapStudioAck) => void) => {
    if (!floors.data || disabled || pending.current || task.busy || floors.error) return;
    pending.current = true;
    void task.run(async () => {
      try { const ack = await command<MapStudioAck>(`${base}/floors${suffix}`, { ...body, expectedVersion: floors.data!.version }); refresh(); after?.(ack); }
      finally { pending.current = false; }
    });
  };
  const defaultName = level < 0 ? t("Keller {nummer}", { nummer: Math.abs(level) }) : t("Obergeschoss {nummer}", { nummer: level });
  const freeLevel = !!stack && Number.isInteger(level) && level >= -8 && level <= 32 && !stack.floors.some(f => f.level === level);
  const adjacent = kind === "lift" || floor !== undefined && Math.abs(floor.level - level) === 1;
  const blocked = disabled || task.busy || !!floors.error || !!rooms.error;
  const open = (destination: FloorDestination) => {
    if (disabled || task.busy) return;
    if ((name.trim() || rename.trim() || linkName.trim()) && !window.confirm(t("Ungespeicherte Geschossangaben verwerfen?"))) return;
    onOpen(destination);
  };
  return <details className="panel map-floors" data-testid="map-floors-panel">
    <summary>{t("Geschosse & Keller")}</summary>
    {floors.loading || rooms.loading ? <Loading /> : null}
    {floors.error || rooms.error || task.error ? <Notice error>{floors.error || rooms.error || task.error}<Button onClick={refresh}>{t("Geschossstand neu laden")}</Button></Notice> : null}
    {disabled ? <Notice>{t("Bitte zuerst die Kartenänderungen speichern oder verwerfen.")}</Notice> : null}
    {stack && floors.data ? <>
      <p className="field-help">{t("Jedes Geschoss ist eine eigene bearbeitbare Karte. Übergänge behalten dieselbe Position auf beiden Seiten. Laufende Szenen wechseln dadurch nicht automatisch das Geschoss.")}</p>
      <nav className="floor-tabs" aria-label={t("Geschoss auswählen")}>
        {[...stack.floors].reverse().map(f => <Button key={f.mapId} variant="quiet" aria-current={f.mapId === current.id ? "page" : undefined}
          disabled={disabled || task.busy || floors.data!.unavailable.includes(f.mapId)} onClick={() => open({ id: f.mapId, title: f.name })}>
          {t("Ebene {nummer}", { nummer: f.level })} · {f.name}</Button>)}
      </nav>
      <p>{t("{anzahl} von 16 Geschossen", { anzahl: stack.floors.length })}</p>
      <fieldset disabled={blocked || !sourceRoom || stack.floors.length >= 16}>
        <legend>{t("Geschoss aus diesem Grundriss anlegen")}</legend>
        <div className="floor-fields">
          <label>{t("Name des neuen Geschosses")}<input aria-label={t("Name des neuen Geschosses")} maxLength={160} value={name} placeholder={defaultName} onChange={e => setName(e.target.value)} /></label>
          <label>{t("Geschossnummer")}<input aria-label={t("Geschossnummer")} type="number" min={-8} max={32} step={1} value={Number.isFinite(level) ? level : ""} onChange={e => setLevel(e.target.valueAsNumber)} /></label>
          <label>{t("Treppenraum im aktuellen Geschoss")}<select aria-label={t("Treppenraum im aktuellen Geschoss")} value={sourceRoom?.id ?? ""} onChange={e => { setRoomId(e.target.value); setPosition(null); }}>
            {(rooms.data?.rooms ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select></label>
          <label>{t("Art des Geschossübergangs")}<select aria-label={t("Art des Geschossübergangs")} value={kind} onChange={e => setKind(e.target.value as MapFloorLinkKind)}><LinkOptions /></select></label>
        </div>
        <label className="check-label"><input type="checkbox" checked={copyContents} onChange={e => setCopyContents(e.target.checked)} />{t("Lose Objekte und Licht übernehmen")}</label>
        <p className="field-help">{t("Der gespeicherte Grundriss wird kopiert, nicht seine Wissensfreigaben oder Unterkarten. Ein vorhandenes Hintergrundbild bleibt erhalten. Das neue Geschoss startet vollständig verdeckt.")}</p>
        {!freeLevel ? <p role="status">{t("Bitte eine freie Geschossnummer zwischen −8 und 32 wählen.")}</p> : !adjacent ? <p role="status">{t("Treppen und Durchbrüche verbinden benachbarte Geschosse. Für mehrere Ebenen einen Aufzug wählen.")}</p> : null}
        <Button disabled={blocked || !sourceRoom || !freeLevel || !adjacent || stack.floors.length >= 16} onClick={() => send("", {
          expectedMapVersion: current.version, name: name.trim() || defaultName, level, fromRegionId: sourceRoom!.id, linkKind: kind, copyContents,
        }, ack => { setName(""); onOpen({ id: ack.mapId, title: name.trim() || defaultName }); })}>{t("Geschoss anlegen und öffnen")}</Button>
      </fieldset>
      {!sourceRoom ? <p>{t("Zuerst einen Raum im Karteneditor anlegen und speichern.")}</p> : null}
      <h3>{t("Übergänge dieses Geschosses")}</h3>
      <ul className="floor-links">{stack.links.filter(l => l.fromMapId === current.id || l.toMapId === current.id).map(link => {
        const targetId = link.fromMapId === current.id ? link.toMapId : link.fromMapId, to = stack.floors.find(f => f.mapId === targetId)!;
        const room = link.fromMapId === current.id ? link.toRegionId : link.fromRegionId;
        return <li key={link.id}><Button variant="quiet" disabled={disabled || task.busy || floors.data!.unavailable.includes(to.mapId)} onClick={() => open({ id: to.mapId, title: to.name, focus: { id: room, x: link.position[0], y: link.position[1] } })}>
          {kindLabel(link.kind)}: {link.name} → {to.name}</Button><small>{t("Position {x} / {y}", { x: link.position[0], y: link.position[1] })}</small>
          <Button variant="quiet" disabled={blocked} onClick={() => { if (window.confirm(t("Diesen Geschossübergang entfernen? Beide Karten bleiben erhalten."))) send("/unlink", { linkId: link.id }); }}>{t("Übergang entfernen")}</Button></li>;
      })}</ul>
      {stack.floors.length > 1 ? <details><summary>{t("Weiteren Übergang verbinden")}</summary>
        <fieldset disabled={blocked}><div className="floor-fields">
          <label>{t("Name des Übergangs")}<input aria-label={t("Name des Übergangs")} value={linkName} maxLength={160} onChange={e => setLinkName(e.target.value)} /></label>
          <label>{t("Zielgeschoss")}<select aria-label={t("Zielgeschoss")} value={targetId} onChange={e => { setTargetId(e.target.value); setTargetRoom(""); }}><option value="">{t("Bitte wählen")}</option>{stack.floors.filter(f => f.mapId !== current.id).map(f => <option key={f.mapId} value={f.mapId}>{f.name}</option>)}</select></label>
          <label>{t("Zielraum")}<select aria-label={t("Zielraum")} value={destinationRoom?.id ?? ""} onChange={e => setTargetRoom(e.target.value)}>{target.data?.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>{t("Übergang X")}<input aria-label={t("Übergang X")} type="number" min={0} max={current.document.geometry.size[0]} step="any" value={Number.isFinite(anchor[0]) ? anchor[0] : ""} onChange={e => setPosition([e.target.valueAsNumber, anchor[1]!])} /></label>
          <label>{t("Übergang Y")}<input aria-label={t("Übergang Y")} type="number" min={0} max={current.document.geometry.size[1]} step="any" value={Number.isFinite(anchor[1]) ? anchor[1] : ""} onChange={e => setPosition([anchor[0]!, e.target.valueAsNumber])} /></label>
        </div><p className="field-help">{t("Verwendet den oben gewählten Treppenraum und die Übergangsart. Die Position muss in beiden Räumen liegen.")}</p>
        {target.error ? <Notice error>{target.error}</Notice> : null}
        <Button disabled={blocked || !!target.error || !sourceRoom || !destinationRoom || !linkName.trim() || !anchor.every(Number.isFinite)} onClick={() => send("/links", { name: linkName.trim(), kind, toMapId: targetId, fromRegionId: sourceRoom!.id, toRegionId: destinationRoom!.id, position: anchor }, () => setLinkName(""))}>{t("Geschosse verbinden")}</Button>
        </fieldset></details> : null}
      {floors.data.version > 0 ? <details><summary>{t("Geschossnamen und Zugehörigkeit bearbeiten")}</summary>
        <label>{t("Neuer Geschossname")}<input aria-label={t("Neuer Geschossname")} value={rename} maxLength={160} placeholder={floor?.name} onChange={e => setRename(e.target.value)} /></label>
        <Button disabled={blocked || !rename.trim()} onClick={() => send("/name", { name: rename.trim() }, () => setRename(""))}>{t("Geschossname speichern")}</Button>
        {current.id !== stack.rootMapId ? <Button variant="quiet" disabled={blocked} onClick={() => { if (window.confirm(t("Dieses Geschoss aus dem Verband lösen? Seine Übergänge werden entfernt; die Karte und Raumfreigaben bleiben erhalten."))) send("/detach", {}); }}>{t("Geschoss aus Verband lösen")}</Button> : null}
      </details> : null}
    </> : null}
  </details>;
}

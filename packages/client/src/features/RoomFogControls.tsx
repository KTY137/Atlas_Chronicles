// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomFogView, RoomFogSetInput } from "@chronicle/protocol";
import { visibleFogRegions } from "@chronicle/szene";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { useCommand } from "./game-api";
import "./map-floors-fog.css";

/** Mounted only in GM surfaces. The player renderer never receives this room index or state. */
export function RoomFogControls({ campaignId, mapId, mapRevision, selectedRoomId = "", onChanged, disabled = false }: {
  campaignId: string; mapId: string; mapRevision: number; selectedRoomId?: string; onChanged: () => void; disabled?: boolean;
}) {
  const path = apiPath(campaignId, `/tactical/maps/${encodeURIComponent(mapId)}/fog`);
  const [epoch, setEpoch] = useState(0), [audience, setAudience] = useState(""), [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Set<string>>(() => new Set(selectedRoomId ? [selectedRoomId] : []));
  const resource = useResource<RoomFogView>(`${path}?revision=${mapRevision}`, epoch, 4000);
  const task = useTask(), command = useCommand(), pending = useRef(false), data = resource.data;
  useEffect(() => { setSelection(new Set(selectedRoomId ? [selectedRoomId] : [])); }, [selectedRoomId, mapId, mapRevision]);
  const available = useMemo(() => new Set(data?.rooms.map(r => r.id) ?? []), [data]);
  const selected = [...selection].filter(id => available.has(id));
  const visible = data ? visibleFogRegions(data.state, audience || null, available, new Set()) : new Set<string>();
  const rooms = data?.rooms.filter(r => r.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  const toggle = (id: string) => setSelection(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const refresh = () => { setEpoch(v => v + 1); onChanged(); };
  const apply = (action: RoomFogSetInput["action"]) => {
    if (!data || disabled || pending.current || task.busy || resource.error) return;
    if (action === "knowledge" && !window.confirm(t("Zum Chronik-Wissen zurückkehren? Bekannte Räume können dadurch wieder sichtbar werden."))) return;
    if (action === "reveal" && selected.length === data.rooms.length && selected.length > 1
      && !window.confirm(t("Alle Räume für den gewählten Wissensblick aufdecken?"))) return;
    pending.current = true;
    void task.run(async () => {
      try { await command(path, { expectedVersion: data.version, mapRevision,
        action, audience: ["enable", "knowledge"].includes(action) ? null : audience || null,
        regionIds: ["enable", "knowledge"].includes(action) ? [] : selected }); refresh(); }
      finally { pending.current = false; }
    });
  };
  return <details className="panel map-room-fog" data-testid="room-fog-controls">
    <summary>{t("Fog of War · Räume aufdecken")}</summary>
    <p className="field-help">{t("Freigaben gelten für dieses Geschoss und Kartenversion {revision}. Aufdecken gibt keine geheimen Chroniktexte frei.", { revision: mapRevision })}</p>
    {disabled ? <Notice>{t("Bitte zuerst die Kartenänderungen speichern oder verwerfen.")}</Notice> : null}
    {resource.loading ? <Loading /> : null}
    {resource.error || task.error ? <Notice error>{resource.error || task.error}<Button onClick={refresh}>{t("Freigabestand neu laden")}</Button></Notice> : null}
    {data ? <>
      <div className="button-row"><strong>{data.state.enabled ? t("Manueller Raumnebel aktiv") : t("Sicht nach Chronik-Wissen")}</strong>
        <Button variant="quiet" disabled={disabled || task.busy || !!resource.error} onClick={() => apply(data.state.enabled ? "knowledge" : "enable")}>{data.state.enabled ? t("Chronik-Wissen verwenden") : t("Manuellen Raumnebel aktivieren")}</Button>
      </div>
      {!data.state.enabled ? <p className="field-help">{t("Im Chronikmodus zeigt diese Liste keine tatsächliche Spielersicht. Aufdecken oder Verbergen aktiviert den manuellen Raumnebel; ohne bisherige Freigaben bleiben alle anderen Räume verdeckt.")}</p> : null}
      <label>{t("Raumfreigabe für")}<select aria-label={t("Raumfreigabe für")} value={audience} onChange={e => setAudience(e.target.value)}>
        <option value="">{t("Ganze Gruppe")}</option>{data.actors.map(a => <option key={a.actorId} value={a.actorId}>{a.name}</option>)}
      </select></label>
      <p className="field-help">{t("Eine Gruppenaktion ersetzt persönliche Ausnahmen für die gewählten Räume. Einzelne Figuren können davon abweichende Freigaben erhalten.")}</p>
      <label>{t("Raumliste durchsuchen")}<input aria-label={t("Raumliste durchsuchen")} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="button-row"><Button variant="quiet" onClick={() => setSelection(new Set(rooms.map(r => r.id)))}>{t("Gefilterte Räume auswählen")}</Button>
        <Button variant="quiet" onClick={() => setSelection(new Set())}>{t("Raumauswahl leeren")}</Button><span aria-live="polite">{t("{anzahl} Räume ausgewählt", { anzahl: selected.length })}</span></div>
      <div className="room-fog-list" role="group" aria-label={t("Räume für Raumnebel")}>
        {rooms.map(room => <label className="room-fog-row" key={room.id}>
          <input type="checkbox" aria-label={t("Raum auswählen: {name}", { name: room.name })} checked={selection.has(room.id)} onChange={() => toggle(room.id)} />
          <span>{room.name}</span><small>{!data.state.enabled ? t("Chronikmodus") : visible.has(room.id) ? t("Aufgedeckt") : t("Verdeckt")}</small>
        </label>)}
      </div>
      {!rooms.length ? <p>{t("Keine passenden Räume vorhanden.")}</p> : null}
      <div className="button-row"><Button disabled={disabled || !selected.length || task.busy || !!resource.error} onClick={() => apply("reveal")}>{t("Ausgewählte Räume aufdecken")}</Button>
        <Button variant="quiet" disabled={disabled || !selected.length || task.busy || !!resource.error} onClick={() => apply("hide")}>{t("Ausgewählte Räume verbergen")}</Button></div>
      <p className="field-help">{t("Die Spielleitung sieht weiterhin die ganze Karte. Spielerdaten und Rasterbilder enthalten nur die freigegebenen Räume. Bereits gesehene Inhalte lassen sich nicht aus dem Gedächtnis zurücknehmen.")}</p>
    </> : null}
  </details>;
}

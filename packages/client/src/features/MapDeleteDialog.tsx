// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState } from "react";
import type { MapDeletionAck, MapDeletionPreview, MapReference } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText } from "../api";
import { useCommand } from "./game-api";
import "./map-context-menu.css";

export function MapDeleteDialog({ campaignId, target, onClose, onDeleted }: {
  campaignId: string; target: MapReference; onClose: () => void; onDeleted: (ack: MapDeletionAck) => void;
}) {
  const titleId = useId(), dialog = useRef<HTMLDialogElement>(null), mounted = useRef(true), submitting = useRef(false);
  const [preview,setPreview] = useState<MapDeletionPreview | null>(null), [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [refresh,setRefresh] = useState(0), [busy,setBusy] = useState(false), [stale,setStale] = useState(false);
  const command = useCommand(), path = apiPath(campaignId,`/maps/${target.kind}/${encodeURIComponent(target.id)}`);
  useEffect(() => {
    mounted.current = true; const element = dialog.current!; element.showModal();
    return () => { mounted.current = false; element.close(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setPreview(null); setError(""); setStale(false);
    void api<MapDeletionPreview>(`${path}/deletion-preview`,{ signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setPreview(value);
    }).catch(failure => { if (!controller.signal.aborted) setError(errorText(failure)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path,refresh]);
  const remove = async () => {
    if (!preview || stale || preview.blockers.length || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const ack = await command<MapDeletionAck>(`${path}/delete`,{ expectedVersion: preview.root.version, confirmationHash: preview.confirmationHash,
        confirmedMapIds: preview.maps.map(map => `${map.kind}:${map.id}`).sort() });
      if (mounted.current) onDeleted(ack);
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof ApiError && failure.status === 409) { setStale(true); setError("Die Karten oder ihre Verwendung haben sich geändert. Lade die Löschvorschau neu und prüfe sie erneut."); }
      else setError(errorText(failure));
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  return <dialog ref={dialog} className="map-delete-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}>
    <h2 id={titleId}>Karte löschen</h2>
    {loading ? <Loading text="Karten und Unterkarten werden geprüft …" /> : null}
    {preview ? <><p><strong>{preview.root.name}</strong> wird aus der Kartenbibliothek entfernt. {preview.maps.length > 1 ? `Dazu gehören ${preview.maps.length-1} verbundene Unterkarten.` : ""}</p>
      <section aria-label="Karten zum Löschen"><h3>{preview.maps.length === 1 ? "Diese Karte wird gelöscht" : `${preview.maps.length} Karten werden gelöscht`}</h3>
        <ul className="map-delete-list">{preview.maps.map(map => <li key={`${map.kind}:${map.id}`}><span>{map.name}</span><small>{map.kind === "atlas" ? "Weltkarte" : "Orts- oder Gebäudekarte"} · Version {map.version}</small></li>)}</ul></section>
      {preview.incoming ? <p>Der Eingang in <strong>{preview.incoming.parentName}</strong> wird wieder frei. Dort kann später ein neuer Innenraum entstehen.</p> : null}
      {preview.affectedPlans.length ? <section aria-label="Betroffene Szenenvorbereitungen"><h3>Szenen brauchen danach eine neue Karte</h3><ul>{preview.affectedPlans.map(plan => <li key={plan.sceneId}>{plan.name}</li>)}</ul></section> : null}
      {preview.blockers.length ? <Notice error><p>Diese Karten werden in laufenden Szenen verwendet. Beende diese Szenen, bevor du die Karten löschst.</p><ul>{preview.blockers.map(blocker => <li key={blocker.sessionId}>{blocker.name}</li>)}</ul></Notice> : null}
    </> : null}
    {error ? <Notice error>{error}</Notice> : null}
    <div className="map-delete-actions"><Button autoFocus disabled={busy} onClick={onClose}>Abbrechen</Button>
      {stale || !loading && (!preview || preview.blockers.length > 0) ? <Button disabled={busy} onClick={() => setRefresh(value => value+1)}>Löschvorschau neu laden</Button> : null}
      <Button variant="primary" className="map-delete-confirm" disabled={loading || busy || stale || !preview || !!preview.blockers.length} onClick={() => void remove()}>{busy ? "Wird gelöscht …" : preview && preview.maps.length > 1 ? `${preview.maps.length} Karten löschen` : "Karte endgültig löschen"}</Button>
    </div>
  </dialog>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState } from "react";
import type { MapDeletionAck, MapDeletionPreview, MapReference } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText } from "../api";
import { plural, t } from "../i18n";
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
      if (failure instanceof ApiError && failure.status === 409) { setStale(true); setError(t("Die Karten oder ihre Verwendung haben sich geändert. Lade die Löschvorschau neu und prüfe sie erneut.")); }
      else setError(errorText(failure));
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  return <dialog ref={dialog} className="map-delete-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}>
    <h2 id={titleId}>{t("Karte löschen")}</h2>
    {loading ? <Loading text={t("Karten und Unterkarten werden geprüft …")} /> : null}
    {preview ? <><p>{t("{name} wird aus der Kartenbibliothek entfernt.", { name: preview.root.name })} {preview.maps.length > 1 ? t("Dazu gehören {anzahl} verbundene Unterkarten.", { anzahl: preview.maps.length-1 }) : ""}</p>
      <section aria-label={t("Karten zum Löschen")}><h3>{plural(preview.maps.length, "Diese Karte wird gelöscht", "{n} Karten werden gelöscht")}</h3>
        <ul className="map-delete-list">{preview.maps.map(map => <li key={`${map.kind}:${map.id}`}><span>{map.name}</span><small>{map.kind === "atlas" ? t("Weltkarte") : t("Orts- oder Gebäudekarte")} · {t("Version {version}", { version: map.version })}</small></li>)}</ul></section>
      {preview.incoming ? <p>{t("Der Eingang in {name} wird wieder frei. Dort kann später ein neuer Innenraum entstehen.", { name: preview.incoming.parentName })}</p> : null}
      {preview.affectedPlans.length ? <section aria-label={t("Betroffene Szenenvorbereitungen")}><h3>{t("Szenen brauchen danach eine neue Karte")}</h3><ul>{preview.affectedPlans.map(plan => <li key={plan.sceneId}>{plan.name}</li>)}</ul></section> : null}
      {preview.blockers.length ? <Notice error><p>{t("Diese Karten werden in laufenden Szenen verwendet. Beende diese Szenen, bevor du die Karten löschst.")}</p><ul>{preview.blockers.map(blocker => <li key={blocker.sessionId}>{blocker.name}</li>)}</ul></Notice> : null}
    </> : null}
    {error ? <Notice error>{error}</Notice> : null}
    <div className="map-delete-actions"><Button autoFocus disabled={busy} onClick={onClose}>{t("Abbrechen")}</Button>
      {stale || !loading && (!preview || preview.blockers.length > 0) ? <Button disabled={busy} onClick={() => setRefresh(value => value+1)}>{t("Löschvorschau neu laden")}</Button> : null}
      <Button variant="danger" className="map-delete-confirm" disabled={loading || busy || stale || !preview || !!preview.blockers.length} onClick={() => void remove()}>{busy ? t("Wird gelöscht …") : preview && preview.maps.length > 1 ? t("{anzahl} Karten löschen", { anzahl: preview.maps.length }) : t("Karte endgültig löschen")}</Button>
    </div>
  </dialog>;
}

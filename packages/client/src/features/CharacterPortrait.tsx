// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { ActorCard } from "@chronicle/protocol";
import { ACTOR_PORTRAIT_LIMITS, type ActorPortraitCard } from "../../../protocol/src/actor-portrait";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import "./character-sheet.css";

/** The original raster is stored on the server, separately from the sheet's rules and revision. */
export function CharacterPortrait({ campaignId, actorId, revision, onDirty, onChanged }: {
  campaignId: string; actorId: string; revision: number; onDirty(value: boolean): void; onChanged(): void;
}) {
  const base = apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}`);
  const actor = useResource<ActorCard>(base, revision), portrait = useResource<ActorPortraitCard>(`${base}/portrait`, revision);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(""), [saved, setSaved] = useState<ActorPortraitCard | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), task = useTask();
  const current = portrait.error && !portrait.data ? null : saved && (!portrait.data || saved.version > portrait.data.version) ? saved : portrait.data;
  const dirty = file !== null || task.busy;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const clear = () => { setFile(null); if (fileInput.current) fileInput.current.value = ""; };
  const accept = (value: ActorPortraitCard) => { setSaved(value); clear(); onChanged(); };
  const name = actor.data?.name ?? t("Deine Figur");
  const source = preview || (current?.image ? `${base}/portrait/file?v=${current.version}` : "");
  return <section className="panel character-identity" aria-label={t("Figurenporträt")}>
    <figure className="character-portrait">
      {source ? <img src={source} alt={t("Porträt von {name}", { name })} /> : <div className="character-portrait-empty"><UserRound size={58} aria-hidden="true" /><span>{t("Noch kein Porträt")}</span></div>}
    </figure>
    <div className="character-identity-details"><p className="eyebrow">{t("Dein Charakter")}</p><h2>{name}</h2>
      <p className="field-help">{t("Dein Bild, deine Werte und alles, was du bei dir trägst.")}</p>
      {portrait.loading || actor.loading ? <Loading /> : null}
      {portrait.error || actor.error ? <Notice error>{portrait.error || actor.error}</Notice> : null}
      {current?.image ? <a href={`${base}/portrait/file`} target="_blank" rel="noreferrer">{t("Originalbild öffnen")}</a> : null}
      {actor.data?.canControl && current ? <>
        <label className="character-portrait-input">{t("Porträt auswählen")}<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={task.busy} onChange={event => {
          const chosen = event.target.files?.[0] ?? null;
          if (chosen && chosen.size > ACTOR_PORTRAIT_LIMITS.bytes) { clear(); task.setError(t("Das Porträt darf höchstens 8 MB groß sein.")); return; }
          task.setError(""); setFile(chosen);
        }} /></label>
        <p className="field-help">{t("PNG, JPEG, WebP oder GIF · höchstens 8 MB und 4096 × 4096 Pixel. Das Original bleibt erhalten.")}</p>
        <div className="button-row">
          {file ? <><Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => {
            const response = await fetch(`${base}/portrait/bytes?expectedVersion=${current.version}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/octet-stream" }, body: file });
            const body = await response.json() as ActorPortraitCard & { error?: string };
            if (!response.ok) throw new ApiError(response.status, body.error ?? t("Das Porträt konnte nicht gespeichert werden."));
            accept(body);
          })}><ImagePlus size={16} />{t("Porträt speichern")}</Button><Button disabled={task.busy} onClick={clear}>{t("Bildauswahl verwerfen")}</Button></> : null}
          {current.image ? <Button variant="danger" disabled={task.busy || !!file} onClick={() => {
            if (window.confirm(t("Das Porträt dieser Figur entfernen?"))) void task.run(async () => accept(await api<ActorPortraitCard>(`${base}/portrait`, { method: "DELETE", body: { expectedVersion: current.version } })));
          }}><Trash2 size={15} />{t("Porträt entfernen")}</Button> : null}
        </div>
      </> : null}
      {task.error ? <Notice error>{task.error}{task.status === 409 ? <><p>{t("Das Porträt wurde inzwischen geändert. Deine Bildauswahl bleibt erhalten.")}</p><Button onClick={onChanged}>{t("Aktuelles Porträt laden")}</Button></> : null}</Notice> : null}
    </div>
  </section>;
}

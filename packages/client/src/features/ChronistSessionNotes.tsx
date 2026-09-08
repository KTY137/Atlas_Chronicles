// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useState } from "react";
import type { ChronistSessionContext, ChronistSessionPage } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { Editor, newEditorSeed, type EditorSeed } from "../Editor";
import { useResource } from "../hooks";
import { chronistPath } from "./chronist-api";
import { locale, t } from "../i18n";

export function ChronistSessionNotes({ campaignId, sessionId, onSession, onSaved, onDirty, disabled }: {
  campaignId: string; sessionId: string; onSession: (id: string) => void; onSaved: (entryId: string) => void; onDirty: (dirty: boolean) => void; disabled: boolean;
}) {
  const [sessionAfter, setSessionAfter] = useState<string | null>(null), [contextAfter, setContextAfter] = useState<string | null>(null), [showContext, setShowContext] = useState(false);
  const [adopted, setAdopted] = useState<Record<string, string>>({}), [seed, setSeed] = useState<EditorSeed | null>(null), [dirty, setDirty] = useState(false);
  const sessions = useResource<ChronistSessionPage>(chronistPath(campaignId, `/sessions?limit=50${sessionAfter ? `&after=${encodeURIComponent(sessionAfter)}` : ""}`));
  const context = useResource<ChronistSessionContext>(sessionId && showContext ? chronistPath(campaignId, `/sessions/${encodeURIComponent(sessionId)}/context?limit=50${contextAfter ? `&after=${encodeURIComponent(contextAfter)}` : ""}`) : null);
  const changeDirty = useCallback((value: boolean) => { setDirty(value); }, []);
  useEffect(() => { onDirty(dirty || seed !== null); }, [dirty, seed, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const guard = () => !dirty && seed === null || window.confirm(t("Ungespeicherte Sitzungsnotizen verwerfen?"));
  const szene = context.data?.scene;
  const szeneText = !szene ? "" : szene.fictionDate
    ? t("Szene: {name} · {datum}", { name: szene.name, datum: szene.fictionDate })
    : t("Szene: {name}", { name: szene.name });
  const toggle = (id: string, value: string, checked: boolean) => setAdopted(current => { const next = { ...current }; if (checked) next[id] = value; else delete next[id]; return next; });
  const createNote = () => {
    if (!guard()) return;
    const note = newEditorSeed(), selected = sessions.data?.sessions.find(session => session.id === sessionId);
    note.title = t("Sitzungsnotizen – {name}", { name: selected?.name ?? context.data?.scene.name ?? t("Spielabend") });
    const texts = Object.values(adopted);
    note.passages = (texts.length ? texts : [""]).map(text => ({ localKey: crypto.randomUUID(), pfad: ["Sitzungsnotizen"], tags: [`chronist-session:${sessionId}`], inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } }));
    changeDirty(false); setSeed(note);
  };
  return <section className="chronist-notes" aria-label={t("Gespeicherte Sitzungsnotizen")}>
    <label>{t("Spielabend auswählen")}<select value={sessionId} disabled={disabled || !!seed} onChange={event => { if (!guard()) return; onSession(event.target.value); setAdopted({}); setContextAfter(null); setShowContext(false); }}><option value="">{t("Sitzung wählen …")}</option>{sessionId && !sessions.data?.sessions.some(session => session.id === sessionId) ? <option value={sessionId}>{t("Ausgewählte Sitzung")}</option> : null}{sessions.data?.sessions.map(session => <option value={session.id} key={session.id}>{session.name} · {new Date(session.startedAt).toLocaleDateString(locale())}{session.endedAt === null ? ` · ${t("läuft")}` : ""}</option>)}</select></label>
    {sessions.loading ? <Loading text={t("Spielabende werden geladen …")} /> : sessions.error ? <Notice error>{sessions.error}</Notice> : sessions.data?.sessions.length === 0 ? <p className="field-help">{t("Noch kein Spielabend vorhanden. Beginne zuerst eine Szene am Tisch; danach kannst du ihre Notizen hier auswerten.")}</p> : null}
    <div className="button-row">{sessionAfter ? <Button disabled={disabled || !!seed} onClick={() => setSessionAfter(null)}>{t("Erste Sitzungsseite")}</Button> : null}{sessions.data && !sessions.data.complete && sessions.data.after ? <Button disabled={disabled || !!seed} onClick={() => setSessionAfter(sessions.data!.after)}>{t("Weitere Sitzungen")}</Button> : null}</div>
    <p className="field-help">{t("Wähle unten bereits gespeicherte Notizpassagen aus der Chronik. Neue Notizen speicherst du zuerst als gewöhnlichen Wiki-Artikel. Die Auswertung verwendet ausschließlich deine anschließend gewählten Passagen.")}</p>
    {sessionId && !seed ? <div className="button-row"><Button disabled={disabled} onClick={createNote}>{t("Neue Sitzungsnotiz schreiben")}</Button><Button disabled={disabled} aria-expanded={showContext} onClick={() => setShowContext(value => !value)}>{t("Szenenangaben & bestätigte Würfe ansehen")}</Button></div> : null}
    {showContext && !seed ? <div className="chronist-context">
      {context.loading ? <Loading text={t("Bestätigter Sitzungskontext wird geladen …")} /> : context.error ? <Notice error>{context.error}</Notice> : context.data ? <>
        <h4>{t("Was soll in deine Notiz?")}</h4><p className="field-help">{t("Diese Auswahl wird zunächst zum bearbeitbaren Notizentwurf. Erst „Speichern“ legt ihn in der Chronik ab.")}</p>
        <label className="chronist-check"><input type="checkbox" checked={!!adopted.scene} disabled={disabled} onChange={event => toggle("scene", szeneText, event.target.checked)} /><span>{szeneText}</span></label>
        {context.data.rolls.map(roll => <label key={roll.id} className="chronist-check"><input type="checkbox" disabled={disabled} checked={!!adopted[roll.id]} onChange={event => toggle(roll.id, `${roll.actorName}: ${roll.resultText}${roll.fictionDate ? ` (${roll.fictionDate})` : ""}`, event.target.checked)} /><span><strong>{roll.actorName}</strong> · {roll.resultText}{roll.fictionDate ? <small> · {roll.fictionDate}</small> : null}</span></label>)}
        {!context.data.rolls.length ? <p className="field-help">{t("Auf dieser Seite liegen keine bestätigten Würfe vor.")}</p> : null}
        {!context.data.complete ? <p className="field-help">{t("Weitere bestätigte Würfe gehören zu dieser Sitzung. Dieser Ausschnitt ist noch nicht vollständig.")}</p> : null}
        <div className="button-row">{contextAfter ? <Button onClick={() => setContextAfter(null)}>{t("Erste Kontextseite")}</Button> : null}{!context.data.complete && context.data.after ? <Button onClick={() => setContextAfter(context.data!.after)}>{t("Weitere bestätigte Würfe")}</Button> : null}<Button variant="primary" disabled={disabled || Object.keys(adopted).length === 0} onClick={createNote}>{t("{anzahl} Angaben in Notizentwurf übernehmen", { anzahl: Object.keys(adopted).length })}</Button></div>
      </> : null}
    </div> : null}
    {seed ? <div className="chronist-note-editor"><Notice>{t("Diese Notiz wird als Wiki-Artikel gespeichert. Anschließend wählst du ihre Passagen als Quellen.")}</Notice><Editor key={seed.instanceId} seed={seed} campaignId={campaignId} onDirty={changeDirty} onCancel={() => { if (guard()) { setSeed(null); changeDirty(false); } }} onSaved={document => { setSeed(null); setAdopted({}); changeDirty(false); onSaved(document.entryId); }} /></div> : null}
  </section>;
}

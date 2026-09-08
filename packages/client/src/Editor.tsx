// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, plainText, type DraftPassage, type EntryDocument, type HistoryItem } from "./api";
import { t } from "./i18n";
import { BlockReader } from "./Reader";

export interface EditorSeed { instanceId: string; title: string; slug?: string; entryId?: string; expectedVersion?: number; passages: DraftPassage[] }
const blank = (): DraftPassage => ({ localKey: crypto.randomUUID(), pfad: [], tags: [], inhalt: { kind: "absatz", inhalt: [{ text: "", marks: [] }] } });
export const newEditorSeed = (): EditorSeed => ({ instanceId: crypto.randomUUID(), title: "", passages: [blank()] });
export const historyEditorSeed = (entryId: string, row: HistoryItem): EditorSeed => ({ instanceId: crypto.randomUUID(), entryId, title: row.document.title, slug: row.document.slug, expectedVersion: row.seq,
  passages: row.document.passagen.map((p, i) => ({ pid: p.pid, localKey: p.pid, inhalt: structuredClone(p.inhalt), pfad: [...p.pfad], tags: row.document.tags?.[i] ?? [] })) });

export function Editor({ campaignId, seed, onSaved, onCancel, onDirty }: { campaignId: string; seed: EditorSeed; onSaved: (doc: EntryDocument) => void; onCancel: () => void; onDirty: (dirty: boolean) => void }) {
  const [title, setTitle] = useState(seed.title), [passages, setPassages] = useState(seed.passages);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false);
  // Last content confirmed saved by the server; tracked separately from seed so status stays correct after a save while still mounted.
  const [savedAt, setSavedAt] = useState<{ title: string; passages: DraftPassage[] } | null>(() => seed.entryId ? { title: seed.title, passages: seed.passages } : null);
  const dirty = title !== seed.title || JSON.stringify(passages) !== JSON.stringify(seed.passages);
  const matchesSaved = savedAt !== null && title.trim() === savedAt.title && JSON.stringify(passages) === JSON.stringify(savedAt.passages);
  const saveLabel = busy ? t("Wird gespeichert …") : conflict ? t("Konflikt") : matchesSaved ? t("Gespeichert") : savedAt ? t("Ungespeicherte Änderungen") : t("Neuer Entwurf");
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const update = (index: number, patch: Partial<DraftPassage>) => setPassages((current) => current.map((p, i) => i === index ? { ...p, ...patch } : p));
  const move = (index: number, direction: number) => setPassages((current) => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  const save = async () => {
    setBusy(true); setError(""); setConflict(false);
    try {
      const document = await api<EntryDocument>(apiPath(campaignId, `/entries${seed.entryId ? `/${encodeURIComponent(seed.entryId)}` : ""}`), {
        method: seed.entryId ? "PUT" : "POST", body: { title: title.trim(), ...(seed.slug ? { slug: seed.slug } : {}), ...(seed.expectedVersion ? { expectedVersion: seed.expectedVersion } : {}),
          passages: passages.map(({ localKey: _localKey, ...passage }) => passage) },
      });
      setSavedAt({ title: title.trim(), passages }); onDirty(false); onSaved(document);
    } catch (error) { setError(errorText(error)); setConflict(error instanceof ApiError && error.status === 409); }
    finally { setBusy(false); }
  };
  const downloadDraft = () => {
    const blob = new Blob([JSON.stringify({ title, passages, expectedVersion: seed.expectedVersion }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = href; anchor.download = "chronicle-entwurf.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  return <form className="editor" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="editor-toolbar"><span className="eyebrow">{seed.entryId ? t("Revision {nummer} bearbeiten", { nummer: seed.expectedVersion ?? 0 }) : t("Neuer Artikel")}</span><span className="save-state" role="status" aria-live="polite">{saveLabel}</span><Button disabled={busy} onClick={onCancel}>{t("Abbrechen")}</Button><Button type="submit" variant="primary" disabled={busy || !title.trim()}><Save size={16} /> {t("Speichern")}</Button></div>
    {error ? <Notice error>{conflict ? t("Nicht gespeichert: Der Artikel wurde inzwischen anderswo geändert — vermutlich in einem zweiten Fenster, oder der Titel ist bereits vergeben. Dein Entwurf bleibt hiervon unberührt und geht nicht verloren. Lade ihn sicherheitshalber herunter, brich dann ab und öffne den Artikel neu, um den aktuellen Stand zu sehen.") : error}{conflict ? <Button onClick={downloadDraft}>{t("Entwurf herunterladen")}</Button> : null}</Notice> : null}
    <label className="title-input">{t("Artikeltitel")}<input value={title} maxLength={200} required onChange={(e) => setTitle(e.target.value)} placeholder={t("Gib deiner Geschichte einen Namen")} disabled={busy} autoFocus /></label>
    <p className="field-help">{t("Der Artikel gliedert sich in Passagen, weil jede einzelne später für bestimmte Figuren freigegeben werden kann — so erfährt eure Runde die Welt Stück für Stück statt auf einen Schlag. Beim Verschieben bleibt diese Freigabe je Passage erhalten.")}</p>
    {passages.map((passage, i) => {
      const editable = passage.inhalt.kind === "absatz" || passage.inhalt.kind === "zitat";
      return <fieldset className="editor-passage" key={passage.localKey} disabled={busy}><legend>{t("Passage {nummer}", { nummer: i + 1 })}</legend>
        <div className="passage-toolbar"><label>{t("Abschnitt")}<input value={passage.pfad.join(" / ")} onChange={(e) => update(i, { pfad: e.target.value.split("/").map((v) => v.trim()).filter(Boolean) })} placeholder={t("z. B. Geschichte / Herkunft")} /></label>
          <Button aria-label={t("Passage {nummer} nach oben", { nummer: i + 1 })} disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp size={15} /></Button><Button aria-label={t("Passage {nummer} nach unten", { nummer: i + 1 })} disabled={i === passages.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown size={15} /></Button>
          <Button variant="quiet" aria-label={t("Passage {nummer} entfernen", { nummer: i + 1 })} onClick={() => setPassages((current) => current.filter((_, index) => index !== i))}><Trash2 size={15} /></Button>
        </div>
        {editable ? <><label className="sr-only" htmlFor={`text-${passage.localKey}`}>{t("Text der Passage {nummer}", { nummer: i + 1 })}</label><textarea id={`text-${passage.localKey}`} rows={Math.max(4, Math.min(14, plainText(passage.inhalt).split("\n").length + 2))} value={plainText(passage.inhalt)} onChange={(event) => update(i, { inhalt: { kind: passage.inhalt.kind as "absatz" | "zitat", inhalt: [{ text: event.target.value, marks: [] }] } })} placeholder={t("Schreibe, was eure Welt ausmacht …")} /></> : <div className="preserved-block"><BlockReader block={passage.inhalt} /><p className="field-help">{t("Dieser strukturierte Inhalt wird beim Speichern vollständig erhalten.")}</p></div>}
        {editable && passage.inhalt.kind !== "rohblock" && "inhalt" in passage.inhalt && passage.inhalt.inhalt.some((part) => part.marks.length) ? <p className="field-help">{t("Dieser Absatz enthält Formatierung oder Links. Eine Textänderung ersetzt sie durch Klartext.")}</p> : null}
      </fieldset>;
    })}
    <Button disabled={busy || passages.length >= 1000} onClick={() => setPassages((current) => [...current, blank()])}><Plus size={16} /> {t("Passage hinzufügen")}</Button>
  </form>;
}

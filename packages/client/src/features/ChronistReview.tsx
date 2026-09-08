// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import type { ChronistSubmissionAck, ChronistSuggestionView, SubmitChronistProposalBody } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { ApiError, apiPath, errorText, type Block, type EntryDocument, type EntrySummary } from "../api";
import { BlockReader } from "../Reader";
import { useResource } from "../hooks";
import { chronistApi, chronistPath } from "./chronist-api";
import { clearChronistDrafts, createChronistCommand, draftStoragePrefix, readChronistDraft, type ChronistDraftRecovery } from "./chronist-model";
import { ChronistBlocks } from "./ChronistBlocks";

const kindLabel = { ereignis: "Ereignis", widerspruch: "Widerspruch", luecke: "Offene Datierung", abriss: "Erzählerischer Abriss" };
export function ChronistReview({ campaignId, proposalId, gm, onDirty, onChanged, onOpenEntry, onClose }: {
  campaignId: string; proposalId: string; gm: boolean; onDirty: (dirty: boolean) => void; onChanged: () => void; onOpenEntry: (id: string) => void; onClose: () => void;
}) {
  const [revision, setRevision] = useState(0), [base, setBase] = useState<ChronistSuggestionView | null>(null), [blocks, setBlocks] = useState<Block[]>([]);
  const [recovery, setRecovery] = useState<ChronistDraftRecovery | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [denied, setDenied] = useState(false);
  const [targetKind, setTargetKind] = useState<"new" | "existing">("new"), [targetTitle, setTargetTitle] = useState(""), [targetEntry, setTargetEntry] = useState("");
  const detail = useResource<ChronistSuggestionView>(chronistPath(campaignId, `/suggestions/${encodeURIComponent(proposalId)}`), revision, 5000);
  const entries = useResource<EntrySummary[]>(gm ? apiPath(campaignId, "/entries") : null, revision);
  const target = useResource<EntryDocument>(gm && targetKind === "existing" && targetEntry ? apiPath(campaignId, `/entries/${encodeURIComponent(targetEntry)}`) : null, revision);
  const storageKey = `${draftStoragePrefix(campaignId)}${proposalId}`, checkedRecovery = useRef(false);
  const dirty = base !== null && JSON.stringify(blocks) !== JSON.stringify(base.blocks);
  const [submitCommand] = useState(() => createChronistCommand<Omit<SubmitChronistProposalBody, "commandId">, ChronistSubmissionAck>(body => chronistApi(chronistPath(campaignId, `/suggestions/${encodeURIComponent(proposalId)}/submit`), { method: "POST", body })));
  const clearRecovery = () => { try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional; the server owns saved drafts. */ } setRecovery(null); };
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    if (!detail.data) {
      if (detail.error && !detail.loaded) { setBase(null); setBlocks([]); setRecovery(null); try { clearChronistDrafts(sessionStorage, campaignId); } catch { /* Unavailable storage has no accessible recovery. */ } }
      return;
    }
    if (!base || !dirty && base.version < detail.data.version) { setBase(detail.data); setBlocks(structuredClone(detail.data.blocks) as Block[]); }
    if (!checkedRecovery.current && gm) {
      checkedRecovery.current = true;
      try { setRecovery(readChronistDraft(sessionStorage.getItem(storageKey), proposalId)); } catch { /* Browser storage may be disabled. */ }
    }
  }, [detail.data, detail.error, detail.loaded, base, dirty, gm, storageKey, proposalId, campaignId]);
  useEffect(() => {
    if (!dirty || !base || !gm || denied) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, proposalId, version: base.version, draftHash: base.draftHash, blocks })); }
    catch { setNotice("Dein Entwurf ist in diesem Fenster erhalten. Die lokale Wiederherstellung ist in diesem Browser nicht verfügbar; speichere den Entwurf vor dem Schließen."); }
  }, [dirty, base, blocks, storageKey, proposalId, gm, denied]);
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (cause) { setError(errorText(cause)); if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) { setDenied(true); setBase(null); setBlocks([]); try { clearChronistDrafts(sessionStorage, campaignId); } catch { /* No fallback copy. */ } } }
    finally { setBusy(false); }
  };
  const replace = (value: ChronistSuggestionView) => { setBase(value); setBlocks(structuredClone(value.blocks) as Block[]); clearRecovery(); setRevision(value => value + 1); onChanged(); onDirty(false); };
  const save = () => run(async () => { if (!base) return; replace(await chronistApi<ChronistSuggestionView>(chronistPath(campaignId, `/suggestions/${encodeURIComponent(proposalId)}`), { method: "PUT", body: { expectedVersion: base.version, blocks } })); setNotice("Entwurf gespeichert."); });
  const submit = () => run(async () => {
    if (!base || dirty) return;
    const destination: SubmitChronistProposalBody["target"] = targetKind === "existing" ? { kind: "existing", entryId: targetEntry, expectedVersion: target.data!.version! } : { kind: "new", title: targetTitle.trim() };
    const ack = await submitCommand.send({ expectedVersion: base.version, expectedDraftHash: base.draftHash, target: destination });
    replace({ ...base, state: "eingereicht", version: ack.proposalVersion, submissionAck: ack }); setNotice("Als Antrag in der Chronik eingereicht. Die reguläre Ratifikation erfolgt anschließend am Tisch.");
  });
  const current = detail.data && base && base.version > detail.data.version ? base : detail.data;
  if (denied || detail.error && !current) return <Notice error>{error || detail.error}<Button onClick={onClose}>Zurück zur Durchsicht</Button></Notice>;
  if (!base || !current) return <Loading text="Vorschlag und Quellen werden geprüft …" />;
  const changedElsewhere = current.version !== base.version || current.draftHash !== base.draftHash;
  const stale = current.stale, editable = gm && base.state === "offen" && current.state === "offen";
  const locked = busy || !!submitCommand.pending;
  return <section className="chronist-review" aria-label="Vorschlag durchsehen">
    <div className="section-heading"><div><p className="eyebrow">{base.origin === "regelwerk" ? "Aus dem Regelwerk" : "Mit Modellunterstützung"}</p><h3>{kindLabel[base.kind]}</h3><p className="field-help">{base.state === "eingereicht" ? "Als Antrag eingereicht" : base.state === "verworfen" ? "Verworfen" : dirty ? "Ungespeicherter Entwurf" : "Gespeicherter Entwurf"}</p></div><Button disabled={busy} onClick={onClose}>Zurück zum Stapel</Button></div>
    {error || detail.error ? <Notice error>{error || detail.error}<Button disabled={busy} onClick={() => setRevision(value => value + 1)}>Aktuellen Stand laden</Button></Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {stale ? <Notice error>Mindestens eine Quelle hat sich geändert. Dies ist eine ältere Fassung; sie lässt sich ansehen und bearbeiten, aber nicht mehr einreichen. Erstelle mit den aktuellen Quellen einen neuen Lauf.</Notice> : null}
    {changedElsewhere ? <Notice error>Dieser Vorschlag wurde anderswo geändert. Dein offener Entwurf bleibt unverändert.<details><summary>Aktuelle gespeicherte Fassung vergleichen</summary>{current.blocks.map((block, i) => <BlockReader key={i} block={block} />)}</details><Button disabled={busy} onClick={() => { if (!dirty || window.confirm("Deinen lokalen Entwurf durch die aktuelle gespeicherte Fassung ersetzen?")) replace(current); }}>Aktuelle Fassung übernehmen</Button>{dirty && current.state === "offen" ? <Button disabled={busy} onClick={() => { setBase(current); setError(""); }}>Meinen verglichenen Entwurf weiterbearbeiten</Button> : null}</Notice> : null}
    {recovery && editable ? <Notice>Auf diesem Gerät liegt ein ungespeicherter Entwurf vor.{recovery.version !== current.version || recovery.draftHash !== current.draftHash ? " Er gehört zu einer älteren Fassung. Vergleiche ihn vor dem Speichern mit dem aktuellen Vorschlag." : ""}<Button disabled={busy} onClick={() => { setBlocks(recovery.blocks); setBase({ ...current, version: recovery.version, draftHash: recovery.draftHash }); setRecovery(null); }}>Lokalen Entwurf wiederherstellen</Button><Button disabled={busy} onClick={clearRecovery}>Lokalen Entwurf verwerfen</Button></Notice> : null}
    <div className="chronist-review-columns"><aside className="chronist-evidence" aria-label="Quellen des Vorschlags"><h4>Die Quellen</h4><p className="field-help">Alle verwendeten Passagen. Hervorgehobene Ausschnitte belegen den ursprünglichen Vorschlag.</p>{current.sources.map(source => <section key={source.sourceId} className="chronist-evidence-source"><Button variant="quiet" onClick={() => onOpenEntry(source.ref.entryId)}>{source.title} öffnen</Button>{current.citations.filter(citation => citation.sourceId === source.sourceId).map((citation, i) => <blockquote key={i}>{source.text.slice(citation.from, citation.to)}</blockquote>)}<details><summary>Vollständige Quellpassage</summary><p className="chronist-source-text">{source.text}</p></details></section>)}</aside>
      <div className="chronist-draft"><h4>Dein Entwurf</h4><details><summary>Ursprünglichen Vorschlag ansehen</summary>{current.originalBlocks.map((block, i) => <BlockReader key={i} block={block} />)}</details>{editable ? <ChronistBlocks blocks={blocks} onChange={setBlocks} disabled={locked} /> : blocks.map((block, i) => <BlockReader key={i} block={block} />)}
        {editable ? <><div className="button-row"><Button variant="primary" disabled={locked || !dirty || blocks.length === 0 || changedElsewhere} onClick={() => void save()}>Entwurf speichern</Button><Button variant="danger" disabled={locked} onClick={() => { if (window.confirm("Diesen Vorschlag verwerfen? Ungespeicherte Änderungen werden dabei ebenfalls verworfen.")) void run(async () => { replace(await chronistApi<ChronistSuggestionView>(chronistPath(campaignId, `/suggestions/${encodeURIComponent(proposalId)}/discard`), { method: "POST", body: { expectedVersion: base.version } })); setNotice("Vorschlag verworfen."); }); }}>Vorschlag verwerfen</Button></div>
          <fieldset className="chronist-submit" disabled={locked}><legend>Als eigenen Antrag einreichen</legend><p className="field-help">Deine gespeicherte Fassung wird im Zielartikel als Antrag ergänzt. Vorhandene Passagen bleiben erhalten. Anschließend kannst du sie regulär ratifizieren.</p><label>Ziel<select value={targetKind} onChange={event => setTargetKind(event.target.value as "new" | "existing")}><option value="new">Neuer Artikel</option><option value="existing">Bestehenden Artikel ergänzen</option></select></label>{targetKind === "new" ? <label>Titel des neuen Artikels<input maxLength={200} value={targetTitle} onChange={event => setTargetTitle(event.target.value)} placeholder="z. B. Die Rückkehr nach Andaria" /></label> : <><label>Zielartikel<select value={targetEntry} onChange={event => setTargetEntry(event.target.value)}><option value="">Artikel wählen …</option>{entries.data?.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>{target.loading ? <Loading text="Zielartikel wird geprüft …" /> : target.error || entries.error ? <Notice error>{target.error || entries.error}</Notice> : target.data ? <p className="field-help">{target.data.titel} · gespeicherte Fassung {target.data.version}</p> : null}</>}</fieldset>
          {dirty ? <p className="field-help">Speichere deine Änderungen, bevor du den Antrag einreichst.</p> : null}<Button variant="primary" disabled={busy || dirty || stale || changedElsewhere || targetKind === "new" && !targetTitle.trim() || targetKind === "existing" && (!target.data?.version || !!target.error)} onClick={() => void submit()}>{submitCommand.pending ? "Einreichung unverändert erneut versuchen" : "Als Antrag einreichen"}</Button>
        </> : null}{base.submissionAck ? <Notice>Der Antrag ist in der Chronik gespeichert.<Button onClick={() => onOpenEntry(base.submissionAck!.entryId)}>Artikel mit Antrag öffnen</Button></Notice> : null}
      </div>
    </div>
  </section>;
}

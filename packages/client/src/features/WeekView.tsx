// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ReaderPerspective } from "@chronicle/protocol";
import { BookOpen, Check, Clock3, Mail, RefreshCw, Send, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, plainText, type Campaign, type EntryDocument, type EntrySummary, type Member } from "../api";
import { BlockReader } from "../Reader";
import { useTask } from "../hooks";
import { createLetterSubmission, type FictionClock, type KnowledgeSource, type LetterDetail, type LetterEnvelope, type LetterRecipient, type WeekDifference } from "./week-api";
import { locale, plural, t } from "../i18n";
import "./WeekView.css";

export interface WeekViewProps {
  campaign: Campaign; userId: string; liveRevision?: number; onDirty: (dirty: boolean) => void;
  onOpenEntry: (entryId: string) => void; onOpenDoors: (doorId?: string) => void;
  composeSeed?: { entryId: string; passageIds: string[] };
}
type Resource<T> = { path: string | null; data: T | null; loading: boolean; error: string };
function useWeekResource<T>(path: string | null, revision: number, interval = 0) {
  const [state, setState] = useState<Resource<T>>({ path, data: null, loading: !!path, error: "" });
  useEffect(() => {
    if (!path) { setState({ path, data: null, loading: false, error: "" }); return; }
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    setState(old => old.path === path ? { ...old, loading: old.data === null, error: "" } : { path, data: null, loading: true, error: "" });
    const load = async () => {
      try {
        const data = await api<T>(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ path, data, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState(old => ({ path, data: error instanceof ApiError && [401, 403, 404].includes(error.status) ? null : old.path === path ? old.data : null, loading: false, error: errorText(error) }));
      }
      if (interval && !controller.signal.aborted) timer = setTimeout(load, interval);
    };
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [path, revision, interval]);
  const replace = useCallback((data: T) => setState({ path, data, loading: false, error: "" }), [path]);
  return { ...(state.path === path ? state : { path, data: null, loading: !!path, error: "" }), replace };
}
const nameOf = (names: ReadonlyMap<string, string>, actorId: string) => names.get(actorId) ?? t("Ehemalige Figur");
function ServerTime({ value }: { value: number }) { return <time dateTime={new Date(value).toISOString()} title={new Date(value).toISOString()}>{new Date(value).toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" })}</time>; }
function sourceName(source: KnowledgeSource, names: ReadonlyMap<string, string>) {
  return source.art === "wurf" ? t("Selbst erfahren") : source.art === "gesprochen" ? t("Am Tisch ausgesprochen") : source.art === "gehoert" ? t("Gehört von {name}", { name: nameOf(names, source.von) }) : t("Über eine andere Passage");
}
function recipientState(recipient: LetterRecipient) {
  return recipient.readAt !== null ? t("Gelesen an Tag {tag}", { tag: String(recipient.readDay) })
    : recipient.deliveredAt !== null ? t("Zugestellt · {label} (Tag {tag})", { label: String(recipient.deliveredLabel), tag: String(recipient.deliveredDay) })
      : t("Unterwegs");
}

export function WeekView(props: WeekViewProps) { return <CampaignWeek key={`${props.campaign.id}/${props.userId}`} {...props} />; }
function CampaignWeek({ campaign, userId, liveRevision = 0, onDirty, onOpenEntry, onOpenDoors, composeSeed }: WeekViewProps) {
  const [localRevision, setLocalRevision] = useState(0), [selected, setSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState(!!composeSeed), [letterDirty, setLetterDirty] = useState(false), [clockDirty, setClockDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const revision = liveRevision + localRevision, gm = campaign.role === "leitung";
  const refresh = useCallback(() => setLocalRevision(value => value + 1), []);
  const roster = useWeekResource<Member[]>(apiPath(campaign.id, "/roster"), revision, 10_000);
  const actors = useWeekResource<ActorCard[]>(apiPath(campaign.id, "/actors"), revision, 10_000);
  const perspective = useWeekResource<ReaderPerspective>(apiPath(campaign.id, "/reader-perspective"), revision, 10_000);
  const clock = useWeekResource<FictionClock>(apiPath(campaign.id, "/week/clock"), revision, 6000);
  const letters = useWeekResource<LetterEnvelope[]>(apiPath(campaign.id, "/week/letters"), revision, 6000);
  const difference = useWeekResource<WeekDifference>(gm ? apiPath(campaign.id, "/week/difference") : null, revision, 10_000);
  const entries = useWeekResource<EntrySummary[]>(apiPath(campaign.id, "/entries"), revision, 10_000);
  const actorId = campaign.role !== "beobachter" ? perspective.data?.actorId : null;
  const recipients: Member[] = [...(roster.data ?? []), ...(actors.data ?? []).filter(a => !roster.data?.some(m => m.actorId === a.id)).map(a => ({ userId: "", actorId: a.id, displayName: a.name, role: "spieler" as const }))];
  const names = new Map(recipients.filter(member => member.actorId).map(member => [member.actorId!, actors.data?.find(a => a.id === member.actorId)?.name ?? member.displayName]));
  const dirty = letterDirty || clockDirty;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const openLetter = (id: string) => { setSelected(id); setNotice(""); };
  return <section className="page-content week-page">
    <div className="page-heading"><div><p className="eyebrow">{t("Zwischen den Abenden")}</p><h1>{t("Die Woche")}</h1><p className="muted">{campaign.name}</p></div><Button aria-label={t("Woche aktualisieren")} onClick={refresh}><RefreshCw size={17} /></Button></div>
    <p className="week-intro">{t("Diese Seite zeigt, was zwischen euren Spielabenden weitergeht: Briefe, die eure Figuren einander schicken, und Vollmachten — eine Erlaubnis der Spielleitung, mit der eine einzelne Figur später ganz allein etwas herausfinden darf, auch an einem gewöhnlichen Wochentag auf dem Handy. Was dabei herauskommt, gehört danach fest zu eurer Welt.")}</p>
    <div className="week-book-link"><p>{t("Neue Passagen findest du an ihrem Platz in deiner Chronik.")}</p><div className="button-row">{entries.data?.[0] ? <Button onClick={() => onOpenEntry(entries.data![0]!.id)}><BookOpen size={16} /> {t("Im Buch weiterlesen")}</Button> : null}<Button onClick={() => onOpenDoors()}>{gm ? t("Vollmachten verwalten") : t("Meine Vollmachten öffnen")}</Button></div></div>
    {roster.error || entries.error || actors.error || perspective.error ? <Notice error>{roster.error || entries.error || actors.error || perspective.error}<Button onClick={refresh}>{t("Erneut laden")}</Button></Notice> : null}
    <ClockPanel campaignId={campaign.id} current={clock.data} loading={clock.loading} error={clock.error} gm={gm} onDirty={setClockDirty} onChanged={refresh} />
    {notice ? <Notice>{notice}</Notice> : null}
    <div className="week-mail-heading"><h2><Mail size={20} /> {t("Briefe")}</h2>{actorId ? <Button variant="primary" onClick={() => setComposing(value => !value)} aria-expanded={composing}>{composing ? t("Briefentwurf einklappen") : t("Brief verfassen")}</Button> : null}</div>
    <p className="field-help">{t("Ein Brief überträgt ausgewählte Passagen als Hörensagen. Sein Begleittext bleibt eine persönliche Notiz. Die Zustellung richtet sich nach eurer Weltzeit.")}</p>
    {roster.loading ? <Loading text={t("Figuren werden geladen …")} /> : !actorId ? <p className="field-help">{t("Briefe werden von der eigenen Figur versendet. Deinem Zugang ist keine schreibende Figur zugeordnet.")}</p> : null}
    {actorId ? <div hidden={!composing}><LetterComposer key={actorId} campaignId={campaign.id} actorId={actorId} roster={recipients} entries={entries.data ?? []} entriesError={entries.error} clock={clock.data} revision={revision} seed={composeSeed} onDirty={setLetterDirty} onSent={letter => { setSelected(letter.id); setComposing(false); setNotice(t("Dein Brief ist gespeichert und versiegelt.")); refresh(); }} /></div> : null}
    <div className="week-mail-layout"><aside className="week-envelopes" aria-label={t("Deine Briefe")}>
      {letters.error ? <Notice error>{letters.error}<Button onClick={refresh}>{t("Briefe erneut laden")}</Button></Notice> : null}
      {letters.loading ? <Loading text={t("Briefe werden geladen …")} /> : letters.data?.length ? <>
        {(["received", "sent"] as const).map(direction => {
          const matching = letters.data!.filter(letter => letter.direction === direction);
          return matching.length ? <section key={direction}><h3>{direction === "received" ? t("Empfangen") : t("Gesendet")}</h3><ul>{matching.map(letter => <li key={letter.id}><button type="button" className={selected === letter.id ? "week-envelope active" : "week-envelope"} aria-current={selected === letter.id ? "true" : undefined} onClick={() => openLetter(letter.id)}>
            <strong>{direction === "received" ? t("Von {name}", { name: nameOf(names, letter.fromActorId) }) : t("An {namen}", { namen: letter.recipients.map(recipient => nameOf(names, recipient.actorId)).join(", ") })}</strong>
            <span>{t("{label} · Tag {tag}", { label: letter.sentLabel, tag: letter.sentDay })}</span><small>{direction === "received" ? recipientState(letter.recipients[0]!) : letter.recipients.every(recipient => recipient.readAt !== null) ? t("Gelesen") : letter.recipients.every(recipient => recipient.deliveredAt !== null) ? t("Zugestellt") : t("Ankunft ab Tag {tag}", { tag: letter.arrivalDay })}</small>
          </button></li>)}</ul></section> : null;
        })}
      </> : !letters.error ? <EmptyState title={t("Hier sammeln sich eure Briefe.")} action={actorId ? <Button variant="primary" onClick={() => setComposing(true)}><Send size={16} /> {t("Ersten Brief schreiben")}</Button> : undefined}>{actorId ? t("Sobald du einen Brief schickst oder deine Figur einen erhält, erscheint er hier.") : t("Sobald eine Figur einen Brief schickt oder empfängt, erscheint er hier.")}</EmptyState> : null}
    </aside><div className="week-letter-stage">{selected ? <LetterReader key={selected} campaignId={campaign.id} letterId={selected} revision={revision} names={names} onOpenEntry={onOpenEntry} onOpenDoors={onOpenDoors} onChanged={refresh} /> : <EmptyState title={t("Ein Umschlag bewahrt, was du gehört hast.")}>{t("Öffne einen Brief, um seinen eingefrorenen Artikeltext und die Zustellung zu lesen.")}</EmptyState>}</div></div>
    {gm ? <DifferencePanel data={difference.data} loading={difference.loading} error={difference.error} names={names} entries={entries.data ?? []} onOpenEntry={onOpenEntry} onOpenDoors={onOpenDoors} onRetry={refresh} /> : null}
  </section>;
}

function ClockPanel({ campaignId, current, loading, error, gm, onDirty, onChanged }: { campaignId: string; current: FictionClock | null; loading: boolean; error: string; gm: boolean; onDirty: (dirty: boolean) => void; onChanged: () => void }) {
  const [draft, setDraft] = useState<FictionClock | null>(null), [saved, setSaved] = useState("");
  const task = useTask(), sending = useRef(false), value = draft ?? current;
  useEffect(() => { onDirty(draft !== null); return () => onDirty(false); }, [draft, onDirty]);
  const stale = !!draft && !!current && draft.version !== current.version;
  const change = (patch: Partial<FictionClock>) => { if (value) { setDraft({ ...value, ...patch }); setSaved(""); task.setError(""); } };
  return <section className="panel week-clock"><div className="section-heading"><h2><Clock3 size={19} /> {t("Weltzeit und Postlaufzeit")}</h2>{current ? <span className="week-clock-now">{t("{label} · Tag {tag}", { label: current.label, tag: current.day })}</span> : null}</div>
    {error ? <Notice error>{error}<Button onClick={onChanged}>{t("Weltzeit erneut laden")}</Button></Notice> : null}{loading ? <Loading text={t("Weltzeit wird geladen …")} /> : null}
    {gm && value ? <form onSubmit={event => { event.preventDefault(); if (sending.current || stale || !draft) return; sending.current = true; void task.run(async () => {
      try { const result = await api<FictionClock>(apiPath(campaignId, "/week/clock"), { method: "PUT", body: { expectedVersion: draft.version, day: draft.day, label: draft.label, postDays: draft.postDays } }); setDraft(null); setSaved(t("Weltzeit gespeichert: {label}. Fällige Briefe wurden zugestellt.", { label: result.label })); onChanged(); }
      catch (failure) { onChanged(); throw new Error(failure instanceof ApiError && failure.status === 409 ? t("Die Weltzeit wurde inzwischen geändert oder würde zurückgestellt. Dein Entwurf bleibt erhalten; prüfe den aktuellen Stand.") : t("Das Speichern ist noch nicht bestätigt. Prüfe den aktualisierten Stand; dein Entwurf bleibt erhalten.")); }
      finally { sending.current = false; }
    }); }}>
      <div className="week-clock-fields"><label>{t("Fortlaufender Tag")}<input type="number" min={current?.day ?? 0} max={1_000_000} step={1} value={Number.isNaN(value.day) ? "" : value.day} onChange={event => change({ day: event.target.valueAsNumber })} disabled={task.busy} required /></label><label>{t("Datum in eurer Welt")}<input value={value.label} maxLength={120} onChange={event => change({ label: event.target.value })} disabled={task.busy} required /></label><label>{t("Postlaufzeit in Tagen")}<input type="number" min={0} max={365} step={1} value={Number.isNaN(value.postDays) ? "" : value.postDays} onChange={event => change({ postDays: event.target.valueAsNumber })} disabled={task.busy} required /></label></div>
      <p className="field-help">{t("Der fortlaufende Tag zählt nur aufwärts und entscheidet, wann Briefe ankommen; das Datum daneben ist allein die Beschriftung, die ihr am Tisch benutzt. Beim Vorstellen der Weltzeit werden fällige Briefe zugestellt. Eine neue Postlaufzeit gilt für künftig versendete Briefe; bereits versiegelte Ankunftstage bleiben bestehen.")}</p>
      {stale ? <Notice error>{t("Es gibt einen neueren Stand der Weltzeit. Verwirf den alten Entwurf, bevor du einen neuen Stand bearbeitest.")}</Notice> : null}
      <div className="button-row"><Button type="submit" variant="primary" disabled={task.busy || !draft || stale || !value.label.trim() || !Number.isInteger(value.day) || !Number.isInteger(value.postDays)}>{t("Weltzeit speichern")}</Button>{draft ? <Button disabled={task.busy} onClick={() => { setDraft(null); task.setError(""); }}>{t("Zeitentwurf verwerfen")}</Button> : null}</div>
    </form> : current ? <p><strong>{t("Die Post braucht {tage}.", { tage: plural(current.postDays, "{n} Tag", "{n} Tage") })}</strong> {t("Die Spielleitung stellt die Weltzeit weiter.")}</p> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}{saved ? <Notice>{saved}</Notice> : null}
  </section>;
}

interface SelectedPassage { pid: string; entryId: string; title: string; label: string }
function LetterComposer({ campaignId, actorId, roster, entries, entriesError, clock, revision, seed, onDirty, onSent }: {
  campaignId: string; actorId: string; roster: Member[]; entries: EntrySummary[]; entriesError: string; clock: FictionClock | null; revision: number;
  seed?: WeekViewProps["composeSeed"]; onDirty: (dirty: boolean) => void; onSent: (letter: LetterDetail) => void;
}) {
  const [initialSeed] = useState(seed), [seedApplied, setSeedApplied] = useState(false), [seedError, setSeedError] = useState("");
  const [entryId, setEntryId] = useState(seed?.entryId ?? ""), [passages, setPassages] = useState<SelectedPassage[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]), [note, setNote] = useState("");
  const task = useTask(), controllers = useRef(new Set<AbortController>());
  const [submission] = useState(() => createLetterSubmission(async request => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15_000); controllers.current.add(controller);
    try { return await api<LetterDetail>(apiPath(campaignId, "/week/letters"), { method: "POST", body: request, signal: controller.signal }); }
    finally { clearTimeout(timer); controllers.current.delete(controller); }
  }));
  const document = useWeekResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${encodeURIComponent(entryId)}`) : null, revision);
  const dirty = !!(note || recipients.length || passages.length || (initialSeed && !seedApplied));
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => () => { for (const controller of controllers.current) controller.abort(); }, []);
  useEffect(() => {
    if (!initialSeed || seedApplied || !document.data || document.data.entryId !== initialSeed.entryId) return;
    const wanted = new Set(initialSeed.passageIds), selected = document.data.passagen.filter(passage => wanted.has(passage.pid));
    setPassages(selected.map(passage => ({ pid: passage.pid, entryId: document.data!.entryId, title: document.data!.titel, label: plainText(passage.inhalt) })));
    if (selected.length !== wanted.size) setSeedError(t("Einige ausgewählte Passagen sind nicht mehr verfügbar. Prüfe die Auswahl vor dem Versand."));
    setSeedApplied(true);
  }, [initialSeed, seedApplied, document.data]);
  const pending = submission.pending !== null, locked = task.busy || pending;
  const availableRecipients = roster.filter(member => member.actorId && member.actorId !== actorId);
  const discard = () => {
    if (pending && !window.confirm(t("Der Brief könnte bereits gespeichert sein. Prüfe deine gesendeten Briefe, bevor du ihn neu verfasst. Diesen Entwurf trotzdem verwerfen?"))) return;
    submission.discard(); setPassages([]); setRecipients([]); setNote(""); setSeedApplied(true); setSeedError(""); task.setError("");
  };
  return <form className="panel week-composer" onSubmit={event => { event.preventDefault(); if (task.busy || !recipients.length || !passages.length) return; void task.run(async () => {
    try { const letter = await submission.submit({ fromActorId: actorId, toActorIds: recipients, passageIds: passages.map(passage => passage.pid), note }); setPassages([]); setRecipients([]); setNote(""); setSeedError(""); setSeedApplied(true); onSent(letter); }
    catch (error) { throw new Error(submission.pending ? t("Der Versand ist noch nicht bestätigt. Wiederhole denselben Brief; seine Versandkennung bleibt gleich. Du kannst inzwischen deine gesendeten Briefe prüfen.") : error instanceof ApiError && error.status === 404 ? t("Eine Figur oder Passage ist nicht mehr verfügbar. Dein Entwurf bleibt erhalten; prüfe Empfänger und Inhalt.") : errorText(error)); }
  }); }}>
    <h3>{t("Brief verfassen")}</h3><p className="field-help">{t("Die ausgewählten Passagen werden beim Versand eingefroren. Spätere Änderungen überschreiben diesen Brief nicht.")}</p>
    <fieldset className="week-recipient-options" disabled={locked}><legend>{t("An welche Figuren?")}</legend>{availableRecipients.length ? availableRecipients.map(member => <label key={member.actorId} className="week-check"><input type="checkbox" checked={recipients.includes(member.actorId!)} disabled={recipients.length >= 16 && !recipients.includes(member.actorId!)} onChange={event => setRecipients(value => event.target.checked ? [...value, member.actorId!] : value.filter(id => id !== member.actorId))} /><span>{member.displayName}</span></label>) : <p className="field-help">{t("Noch keine andere Figur in dieser Runde.")}</p>}</fieldset>
    <label>{t("Artikel für den Brief")}<select value={entryId} onChange={event => setEntryId(event.target.value)} disabled={locked}><option value="">{t("Artikel auswählen")}</option>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
    {entriesError || document.error ? <Notice error>{entriesError || document.error}</Notice> : null}{seedError ? <Notice error>{seedError}</Notice> : null}
    {document.loading ? <Loading text={t("Deine Passagen werden geladen …")} /> : document.data ? <fieldset className="week-passage-options" disabled={locked}><legend>{t("Passagen aus {titel}", { titel: document.data.titel })}</legend>{document.data.passagen.map(passage => {
      const label = plainText(passage.inhalt), selected = passages.some(item => item.pid === passage.pid);
      return <label key={passage.pid} className="week-check"><input type="checkbox" checked={selected} disabled={passages.length >= 32 && !selected} onChange={event => setPassages(value => event.target.checked ? [...value, { pid: passage.pid, entryId: document.data!.entryId, title: document.data!.titel, label }] : value.filter(item => item.pid !== passage.pid))} /><span>{passage.pfad.length ? <small>{passage.pfad.join(" › ")}</small> : null}{label || t("Passage ohne Text")}</span></label>;
    })}</fieldset> : null}
    {passages.length ? <div className="week-selection"><p>{plural(passages.length, "{n} Passage ausgewählt", "{n} Passagen ausgewählt")}</p><ul>{passages.map(passage => <li key={passage.pid}><span><strong>{passage.title}</strong> · {passage.label.slice(0, 160)}</span><Button variant="quiet" aria-label={t("Passage entfernen: {text}", { text: passage.label.slice(0, 80) })} disabled={locked} onClick={() => setPassages(value => value.filter(item => item.pid !== passage.pid))}><X size={15} /></Button></li>)}</ul></div> : null}
    <label>{t("Persönlicher Begleittext")}<textarea value={note} onChange={event => setNote(event.target.value)} rows={4} maxLength={4000} disabled={task.busy} readOnly={pending} /></label>
    <p className="field-help">{clock ? t("Beim jetzigen Stand würde der Brief an Tag {tag} ankommen. Der Server versiegelt den Ankunftstag beim Versand.", { tag: clock.day + clock.postDays }) : t("Die Ankunft wird beim Versand aus der aktuellen Weltzeit berechnet.")}</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}<div className="button-row"><Button type="submit" variant="primary" disabled={task.busy || !passages.length || !recipients.length || (!pending && !!document.error)}><Send size={16} /> {pending ? t("Denselben Brief erneut senden") : t("Brief versiegeln und senden")}</Button>{dirty || pending ? <Button disabled={task.busy} onClick={discard}>{t("Briefentwurf verwerfen")}</Button> : null}</div>
  </form>;
}

function LetterReader({ campaignId, letterId, revision, names, onOpenEntry, onOpenDoors, onChanged }: { campaignId: string; letterId: string; revision: number; names: ReadonlyMap<string, string>; onOpenEntry: (id: string) => void; onOpenDoors: (id?: string) => void; onChanged: () => void }) {
  const letter = useWeekResource<LetterDetail>(apiPath(campaignId, `/week/letters/${encodeURIComponent(letterId)}`), revision, 6000), task = useTask();
  return <>{letter.error ? <Notice error>{letter.error}<Button onClick={onChanged}>{t("Brief erneut laden")}</Button></Notice> : null}{task.error ? <Notice error>{task.error}</Notice> : null}{letter.loading ? <Loading text={t("Brief wird geöffnet …")} /> : letter.data ? <LetterContents letter={letter.data} names={names} onOpenEntry={onOpenEntry} onOpenDoors={onOpenDoors} busy={task.busy} onRead={() => void task.run(async () => { const updated = await api<LetterDetail>(apiPath(campaignId, `/week/letters/${encodeURIComponent(letterId)}/read`), { method: "POST", body: {} }); letter.replace(updated); onChanged(); })} /> : null}</>;
}

/** Render the server's frozen projection; never substitute the current wiki document. */
export function LetterContents({ letter, names, onOpenEntry, onOpenDoors, onRead, busy = false }: { letter: LetterDetail; names: ReadonlyMap<string, string>; onOpenEntry: (id: string) => void; onOpenDoors?: (id?: string) => void; onRead: () => void; busy?: boolean }) {
  const received = letter.direction === "received", unread = received && letter.recipients.some(recipient => recipient.readAt === null);
  const outcomes = new Map(letter.delivery.flatMap(receipt => receipt.proof.passages.map(passage => [passage.passageId, passage] as const)));
  return <article className="week-letter"><header><p className="eyebrow">{received ? t("Empfangener Brief") : t("Deine versiegelte Abschrift")}</p><h2>{t("Von {name}", { name: nameOf(names, letter.fromActorId) })}</h2><p className="muted">{t("Versandt: {label} · Tag {tag}. Ankunft ab Tag {ankunft}.", { label: letter.sentLabel, tag: letter.sentDay, ankunft: letter.arrivalDay })}</p></header>
    <ul className="week-recipient-state">{letter.recipients.map(recipient => <li key={recipient.actorId}><strong>{nameOf(names, recipient.actorId)}</strong><span>{recipientState(recipient)}</span>{recipient.readAt !== null ? <small>{t("Lesebestätigung:")} <ServerTime value={recipient.readAt} /></small> : recipient.deliveredAt !== null ? <small>{t("Zustellung auf dem Server:")} <ServerTime value={recipient.deliveredAt} /></small> : null}</li>)}</ul>
    {letter.note ? <section className="week-cover-note"><h3>{t("Persönlicher Begleittext")}</h3><p>{letter.note}</p><small>{t("Dieser Begleittext ist keine kanonische Passage.")}</small></section> : null}
    {letter.articles.map(article => <section className="week-frozen-article" key={article.entryId}><h3>{article.titel}</h3><p className="field-help">{t("Eingefrorene Abschrift · Hörensagen")}</p>{article.passagen.map(passage => {
      const citation = article.citations.find(item => item.passageId === passage.pid), outcome = outcomes.get(passage.pid);
      return <section key={passage.pid} className="week-frozen-passage">{passage.pfad.length ? <h4>{passage.pfad.join(" › ")}</h4> : null}<BlockReader block={passage.inhalt} onEntry={onOpenEntry} onDoor={onOpenDoors} />
        {outcome ? <p className="week-grant-state">{outcome.grant === "current" ? t("Bei Zustellung als Hörensagen ins Buch aufgenommen. Stärkere eigene Quellen bleiben erhalten.") : t("Historische Abschrift: Die Quelle hat sich verändert. Der neuere Artikelinhalt wurde durch diesen Brief nicht freigegeben.")}</p> : null}
        {citation ? <details><summary>{t("Quelle dieser Abschrift")}</summary><dl className="week-evidence"><dt>{t("Übermittlung")}</dt><dd>{sourceName(citation.quelle, names)}</dd><dt>{t("Quellrevision")}</dt><dd><code>{citation.sourceRevisionId}</code></dd><dt>{t("Quellbeleg")}</dt><dd><code>{citation.sourceHash}</code></dd></dl></details> : null}
      </section>;
    })}{received && article.passagen.some(passage => outcomes.get(passage.pid)?.grant === "current") ? <Button onClick={() => onOpenEntry(article.entryId)}><BookOpen size={15} /> {t("In der Chronik öffnen")}</Button> : null}</section>)}
    <details className="week-delivery-proof"><summary>{t("Versand und Zustellbeleg ansehen")}</summary><dl className="week-evidence"><dt>{t("Auf dem Server versiegelt")}</dt><dd><ServerTime value={letter.sentAt} /></dd><dt>{t("Weltzeit beim Versand")}</dt><dd>{t("{label} · Tag {tag}", { label: letter.sentLabel, tag: letter.sentDay })}</dd><dt>{t("Geplanter Ankunftstag")}</dt><dd>{t("Tag {tag}", { tag: letter.arrivalDay })}</dd><dt>{t("Umschlagsiegel")}</dt><dd><code>{letter.seal}</code></dd></dl>
      {letter.delivery.map(receipt => <section key={receipt.seal}><h3>{t("Zustellung an {name}", { name: nameOf(names, receipt.proof.toActorId) })}</h3><dl className="week-evidence"><dt>{t("Auf dem Server zugestellt")}</dt><dd><ServerTime value={receipt.proof.deliveredAt} /></dd><dt>{t("Weltzeit bei Zustellung")}</dt><dd>{t("{label} · Tag {tag}", { label: receipt.proof.deliveredLabel, tag: receipt.proof.deliveredDay })}</dd><dt>{t("Zustellsiegel")}</dt><dd><code>{receipt.seal}</code></dd></dl><p className="field-help">{t("Der Zustellbeleg bewahrt die übermittelten Quellrevisionen und ob jede Passage aktuell oder nur als historische Abschrift ankam.")}</p></section>)}
      {!received ? <p className="field-help">{t("Den persönlichen Zustellbeleg sieht die empfangende Figur. Ob zugestellt und gelesen wurde, steht oben am Umschlag.")}</p> : null}
    </details>
    {unread ? <Button variant="primary" disabled={busy} onClick={onRead}><Check size={16} /> {t("Brief als gelesen markieren")}</Button> : received ? <p className="week-read-state" role="status">{t("Deine Lesebestätigung ist gespeichert.")}</p> : null}
  </article>;
}

function DifferencePanel({ data, loading, error, names, entries, onOpenEntry, onOpenDoors, onRetry }: { data: WeekDifference | null; loading: boolean; error: string; names: ReadonlyMap<string, string>; entries: EntrySummary[]; onOpenEntry: (id: string) => void; onOpenDoors: (id?: string) => void; onRetry: () => void }) {
  const titles = new Map(entries.map(entry => [entry.id, entry.title])), grouped = new Map<string, WeekDifference["knowledgeAdded"]>();
  for (const change of data?.knowledgeAdded ?? []) grouped.set(change.entryId, [...(grouped.get(change.entryId) ?? []), change]);
  return <section className="panel week-difference"><p className="eyebrow">{t("Nur für die Spielleitung")}</p><h2>{t("Seit dem letzten Sitzungsbeginn")}</h2>
    {error ? <Notice error>{error}<Button onClick={onRetry}>{t("Vergleich erneut laden")}</Button></Notice> : null}{loading ? <Loading text={t("Wochenvergleich wird geladen …")} /> : null}
    {data ? <>{data.window.from !== null ? <p className="field-help">{t("Vergleichsfenster:")} <ServerTime value={data.window.from} /> {t("bis")} <ServerTime value={data.window.to} /></p> : null}
      {!data.baselineKnown ? <Notice>{t("Für den letzten Sitzungsbeginn liegt kein gespeicherter Wissensstand vor. Neue Kenntnisse lassen sich deshalb für dieses Fenster nicht bestimmen. Beim nächsten Szenenbeginn wird ein Ausgangsstand festgehalten.")}</Notice> : <section><h3>{t("Hinzugekommenes Wissen")}</h3>{grouped.size ? [...grouped].map(([entryId, changes]) => <div key={entryId} className="week-difference-entry"><Button variant="quiet" onClick={() => onOpenEntry(entryId)}>{titles.get(entryId) ?? t("Artikel öffnen")}</Button><ul>{changes.map(change => <li key={`${change.actorId}/${change.passageId}`}><strong>{nameOf(names, change.actorId)}</strong> · {sourceName(change.quelle, names)}<small><ServerTime value={change.grantedAt} /></small></li>)}</ul></div>) : <p className="muted">{t("Seit diesem Sitzungsbeginn ist kein zusätzliches Wissen hinzugekommen.")}</p>}</section>}
      <p className="field-help">{t("Eine Vollmacht erlaubt einer einzelnen Figur, eine von der Spielleitung vorbereitete Handlung ganz allein auszulösen — unabhängig vom nächsten Spielabend, solange die Frist läuft.")}</p>
      <div className="week-difference-columns">{(["open", "expired"] as const).map(kind => <section key={kind}><h3>{kind === "open" ? t("Offene Vollmachten") : t("In diesem Fenster verfallen")}</h3>{data[kind].length ? <ul>{data[kind].map(door => <li key={door.id}><Button variant="quiet" onClick={() => onOpenDoors(door.id)}>{door.targetSlug}</Button><span>{kind === "open" ? t("Nur {name} kann sie auslösen.", { name: nameOf(names, door.actorId) }) : t("War für {name} bestimmt.", { name: nameOf(names, door.actorId) })}</span><small>{kind === "open" ? <>{t("Läuft ab")} <ServerTime value={door.expiresAt} /> · {t("reale Uhrzeit, nicht die Weltzeit")}</> : <>{t("Frist verstrichen:")} <ServerTime value={door.expiresAt} /></>}</small></li>)}</ul> : kind === "open" ? <EmptyState title={t("Gerade ist niemandem eine Vollmacht erteilt.")} action={<Button variant="quiet" onClick={() => onOpenDoors()}>{t("Vollmacht erteilen")}</Button>}>{t("Erteile einer Figur eine Vollmacht, damit sie zwischen den Abenden selbst etwas herausfinden kann.")}</EmptyState> : <p className="muted">{t("In diesem Fenster ist keine Frist verstrichen.")}</p>}</section>)}<section><h3>{t("Briefe unterwegs")}</h3>{data.inTransit.length ? <ul>{data.inTransit.map(letter => <li key={`${letter.letterId}/${letter.toActorId}`}><strong>{nameOf(names, letter.fromActorId)} → {nameOf(names, letter.toActorId)}</strong><small>{t("Ankunft ab Tag {tag}", { tag: letter.arrivalDay })}</small></li>)}</ul> : <p className="muted">{t("Keine Briefe unterwegs.")}</p>}</section></div>
    </> : null}
  </section>;
}

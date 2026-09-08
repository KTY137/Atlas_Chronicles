// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import type { ChronistSourceDescriptor, ChronistSourcePage } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type EntrySummary } from "../api";
import { useResource } from "../hooks";
import { chronistPath } from "./chronist-api";
import { t } from "../i18n";

export function ChronistSources({ campaignId, selected, onChange, savedEntryId, revision, disabled }: {
  campaignId: string; selected: readonly ChronistSourceDescriptor[]; onChange: (sources: ChronistSourceDescriptor[]) => void;
  savedEntryId: string | null; revision: number; disabled: boolean;
}) {
  const [query, setQuery] = useState(""), [entryId, setEntryId] = useState(savedEntryId ?? ""), [after, setAfter] = useState<string | null>(null);
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, `/entries${query ? `?q=${encodeURIComponent(query)}` : ""}`), revision);
  const passages = useResource<ChronistSourcePage>(entryId ? chronistPath(campaignId, `/sources?entryId=${encodeURIComponent(entryId)}&limit=50${after ? `&after=${encodeURIComponent(after)}` : ""}`) : null, revision);
  useEffect(() => { if (savedEntryId) { setEntryId(savedEntryId); setAfter(null); } }, [savedEntryId]);
  const choose = (source: ChronistSourceDescriptor, checked: boolean) => onChange(checked
    ? [...selected.filter(item => item.ref.passageId !== source.ref.passageId), source]
    : selected.filter(item => item.ref.passageId !== source.ref.passageId));
  return <section className="chronist-sources" aria-label={t("Quellen wählen")}>
    <div className="chronist-form-row"><label>{t("Artikel finden")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Titel oder Text suchen")} disabled={disabled} /></label><label>{t("Artikel auswählen")}<select value={entryId} disabled={disabled || entries.loading} onChange={event => { setEntryId(event.target.value); setAfter(null); }}><option value="">{t("Artikel wählen …")}</option>{entryId && !entries.data?.some(entry => entry.id === entryId) ? <option value={entryId}>{t("Ausgewählter Artikel")}</option> : null}{entries.data?.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label></div>
    {entries.error ? <Notice error>{entries.error}</Notice> : null}
    {entries.loading ? <Loading text={t("Artikel werden geladen …")} /> : entries.data?.length === 0 ? <p className="field-help">{query ? t("Keine Artikel für diese Suche.") : t("Noch keine gespeicherten Artikel. Lege eine Notiz oder einen Artikel in der Chronik an.")}</p> : null}
    {passages.loading ? <Loading text={t("Gespeicherte Passagen werden geladen …")} /> : passages.error ? <Notice error>{passages.error}</Notice> : passages.data ? <>
      <div className="section-heading"><h4>{passages.data.sources[0]?.title ?? t("Passagen")}</h4><Button disabled={disabled || !passages.data.sources.length} onClick={() => onChange([...selected.filter(item => !passages.data!.sources.some(source => source.ref.passageId === item.ref.passageId)), ...passages.data!.sources].slice(0, 512))}>{t("Diese {anzahl} Passagen wählen", { anzahl: passages.data.sources.length })}</Button></div>
      <div className="chronist-source-list">{passages.data.sources.map((source, index) => <label key={source.sourceId} className="chronist-source-option"><input type="checkbox" checked={selected.some(item => item.sourceId === source.sourceId)} disabled={disabled || selected.length >= 512 && !selected.some(item => item.sourceId === source.sourceId)} onChange={event => choose(source, event.target.checked)} /><span><strong>{t("Passage {nummer}", { nummer: index + 1 })}{after ? ` ${t("auf dieser Seite")}` : ""}</strong><span className="chronist-source-text">{source.text || t("Leere Passage")}</span></span></label>)}</div>
      <div className="button-row">{after ? <Button disabled={disabled} onClick={() => setAfter(null)}>{t("Erste Passagenseite")}</Button> : null}{!passages.data.complete && passages.data.after ? <Button disabled={disabled} onClick={() => setAfter(passages.data!.after)}>{t("Weitere Passagen")}</Button> : null}</div>
      {!passages.data.complete ? <p className="field-help">{t("Dieser Artikel enthält weitere Passagen. Nur die ausdrücklich gewählten Passagen gehören zur Auswertung.")}</p> : null}
    </> : <EmptyState title={t("Welche Geschichten gehören dazu?")}>{t("Wähle einen Artikel und anschließend die einzelnen Passagen. Weitere Artikel kannst du danach ergänzen.")}</EmptyState>}
    <div className="chronist-selection" aria-live="polite"><div className="section-heading"><h4>{t("{anzahl} Passagen ausgewählt", { anzahl: selected.length })}</h4>{selected.length ? <Button disabled={disabled} onClick={() => onChange([])}>{t("Auswahl leeren")}</Button> : null}</div>
      {selected.length ? <ul>{selected.map(source => <li key={source.sourceId}><div><strong>{source.title}</strong><p>{source.text.slice(0, 180)}{source.text.length > 180 ? "…" : ""}</p></div><Button disabled={disabled} aria-label={t("Passage aus {titel} entfernen", { titel: source.title })} onClick={() => choose(source, false)}>{t("Entfernen")}</Button></li>)}</ul> : <p className="field-help">{t("Es wird noch kein Inhalt verwendet.")}</p>}
    </div>
  </section>;
}

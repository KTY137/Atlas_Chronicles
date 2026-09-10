// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useState } from "react";
import type { ChronistLocalScanReport, ChronistPreviewBody, ChronistPreviewResult, ChronistProviderDescription, ChronistProviderScanResult, ChronistRunPage, ChronistRunView, ChronistSourceDescriptor, ChronistStartAck, ChronistSuggestionPage, StartChronistRunBody } from "@chronicle/protocol";
import { BookOpen, Check, Feather, Play, RefreshCw, Search, Square } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { ApiError, errorText, type Campaign } from "../api";
import { useResource } from "../hooks";
import { ChronistApiError, chronistApi, chronistPath, chronistReason } from "./chronist-api";
import { CHRONIST_TASKS, CHRONIST_TASK_LABEL, CHRONIST_ZEICHEN_JE_TOKEN, DEFAULT_CHRONIST_BUDGET, VORSCHLAG_ART_LABEL, chronistCost, chronistFreigabeRest, chronistNumber, clearChronistDrafts, createChronistCommand, type ChronistMode } from "./chronist-model";
import { ChronistSources } from "./ChronistSources";
import { ChronistSessionNotes } from "./ChronistSessionNotes";
import { ChronistReview } from "./ChronistReview";
import { locale, t } from "../i18n";
import "./chronist.css";

interface Finding { art: string; entryId: string; titel: string; text: string; passagen: readonly string[] }
/** Was an einer geprüften Adresse los war. Links Serverdaten, rechts Oberfläche — übersetzt
 * wird erst an der Anzeigestelle mit `t(SCAN_CODE_LABEL[code])`. */
const SCAN_CODE_LABEL: Record<string, string> = {
  gefunden: "Dienst antwortet",
  leer: "Dienst antwortet, hat aber kein Modell installiert",
  "keine-antwort": "Dort lauscht nichts",
  zeitueberschreitung: "Keine Antwort in der Wartezeit",
  unlesbar: "Antwort war keine Modellliste",
};
const LAUF_STATUS_LABEL = { running: "Auswertung läuft", paused: "Unterbrochen", partial: "Mit Teilergebnissen beendet", completed: "Bereit zur Durchsicht" };
export function ChronistWorkbench({ campaign, onDirty, onOpenEntry, onClose, liveRevision = 0 }: {
  campaign: Campaign; onDirty: (dirty: boolean) => void; onOpenEntry: (id: string) => void; onClose: () => void; liveRevision?: number;
}) {
  const gm = campaign.role === "leitung", campaignId = campaign.id;
  const [view, setView] = useState<"prepare" | "review">("prepare"), [mode, setMode] = useState<ChronistMode>("prosa"), [revision, setRevision] = useState(0);
  const [sources, setSources] = useState<ChronistSourceDescriptor[]>([]), [sessionId, setSessionId] = useState(""), [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState(""), [chosenModel, setChosenModel] = useState(""), [budget, setBudget] = useState<ChronistPreviewResult["budget"]>({ ...DEFAULT_CHRONIST_BUDGET });
  const [prepared, setPrepared] = useState<{ request: ChronistPreviewBody; result: ChronistPreviewResult } | null>(null), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [denied, setDenied] = useState(false);
  const [jetzt, setJetzt] = useState(() => Date.now());
  const [runId, setRunId] = useState<string | null>(null), [proposalId, setProposalId] = useState<string | null>(null), [runAfter, setRunAfter] = useState<string | null>(null), [suggestionAfter, setSuggestionAfter] = useState<string | null>(null);
  const providers = useResource<{ providers: readonly ChronistProviderDescription[]; canScanLocal?: boolean }>(gm ? chronistPath(campaignId, "/providers") : null, revision + liveRevision, 8000);
  // Das Ergebnis der letzten ausdruecklichen Suche nach einem lokalen Modelldienst.
  const [scan, setScan] = useState<ChronistLocalScanReport | null>(null), [scanning, setScanning] = useState(false);
  const findings = useResource<readonly Finding[]>(chronistPath(campaignId), revision + liveRevision);
  const runs = useResource<ChronistRunPage>(gm && view === "review" ? chronistPath(campaignId, `/runs?limit=50${runAfter ? `&after=${encodeURIComponent(runAfter)}` : ""}`) : null, revision + liveRevision, 5000);
  const run = useResource<ChronistRunView>(gm && view === "review" && runId ? chronistPath(campaignId, `/runs/${encodeURIComponent(runId)}`) : null, revision + liveRevision, 2000);
  const suggestions = useResource<ChronistSuggestionPage>(view === "review" ? chronistPath(campaignId, `/suggestions?limit=50${runId ? `&runId=${encodeURIComponent(runId)}` : ""}${suggestionAfter ? `&after=${encodeURIComponent(suggestionAfter)}` : ""}`) : null, revision + liveRevision, 5000);
  const [startCommand] = useState(() => createChronistCommand<Omit<StartChronistRunBody, "commandId">, ChronistStartAck>(body => chronistApi(chronistPath(campaignId, "/runs"), { method: "POST", body })));
  const provider = providers.data?.providers.find(item => item.id === providerId) ?? (!providerId ? providers.data?.providers.find(item => item.location === "lokal" && item.available) ?? providers.data?.providers.find(item => item.location === "lokal") : undefined);
  const model = chosenModel || provider?.models[0] || "";
  const refresh = () => setRevision(value => value + 1);
  /**
   * Sucht auf Knopfdruck nach einem lokal laufenden Modelldienst.
   *
   * Warum es diesen Knopf gibt: bis zum 10.09.2026 suchte der Server genau einmal beim Start,
   * an genau einer Adresse, mit einer Sekunde Geduld — und sagte bei einem Fehlschlag nichts.
   * Wer seinen Modelldienst nach der App startet oder ihn woanders betreibt, musste den ganzen
   * Server neu starten und raten. Jetzt sucht er auf Ansage, ueber mehrere Adressen, und sagt
   * fuer jede, was er dort vorgefunden hat.
   */
  const sucheLokal = async () => {
    setScanning(true); setError("");
    try {
      const ergebnis = await chronistApi<ChronistProviderScanResult>(chronistPath(campaignId, "/providers/scan"), { method: "POST" });
      setScan(ergebnis.scan);
      // Die Anbieterliste kommt aus derselben Antwort; ein erneutes Laden haelt sie und die
      // uebrigen Ansichten auf demselben Stand.
      refresh();
      if (ergebnis.scan.found) { setProviderId(""); setChosenModel(""); }
    } catch (fehler) { setError(errorText(fehler)); }
    finally { setScanning(false); }
  };
  const changeDirty = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const guard = () => !dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"));
  const invalidate = () => { setPrepared(null); setConsent(false); setError(""); };
  const locked = busy || !!startCommand.pending;
  // Die Freigabe ist ein Einmal-Token mit Ablauf. Solange eine offen ist, tickt die Anzeige,
  // und mit ihrem Ablauf verliert das Kästchen seine Wirkung, statt erst der Serverfehler.
  const freigabe = prepared?.result.freigabe ?? null, freigabeGueltig = !!freigabe && freigabe.ablaufAt > jetzt;
  useEffect(() => {
    if (!freigabe) return;
    setJetzt(Date.now());
    const timer = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [freigabe]);
  useEffect(() => { if (!freigabeGueltig) setConsent(false); }, [freigabeGueltig]);
  useEffect(() => {
    if (gm && providers.error && !providers.data) { setSources([]); setPrepared(null); setConsent(false); try { clearChronistDrafts(sessionStorage, campaignId); } catch { /* No secondary cache. */ } }
  }, [providers.error, providers.data, gm, campaignId]);
  const execute = async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (cause) { setError(errorText(cause)); if (cause instanceof ApiError && [401, 403, 404].includes(cause.status)) { setDenied(true); setSources([]); setPrepared(null); try { clearChronistDrafts(sessionStorage, campaignId); } catch { /* No fallback cache. */ } } }
    finally { setBusy(false); }
  };
  const preview = () => execute(async () => {
    if (!provider) return;
    const request: ChronistPreviewBody = { mode, ...(mode === "sitzung" ? { sessionId } : {}), providerId: provider.id, model, sourceRefs: sources.map(source => source.ref), budget };
    const result = await chronistApi<ChronistPreviewResult>(chronistPath(campaignId, "/runs/preview"), { method: "POST", body: request });
    setPrepared({ request, result }); setConsent(false);
  });
  const start = () => execute(async () => {
    if (!prepared) return;
    const external = prepared.result.provider.location === "fremd";
    if (external && !prepared.result.freigabe) throw new ChronistApiError(409, "freigabe-missing", chronistReason("freigabe-missing"));
    const ack = await startCommand.send({ ...prepared.request, scopeHash: prepared.result.scopeHash,
      ...(external ? { externalConsent: { scopeHash: prepared.result.scopeHash, token: prepared.result.freigabe!.token } } : {}) });
    setRunId(ack.runId); setView("review"); setSuggestionAfter(null); setPrepared(null); setConsent(false); refresh();
  });
  const changeView = (value: "prepare" | "review") => { if (value === view || !guard()) return; changeDirty(false); setProposalId(null); setView(value); };
  const openEntry = (id: string) => { onOpenEntry(id); };
  const chooseRun = (id: string | null) => { if (!guard()) return; changeDirty(false); setRunId(id); setProposalId(null); setSuggestionAfter(null); };
  return <section className="chronist-workbench" aria-label={t("Chronist")}>
    <header className="chronist-heading"><div className="chronist-heading-mark" aria-hidden="true"><Feather size={28} /></div><div><p className="eyebrow">{t("Aus Geschichten wird eine Chronik")}</p><h2>{t("Der Chronist")}</h2><p>{t("Quellen durchsehen, Zusammenhänge entdecken, eure Geschichte weiterschreiben.")}</p></div><Button onClick={onClose}>{t("Schließen")}</Button></header>
    <div className="chronist-view-tabs" aria-label={t("Chronist-Arbeitsbereiche")}><Button aria-pressed={view === "prepare"} onClick={() => changeView("prepare")}>{gm ? t("Neue Aufgabe") : t("Regelbefunde")}</Button><Button aria-pressed={view === "review"} onClick={() => changeView("review")}>{gm ? t("Läufe & Durchsicht") : t("Vorschläge durchsehen")}</Button><Button aria-label={t("Chronist aktualisieren")} onClick={refresh}><RefreshCw size={16} /></Button></div>
    {denied || gm && providers.error && !providers.data ? <Notice error>{error || providers.error || t("Der Chronist ist für diesen Zugang nicht verfügbar.")}<Button onClick={() => { setDenied(false); refresh(); }}>{t("Zugang erneut prüfen")}</Button></Notice> : <>
      {error ? <Notice error>{error}<Button disabled={busy} onClick={refresh}>{t("Stand aktualisieren")}</Button></Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
      {view === "prepare" ? <>
        {gm ? <><div className="chronist-tasks" aria-label={t("Aufgabe wählen")}>{CHRONIST_TASKS.map((id, i) => <button key={id} className={mode === id ? "chronist-task active" : "chronist-task"} aria-pressed={mode === id} disabled={locked} onClick={() => { if (mode === id || !guard()) return; changeDirty(false); setMode(id); invalidate(); }}><span className="chronist-task-number">0{i + 1}</span><strong>{t(CHRONIST_TASK_LABEL[id].titel)}</strong><span>{t(CHRONIST_TASK_LABEL[id].beschreibung)}</span>{mode === id ? <Check size={16} aria-label={t("Ausgewählt")} /> : null}</button>)}</div>
          <ol className="chronist-steps" aria-label={t("Aufgabenfolge")}><li aria-current={!prepared ? "step" : undefined}><span>1</span> {t("Quellen wählen")}</li><li aria-current={prepared ? "step" : undefined}><span>2</span> {t("Umfang prüfen")}</li><li><span>3</span> {t("Vorschläge durchsehen")}</li></ol>
          <section className="chronist-panel"><div className="section-heading"><div><p className="eyebrow">{t("Schritt 1")}</p><h3>{mode === "sitzung" ? t("Notizen speichern und Quellen wählen") : mode === "ueberarbeitung" ? t("Welche Passagen sollen überarbeitet werden?") : t("Welche Quellen sollen gelesen werden?")}</h3></div><BookOpen size={21} aria-hidden="true" /></div>
            {mode === "ueberarbeitung" ? <p className="field-help">{t("Zu jeder gewählten Passage entsteht genau ein Vorschlag: dieselbe Aussage, klarer geschrieben. Du siehst beide Fassungen nebeneinander und entscheidest, ob die neue an ihre Stelle tritt. Sehr lange Passagen werden übersprungen — eine halb überarbeitete Passage gibt es nicht.")}</p> : null}
            {mode === "artikel" ? <p className="field-help">{t("Aus allen gewählten Passagen entsteht ein zusammenhängender Artikel in mehreren Absätzen. Er darf nur enthalten, was in den Quellen steht; anschließend reichst du ihn als neuen Artikel ein.")}</p> : null}
            {mode === "sitzung" ? <ChronistSessionNotes campaignId={campaignId} sessionId={sessionId} onSession={id => { setSessionId(id); invalidate(); }} onSaved={id => { setSavedEntryId(id); refresh(); invalidate(); setNotice(t("Sitzungsnotiz gespeichert. Wähle jetzt ihre Passagen als Quellen aus.")); }} onDirty={changeDirty} disabled={locked} /> : null}
            <ChronistSources campaignId={campaignId} selected={sources} onChange={value => { setSources(value); invalidate(); }} savedEntryId={savedEntryId} revision={revision + liveRevision} disabled={locked} />
          </section>
          <section className="chronist-panel" aria-label={t("Anbieter und Umfang")}><p className="eyebrow">{t("Schritt 2")}</p><h3>{t("Anbieter und Umfang prüfen")}</h3><p className="field-help">{t("Jede Aufgabe beginnt mit dem Regelwerk. Modellunterstützung ergänzt nur die ausgewählten Quellen.")}</p>
            {providers.loading ? <Loading text={t("Anbieter werden geprüft …")} /> : <><div className="chronist-form-row"><label>{t("Anbieter")}<select value={provider?.id ?? ""} disabled={locked} onChange={event => { setProviderId(event.target.value); setChosenModel(""); invalidate(); }}><option value="">{t("Anbieter wählen …")}</option>{providers.data?.providers.map(item => <option key={item.id} value={item.id}>{item.label} · {item.location === "lokal" ? t("Lokal") : t("Extern")}{!item.available ? ` · ${t("noch nicht bereit")}` : ""}</option>)}</select></label><label>{t("Modell")}<select value={model} disabled={locked || !provider?.models.length} onChange={event => { setChosenModel(event.target.value); invalidate(); }}>{!model ? <option value="">{t("Kein Modell verfügbar")}</option> : null}{provider?.models.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
              {/* Die Suche nach einem lokalen Modelldienst — auf Ansage, nicht nur beim Start
                  des Servers. Der Bericht nennt jede geprüfte Adresse und was dort war; ohne das
                  bleibt „kein Anbieter gefunden" eine Aussage ohne Anhaltspunkt. */}
              {providers.data?.canScanLocal === false
                ? <p className="field-help">{t("Dieser Server sucht nicht selbst nach lokalen Modellen. Die Anbieter stehen in seiner Einrichtungsdatei.")}</p>
                : <div className="chronist-scan">
                  <div className="button-row">
                    <Button disabled={locked || scanning} onClick={() => void sucheLokal()}>
                      <Search size={16} aria-hidden="true" /> {scanning ? t("Wird gesucht …") : t("Auf diesem Rechner nach Modellen suchen")}
                    </Button>
                    <span className="field-help">{t("Liest nur die Namen installierter Modelle. Es wird nichts geladen und nichts gestartet.")}</span>
                  </div>
                  {scan ? <div className="chronist-scan-bericht" role="status">
                    <p className="chronist-scan-fazit" data-treffer={scan.found ? "ja" : "nein"}>{scan.found
                      ? t("Gefunden unter {adresse}: {anzahl} Modelle.", { adresse: scan.found.baseUrl, anzahl: scan.found.models.length })
                      : t("Kein laufender Modelldienst gefunden.")}</p>
                    <ul>{scan.entries.map(eintrag => <li key={eintrag.baseUrl} data-code={eintrag.code}>
                      <code>{eintrag.baseUrl}</code>
                      <span>{t(SCAN_CODE_LABEL[eintrag.code])}{eintrag.code === "gefunden" ? ` · ${eintrag.models.slice(0, 4).join(", ")}${eintrag.models.length > 4 ? " …" : ""}` : ""}</span>
                    </li>)}</ul>
                    {!scan.found ? <p className="field-help">{t("Prüfe, ob der Dienst läuft, und ob er auf einer der oben geprüften Adressen lauscht. Eine abweichende Adresse trägst du als OLLAMA_HOST in die Umgebung des Servers ein.")}</p> : null}
                  </div> : null}
                </div>}
              {!provider?.available ? <Notice>{provider?.availabilityCode === "capability-unverified" ? t("Dieser Anbieter ist für die benötigte Textauswertung noch nicht freigegeben.") : t("Hier ist noch kein einsatzbereiter lokaler Anbieter eingerichtet. Die Regelbefunde unten bleiben nutzbar.")}</Notice> : <p className="chronist-provider-location">{provider.location === "lokal" ? t("Lokale Verarbeitung · kein automatischer Wechsel zu einem externen Anbieter") : t("Externe Verarbeitung · deine ausdrückliche Freigabe ist für jeden Lauf erforderlich")}</p>}
              <details className="chronist-setup"><summary>{t("Anbieter einrichten")}</summary><p>{t("Die Einrichtung erfolgt auf dem Rechner, der eure Kampagne bereitstellt. Dort wird ein lokaler Modellserver oder ein unterstützter externer Anbieter mit seinem Modell konfiguriert. Zugangsschlüssel bleiben auf diesem Rechner.")}</p><p>{t("Nach der Einrichtung kannst du die Verfügbarkeit hier erneut prüfen. Die Liste zeigt ausschließlich die für diesen Host eingerichteten Anbieter.")}</p><Button onClick={refresh} disabled={busy}>{t("Verfügbarkeit neu prüfen")}</Button></details>
            </>}
            <details className="chronist-budget"><summary>{t("Grenzen der Auswertung anpassen")}</summary><div className="chronist-form-row"><label>{t("Höchstens so viele Modellaufrufe")}<input type="number" min={0} max={128} value={budget.maxCalls} disabled={locked} onChange={event => { setBudget(value => ({ ...value, maxCalls: Math.max(0, Math.min(128, Number(event.target.value))) })); invalidate(); }} /></label><label>{t("Höchstens so viele Eingabezeichen")}<input type="number" min={0} max={4_000_000} step={1000} value={budget.maxInputChars} disabled={locked} onChange={event => { setBudget(value => ({ ...value, maxInputChars: Math.max(0, Math.min(4_000_000, Number(event.target.value))) })); invalidate(); }} /></label><label>{t("Höchstens so viele Ausgabezeichen")}<input type="number" min={0} max={512_000} step={1000} value={budget.maxOutputChars} disabled={locked} onChange={event => { setBudget(value => ({ ...value, maxOutputChars: Math.max(0, Math.min(512_000, Number(event.target.value))) })); invalidate(); }} /></label></div><p className="field-help">{t("Die Grenzen zählen den gesamten Lauf einschließlich Wiederholungen. Eine Fortsetzung beginnt die Zählung nicht neu. Bei 0 Modellaufrufen wird ausschließlich das Regelwerk verwendet.")}</p></details>
            <Button variant="primary" disabled={locked || dirty || !sources.length || !provider || !model || mode === "sitzung" && !sessionId} onClick={() => void preview()}>{busy ? t("Umfang wird geprüft …") : t("Umfang und Kosten vorschauen")}</Button>{dirty ? <p className="field-help">{t("Speichere zuerst deine Sitzungsnotiz.")}</p> : null}
            {prepared ? <div className="chronist-preview" role="region" aria-label={t("Vorschau der Auswertung")}><h4>{t("Das wird ausgewertet")}</h4><dl className="chronist-metrics"><div><dt>{t("Quellen")}</dt><dd>{t("{anzahl} Passagen", { anzahl: prepared.result.sources.length })}</dd></div><div><dt>{t("Quelltext")}</dt><dd>{t("{anzahl} Zeichen", { anzahl: chronistNumber(prepared.result.sourceChars) })}</dd></div><div><dt>{t("Modellarbeit")}</dt><dd>{t("bis zu {anzahl} Aufrufe", { anzahl: Math.min(prepared.result.maxCalls, prepared.result.budget.maxCalls) })}</dd></div><div><dt>{t("Kostenschätzung")}</dt><dd>{chronistCost(prepared.result.estimate.costMicros, prepared.result.estimate.currency)}</dd></div></dl><p className="field-help">{t("Bis zu {eingabe} Eingabezeichen einschließlich Anweisungen; bis zu {ausgabe} Ausgabezeichen. Die Schätzung rechnet mit rund {zeichen} Zeichen je Token und setzt je Aufruf das volle Ausgabebudget von {budget} Zeichen an, beim Anbieter auf 64 bis 16.000 Token geklammert.", { eingabe: chronistNumber(prepared.result.estimate.inputChars), ausgabe: chronistNumber(prepared.result.estimate.outputChars), zeichen: CHRONIST_ZEICHEN_JE_TOKEN, budget: chronistNumber(prepared.result.budget.maxOutputCharsPerCall) })} {prepared.result.estimate.costKind === "unknown" ? t("Für diesen Anbieter ist kein Tarif hinterlegt, deshalb bleibt die Kostenschätzung unbekannt. Das bedeutet nicht, dass die Auswertung kostenlos ist.") : t("Sie ist eine obere Schranke bei voll ausgeschöpften Grenzen; der tatsächliche Verbrauch liegt in der Regel darunter.")}</p>
              <div className="chronist-preview-sources">{prepared.result.sources.map((source, index) => <details key={source.sourceId}><summary>{source.title} · {t("Passage {nummer}", { nummer: index + 1 })} · {t("{anzahl} Zeichen", { anzahl: chronistNumber(source.text.length) })}</summary><p className="chronist-source-text">{source.text}</p></details>)}</div>
              {prepared.result.ruleFindings.length ? <div className="chronist-preview-findings"><h4>{t("Bereits im Regelwerk gefunden")}</h4>{prepared.result.ruleFindings.map((finding, i) => <p key={i}><strong>{finding.titel}</strong> · {finding.text}</p>)}</div> : null}{prepared.result.warnings.map((warning, i) => <Notice key={i}>{chronistReason(warning)}</Notice>)}
              {prepared.result.provider.location === "fremd" ? <><label className="chronist-consent chronist-check"><input type="checkbox" checked={consent} disabled={locked || !freigabeGueltig} onChange={event => setConsent(event.target.checked)} /><span>{t("Ich gebe diese {anzahl} Passagen und den angezeigten Umfang für diesen Lauf an {anbieter} ({modell}) frei.", { anzahl: prepared.result.sources.length, anbieter: prepared.result.provider.label, modell: prepared.result.model })}{prepared.result.estimate.costKind === "unknown" ? ` ${t("Die Kosten sind unbekannt.")}` : ""}</span></label>
                <p className="field-help" aria-live="polite">{freigabe ? chronistFreigabeRest(freigabe.ablaufAt, jetzt) : t("Für diesen Lauf liegt keine Freigabe vor. Bitte den Umfang erneut vorschauen.")}</p></> : null}
              {!prepared.result.provider.available ? <Notice>{t("Du kannst das Regelwerk jetzt ausführen. Die Modellarbeit pausiert, bis dieser Anbieter eingerichtet ist; vorhandene Regelvorschläge bleiben zur Durchsicht erhalten.")}</Notice> : null}
              <Button variant="primary" disabled={busy || prepared.result.provider.location === "fremd" && (!consent || !freigabeGueltig)} onClick={() => void start()}><Play size={16} />{startCommand.pending ? t("Start unverändert erneut versuchen") : t("Auswertung starten")}</Button>
            </div> : null}
          </section></> : null}
        <section className="chronist-panel" aria-label={t("Regelbefunde")}><p className="eyebrow">{t("Ohne Modell nutzbar")}</p><h3>{t("Was das Regelwerk schon erkennt")}</h3>{findings.loading ? <Loading text={t("Regelbefunde werden gelesen …")} /> : findings.error ? <Notice error>{findings.error}</Notice> : findings.data?.length ? <ul className="chronist-findings">{findings.data.map((finding, i) => <li key={`${finding.entryId}:${i}`}><div><strong>{finding.titel}</strong><p>{finding.text}</p></div><Button onClick={() => openEntry(finding.entryId)}>{t("Artikel öffnen")}</Button></li>)}</ul> : <p className="field-help">{t("Im lesbaren Bestand wurden keine widersprüchlichen Jahresangaben oder unlesbaren Datumsfelder gefunden.")}</p>}</section>
      </> : <>
        {gm ? <section className="chronist-panel"><div className="section-heading"><h3>{t("Deine Auswertungen")}</h3><Button aria-pressed={runId === null} onClick={() => chooseRun(null)}>{t("Alle Vorschläge")}</Button></div>{runs.loading ? <Loading text={t("Läufe werden geladen …")} /> : runs.error ? <Notice error>{runs.error}</Notice> : runs.data?.runs.length ? <div className="chronist-run-list">{runs.data.runs.map(item => <button key={item.runId} className={item.runId === runId ? "chronist-run selected" : "chronist-run"} aria-pressed={item.runId === runId} onClick={() => chooseRun(item.runId)}><strong>{t(CHRONIST_TASK_LABEL[item.mode].titel)}</strong><span>{new Date(item.createdAt).toLocaleString(locale())}</span><span>{t(LAUF_STATUS_LABEL[item.state])}</span><small>{item.provider.label} · {t("{anzahl} Vorschläge", { anzahl: item.progress.suggestions })}</small></button>)}</div> : <p className="field-help">{t("Noch keine Auswertung gestartet. Wähle unter „Neue Aufgabe“ deine Quellen.")}</p>}<div className="button-row">{runAfter ? <Button onClick={() => setRunAfter(null)}>{t("Erste Laufseite")}</Button> : null}{runs.data && !runs.data.complete && runs.data.after ? <Button onClick={() => setRunAfter(runs.data!.after)}>{t("Weitere Läufe")}</Button> : null}</div>
          {run.loading ? <Loading text={t("Laufstand wird geprüft …")} /> : run.error ? <Notice error>{run.error}</Notice> : run.data ? <ChronistRun key={`${run.data.runId}:${run.data.version}`} run={run.data} busy={busy} onCancel={() => void execute(async () => { await chronistApi(chronistPath(campaignId, `/runs/${encodeURIComponent(run.data!.runId)}/cancel`), { method: "POST", body: { expectedVersion: run.data!.version } }); refresh(); })} onResume={(external, unknown) => void execute(async () => { const value = run.data!;
            // Auch eine Fortsetzung geht nach aussen. Sie holt sich dafür eine eigene, frische
            // Freigabe für genau diesen unveränderten Umfang; ein altes Token gilt nie zweimal.
            let externalConsent: { scopeHash: string; token: string } | undefined;
            if (external) {
              const fresh = await chronistApi<ChronistPreviewResult>(chronistPath(campaignId, "/runs/preview"), { method: "POST", body: { mode: value.mode, ...(value.sessionId ? { sessionId: value.sessionId } : {}), providerId: value.provider.id, model: value.model, sourceRefs: value.sources.map(source => source.ref), budget: value.budget } });
              if (fresh.scopeHash !== value.scopeHash) throw new ChronistApiError(409, "scope-changed", chronistReason("scope-changed"));
              if (!fresh.freigabe) throw new ChronistApiError(409, "freigabe-missing", chronistReason("freigabe-missing"));
              externalConsent = { scopeHash: value.scopeHash, token: fresh.freigabe.token };
            }
            await chronistApi(chronistPath(campaignId, `/runs/${encodeURIComponent(value.runId)}/resume`), { method: "POST", body: { expectedVersion: value.version, scopeHash: value.scopeHash, ...(externalConsent ? { externalConsent } : {}), ...(unknown ? { acknowledgeUnknownOutcome: true } : {}) } }); refresh(); })} /> : null}
        </section> : null}
        {proposalId ? <ChronistReview key={proposalId} campaignId={campaignId} proposalId={proposalId} gm={gm} onDirty={changeDirty} onChanged={refresh} onOpenEntry={openEntry} onClose={() => { if (guard()) { setProposalId(null); changeDirty(false); } }} /> : <section className="chronist-panel" aria-label={t("Vorschlagsstapel")}><p className="eyebrow">{t("Schritt 3")}</p><h3>{t("Vorschläge durchsehen")}</h3><p className="field-help">{t("Prüfe die Quellen und bearbeite den Entwurf. Deine Einreichung ist ein Antrag; sie wird erst durch die reguläre Ratifikation zu Kanon.")}</p>{suggestions.loading ? <Loading text={t("Sichtbare Vorschläge werden geladen …")} /> : suggestions.error ? <Notice error>{suggestions.error}</Notice> : suggestions.data?.suggestions.length ? <div className="chronist-suggestion-list">{suggestions.data.suggestions.map(suggestion => <button key={suggestion.id} onClick={() => setProposalId(suggestion.id)} className="chronist-suggestion"><span className="eyebrow">{suggestion.origin === "regelwerk" ? t("Regelwerk") : t("Modellvorschlag")}</span><strong>{t(VORSCHLAG_ART_LABEL[suggestion.kind])}</strong><span>{[...new Set(suggestion.sources.map(source => source.title))].join(" · ")}</span><small>{suggestion.stale ? `${t("Ältere Quellen")} · ` : ""}{suggestion.state === "offen" ? t("Zur Durchsicht") : suggestion.state === "eingereicht" ? t("Als Antrag eingereicht") : t("Verworfen")}</small></button>)}</div> : <EmptyState title={run.data?.state === "running" ? t("Die ersten Vorschläge entstehen.") : t("Dieser Stapel ist leer.")}>{run.data?.state === "running" ? t("Du kannst den Laufstand oben verfolgen. Neue belegte Vorschläge erscheinen hier automatisch.") : t("Hier erscheinen die für deinen Wissensblick verfügbaren Vorschläge. Eine Auswertung kann auch ohne neue Vorschläge enden.")}</EmptyState>}<div className="button-row">{suggestionAfter ? <Button onClick={() => setSuggestionAfter(null)}>{t("Erste Vorschlagsseite")}</Button> : null}{suggestions.data && !suggestions.data.complete && suggestions.data.after ? <Button onClick={() => setSuggestionAfter(suggestions.data!.after)}>{t("Weitere Vorschläge")}</Button> : null}</div></section>}
      </>}
    </>}
  </section>;
}

function ChronistRun({ run, busy, onCancel, onResume }: { run: ChronistRunView; busy: boolean; onCancel: () => void; onResume: (external: boolean, unknown: boolean) => void }) {
  const [externalConsent, setExternalConsent] = useState(false), [unknownConsent, setUnknownConsent] = useState(false);
  const external = run.provider.location === "fremd", unknown = run.stopReason === "outcome-unknown" || run.unknownCalls > 0;
  return <section className="chronist-run-detail" aria-label={t("Laufstand")}><div className="section-heading"><h4 aria-live="polite">{t(LAUF_STATUS_LABEL[run.state])}</h4>{run.actions.includes("cancel") ? <Button variant="danger" disabled={busy || run.cancelRequested} onClick={onCancel}><Square size={14} />{run.cancelRequested ? t("Abbruch angefordert") : t("Auswertung abbrechen")}</Button> : null}</div>
    <p>{run.provider.label} · {run.model}</p><progress value={run.usage.calls} max={Math.max(1, run.budget.maxCalls)} aria-label={t("Gegen die Grenze gezählte Modellaufrufe")} /><p className="field-help">{t("{genutzt} von höchstens {grenze} reservierten Modellaufrufen", { genutzt: run.usage.calls, grenze: run.budget.maxCalls })} · {t("{anzahl} Vorschläge", { anzahl: run.progress.suggestions })} · {t("{anzahl} Beiträge ohne ausreichenden Beleg verworfen", { anzahl: run.progress.rejections })}</p>
    {run.stopReason ? <Notice>{chronistReason(run.stopReason)}</Notice> : null}<dl className="chronist-metrics"><div><dt>{t("Eingabebudget belegt")}</dt><dd>{t("{anzahl} Zeichen", { anzahl: chronistNumber(run.usage.inputChars) })}</dd></div><div><dt>{t("Ausgabe erfasst")}</dt><dd>{t("{anzahl} Zeichen", { anzahl: chronistNumber(run.usage.outputChars) })}</dd></div><div><dt>{t("Ausgabe noch gebunden")}</dt><dd>{t("{anzahl} Zeichen", { anzahl: chronistNumber(run.usage.reservedOutputChars) })}</dd></div><div><dt>{t("Erfasster Kostenstand")}</dt><dd>{chronistCost(run.usage.costMicros, run.usage.currency)}</dd></div></dl><p className="field-help">{t("Verbleibende Grenzen: {aufrufe} Aufrufe · {eingabe} Eingabezeichen · {ausgabe} Ausgabezeichen.", { aufrufe: Math.max(0, run.budget.maxCalls - run.usage.calls), eingabe: chronistNumber(Math.max(0, run.budget.maxInputChars - run.usage.inputChars)), ausgabe: chronistNumber(Math.max(0, run.budget.maxOutputChars - run.usage.outputChars - run.usage.reservedOutputChars)) })}</p>
    <p className="field-help">{t("Kosten beruhen auf Anbieterangaben oder dem hinterlegten Tarif.")} {run.usage.inputTokens === null || run.usage.outputTokens === null ? t("Tokenverbrauch unbekannt.") : t("{eingabe} Eingabetokens · {ausgabe} Ausgabetokens.", { eingabe: chronistNumber(run.usage.inputTokens), ausgabe: chronistNumber(run.usage.outputTokens) })} {!run.usage.tokensComplete ? `${t("Die Tokenangaben sind noch unvollständig.")} ` : ""}{!run.usage.costComplete ? t("Die Kosten sind noch unvollständig; bereits gesendete Aufrufe können nachträglich abgerechnet werden.") : ""}</p>
    <details className="chronist-run-sources"><summary>{t("{anzahl} ausgewählte Quellpassagen dieses Laufs", { anzahl: run.sources.length })}</summary>{run.sources.map((source, i) => <details key={source.sourceId}><summary>{source.title} · {t("Passage {nummer}", { nummer: i + 1 })}</summary><p className="chronist-source-text">{source.text}</p></details>)}</details>
    {run.unknownCalls > 0 ? <Notice>{t("{anzahl} gesendete Aufrufe haben einen ungewissen Ausgang. Ihre gebundene Ausgabe und mögliche Kosten bleiben berücksichtigt.", { anzahl: run.unknownCalls })}</Notice> : null}
    {run.actions.includes("resume") ? <div className="chronist-resume"><h4>{t("Auswertung fortsetzen")}</h4>{external ? <label className="chronist-consent chronist-check"><input type="checkbox" checked={externalConsent} onChange={event => setExternalConsent(event.target.checked)} /><span>{t("Ich gebe die oben gezeigten {anzahl} unveränderten Quellpassagen dieses Laufs erneut für {anbieter} ({modell}) frei. Bisheriger Verbrauch und Grenzen gelten weiter.", { anzahl: run.sources.length, anbieter: run.provider.label, modell: run.model })}{run.provider.pricing === null ? ` ${t("Die Kosten weiterer Aufrufe sind unbekannt.")}` : ""}</span></label> : null}{unknown ? <label className="chronist-consent chronist-check"><input type="checkbox" checked={unknownConsent} onChange={event => setUnknownConsent(event.target.checked)} /><span>{t("Ich habe den ungewissen Ausgang gelesen. Bereits gesendete Aufrufe können Kosten verursacht haben; eine Fortsetzung kann weitere Kosten erzeugen.")}</span></label> : null}<Button variant="primary" disabled={busy || external && !externalConsent || unknown && !unknownConsent} onClick={() => onResume(externalConsent, unknownConsent)}>{t("Auswertung fortsetzen")}</Button></div> : null}
  </section>;
}

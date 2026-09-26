// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, Download, Wand2, Eye, EyeOff, FlaskConical, MoreHorizontal, Plus, Redo2, Search, Trash2, TriangleAlert, Undo2, Upload, X } from "lucide-react";
import { Button, Loading, Notice, ViewIntro, confirmAction, focusHeading } from "@chronicle/ui";
import { ENGINE_VERSION, RULE_LIMITS, describeRuleCapabilities, parseSupportedRulePackage as parseRulePackage, stableJson, type FormulaType, type MigrationPreview, type PackagePin, type AnyRulePackage as RulePackage, type Scalar } from "@chronicle/rules";
import { ApiError, api, apiPath, errorText, type Campaign } from "../api";
import { locale, t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { Begriff } from "./Begriff";
import { FormulaExampleContext, FormulaField } from "./FormulaField";
import { useSettledText } from "./FormulaLine";
import { RuleActionEditor } from "./RuleActionEditor";
import { FieldList } from "./RuleFieldList";
import { LiveSheet, RuleForgePreview, useExampleFigure, useForgeFixtures } from "./RuleForgePreview";
import { RuleMap } from "./RuleMap";
import { RuleForgePath, RuleCapabilityCard, forgePathSteps, type ForgePathTarget } from "./RuleForgePath";
import { RuleForgeNav, SectionIntro, sectionLabel, type ForgeSection } from "./RuleForgeNav";
import { ChronicleHeroesTemplate } from "./ChronicleHeroesTemplate";
import { MapContextMenu } from "./MapContextMenu";
import { RuleComputedEditor, RuleConstraintEditor, AttributionEditor } from "./RuleDeclarativeEditor";
import { RuleAbilityEditor, RuleConditionEditor } from "./RuleAbilityEditor";
import { RuleAttribution } from "./RuleComputedFields";
import { RuleVitalEditor } from "./RuleVitalEditor";
import { RuleCollectionEditor } from "./RuleCollectionEditor";
import { RuleSheetEditor } from "./RulePresentationEditor";
import { RuleWizard } from "./RuleWizard";
import type { RulePackageHindernis, RulePackageStand, RulesState } from "./game-api";
import { explainValidationError, locateValidationError, type SectionNumbers } from "./forge-navigation-model";
import { draftExpression, forkPackage, localKey, migrationStepDraft, moveItem, newField, newPackage, packageDraft, packageTestResults, renameFieldReferences, validateDraft, withExampleAction, type DraftAction, type DraftField, type DraftMigration, type DraftMigrationStep, type FormulaDraft, type RuleDraft } from "./rule-forge-model";
import { syncSheetWithFields } from "./rule-sheet-model";
import { areaLabel, emptyHistory, record, redo, undo } from "./rule-draft-history";
import { clearDraft, loadDraft, saveDraft, type SaveResult } from "./rule-draft-store";
import "./rule-forge.css";

/** Befund und Fundort wohnen im Wegweiser der Werkbank; hier bleiben sie für bestehende Aufrufer erreichbar. */
export { explainValidationError, locateValidationError };

interface RuleReview { from: PackagePin; to: PackagePin; pinVersion: number; migration: MigrationPreview | null; previewHash: string }
const packageKey = (pkg: PackagePin) => `${pkg.id}@${pkg.version}`;
const MIGRATION_NUMERIC_SOURCES = { actor: [{ id: "value", type: "number" as const, get label() { return t("bisheriger Wert"); } }], input: [] };
const MIGRATION_NUMERIC_FIELDS: readonly DraftField[] = [{ ...newField("value"), defaultValue: "1", get label() { return t("bisheriger Wert"); } }];
/** Die Überschriften, auf denen der Fokus nach einem Ansichtswechsel landet (Spec E4). */
const LIBRARY_TITLE = "rf-library-title", BENCH_TITLE = "rf-bench-title", SECTION_TITLE = "rf-section-title", WIZARD_TITLE = "rw-question";
const LIVE_PREVIEW_KEY = "atlas.rule-forge-preview";
/** Die Bogen-Vorschau neben dem Editor: gemerkt je Gerät; ohne Wahl offen, wenn sie als eigene Spalte Platz hat. */
function readLivePreview(): boolean {
  try { const value = localStorage.getItem(LIVE_PREVIEW_KEY); if (value === "1" || value === "0") return value === "1"; } catch { /* storage may be blocked */ }
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1280px)").matches;
}
function writeLivePreview(open: boolean): void { try { localStorage.setItem(LIVE_PREVIEW_KEY, open ? "1" : "0"); } catch { /* the choice just does not persist */ } }
function starterDraft(authorName: string, packages: readonly RulePackage[]): RuleDraft {
  const draft = newPackage(authorName, packages);
  const attribute = draft.fields.find(f => f.type === "integer" || f.type === "number");
  const formula: FormulaDraft = attribute
    ? { kind: "binary", op: "+", left: { kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" }, right: { kind: "field", source: "actor", field: attribute.id } }
    : { kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" };
  const action: DraftAction = { localId: localKey(), id: "erste-aktion", name: "Erste Aktion", version: "1.0.0",
    disclosure: `Ein W20${attribute ? ` plus ${attribute.label}` : ""} entscheidet. Passe Würfel, Merkmal und Schwelle unten frei an dein System an.`,
    inputs: [], thresholdEnabled: true, threshold: "15", formula };
  return { ...draft, actions: [action] };
}
/** Attribute geändert: Umbenennungen folgen in alle Verweise, Bogen und Abschnitte ziehen mit. */
function withFields(draft: RuleDraft, fields: DraftField[]): RuleDraft {
  return syncSheetWithFields(renameFieldReferences({ ...draft, fields, sections: draft.sections.map(s => ({ ...s, fieldKeys: s.fieldKeys.filter(id => fields.some(f => f.localId === id)) })) }, draft.fields), draft.fields);
}
export function grundText(fall: RulePackageHindernis): string {
  switch (fall) {
    case "eingebaut": return t("noch gar nicht in der Bibliothek gespeichert");
    case "angeheftet": return t("gerade für diese Runde angeheftet");
    case "boegen": return t("von Figurenbögen benutzt");
    case "wuerfe": return t("in Würfen belegt");
  }
}
const UNBEKANNTER_STAND: Omit<RulePackageStand, "id" | "version"> = { genommen: false, loeschbar: false, hindernisse: ["eingebaut"] };

export function RuleForge({ campaign, authorName, onDirty, onActivated }: { campaign: Campaign; authorName: string; onDirty(dirty: boolean): void; onActivated?: () => void }) {
  const [revision, setRevision] = useState(0), resource = useResource<RulesState>(apiPath(campaign.id, "/rules"), revision), task = useTask();
  // Level 2: ein auf diesem Gerät gesicherter Entwurf ist sofort wieder da (L2-E1/E2).
  const [stored] = useState(() => loadDraft(campaign.id));
  const [selected, setSelected] = useState<string | null>(null), [draft, setDraft] = useState<RuleDraft | null>(stored?.draft ?? null), [locked, setLocked] = useState(false), [dirty, setDirty] = useState(!!stored);
  const [history, setHistory] = useState(emptyHistory), [savedAt, setSavedAt] = useState<number | null>(stored?.savedAt ?? null), [saveState, setSaveState] = useState<SaveResult | "pending" | null>(stored ? "saved" : null);
  const [view, setView] = useState<"library" | "bench" | "wizard">("library"), [section, setSection] = useState<ForgeSection>("package");
  const [review, setReview] = useState<(RuleReview & { fingerprint: string }) | null>(null), [acknowledged, setAcknowledged] = useState(false), [notice, setNotice] = useState("");
  const [justInstalled, setJustInstalled] = useState<RulePackage | null>(null), upload = useRef<HTMLInputElement>(null), bench = useRef<HTMLDivElement>(null);
  const [fixtures, setFixtures] = useForgeFixtures(), [livePreview, setLivePreview] = useState(readLivePreview);
  const [libraryQuery, setLibraryQuery] = useState(""), [zeigeGenommene, setZeigeGenommene] = useState(false);
  const [menu, setMenu] = useState<{ key: number; id: string; version: string; name: string; x: number; y: number } | null>(null);
  const packages = useMemo(() => { const values = resource.data?.packages ?? []; return justInstalled && !values.some(p => packageKey(p) === packageKey(justInstalled)) ? [...values, justInstalled] : values; }, [resource.data, justInstalled]);
  const stand = (item: { id: string; version: string }): Omit<RulePackageStand, "id" | "version"> => resource.data?.bibliothek?.find(row => row.id === item.id && row.version === item.version) ?? UNBEKANNTER_STAND;
  const genommene = packages.filter(item => stand(item).genommen), verfuegbar = zeigeGenommene ? packages : packages.filter(item => !stand(item).genommen);
  const sichtbar = verfuegbar.filter(item => `${item.name} ${item.id} ${item.version}`.toLocaleLowerCase().includes(libraryQuery.trim().toLocaleLowerCase()));
  const base = packages.find(p => packageKey(p) === selected) ?? packages.find(p => resource.data && packageKey(p) === packageKey(resource.data.pin)) ?? packages[0];
  const baseDraft = useMemo(() => base ? packageDraft(base) : null, [base]), current = draft ?? baseDraft;
  const validation = useMemo(() => current ? validateDraft(current) : null, [current]), pkg = validation?.valid ? validation.value : null;
  const [lastValidPkg, setLastValidPkg] = useState<RulePackage | null>(null);
  useEffect(() => { if (pkg) setLastValidPkg(pkg); }, [pkg]);
  const previewPkg = pkg ?? lastValidPkg;
  const figure = useExampleFigure(previewPkg, fixtures);
  const errorLocation = useMemo(() => validation && !validation.valid && current ? locateValidationError(validation.error, current) : null, [validation, current]);
  const fingerprint = useMemo(() => pkg ? stableJson(pkg) : "", [pkg]);
  const tests = useMemo(() => pkg ? packageTestResults(pkg) : [], [pkg]), testsPass = tests.every(test => test.passed);
  const installed = pkg ? packages.find(p => packageKey(p) === packageKey(pkg)) : undefined;
  const exactInstalled = !!installed && stableJson(installed) === fingerprint, collision = !!installed && !exactInstalled;
  const editable = draft !== null && !locked, active = !!pkg && !!resource.data && packageKey(pkg) === packageKey(resource.data.pin);
  const readyReview = review?.fingerprint === fingerprint ? review : null;
  // Probleme je Bereich: für das Warnzeichen am Reiter und seinen Namen („Attribute, ein Problem“).
  const problems = useMemo((): SectionNumbers => {
    const out: Partial<Record<ForgeSection, number>> = {};
    if (errorLocation) out[errorLocation.section] = 1; else if (collision) out.package = 1;
    const failing = tests.filter(test => !test.passed).length;
    if (failing) out.try = (out.try ?? 0) + failing;
    return out;
  }, [errorLocation, collision, tests]);
  const statusText = validation && !validation.valid ? explainValidationError(validation.error)
    : collision ? t("Diese Kennung und Version sind bereits mit anderem Inhalt installiert. Wähle eine neue Version.")
    : tests.length ? t("Paketstruktur, Feldtypen und Formeln gültig · {bestanden} von {gesamt} Pakettests bestanden.", { bestanden: tests.filter(test => test.passed).length, gesamt: tests.length }) : t("Paketstruktur, Feldtypen und Formeln gültig.");
  // Die Ansage wartet, bis 700 ms lang nichts mehr getippt wurde, statt jeden Tastendruck zu melden.
  const spokenStatus = useSettledText(view === "bench" ? statusText : "");
  const setDirtyState = (value: boolean) => { setDirty(value); if (value) setSaveState("pending"); };
  // Wer die Werkstatt verlässt, verliert nichts mehr, sobald der Entwurf auf dem Gerät liegt.
  useEffect(() => { onDirty(dirty && saveState !== "saved"); }, [dirty, saveState, onDirty]);
  useEffect(() => {
    if (draft && !locked && dirty) {
      const timer = globalThis.setTimeout?.(() => { const now = Date.now(), result = saveDraft(campaign.id, draft, now); setSaveState(result); if (result === "saved") setSavedAt(now); }, 600);
      return () => { if (timer !== undefined) globalThis.clearTimeout?.(timer); };
    }
    if (!dirty) { clearDraft(campaign.id); setSavedAt(null); setSaveState(null); }
    return undefined;
  }, [draft, locked, dirty, campaign.id]);
  const clearReview = () => { setReview(null); setAcknowledged(false); setNotice(""); task.setError(""); };
  const edit = (next: RuleDraft) => { if (!editable || task.busy || !draft) return; setHistory(h => record(h, draft, next, Date.now())); setDraft(next); setDirtyState(true); clearReview(); };
  const step = (direction: "undo" | "redo") => { if (!editable || task.busy || !draft) return; const result = direction === "undo" ? undo(history, draft) : redo(history, draft); if (!result) return; setHistory(result.history); setDraft(result.draft); setDirtyState(true); clearReview(); };
  const discard = () => { setDraft(null); setLocked(false); setDirtyState(false); setHistory(emptyHistory()); clearReview(); setLastValidPkg(null); };
  // Strg+Z / Strg+Umschalt+Z / Strg+Y außerhalb von Textfeldern; dort bleibt das Rückgängig des Feldes (L2-E3).
  useEffect(() => {
    if (view !== "bench" || !editable || typeof window.addEventListener !== "function") return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable='true']"))) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) { event.preventDefault(); step("undo"); } else if ((key === "z" && event.shiftKey) || key === "y") { event.preventDefault(); step("redo"); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [view, editable, history, draft, task.busy]);
  // Jeder Ansichtswechsel setzt den Fokus auf die Überschrift der neuen Ansicht (Spec E4).
  const showLibrary = () => { setView("library"); focusHeading(LIBRARY_TITLE); };
  const showWizard = () => { setView("wizard"); focusHeading(WIZARD_TITLE); };
  const open = (next: ForgeSection) => {
    setView("bench"); setSection(next); focusHeading(BENCH_TITLE);
    globalThis.requestAnimationFrame?.(() => { const node = bench.current, stage = node?.closest<HTMLElement>(".main-stage"); if (node && stage && node.getBoundingClientRect().top < stage.getBoundingClientRect().top) stage.scrollTo({ top: stage.scrollTop + node.getBoundingClientRect().top - stage.getBoundingClientRect().top - 12 }); });
  };
  /** Ein Knopf, der in einen anderen Bereich führt (nicht der Reiter selbst): der Fokus folgt auf dessen Überschrift. */
  const goTo = (next: ForgeSection) => { setSection(next); focusHeading(SECTION_TITLE); };
  /** Ein ungesicherter Entwurf wird nur nach Rückfrage ersetzt; ohne Entwurf geht es sofort weiter. */
  const replacing = (then: () => void) => {
    if (!dirty) { then(); return; }
    void confirmAction({ title: t("Entwurf verwerfen?"), message: t("Ungespeicherten Regelentwurf verwerfen? Lade ihn vorher als Datei herunter, wenn du ihn behalten möchtest."), confirmLabel: t("Entwurf verwerfen"), danger: true })
      .then(ok => { if (ok) then(); });
  };
  const selectPackage = (next: RulePackage) => replacing(() => { setHistory(emptyHistory()); setSelected(packageKey(next)); setDraft(null); setLocked(false); setDirtyState(false); clearReview(); setLastValidPkg(null); open("package"); });
  const begin = (next: RuleDraft) => replacing(() => { setHistory(emptyHistory()); setDraft(next); setLocked(false); setDirtyState(true); clearReview(); setLastValidPkg(null); open("package"); });
  const refresh = () => { setRevision(v => v + 1); setReview(null); setAcknowledged(false); };
  const runPreview = () => { if (!pkg) return; void task.run(async () => { setReview(null); setAcknowledged(false); setNotice(""); const result = await api<RuleReview>(apiPath(campaign.id, "/rules/preview"), { method: "POST", body: { package: pkg } }); setReview({ ...result, fingerprint }); }); };
  const activateFromMenu = (item: RulePackage) => {
    if (task.busy) return;
    replacing(() => {
      setSelected(packageKey(item)); setDraft(null); setLocked(false); setDirtyState(false); clearReview(); setLastValidPkg(null); open("publish");
      void task.run(async () => { const result = await api<RuleReview>(apiPath(campaign.id, "/rules/preview"), { method: "POST", body: { package: item } }); setReview({ ...result, fingerprint: stableJson(item) }); });
    });
  };
  const install = () => { if (!pkg || collision || !testsPass) return; void task.run(async () => { const result = await api<RulePackage>(apiPath(campaign.id, "/rules"), { method: "POST", body: pkg }); setJustInstalled(result); setHistory(emptyHistory()); setDraft(packageDraft(result)); setSelected(packageKey(result)); setLocked(true); setDirtyState(false); setRevision(v => v + 1); setNotice(t("Paketversion installiert. Für die Runde wird sie erst durch die ausdrückliche Aktivierung wirksam.")); }); };
  const activate = () => { if (!pkg || !readyReview || !exactInstalled || active || (!!readyReview.migration?.entities.length && !acknowledged)) return; void task.run(async () => {
    try { await api(apiPath(campaign.id, "/rules/activate"), { method: "POST", body: { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: readyReview.pinVersion, previewHash: readyReview.previewHash } }); }
    catch (error) { if (error instanceof ApiError && error.status === 409) { refresh(); throw new Error(t("Die Runde hat sich seit der Vorschau verändert. Prüfe die Migration erneut und bestätige die aktuelle Vorschau.")); } throw error; }
    setNotice(t("Für diese Runde ist jetzt {name} {version} aktiv.", { name: pkg.name, version: pkg.version })); setDirtyState(false); refresh(); onActivated?.();
  }); };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; replacing(() => { void task.run(async () => { if (file.size > RULE_LIMITS.packageBytes) throw new Error(t("Das Regelpaket darf höchstens {groesse} MiB groß sein.", { groesse: RULE_LIMITS.packageBytes / (1024 * 1024) })); const next = packageDraft(parseRulePackage(await file.text())); setHistory(emptyHistory()); setDraft(next); setLocked(false); setDirtyState(true); clearReview(); open("package"); }); }); };
  const nehmen = (item: RulePackage, zurueck: boolean) => { void task.run(async () => { await api(apiPath(campaign.id, zurueck ? "/rules/unarchive" : "/rules/archive"), { method: "POST", body: { packageId: item.id, packageVersion: item.version } }); setNotice(zurueck ? t("„{name} {version}“ ist wieder in der Bibliothek.", { name: item.name, version: item.version }) : t("„{name} {version}“ ist aus der Bibliothek genommen. Über „Auch genommene zeigen“ holst du es zurück.", { name: item.name, version: item.version })); refresh(); }); };
  const loeschen = (item: RulePackage) => {
    void confirmAction({ title: t("Endgültig löschen?"), message: t("„{name} {version}“ endgültig löschen? Diese Paketfassung verschwindet vollständig und lässt sich nicht zurückholen.", { name: item.name, version: item.version }), confirmLabel: t("Endgültig löschen"), danger: true }).then(ok => { if (!ok) return; void task.run(async () => { await api(apiPath(campaign.id, "/rules"), { method: "DELETE", body: { packageId: item.id, packageVersion: item.version } }); if (selected === packageKey(item)) setSelected(null); if (!editable && current && packageKey(current) === packageKey(item)) { setDraft(null); setLastValidPkg(null); setLocked(false); setDirtyState(false); } if (justInstalled && packageKey(justInstalled) === packageKey(item)) setJustInstalled(null); setNotice(t("„{name} {version}“ ist endgültig gelöscht.", { name: item.name, version: item.version })); refresh(); }); });
  };
  const askDiscard = () => { void confirmAction({ title: t("Entwurf verwerfen?"), message: t("Den Entwurf wirklich verwerfen? Das lässt sich nicht rückgängig machen."), confirmLabel: t("Ja, verwerfen"), cancelLabel: t("Behalten"), danger: true }).then(ok => { if (ok) discard(); }); };
  const oeffneMenu = (item: RulePackage, x: number, y: number) => setMenu({ key: Date.now(), id: item.id, version: item.version, name: item.name, x, y });
  const menuPaket = menu ? packages.find(item => item.id === menu.id && item.version === menu.version) : undefined, menuStand = menuPaket ? stand(menuPaket) : null;
  const download = () => { if (!pkg) return; const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2) + "\n"], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${pkg.id}-${pkg.version}.rules.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const toggleLivePreview = () => setLivePreview(value => { writeLivePreview(!value); return !value; });
  const setFirstValues = (values: Record<string, Scalar>) => setFixtures(items => items.map((fixture, i) => i === 0 ? { ...fixture, values } : fixture));
  if (campaign.role !== "leitung") return <Notice>{t("Die Regelschmiede steht der Spielleitung zur Verfügung.")}</Notice>;
  if (resource.loading && !resource.data) return <Loading text={t("Regelpakete werden geladen …")} />;
  const notices = <>{resource.error ? <Notice error>{resource.error} <Button disabled={task.busy} onClick={refresh}>{t("Erneut laden")}</Button></Notice> : null}{task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}</>;
  const fileInput = <input ref={upload} type="file" accept=".json,application/json" hidden onChange={importFile} disabled={task.busy} />;

  if (view === "wizard") return <div className="rule-forge">{notices}<RuleWizard authorName={authorName} installed={packages} onCancel={showLibrary} onCreate={created => begin(created)} /></div>;
  if (view === "library" || !current) {
    const openDraft = editable && !!current;
    const isActive = (item: RulePackage) => !!resource.data && packageKey(item) === packageKey(resource.data.pin);
    return <div className="rule-forge">
      <ViewIntro id={LIBRARY_TITLE} title={t("Regelwerke deiner Runde")}
        action={<><Button variant={openDraft ? "default" : "primary"} disabled={task.busy} onClick={showWizard}><Wand2 size={16} aria-hidden="true" />{t("Neues Regelwerk")}</Button><Button variant="quiet" disabled={task.busy} onClick={() => upload.current?.click()}><Upload size={16} aria-hidden="true" />{t("Paket öffnen")}</Button>{fileInput}</>}
        steps={[t("„Neues Regelwerk“ stellt dir sechs Fragen und legt daraus einen Entwurf an."), t("In der Werkbank verfeinerst du Attribute, Balken und Würfe und probierst sie mit Testfiguren aus."), t("Unter „Übernehmen“ prüfst, installierst und aktivierst du die neue Version für deine Runde.")]}>
        {t("Ein Regelwerk legt fest, welche Werte eine Figur hat und wie gewürfelt wird. Hier liegen alle Versionen deiner Runde; nach der aktiven wird am Tisch gespielt.")}
        <span className="rf-begriffe"><span>{t("Begriffe:")}</span> <Begriff id="regelwerk" /> <Begriff id="version" /> <Begriff id="installieren" /> <Begriff id="aktivieren" /></span>
      </ViewIntro>
      {notices}
      {openDraft && current ? <div className="rf-open-draft" role="status"><div><span className="eyebrow">{t("Offener Entwurf")}</span><strong>{t("{name}, Version {version}", { name: current.name || t("Unbenanntes Regelpaket"), version: current.version })}</strong><small>{saveState === "saved" && savedAt ? t("Automatisch auf diesem Gerät gesichert um {zeit}. Er bleibt auch nach Neustart erhalten.", { zeit: new Date(savedAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) }) : dirty ? t("Mit ungespeicherten Änderungen. Lade ihn als Datei herunter oder installiere ihn, um ihn zu behalten.") : t("Keine ungespeicherten Änderungen.")}</small></div>
        <div className="rf-toolbar"><Button variant="quiet" onClick={askDiscard}><Trash2 size={15} aria-hidden="true" />{t("Verwerfen")}</Button><Button variant="primary" onClick={() => open(section)}>{t("Weiter bearbeiten")}<ArrowRight size={15} aria-hidden="true" /></Button></div></div> : null}
      <div className="rf-library">
        <section className="rf-catalog" aria-label={t("Installierte Regelpakete")}><div className="rf-section-heading"><h3><BookOpen size={18} aria-hidden="true" />{t("Bibliothek")}</h3><Button variant="quiet" disabled={task.busy} onClick={refresh} aria-label={t("Paketbibliothek aktualisieren")}>↻</Button></div>
          <p className="rf-help">{t("Jede installierte Version bleibt unveränderlich. Ein Klick öffnet sie zum Ansehen; bearbeiten heißt, eine neue Version daraus zu machen. Über das Menü am Eintrag aktivierst du eine Version, nimmst sie aus der Bibliothek oder holst sie zurück.")}</p>
          <div className="rf-library-tools"><label className="rf-library-search"><Search size={15} aria-hidden="true" /><input type="search" value={libraryQuery} aria-label={t("Regelpaket suchen")} placeholder={t("Name oder Version")} onChange={event => setLibraryQuery(event.target.value)} /></label>
            {genommene.length ? <Button variant="quiet" aria-pressed={zeigeGenommene} disabled={task.busy} onClick={() => setZeigeGenommene(v => !v)}>{t("Auch genommene zeigen ({anzahl})", { anzahl: genommene.length })}</Button> : null}</div>
          <div className="rf-catalog-grid">{sichtbar.map(item => <div className="rf-catalog-row" key={packageKey(item)}><button type="button" className={`rf-catalog-item ${isActive(item) ? "is-active" : ""}`} disabled={task.busy} onClick={() => selectPackage(item)} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); oeffneMenu(item, event.clientX, event.clientY); }} onKeyDown={event => { if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return; event.preventDefault(); event.stopPropagation(); const rand = event.currentTarget.getBoundingClientRect(); oeffneMenu(item, rand.left, rand.bottom + 4); }}><strong>{item.name}</strong><span>{stand(item).genommen ? t("Version {version} · Aus der Bibliothek genommen", { version: item.version }) : isActive(item) ? t("Version {version} · Aktiv in dieser Runde", { version: item.version }) : t("Version {version} · Installiert", { version: item.version })}</span></button><Button variant="quiet" className="rf-catalog-menu" disabled={task.busy} aria-label={t("Paket {name} {version} verwalten", { name: item.name, version: item.version })} aria-haspopup="menu" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); oeffneMenu(item, bounds.left, bounds.bottom + 4); }}><MoreHorizontal size={17} aria-hidden="true" /></Button></div>)}</div>
          {!packages.length ? <p className="rf-help">{t("Noch kein Regelwerk in der Bibliothek. Beginne oben mit „Neues Regelwerk“ oder unten mit einer Vorlage.")}</p> : null}{packages.length && !verfuegbar.length ? <p>{t("Alle Pakete sind aus der Bibliothek genommen. Über den Schalter oben werden sie wieder sichtbar.")}</p> : null}{verfuegbar.length > 0 && !sichtbar.length ? <div className="rf-search-empty" role="status"><p>{t("Kein Regelpaket gefunden.")}</p><Button variant="quiet" onClick={() => setLibraryQuery("")}>{t("Suche zurücksetzen")}</Button></div> : null}
          {menu && menuPaket && menuStand ? <MapContextMenu key={menu.key} label={t("{name}, Version {version}", { name: menuPaket.name, version: menuPaket.version })} menuLabel={t("Paketmenü für {name}, Version {version}", { name: menuPaket.name, version: menuPaket.version })} popup={{ x: menu.x, y: menu.y, onDismiss: () => setMenu(null) }} actions={[{ id: "aktivieren", label: isActive(menuPaket) ? t("Bereits für diese Runde aktiv") : menuStand.genommen ? t("Zum Aktivieren zuerst in die Bibliothek zurückholen") : t("Für diese Runde aktivieren …"), disabled: task.busy || menuStand.genommen || isActive(menuPaket), onSelect: () => activateFromMenu(menuPaket) }, { id: "nehmen", label: menuStand.genommen ? t("Wieder in die Bibliothek") : t("Aus der Bibliothek nehmen"), onSelect: () => nehmen(menuPaket, menuStand.genommen) }, { id: "loeschen", danger: true, disabled: !menuStand.loeschbar, label: menuStand.loeschbar ? t("Endgültig löschen …") : t("Endgültig löschen — geht nicht: {grund}", { grund: menuStand.hindernisse.map(grundText).join(", ") }), onSelect: () => loeschen(menuPaket) }]} /> : null}
        </section>
        <section className="rf-starter" aria-label={t("Eigenes Regelwerk beginnen")}><div className="rf-section-heading"><h3><Plus size={18} aria-hidden="true" />{t("Aus einer Vorlage beginnen")}</h3></div>
          <p className="rf-help">{t("Jede Vorlage wird ein eigener Entwurf, den du frei veränderst. Wer lieber Schritt für Schritt vorgeht, nimmt oben „Neues Regelwerk“.")}</p>
          <div className="rf-starter-blank"><Button disabled={task.busy} onClick={() => begin(starterDraft(authorName, packages))}><Plus size={16} aria-hidden="true" />{t("Leeres Paket beginnen")}</Button><Button disabled={task.busy} onClick={() => upload.current?.click()}><Upload size={16} aria-hidden="true" />{t("Paketdatei öffnen")}</Button><span className="rf-help">{t("Leer heißt: ein Attribut und eine W20-Aktion als Anfang, alles Weitere kommt von dir.")}</span></div>
          <ChronicleHeroesTemplate disabled={task.busy} onCreate={template => begin(packageDraft(template))} />
        </section>
      </div>
    </div>;
  }

  const pathState = { editable, valid: !!pkg && !collision, fields: current.fields.length, actions: current.actions.length, tests: tests.length, testsPass, installed: exactInstalled, reviewed: !!readyReview, active };
  const jump = (target: ForgePathTarget) => { if (target === "start") showLibrary(); else goTo(target === "preview" ? "try" : target); };
  const next = forgePathSteps(pathState).find(step => step.state === "current");
  const nextTarget: ForgeSection | null = !next || next.id === "start" ? null : next.id === "preview" ? "try" : next.id;
  const sheetPreview = previewPkg && fixtures[0] ? <><h4>{t("So sieht der Bogen am Tisch aus")}</h4><p className="rf-help">{t("Testfigur {name}. Werte lassen sich hier ausprobieren; sie gehören nur der Vorschau.", { name: fixtures[0].name })}</p><LiveSheet pkg={previewPkg} fixture={fixtures[0]} onChange={setFirstValues} /></> : <Notice tone="info">{t("Die Vorschau erscheint, sobald der Entwurf einmal gültig ist.")}</Notice>;
  const inlinePreview = section === "sheet" || section === "vitals" || section === "try";
  const drawer = livePreview && !inlinePreview;
  const lockedOut = !editable || task.busy;
  // Übernehmen in der Reihenfolge der Liste: erst prüfen, dann installieren, dann aktivieren. Hervorgehoben ist nur der nächste Schritt.
  const needsAcknowledge = !!readyReview?.migration?.entities.length && !acknowledged;
  const publishStep: "review" | "install" | "activate" | null = active ? null : !readyReview ? "review" : !exactInstalled ? "install" : "activate";
  const activateReason = active ? "" : !readyReview ? t("Erst prüfen, dann aktivieren.") : !exactInstalled ? t("Installiere zuerst genau diese geprüfte Version. Die Vorschau bleibt für die anschließende Aktivierung erhalten.") : needsAcknowledge ? t("Bestätige zuerst, dass du die Änderungen an den Figuren geprüft hast.") : "";
  return <div className="rule-forge" ref={bench}>
    <div className="rf-bench-head"><Button variant="quiet" onClick={showLibrary}><ArrowLeft size={15} aria-hidden="true" />{t("Zur Bibliothek")}</Button>
      <div className="rf-bench-title"><h2 id={BENCH_TITLE} tabIndex={-1}>{current.name || t("Unbenanntes Regelpaket")}</h2><span className="rf-help">{!editable ? t("Installierte Version · schreibgeschützt · {version}", { version: current.version }) : saveState === "saved" && savedAt ? t("Entwurf · {version} · auf diesem Gerät gesichert um {zeit}", { version: current.version, zeit: new Date(savedAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) }) : saveState === "full" ? t("Entwurf · {version} · nicht gesichert: der Speicher dieses Geräts ist voll. Lade den Entwurf als Datei herunter.", { version: current.version }) : saveState === "unavailable" ? t("Entwurf · {version} · dieses Gerät erlaubt keine Sicherung. Lade den Entwurf als Datei herunter.", { version: current.version }) : dirty ? t("Ungespeicherter Entwurf · {version}", { version: current.version }) : t("Entwurf · {version}", { version: current.version })}</span></div>
      <div className="rf-toolbar">{editable ? <span className="rf-history" role="group" aria-label={t("Verlauf")}><Button variant="quiet" disabled={!history.past.length || task.busy} title={history.past.length ? t("Rückgängig: Änderung an {bereich} (Strg+Z)", { bereich: areaLabel(history.past.at(-1)!.area) }) : t("Nichts rückgängig zu machen")} onClick={() => step("undo")}><Undo2 size={15} aria-hidden="true" />{t("Rückgängig")}</Button><Button variant="quiet" disabled={!history.future.length || task.busy} title={history.future.length ? t("Wiederholen: Änderung an {bereich} (Strg+Y)", { bereich: areaLabel(history.future.at(-1)!.area) }) : t("Nichts zu wiederholen")} onClick={() => step("redo")}><Redo2 size={15} aria-hidden="true" />{t("Wiederholen")}</Button></span> : null}{!editable && pkg ? <Button disabled={task.busy} onClick={() => { try { begin(forkPackage(pkg, packages)); } catch (error) { task.setError(errorText(error)); } }}>{t("Neue Version erstellen")}</Button> : null}<Button disabled={!pkg || task.busy} onClick={download}><Download size={15} aria-hidden="true" />{t("Paketdatei")}</Button>{!inlinePreview ? <Button variant="quiet" onClick={toggleLivePreview}>{livePreview ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}{livePreview ? t("Vorschau ausblenden") : t("Vorschau zeigen")}</Button> : null}{fileInput}</div></div>
    {notices}
    {!editable ? <p className="rf-readonly-help">{t("Du kannst alle Einträge ansehen. Zum Ändern erstelle oben eine neue Version.")}</p> : null}
    <div className={`rf-bench${drawer ? " has-live" : ""}`}>
      <RuleForgeNav draft={current} current={section} problems={problems} onChange={setSection} />
      <section className="rf-editor" aria-label={t("Regelpaket")}><FormulaExampleContext.Provider value={figure}>
        <div role="tabpanel" id={`rf-panel-${section}`} aria-labelledby={`rf-tab-${section}`}>
          <SectionIntro id={section}>{section === "publish" ? <span className="rf-begriffe"><span>{t("Begriffe:")}</span> <Begriff id="version" /> <Begriff id="installieren" /> <Begriff id="aktivieren" /></span> : null}</SectionIntro>
          <fieldset className="rf-editor-fields" disabled={(section === "package" || section === "migrations") && lockedOut}>
          {section === "package" ? <><PackageEditor draft={current} onChange={edit} problem={errorLocation?.section === "package" || collision} />{pkg ? <RuleCapabilityCard capabilities={describeRuleCapabilities(pkg)} /> : null}{pkg ? <RuleAttribution pkg={pkg} /> : null}{current.attribution ? <AttributionEditor value={current.attribution} onChange={attribution => edit({ ...current, attribution })} /> : null}</> : null}
          {section === "map" ? <RuleMap draft={current} disabled={lockedOut} onChange={edit} onOpen={tab => goTo(tab)} /> : null}
          {section === "fields" ? <FieldList title={t("Attribute")} fields={current.fields} disabled={lockedOut} onChange={fields => edit(withFields(current, fields))} /> : null}
          {section === "computed" ? <RuleComputedEditor draft={current} disabled={lockedOut} onChange={edit} /> : null}
          {section === "vitals" ? <RuleVitalEditor draft={current} disabled={lockedOut} onChange={edit} pkg={previewPkg} figureName={fixtures[0]?.name ?? ""} values={fixtures[0]?.values ?? {}} onValues={setFirstValues} /> : null}
          {section === "collections" ? <RuleCollectionEditor draft={current} disabled={lockedOut} onChange={edit} /> : null}
          {section === "sheet" ? <RuleSheetEditor draft={current} disabled={lockedOut} onChange={edit} preview={sheetPreview} /> : null}
          {section === "actions" ? <RuleActionEditor draft={current} disabled={lockedOut} onChange={actions => edit({ ...current, actions })} onExample={() => edit(syncSheetWithFields(withExampleAction(current), current.fields))} /> : null}
          {section === "abilities" ? <RuleAbilityEditor draft={current} disabled={lockedOut} onChange={edit} /> : null}
          {section === "conditions" ? <RuleConditionEditor draft={current} disabled={lockedOut} onChange={edit} /> : null}
          {section === "constraints" ? <RuleConstraintEditor draft={current} disabled={lockedOut} onChange={edit} /> : null}
          {section === "try" ? <>
            {!pkg && lastValidPkg ? <Notice tone="warn">{t("Die Testtafel zeigt zur Orientierung weiter die zuletzt gültige Fassung (Version {version}), statt beim Bearbeiten zu verschwinden. Dein aktueller Entwurf ist noch nicht gültig: {fehler}", { version: lastValidPkg.version, fehler: validation && !validation.valid ? explainValidationError(validation.error) : "" })}</Notice> : null}
            <RuleForgePreview pkg={previewPkg} fixtures={fixtures} onFixtures={setFixtures} onSaveTest={editable && pkg && !task.busy && current.selfTests.length < RULE_LIMITS.selfTests ? test => edit({ ...current, includeSelfTests: true, selfTests: [...current.selfTests, test] }) : undefined} />
            <SelfTests draft={current} results={tests} disabled={lockedOut} onChange={selfTests => edit({ ...current, selfTests })} />
          </> : null}
          {section === "migrations" ? <MigrationEditor draft={current} packages={packages} onChange={migrations => edit({ ...current, migrations })} /> : null}
          {section === "publish" ? <div className="rf-publish">
            <RuleForgePath state={pathState} onJump={jump} />
            <ol className="rf-publish-steps">
              <li data-state={readyReview ? "done" : publishStep === "review" ? "current" : "todo"}><strong>{t("Prüfen")}</strong><span>{t("zeigt, was sich für vorhandene Figuren ändern würde, ohne etwas zu verändern.")}</span>
                <div className="rf-toolbar"><Button variant={publishStep === "review" ? "primary" : "default"} disabled={!pkg || !testsPass || collision || task.busy || active} onClick={runPreview}><FlaskConical size={16} aria-hidden="true" />{readyReview ? t("Vorschau erneuern") : t("Aktivierung prüfen")}</Button></div>
                {readyReview ? <ReviewPanel review={readyReview} acknowledged={acknowledged} onAcknowledge={setAcknowledged} disabled={task.busy} /> : null}</li>
              <li data-state={exactInstalled ? "done" : publishStep === "install" ? "current" : "todo"}><strong>{t("Installieren")}</strong><span>{t("legt diese Version unveränderlich in die Bibliothek. Am Tisch ändert sich noch nichts.")}</span>
                <div className="rf-toolbar"><Button variant={publishStep === "install" ? "primary" : "default"} disabled={!pkg || !testsPass || collision || exactInstalled || task.busy} onClick={install}>{exactInstalled ? t("Version ist installiert") : t("Version installieren")}</Button></div></li>
              <li data-state={active ? "done" : publishStep === "activate" ? "current" : "todo"}><strong>{t("Aktivieren")}</strong><span>{t("macht die geprüfte Version zum Regelwerk dieser Runde.")}</span>
                <div className="rf-toolbar"><Button variant={publishStep === "activate" ? "primary" : "default"} disabled={task.busy || !readyReview || !exactInstalled || active || needsAcknowledge} aria-describedby={activateReason ? "rf-activate-reason" : undefined} onClick={activate}>{t("Geprüfte Version für diese Runde aktivieren")}</Button></div>
                {activateReason ? <p className="rf-help" id="rf-activate-reason">{activateReason}</p> : null}</li>
            </ol>
            {active ? <p className="rf-help">{t("Diese Paketversion ist bereits aktiv.")}</p> : null}
          </div> : null}
          </fieldset>
        </div>
      </FormulaExampleContext.Provider></section>
      {drawer ? <aside className="rf-live-drawer" aria-label={t("Live-Vorschau des Bogens")}><div className="rf-section-heading"><span /><Button variant="quiet" aria-label={t("Vorschau ausblenden")} onClick={toggleLivePreview}><X size={15} aria-hidden="true" /></Button></div>{sheetPreview}</aside> : null}
    </div>
    <div className="rf-statusbar" id="rf-status">
      <div className="rf-status-check">{validation && !validation.valid ? <><TriangleAlert size={16} aria-hidden="true" /><span>{statusText}</span>{errorLocation && errorLocation.section !== section ? <Button variant="quiet" onClick={() => goTo(errorLocation.section)}>{t("Zum Reiter „{name}“ springen", { name: sectionLabel(errorLocation.section) })}</Button> : null}</> : collision ? <><TriangleAlert size={16} aria-hidden="true" /><span>{statusText}</span>{section !== "package" ? <Button variant="quiet" onClick={() => goTo("package")}>{t("Zum Reiter „{name}“ springen", { name: sectionLabel("package") })}</Button> : null}</> : <p><Check size={16} aria-hidden="true" />{statusText}</p>}</div>
      {next && !(next.id === "start" && editable) && nextTarget !== section ? <Button variant={next.id === "start" || section === "publish" ? "quiet" : "primary"} onClick={() => jump(next.id)}>{t("Weiter: {schritt}", { schritt: next.title })}<ArrowRight size={14} aria-hidden="true" /></Button> : null}
      <p className="sr-only" role="status">{spokenStatus}</p>
    </div>
  </div>;
}
function SelfTests({ draft, results, disabled, onChange }: { draft: RuleDraft; results: ReturnType<typeof packageTestResults>; disabled: boolean; onChange(tests: RuleDraft["selfTests"]): void }) {
  return <section className="rf-selftests"><h4>{t("Pakettests")}</h4><p>{t("Speichere Beispiele aus der Testtafel als feste Erwartung. Bei der Installation werden alle enthaltenen Tests ausgeführt.")}</p>{!draft.selfTests.length ? <p className="rf-help">{t("Noch keine Pakettests. Oben auf der Testtafel kannst du für jede Figur ein Beispiel speichern.")}</p> : <div className="rf-test-list">{draft.selfTests.map((test, i) => <article className="rf-card" key={i}><div className="rf-section-heading"><h5>{test.name}</h5><Button variant="quiet" disabled={disabled} aria-label={t("Pakettest {name} entfernen", { name: test.name })} onClick={() => onChange(draft.selfTests.filter((_, n) => n !== i))}><Trash2 size={15} />{t("Entfernen")}</Button></div><p>{t("{kennung} · Erwartet {erwartet} · {stand}", { kennung: draft.actions.find(action => action.id === test.actionId)?.name ?? test.actionId, erwartet: test.expectedTotal, stand: results[i]?.passed ? t("Bestanden") : results[i]?.error ?? (results[i]?.actual === undefined ? t("Paket noch nicht gültig") : t("Ergebnis {wert} weicht ab", { wert: String(results[i]!.actual) })) })}</p><details className="rf-advanced"><summary>{t("Für Fortgeschrittene: gespeicherte Beispielwerte")}</summary><dl className="rf-value-list"><dt>{t("Würfelstart")}</dt><dd>{test.context.seed}</dd>{Object.entries(test.context.actor).map(([id, value]) => <div key={id}><dt>{id}</dt><dd>{String(value)}</dd></div>)}</dl><p>{t("{anzahl} gehaltene Beispielpassagen", { anzahl: test.context.knowledge.passages.length })}</p></details></article>)}</div>}</section>;
}
function PackageEditor({ draft, onChange, problem }: { draft: RuleDraft; onChange(value: RuleDraft): void; problem: boolean }) {
  // Einmal aufgeklappt bleibt „Für Fortgeschrittene“ offen, auch wenn der Befund dort behoben ist.
  const [advanced, setAdvanced] = useState(false);
  return <><div className="rf-form-grid"><label>{t("Name")}<input value={draft.name} maxLength={RULE_LIMITS.label} required placeholder={t("z. B. Mein Regelwerk")} onChange={e => onChange({ ...draft, name: e.target.value })} /><small>{t("Der Titel, den Spielleitung und Spielende in der Bibliothek sehen.")}</small></label></div><h4>{t("Urheberschaft")}</h4><p className="rf-help">{t("Wer dieses Regelwerk verfasst hat. Mindestens eine Angabe ist erforderlich.")}</p>{draft.authors.map((author, i) => <div className="rf-inline" key={i}><label>{t("Autor:in {n}", { n: i + 1 })}<input value={author} maxLength={RULE_LIMITS.label} required placeholder={t("Name oder Tischname")} onChange={e => onChange({ ...draft, authors: draft.authors.map((a, n) => n === i ? e.target.value : a) })} /></label><Button disabled={draft.authors.length <= 1} variant="quiet" aria-label={t("Autor:in {n} entfernen", { n: i + 1 })} onClick={() => onChange({ ...draft, authors: draft.authors.filter((_, n) => n !== i) })}><Trash2 size={15} /></Button></div>)}<Button disabled={draft.authors.length >= RULE_LIMITS.authors} onClick={() => onChange({ ...draft, authors: [...draft.authors, ""] })}><Plus size={15} aria-hidden="true" />{t("Weitere Urheberschaft")}</Button>
    <details className="rf-advanced" open={advanced || problem} onToggle={event => setAdvanced(event.currentTarget.open)}><summary>{t("Für Fortgeschrittene")}</summary>
      <div className="rf-form-grid"><label>{t("Version")}<input value={draft.version} placeholder="1.0.0" required onChange={e => onChange({ ...draft, version: e.target.value })} /><small>{t("Drei durch Punkte getrennte Zahlen (Hauptversion.Nebenversion.Fehlerbehebung), z. B. 1.0.0. Jede installierte Version ist danach unveränderlich.")}</small></label><label>{t("Paketkennung")}<input value={draft.id} maxLength={128} placeholder="de.meine-runde.regelwerk" required onChange={e => onChange({ ...draft, id: e.target.value })} /><small>{t("Ein eindeutiger Name für Dateien und neue Versionen: Kleinbuchstaben und Ziffern, mit Punkten oder Bindestrichen getrennt, zum Beispiel de.meine-runde.regelwerk.")}</small></label><label>{t("Lizenz")}<input value={draft.license} maxLength={RULE_LIMITS.label} required placeholder={t("z. B. MIT")} onChange={e => onChange({ ...draft, license: e.target.value })} /><small>{t("Unter welchen Bedingungen andere dieses Paket weiterverwenden dürfen, z. B. MIT oder Alle Rechte vorbehalten.")}</small></label></div>
      <p className="rf-help">{t("Geschrieben für Atlas Chronicles, Regelstand {version}. Jeder Wurf wird am Tisch von einem Menschen bestätigt.", { version: ENGINE_VERSION })}</p>
    </details></>;
}
function OrderButtons({ index, length, onMove }: { index: number; length: number; onMove(delta: -1 | 1): void }) { return <span className="rf-order"><Button variant="quiet" disabled={index === 0} aria-label={t("Nach oben verschieben")} onClick={() => onMove(-1)}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index === length - 1} aria-label={t("Nach unten verschieben")} onClick={() => onMove(1)}><ArrowDown size={14} /></Button></span>; }
function stepName(kind: DraftMigrationStep["kind"]): string { switch (kind) { case "rename": return t("Umbenennen"); case "add": return t("Hinzufügen"); case "archive": return t("Archivieren"); default: return t("Zahl umrechnen"); } }
function MigrationEditor({ draft, packages, onChange }: { draft: RuleDraft; packages: readonly RulePackage[]; onChange(migrations: DraftMigration[]): void }) {
  const sources = packages.filter(p => p.id === draft.id && p.version !== draft.version), update = (next: DraftMigration) => onChange(draft.migrations.map(m => m.localId === next.localId ? next : m));
  return <><div className="rf-section-heading"><h4>{t("Charakterfelder migrieren")}</h4><Button disabled={draft.migrations.length >= RULE_LIMITS.migrations} onClick={() => onChange([...draft.migrations, { localId: localKey(), from: sources.find(p => !draft.migrations.some(m => m.from === p.version))?.version ?? "", steps: [] }])}><Plus size={15} />{t("Migrationsweg")}</Button></div><p>{t("Jeder Weg beschreibt einen direkten Wechsel von einer früheren Version zu {version}. Schritte werden der Reihe nach angewendet. Entfernte Werte müssen ausdrücklich archiviert und neue Felder ausdrücklich hinzugefügt werden.", { version: draft.version || t("dieser Version") })}</p><p className="rf-help">{t("Bei vorhandenen Charakterbögen ist auch für unveränderte Felder ein Weg ohne Schritte erforderlich. Ein Wechsel zu einer anderen Paketkennung kann vorhandene Bögen nicht übernehmen. Bereits gespeicherte Würfe behalten ihre ursprünglichen Regeln.")}</p><datalist id="rf-migration-versions">{sources.map(p => <option key={p.version} value={p.version} />)}</datalist>{draft.migrations.map(migration => <article className="rf-card" key={migration.localId}><div className="rf-section-heading"><h5>{t("{ausgang} → {ziel}", { ausgang: migration.from || t("Ausgangsversion wählen"), ziel: draft.version })}</h5><Button variant="quiet" aria-label={t("Migrationsweg von {version} entfernen", { version: migration.from })} onClick={() => onChange(draft.migrations.filter(m => m.localId !== migration.localId))}><Trash2 size={15} /></Button></div><label>{t("Ausgangsversion")}<input value={migration.from} list="rf-migration-versions" placeholder="1.0.0" onChange={e => update({ ...migration, from: e.target.value })} /><small>{t("Die frühere Paketversion, aus der Bögen übernommen werden, z. B. 1.0.0, muss sich von {version} unterscheiden.", { version: draft.version || t("dieser Version") })}</small></label>{sources.find(p => p.version === migration.from) ? <p className="rf-help">{t("Ausgangsfelder: {ausgang}. Zielfelder: {ziel}.", { ausgang: Object.keys(sources.find(p => p.version === migration.from)!.fields).join(", ") || t("keine"), ziel: draft.fields.map(f => f.id).join(", ") || t("keine") })}</p> : <p className="rf-help">{t("Diese Ausgangsversion ist noch nicht in der Bibliothek. Die tatsächlichen Charakterwerte prüft die Aktivierungsvorschau.")}</p>}{!migration.steps.length ? <p>{t("Keine Feldänderungen. Vorhandene Werte bleiben erhalten, sofern sie vollständig zum Zielbogen passen.")}</p> : null}{migration.steps.map((step, index) => <MigrationStepEditor key={step.localId} step={step} index={index} length={migration.steps.length} onChange={next => update({ ...migration, steps: migration.steps.map(s => s.localId === step.localId ? next : s) })} onRemove={() => update({ ...migration, steps: migration.steps.filter(s => s.localId !== step.localId) })} onMove={delta => update({ ...migration, steps: moveItem(migration.steps, index, delta) })} />)}<div className="rf-toolbar">{(["rename", "add", "archive", "numeric"] as const).map(kind => <Button key={kind} disabled={migration.steps.length >= RULE_LIMITS.migrationSteps} onClick={() => update({ ...migration, steps: [...migration.steps, migrationStepDraft(kind === "rename" ? { kind, from: "", to: "" } : kind === "add" ? { kind, field: "", value: 0 } : kind === "archive" ? { kind, field: "" } : { kind, field: "", expression: "actor.value" })] })}><Plus size={14} />{stepName(kind)}</Button>)}</div></article>)}</>;
}
function MigrationStepEditor({ step, index, length, onChange, onRemove, onMove }: { step: DraftMigrationStep; index: number; length: number; onChange(step: DraftMigrationStep): void; onRemove(): void; onMove(delta: -1 | 1): void }) {
  return <fieldset className="rf-migration-step"><legend>{t("{n}. {schritt}", { n: index + 1, schritt: stepName(step.kind) })}</legend><div className="rf-toolbar"><OrderButtons index={index} length={length} onMove={onMove} /><Button variant="quiet" onClick={onRemove} aria-label={t("Migrationsschritt {n} entfernen", { n: index + 1 })}><Trash2 size={15} /></Button></div>{step.kind === "rename" ? <div className="rf-form-grid"><label>{t("Bisherige Attributkennung")}<input value={step.from} onChange={e => onChange({ ...step, from: e.target.value })} /><small>{t("Wie das Attribut in der Ausgangsversion heißt.")}</small></label><label>{t("Neue Attributkennung")}<input value={step.to} onChange={e => onChange({ ...step, to: e.target.value })} /><small>{t("Wie das Attribut im Reiter „Attribute“ jetzt heißt.")}</small></label></div> : <label>{t("Attributkennung")}<input value={step.field} onChange={e => onChange({ ...step, field: e.target.value })} /><small>{step.kind === "archive" ? t("Muss in der Ausgangsversion vorhanden sein.") : t("Muss im Reiter „Attribute“ dieser Version vorhanden sein.")}</small></label>}{step.kind === "add" ? <div className="rf-form-grid"><label>{t("Werttyp")}<select value={step.type} onChange={e => { const type = e.target.value as FormulaType; onChange({ ...step, type, value: type === "number" ? "0" : type === "boolean" ? "false" : "" }); }}><option value="number">{t("Zahl")}</option><option value="string">{t("Text")}</option><option value="boolean">{t("Wahr / falsch")}</option></select></label><label>{t("Wert für bestehende Charaktere")}{step.type === "boolean" ? <select value={step.value} onChange={e => onChange({ ...step, value: e.target.value })}><option value="false">{t("Falsch")}</option><option value="true">{t("Wahr")}</option></select> : <input type={step.type === "number" ? "number" : "text"} step="any" value={step.value} onChange={e => onChange({ ...step, value: e.target.value })} />}<small>{t("Diesen Wert erhalten Charaktere, die dieses neue Feld noch nicht haben.")}</small></label></div> : null}{step.kind === "numeric" ? <FormulaField label={t("Neuer Zahlenwert")} help={t("@value ist der bisherige Zahlenwert dieses Attributs, zum Beispiel @value * 2.")} value={draftExpression(step)} onChange={expression => onChange({ ...step, expression })} sources={MIGRATION_NUMERIC_SOURCES} fields={MIGRATION_NUMERIC_FIELDS} allowDice={false} allowKnowledge={false} /> : null}</fieldset>;
}
function ReviewPanel({ review, acknowledged, onAcknowledge, disabled }: { review: RuleReview; acknowledged: boolean; onAcknowledge(value: boolean): void; disabled: boolean }) {
  return <section className="rf-review" aria-label={t("Geprüfte Aktivierung")}><h4>{t("Vorschau: {von} → {nach}", { von: review.from.version, nach: review.to.version })}</h4>{review.from.id !== review.to.id ? <p>{t("{von} → {nach}", { von: review.from.id, nach: review.to.id })}</p> : null}{review.migration ? <><p>{t("{anzahl} vorhandene Charakterbögen geprüft.", { anzahl: review.migration.entities.length })}</p>{review.migration.entities.map(entity => <details key={entity.id}><summary>{t("Charakter {kennung} · {anzahl} Änderungen", { kennung: entity.id, anzahl: entity.changes.length })}</summary><div className="rf-table-scroll"><table><caption>{t("Geprüfte Feldwerte")}</caption><thead><tr><th>{t("Feld")}</th><th>{t("Vorher")}</th><th>{t("Nachher")}</th><th>{t("Archiviert")}</th></tr></thead><tbody>{[...new Set([...Object.keys(entity.before), ...Object.keys(entity.after), ...Object.keys(entity.archived)])].map(field => <tr key={field}><th>{field}</th><td>{Object.hasOwn(entity.before, field) ? String(entity.before[field]) : "—"}</td><td>{Object.hasOwn(entity.after, field) ? String(entity.after[field]) : "—"}</td><td>{Object.hasOwn(entity.archived, field) ? String(entity.archived[field]) : "—"}</td></tr>)}</tbody></table></div>{entity.changes.length ? <ul>{entity.changes.map((change, i) => <li key={i}>{change}</li>)}</ul> : <p>{t("Keine Feldänderungen.")}</p>}</details>)}{review.migration.entities.length ? <label className="rf-check"><input type="checkbox" checked={acknowledged} disabled={disabled} onChange={e => onAcknowledge(e.target.checked)} />{t("Ich habe die Feldänderungen und archivierten Werte geprüft.")}</label> : null}</> : <p>{t("Für diese Aktivierung müssen keine vorhandenen Charakterbögen migriert werden.")}</p>}<p className="rf-help">{t("Ändern sich Paket, aktive Version oder Charakterwerte, ist vor der Aktivierung eine neue Vorschau erforderlich.")}</p></section>;
}

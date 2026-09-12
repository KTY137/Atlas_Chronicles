// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRight, Globe, Hammer, Image, Layers, LayoutDashboard, Map, PackageOpen, Palette, Users } from "lucide-react";
import type { ActorCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import { ActorTemplates, InstantiateActor, Inventory, ItemTemplates } from "./ActorWorkbench";
import { ActorDeletionPanel } from "./ActorDeletionPanel";
import type { RulesState } from "./game-api";
import type { ForgeSection } from "./forge-navigation";
import "./rule-forge.css";
import "./authoring.css";
import "./tactical.css";

const RuleForge = lazy(() => import("./RuleForge").then(module => ({ default: module.RuleForge })));
const ThemeWorkbench = lazy(() => import("./ThemeWorkbench").then(module => ({ default: module.ThemeWorkbench })));
const PublicationWorkbench = lazy(() => import("./PublicationWorkbench").then(module => ({ default: module.PublicationWorkbench })));
const TacticalPreparation = lazy(() => import("./TacticalPreparation").then(module => ({ default: module.TacticalPreparation })));
const WikiMedien = lazy(() => import("./WikiMedien").then(module => ({ default: module.WikiMedien })));

const TOOLS: { id: Exclude<ForgeSection, "overview">; icon: typeof Hammer }[] = [
  { id: "rules", icon: Hammer }, { id: "actors", icon: Users },
  { id: "loot", icon: Layers }, { id: "maps", icon: Map }, { id: "media", icon: Image },
  { id: "themes", icon: Palette }, { id: "publication", icon: Globe },
];

/**
 * Die Beschriftungen der Werkbänke als Zeichenkettenliterale. Eine Tabelle am Modulkopf hätte
 * `t(TOOLS[i].label)` gebraucht — kein Literal, und einmal beim Import übersetzt bliebe sie
 * beim Sprachwechsel stehen. Die Reihenfolge steht weiter in `TOOLS`.
 */
function werkzeug(id: Exclude<ForgeSection, "overview">): { label: string; summary: string; action: string } {
  switch (id) {
    case "loot": return { label: t("Lootkarten"), summary: t("Gegenstände als Karten gestalten, Exemplare erzeugen und Beute verteilen."), action: t("Lootkarte erstellen") };
    case "actors": return { label: t("Figuren & NPCs"), summary: t("Vorlagen mit Werten und Beute anlegen. Daraus entstehen Figuren für eure Runde."), action: t("Figuren vorbereiten") };
    case "maps": return { label: t("Karten"), summary: t("Grundrisse und Orte erzeugen, bearbeiten und für eine Szene vorbereiten."), action: t("Karte erstellen") };
    case "media": return { label: t("Bilder"), summary: t("Eigene Bilder hochladen und in Lootkarten oder Artikeln verwenden."), action: t("Bild hochladen") };
    case "rules": return { label: t("Regeln"), summary: t("Figurenwerte, Fähigkeiten, Proben und Lebensbalken gestalten."), action: t("Regeln bearbeiten") };
    case "themes": return { label: t("Aussehen"), summary: t("Farben, Schrift und Lesbarkeit eurer Runde abstimmen."), action: t("Aussehen gestalten") };
    default: return { label: t("Veröffentlichung"), summary: t("Ausgewählte Artikel mit Menschen außerhalb eurer Runde teilen."), action: t("Veröffentlichung öffnen") };
  }
}

export function ForgeWorkbench({ campaign, authorName, liveRevision, section, onSectionChange, onOpenMaps, onOpenTable, onDirty, onChanged }: {
  campaign: Campaign; authorName: string; liveRevision: number; section?: ForgeSection;
  onSectionChange?: (section: ForgeSection) => void; onOpenMaps?: () => void; onOpenTable?: () => void;
  onDirty: (dirty: boolean) => void; onChanged: () => void;
}) {
  const [localSection, setLocalSection] = useState<ForgeSection>("overview");
  const active = section ?? localSection;
  const [draft, setDraft] = useState({ section: active, dirty: false });
  const dirty = draft.section === active && draft.dirty;
  const changed = useCallback((value: boolean) => { setDraft({ section: active, dirty: value }); onDirty(value); }, [active, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const navigate = (next: ForgeSection) => {
    if (next === active || (dirty && !window.confirm(t("Ungespeicherten Werkstatt-Entwurf verwerfen?")))) return;
    changed(false); setLocalSection(next); onSectionChange?.(next);
  };
  if (campaign.role !== "leitung") return <EmptyState title={t("Die Schmiede gehört der Spielleitung.")}>{t("Hier entstehen Lootkarten, Figuren, Karten und die Regeln eurer Runde. Deine Figuren und ihren Besitz findest du am Tisch.")}</EmptyState>;
  const current = active === "overview" ? null : werkzeug(active);
  return <div className={`forge-workbench${current ? " forge-workbench-editing" : ""}`}>
    <header className="forge-header"><div><p className="eyebrow">{t("Werkstatt · {kampagne}", { kampagne: campaign.name })}</p><h1>{t("Schmiede")}</h1>{!current ? <p>{t("Alles für euren nächsten Spielabend. Wähle, was du erschaffen möchtest.")}</p> : null}</div>{dirty ? <span className="forge-draft-state" role="status">{t("Ungespeicherter Entwurf")}</span> : null}</header>
    <nav className="forge-navigation" aria-label={t("Werkstätten")}>
      <Button aria-current={active === "overview" ? "page" : undefined} onClick={() => navigate("overview")}><LayoutDashboard size={16} aria-hidden="true" />{t("Übersicht")}</Button>
      {TOOLS.map(({ id, icon: Icon }) => <Button key={id} aria-current={active === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={16} aria-hidden="true" />{werkzeug(id).label}</Button>)}
    </nav>
    {active === "overview" ? <>
      <section className="forge-overview" aria-labelledby="forge-start"><div className="forge-section-heading"><h2 id="forge-start">{t("Regeln und Figuren zuerst")}</h2><p>{t("Lege fest, wie eure Welt funktioniert, und erschaffe die Figuren, die sie erleben.")}</p></div>
        <div className="forge-tool-grid forge-tool-grid-primary">{TOOLS.filter(({ id }) => id === "rules" || id === "actors").map(({ id, icon: Icon }, index) => { const { label, summary, action } = werkzeug(id); return <button type="button" key={id} className="forge-tool forge-tool-featured" onClick={() => navigate(id)}>
          <span className="forge-tool-top"><Icon className="forge-tool-icon" size={26} aria-hidden="true" /><span className="forge-tool-number" aria-hidden="true">0{index + 1}</span></span><strong>{id === "rules" ? t("Regelschmiede") : label}</strong><span>{summary}</span><span className="forge-tool-route">{id === "rules" ? t("Attribute → Fähigkeiten → Proben") : t("Vorlage → Anfangswerte → Spielfigur")}</span><span className="forge-tool-action">{action}<ArrowRight size={16} aria-hidden="true" /></span>
        </button>; })}</div>
      </section>
      <section className="forge-overview forge-overview-secondary" aria-labelledby="forge-session"><div className="forge-section-heading"><h2 id="forge-session">{t("Den Spielabend ausgestalten")}</h2><p>{t("Karten, Beute und Bilder ergänzen eure Runde.")}</p></div>
        <div className="forge-tool-grid">{TOOLS.filter(({ id }) => id === "loot" || id === "maps" || id === "media").map(({ id, icon: Icon }) => { const { label, summary, action } = werkzeug(id); return <button type="button" key={id} className="forge-tool forge-tool-secondary" onClick={() => navigate(id)}>
          <Icon className="forge-tool-icon" size={21} aria-hidden="true" /><strong>{label}</strong><span>{summary}</span><span className="forge-tool-action">{action}<ArrowRight size={16} aria-hidden="true" /></span>
        </button>; })}</div>
        <div className="forge-finishing-tools">{TOOLS.filter(({ id }) => id === "themes" || id === "publication").map(({ id, icon: Icon }) => { const { label, summary } = werkzeug(id); return <button type="button" className="forge-finishing-tool" key={id} onClick={() => navigate(id)}><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><span>{summary}</span></span><ArrowRight size={16} aria-hidden="true" /></button>; })}</div>
      </section>
      <aside className="forge-orientation"><PackageOpen size={22} aria-hidden="true" /><div><h2>{t("Von der Vorlage ins Spiel")}</h2><p>{t("Eine Lootkarte beschreibt den Gegenstand. Erzeuge daraus ein Exemplar im Vorrat und gib es einer Figur. Figuren funktionieren genauso: Vorlage anlegen, Figur erschaffen, am Tisch spielen.")}</p></div></aside>
    </> : <section className="forge-content" aria-label={current?.label}>
      {current ? <header className="forge-section-heading"><h2>{active === "rules" ? t("Regelschmiede") : current.label}</h2><p>{current.summary}</p></header> : null}
      <Suspense fallback={<Loading text={t("Werkstatt wird geladen …")} />}>
        {active === "loot" ? <LootWorkshop key={campaign.id} campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} /> : null}
        {active === "actors" ? <FigureWorkshop key={campaign.id} campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} onOpenLoot={() => navigate("loot")} onOpenTable={onOpenTable} /> : null}
        {active === "maps" ? <div className="tactical-workspace">{onOpenMaps ? <p className="forge-context-link">{t("Eine fertige Karte spielen?")} <Button variant="quiet" onClick={onOpenMaps}>{t("Szenenkarten am Tisch öffnen")}<ArrowRight size={14} aria-hidden="true" /></Button></p> : null}<TacticalPreparation campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} /></div> : null}
        {active === "media" ? <WikiMedien campaignId={campaign.id} onClose={() => navigate("overview")} closeLabel={t("Zur Schmiede")} embedded onDirty={changed} /> : null}
        {active === "rules" ? <RuleForge campaign={campaign} authorName={authorName} onDirty={changed} onActivated={onChanged} /> : null}
        {active === "themes" ? <ThemeWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} onChanged={onChanged} /> : null}
        {active === "publication" ? <PublicationWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} /> : null}
      </Suspense>
    </section>}
  </div>;
}

function LootWorkshop({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void }) {
  const [tab, setTab] = useState<"templates" | "inventory">("templates"), [dirty, setDirty] = useState(false), [localRevision, setLocalRevision] = useState(0);
  const actors = useResource<ActorCard[]>(tab === "inventory" ? apiPath(campaignId, "/actors") : null, revision + localRevision);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const refresh = () => { setLocalRevision(value => value + 1); onChanged(); };
  const choose = (next: typeof tab) => { if (next === tab || (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?")))) return; report(false); setTab(next); };
  return <div className="actor-workbench"><div className="forge-task-tabs" aria-label={t("Lootkarten bearbeiten")}><Button aria-pressed={tab === "templates"} onClick={() => choose("templates")}>{t("1 · Kartenvorlagen gestalten")}</Button><Button aria-pressed={tab === "inventory"} onClick={() => choose("inventory")}>{t("2 · Exemplare & Vorrat")}</Button></div>
    {tab === "templates" ? <ItemTemplates campaignId={campaignId} revision={revision + localRevision} onDirty={report} onChanged={refresh} onOpenInventory={() => choose("inventory")} /> : <>
      <p className="field-help">{t("Hier erzeugst du Exemplare deiner gespeicherten Karten. Menge, Notizen und Besitz gehören zu jedem Exemplar; die Vorlage bleibt erhalten.")}</p>
      {actors.error ? <Notice error>{actors.error}</Notice> : null}
      {!actors.data && actors.error ? null : !actors.data && actors.loading ? <Loading /> : <Inventory campaignId={campaignId} actorId="" actors={actors.data ?? []} gm revision={revision + localRevision} onChanged={refresh} onDirty={report} onCreateTemplate={() => choose("templates")} />}
    </>}
  </div>;
}

function FigureWorkshop({ campaignId, revision, onChanged, onDirty, onOpenLoot, onOpenTable }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void; onOpenLoot: () => void; onOpenTable?: () => void }) {
  const [tab, setTab] = useState<"templates" | "create">("templates"), [dirty, setDirty] = useState(false), [localRevision, setLocalRevision] = useState(0);
  const [creationTemplateId, setCreationTemplateId] = useState("");
  const rules = useResource<RulesState>(apiPath(campaignId, "/rules"), revision + localRevision);
  const actors = useResource<ActorCard[]>(apiPath(campaignId, "/actors"), revision + localRevision);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const refresh = () => { setLocalRevision(value => value + 1); onChanged(); };
  const choose = (next: typeof tab) => { if (next === tab) return true; if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return false; report(false); setTab(next); return true; };
  return <div className="actor-workbench"><div className="forge-task-tabs" aria-label={t("Figuren vorbereiten")}><Button aria-pressed={tab === "templates"} onClick={() => choose("templates")}>{t("1 · Figurvorlagen")}</Button><Button aria-pressed={tab === "create"} onClick={() => choose("create")}>{t("2 · Figur erschaffen")}</Button></div>
    {rules.error ? <Notice error>{rules.error}</Notice> : null}
    {rules.data ? tab === "templates" ? <ActorTemplates campaignId={campaignId} rules={rules.data} revision={revision + localRevision} onChanged={refresh} onDirty={report} onOpenLoot={onOpenLoot} onInstantiate={templateId => { if (choose("create")) setCreationTemplateId(templateId ?? ""); }} /> : <InstantiateActor campaignId={campaignId} rules={rules.data} initialTemplateId={creationTemplateId} revision={revision + localRevision} onChanged={refresh} onDirty={report} onCreateTemplate={() => choose("templates")} /> : rules.loading && !rules.error ? <Loading /> : null}
    {actors.error ? <Notice error>{actors.error}</Notice> : actors.loading ? <Loading /> : <ActorDeletionPanel campaignId={campaignId} actors={actors.data ?? []} revision={revision + localRevision} onChanged={refresh} />}
    {onOpenTable ? <p className="forge-context-link">{t("Vorhandene Figuren steuern, Bögen bearbeiten und Besitz verwalten:")} <Button variant="quiet" onClick={onOpenTable}>{t("Figuren am Tisch öffnen")}<ArrowRight size={14} aria-hidden="true" /></Button></p> : null}
  </div>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRight, Globe, Hammer, Image, Layers, LayoutDashboard, Map, PackageOpen, Palette, Users } from "lucide-react";
import type { ActorCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign } from "../api";
import { useResource } from "../hooks";
import { ActorTemplates, InstantiateActor, Inventory, ItemTemplates } from "./ActorWorkbench";
import type { RulesState } from "./game-api";
import type { ForgeSection } from "./forge-navigation";
import "./authoring.css";
import "./rule-forge.css";
import "./tactical.css";

const RuleForge = lazy(() => import("./RuleForge").then(module => ({ default: module.RuleForge })));
const ThemeWorkbench = lazy(() => import("./ThemeWorkbench").then(module => ({ default: module.ThemeWorkbench })));
const PublicationWorkbench = lazy(() => import("./PublicationWorkbench").then(module => ({ default: module.PublicationWorkbench })));
const TacticalPreparation = lazy(() => import("./TacticalPreparation").then(module => ({ default: module.TacticalPreparation })));
const WikiMedien = lazy(() => import("./WikiMedien").then(module => ({ default: module.WikiMedien })));

const TOOLS: { id: Exclude<ForgeSection, "overview">; label: string; icon: typeof Hammer; summary: string; action: string }[] = [
  { id: "loot", label: "Lootkarten", icon: Layers, summary: "Gegenstände als Karten gestalten, Exemplare erzeugen und Beute verteilen.", action: "Lootkarte erstellen" },
  { id: "actors", label: "Figuren & NPCs", icon: Users, summary: "Vorlagen mit Werten und Beute anlegen. Daraus entstehen Figuren für eure Runde.", action: "Figuren vorbereiten" },
  { id: "maps", label: "Karten", icon: Map, summary: "Grundrisse und Orte erzeugen, bearbeiten und für eine Szene vorbereiten.", action: "Karte erstellen" },
  { id: "media", label: "Bilder", icon: Image, summary: "Eigene Bilder hochladen und in Lootkarten oder Artikeln verwenden.", action: "Bild hochladen" },
  { id: "rules", label: "Regeln", icon: Hammer, summary: "Figurenwerte, Fähigkeiten, Proben und Lebensbalken gestalten.", action: "Regeln bearbeiten" },
  { id: "themes", label: "Aussehen", icon: Palette, summary: "Farben, Schrift und Lesbarkeit eurer Runde abstimmen.", action: "Aussehen gestalten" },
  { id: "publication", label: "Veröffentlichung", icon: Globe, summary: "Ausgewählte Artikel mit Menschen außerhalb eurer Runde teilen.", action: "Veröffentlichung öffnen" },
];

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
    if (next === active || (dirty && !window.confirm("Ungespeicherten Werkstatt-Entwurf verwerfen?"))) return;
    changed(false); setLocalSection(next); onSectionChange?.(next);
  };
  if (campaign.role !== "leitung") return <EmptyState title="Die Schmiede gehört der Spielleitung.">Hier entstehen Lootkarten, Figuren, Karten und die Regeln eurer Runde. Deine Figuren und ihren Besitz findest du am Tisch.</EmptyState>;
  const current = TOOLS.find(tool => tool.id === active);
  return <div className="forge-workbench">
    <header className="forge-header"><div><p className="eyebrow">Werkstatt · {campaign.name}</p><h1>Schmiede</h1><p>Alles für euren nächsten Spielabend. Wähle, was du erschaffen möchtest.</p></div>{dirty ? <span className="forge-draft-state" role="status">Ungespeicherter Entwurf</span> : null}</header>
    <nav className="forge-navigation" aria-label="Werkstätten">
      <Button aria-current={active === "overview" ? "page" : undefined} onClick={() => navigate("overview")}><LayoutDashboard size={16} aria-hidden="true" />Übersicht</Button>
      {TOOLS.map(({ id, label, icon: Icon }) => <Button key={id} aria-current={active === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={16} aria-hidden="true" />{label}</Button>)}
    </nav>
    {active === "overview" ? <>
      <section className="forge-overview" aria-labelledby="forge-start"><div className="forge-section-heading"><h2 id="forge-start">Was möchtest du vorbereiten?</h2><p>Erstellen, gestalten und direkt in der Runde verwenden.</p></div>
        <div className="forge-tool-grid">{TOOLS.map(({ id, label, icon: Icon, summary, action }, index) => <button type="button" key={id} className={`forge-tool${index < 3 ? " forge-tool-featured" : ""}`} onClick={() => navigate(id)}>
          <Icon className="forge-tool-icon" size={24} aria-hidden="true" /><strong>{label}</strong><span>{summary}</span><span className="forge-tool-action">{action}<ArrowRight size={16} aria-hidden="true" /></span>
        </button>)}</div>
      </section>
      <aside className="forge-orientation"><PackageOpen size={22} aria-hidden="true" /><div><h2>Von der Vorlage ins Spiel</h2><p>Eine Lootkarte beschreibt den Gegenstand. Erzeuge daraus ein Exemplar im Vorrat und gib es einer Figur. Figuren funktionieren genauso: Vorlage anlegen, Figur erschaffen, am Tisch spielen.</p></div></aside>
    </> : <section className="forge-content" aria-label={current?.label}>
      {current ? <header className="forge-section-heading"><h2>{current.label}</h2><p>{current.summary}</p></header> : null}
      <Suspense fallback={<Loading text="Werkstatt wird geladen …" />}>
        {active === "loot" ? <LootWorkshop key={campaign.id} campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} /> : null}
        {active === "actors" ? <FigureWorkshop key={campaign.id} campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} onOpenLoot={() => navigate("loot")} onOpenTable={onOpenTable} /> : null}
        {active === "maps" ? <div className="tactical-workspace">{onOpenMaps ? <p className="forge-context-link">Eine fertige Karte spielen? <Button variant="quiet" onClick={onOpenMaps}>Szenenkarten am Tisch öffnen<ArrowRight size={14} aria-hidden="true" /></Button></p> : null}<TacticalPreparation campaignId={campaign.id} revision={liveRevision} onChanged={onChanged} onDirty={changed} /></div> : null}
        {active === "media" ? <WikiMedien campaignId={campaign.id} onClose={() => navigate("overview")} closeLabel="Zur Schmiede" embedded onDirty={changed} /> : null}
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
  const choose = (next: typeof tab) => { if (next === tab || (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?"))) return; report(false); setTab(next); };
  return <div className="actor-workbench"><div className="forge-task-tabs" aria-label="Lootkarten bearbeiten"><Button aria-pressed={tab === "templates"} onClick={() => choose("templates")}>1 · Kartenvorlagen gestalten</Button><Button aria-pressed={tab === "inventory"} onClick={() => choose("inventory")}>2 · Exemplare & Vorrat</Button></div>
    {tab === "templates" ? <ItemTemplates campaignId={campaignId} revision={revision + localRevision} onDirty={report} onChanged={refresh} onOpenInventory={() => choose("inventory")} /> : <>
      <p className="field-help">Hier erzeugst du Exemplare deiner gespeicherten Karten. Menge, Notizen und Besitz gehören zu jedem Exemplar; die Vorlage bleibt erhalten.</p>
      {actors.error ? <Notice error>{actors.error}</Notice> : actors.loading ? <Loading /> : <Inventory campaignId={campaignId} actorId="" actors={actors.data ?? []} gm revision={revision + localRevision} onChanged={refresh} onDirty={report} onCreateTemplate={() => choose("templates")} />}
    </>}
  </div>;
}

function FigureWorkshop({ campaignId, revision, onChanged, onDirty, onOpenLoot, onOpenTable }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void; onOpenLoot: () => void; onOpenTable?: () => void }) {
  const [tab, setTab] = useState<"templates" | "create">("templates"), [dirty, setDirty] = useState(false), [localRevision, setLocalRevision] = useState(0);
  const rules = useResource<RulesState>(apiPath(campaignId, "/rules"), revision + localRevision);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const refresh = () => { setLocalRevision(value => value + 1); onChanged(); };
  const choose = (next: typeof tab) => { if (next === tab || (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?"))) return; report(false); setTab(next); };
  return <div className="actor-workbench"><div className="forge-task-tabs" aria-label="Figuren vorbereiten"><Button aria-pressed={tab === "templates"} onClick={() => choose("templates")}>1 · Figurvorlagen</Button><Button aria-pressed={tab === "create"} onClick={() => choose("create")}>2 · Figur erschaffen</Button></div>
    {rules.error ? <Notice error>{rules.error}</Notice> : rules.loading ? <Loading /> : rules.data ? tab === "templates" ? <ActorTemplates campaignId={campaignId} rules={rules.data} revision={revision + localRevision} onChanged={refresh} onDirty={report} onOpenLoot={onOpenLoot} onInstantiate={() => choose("create")} /> : <InstantiateActor campaignId={campaignId} revision={revision + localRevision} onChanged={refresh} onDirty={report} onCreateTemplate={() => choose("templates")} /> : null}
    {onOpenTable ? <p className="forge-context-link">Vorhandene Figuren steuern, Bögen bearbeiten und Besitz verwalten: <Button variant="quiet" onClick={onOpenTable}>Figuren am Tisch öffnen<ArrowRight size={14} aria-hidden="true" /></Button></p> : null}
  </div>;
}

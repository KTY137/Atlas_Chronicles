// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useState } from "react";
import { Globe, Hammer, Palette } from "lucide-react";
import { Button, EmptyState, Notice } from "@chronicle/ui";
import type { Campaign } from "../api";
import { RuleForge } from "./RuleForge";
import { ThemeWorkbench } from "./ThemeWorkbench";
import { PublicationWorkbench } from "./PublicationWorkbench";
import "./authoring.css";

type ForgeTab = "rules" | "themes" | "publication";

const TOOLS: { id: ForgeTab; label: string; icon: typeof Hammer; summary: string }[] = [
  { id: "rules", label: "Regeln", icon: Hammer, summary: "Werte, Fähigkeiten und Proben eurer Figuren bauen und bewusst am Tisch einführen." },
  { id: "themes", label: "Themes", icon: Palette, summary: "Farben, Schrift und Erscheinungsbild eurer Runde gestalten und auf Lesbarkeit prüfen." },
  { id: "publication", label: "Veröffentlichung", icon: Globe, summary: "Ausgewählte Artikel bewusst mit Menschen außerhalb eurer Runde teilen." },
];

const tileStyle = { flex: "1 1 240px", maxWidth: 360, height: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, whiteSpace: "normal", textAlign: "left" } as const;

export function ForgeWorkbench({ campaign, authorName, liveRevision, onDirty, onChanged }: { campaign: Campaign; authorName: string; liveRevision: number; onDirty: (dirty: boolean) => void; onChanged: () => void }) {
  const [tab, setTab] = useState<ForgeTab>("rules"), [dirty, setDirty] = useState(false);
  const changed = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  if (campaign.role !== "leitung") return <EmptyState title="Die Schmiede gehört der Spielleitung.">Hier entstehen die Regeln, das Aussehen und die Veröffentlichung eurer Runde. Was aktiv ist, findest du am Tisch und in der öffentlichen Welt – verändern kann es nur die Spielleitung.</EmptyState>;
  return <>
    <div style={{ padding: "18px 32px 0" }}>
      <p className="eyebrow">Schmiede für {campaign.name}</p>
      <p style={{ maxWidth: "76ch" }}>Hier baust du die Regeln eurer Welt, gestaltest ihr Aussehen und entscheidest, was davon veröffentlicht wird.</p>
    </div>
    {tab === "rules" && !dirty ? <div style={{ padding: "0 32px" }}><Notice>Noch nichts gebaut? Beginne bei den Regeln – Themes und Veröffentlichung bauen darauf auf.</Notice></div> : null}
    <nav className="forge-tabs" aria-label="Werkstätten">
      {TOOLS.map(({ id, label, icon: Icon, summary }) => <Button key={id} aria-current={tab === id ? "page" : undefined} style={tileStyle} onClick={() => { if (id !== tab && (!dirty || window.confirm("Ungespeicherten Werkstatt-Entwurf verwerfen?"))) { changed(false); setTab(id); } }}>
        <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon size={16} />{label}</strong>
        <span className="muted">{summary}</span>
      </Button>)}
    </nav>
    {tab === "rules" ? <RuleForge campaign={campaign} authorName={authorName} onDirty={changed} onActivated={onChanged} /> : tab === "themes" ? <ThemeWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} onChanged={onChanged} /> : <PublicationWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} />}
  </>;
}

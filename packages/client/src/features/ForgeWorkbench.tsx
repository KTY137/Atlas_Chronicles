import { useCallback, useState } from "react";
import { Button } from "@chronicle/ui";
import type { Campaign } from "../api";
import { RuleForge } from "./RuleForge";
import { ThemeWorkbench } from "./ThemeWorkbench";
import { PublicationWorkbench } from "./PublicationWorkbench";
import "./authoring.css";

export function ForgeWorkbench({ campaign, authorName, liveRevision, onDirty, onChanged }: { campaign: Campaign; authorName: string; liveRevision: number; onDirty: (dirty: boolean) => void; onChanged: () => void }) {
  const [tab, setTab] = useState<"rules" | "themes" | "publication">("rules"), [dirty, setDirty] = useState(false);
  const changed = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  return <><nav className="forge-tabs" aria-label="Werkstätten">{([["rules", "Regeln"], ["themes", "Themes"], ["publication", "Veröffentlichung"]] as const).map(([id, label]) => <Button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => { if (id !== tab && (!dirty || window.confirm("Ungespeicherten Werkstatt-Entwurf verwerfen?"))) { changed(false); setTab(id); } }}>{label}</Button>)}</nav>
    {tab === "rules" ? <RuleForge campaign={campaign} authorName={authorName} onDirty={changed} onActivated={onChanged} /> : tab === "themes" ? <ThemeWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} onChanged={onChanged} /> : <PublicationWorkbench campaign={campaign} liveRevision={liveRevision} onDirty={changed} />}
  </>;
}

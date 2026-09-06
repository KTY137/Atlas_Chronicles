import { useState } from "react";
import { Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";
import "./PassageProvenance.css";

interface Evidence {
  id: string; kind: string; revisionId: string; seal: string; confirmedAt: string | number;
  provenance: { playDate?: string; fictionDate?: string; serverTime?: number; package?: { id: string; version: string } | null };
}
const kinds: Record<string, string> = { wurf: "Bestätigter Wurf", gesprochen: "Am Tisch ausgesprochen", ratifikation: "Ratifikation", berichtigung: "Berichtigung", vollmacht: "Vollmacht" };

export function PassageProvenance({ campaignId, passageId }: { campaignId: string; passageId: string }) {
  const [expanded, setExpanded] = useState(false);
  const evidence = useResource<Evidence[]>(expanded ? apiPath(campaignId, `/passages/${encodeURIComponent(passageId)}/provenance`) : null);
  return <details className="passage-evidence" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>Herkunft ansehen</summary>
    {evidence.loading ? <p role="status">Herkunft wird geladen …</p> : evidence.error ? <Notice error>{evidence.error}</Notice> : evidence.data?.length ? evidence.data.map(item => <div key={item.id}>
      <h3>{kinds[item.kind] ?? item.kind}</h3><dl className="receipt-meta">
        <dt>Weltzeit</dt><dd>{item.provenance.fictionDate ?? "Nicht angegeben"}</dd>
        <dt>Spieltag</dt><dd>{item.provenance.playDate ?? "Nicht angegeben"}</dd>
        <dt>Auf dem Server bestätigt</dt><dd><time dateTime={new Date(Number(item.confirmedAt)).toISOString()}>{new Date(Number(item.confirmedAt)).toLocaleString("de-DE")}</time></dd>
        {item.provenance.package ? <><dt>Regelwerk</dt><dd>{item.provenance.package.id} · {item.provenance.package.version}</dd></> : null}
        <dt>Revision</dt><dd><code>{item.revisionId}</code></dd><dt>Siegel</dt><dd><code>{item.seal}</code></dd>
      </dl>
    </div>) : <p className="muted">Für diese Passage wurde noch kein Kanonbeleg bestätigt.</p>}
  </details>;
}

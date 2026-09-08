// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource } from "../hooks";
import { locale, t } from "../i18n";
import "./PassageProvenance.css";

interface Evidence {
  id: string; kind: string; revisionId: string; seal: string; confirmedAt: string | number;
  provenance: { playDate?: string; fictionDate?: string; serverTime?: number; package?: { id: string; version: string } | null };
}
/** Anzeigenamen der Belegarten. Als Funktionen, damit der Text erst beim Zeichnen in der
 * gewählten Sprache entsteht — ein Modulwert wäre in der Sprache des Seitenaufbaus eingefroren. */
const kinds: Record<string, () => string> = { wurf: () => t("Bestätigter Wurf"), gesprochen: () => t("Am Tisch ausgesprochen"), ratifikation: () => t("Ratifikation"), berichtigung: () => t("Berichtigung"), vollmacht: () => t("Vollmacht") };

export function PassageProvenance({ campaignId, passageId }: { campaignId: string; passageId: string }) {
  const [expanded, setExpanded] = useState(false);
  const evidence = useResource<Evidence[]>(expanded ? apiPath(campaignId, `/passages/${encodeURIComponent(passageId)}/provenance`) : null);
  return <details className="passage-evidence" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>{t("Herkunft ansehen")}</summary>
    {evidence.loading ? <p role="status">{t("Herkunft wird geladen …")}</p> : evidence.error ? <Notice error>{evidence.error}</Notice> : evidence.data?.length ? evidence.data.map(item => <div key={item.id}>
      <h3>{kinds[item.kind]?.() ?? item.kind}</h3><dl className="receipt-meta">
        <dt>{t("Weltzeit")}</dt><dd>{item.provenance.fictionDate ?? t("Nicht angegeben")}</dd>
        <dt>{t("Spieltag")}</dt><dd>{item.provenance.playDate ?? t("Nicht angegeben")}</dd>
        <dt>{t("Auf dem Server bestätigt")}</dt><dd><time dateTime={new Date(Number(item.confirmedAt)).toISOString()}>{new Date(Number(item.confirmedAt)).toLocaleString(locale())}</time></dd>
        {item.provenance.package ? <><dt>{t("Regelwerk")}</dt><dd>{item.provenance.package.id} · {item.provenance.package.version}</dd></> : null}
        <dt>{t("Revision")}</dt><dd><code>{item.revisionId}</code></dd><dt>{t("Siegel")}</dt><dd><code>{item.seal}</code></dd>
      </dl>
    </div>) : <p className="muted">{t("Für diese Passage wurde noch kein Kanonbeleg bestätigt.")}</p>}
  </details>;
}

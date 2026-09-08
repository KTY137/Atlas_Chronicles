// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type CSSProperties } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useTask } from "../hooks";
import { locale, t } from "../i18n";
import type { ActionCard } from "./game-api";

/**
 * `frisch` heisst: dieser Wurf ist gerade eingetroffen, seine Wuerfel duerfen fallen. Ein Wurf
 * aus der Historie liegt still — Bewegung, die nichts mitteilt, ist Unruhe. Die Voreinstellung
 * ist deshalb `false`: wer die Karte ohne diese Angabe rendert, bekommt keine Bewegung.
 *
 * Die Wuerfelschreibweise (`W6`, `W12`) ist Notation und keine Oberflaeche: sie bleibt in jeder
 * Sprache stehen, wie der Ausdruck des Regelpakets daneben.
 */
export function RollCard({ card, campaignId, actorName, onChanged, frisch = false }: { card: ActionCard; campaignId: string; actorName: string; onChanged: () => void; frisch?: boolean }) {
  const task = useTask(), [replay, setReplay] = useState<boolean | null>(null);
  const outcome = card.receipt.schemaVersion === 2 ? card.receipt.outcome : undefined;
  // Erst die gewerteten Wuerfel sammeln, dann anzeigen: nur so hat jeder eine eigene laufende
  // Nummer, und nur die staffelt die Landung. Text und Aufbau bleiben unveraendert.
  const gewuerfelt = card.receipt.dice.flatMap((die, i) => die.kept.map(index => {
    const chain = die.rolls[index]!, total = chain.reduce((sum, face) => sum + face, 0);
    return { schluessel: `${i}-${index}`, sides: die.sides, wert: chain.length > 1 ? `${chain.join(" + ")} = ${total}` : String(total) };
  }));
  return <article className="roll-card"><div className="roll-heading"><div><span className="eyebrow">{actorName} · {card.fictionDate}</span><h3>{card.receipt.action.id}</h3></div><strong className="roll-total">{card.receipt.total}</strong></div>
    <p className="roll-expression">{card.receipt.expression}</p><div className={frisch ? "dice-results faellt" : "dice-results"} role="group" aria-label={t("Gewertete Würfel")}>{gewuerfelt.map((wuerfel, n) =>
      <span key={wuerfel.schluessel} role="img" aria-label={`W${wuerfel.sides}: ${wuerfel.wert}`} title={`W${wuerfel.sides}: ${wuerfel.wert}`}
        style={{ maxWidth: "100%", height: "auto", minHeight: 49, overflowWrap: "anywhere", "--wuerfel-nr": n } as CSSProperties}>{wuerfel.wert}<small>W{wuerfel.sides}</small></span>)}</div>
    {outcome ? <p className="roll-outcome" role="status"><strong>{outcome.label}</strong></p> : null}
    <p className="muted">{card.confirmation ? card.confirmation.success ? t("Bestätigt · erfolgreich") : outcome ? t("Bestätigt · Probe misslungen") : t("Bestätigt · Schwelle nicht erreicht") : t("Das Ergebnis wartet auf deine Bestätigung.")}{card.confirmation?.mint ? ` ${t("Die Herkunft wurde in der Chronik versiegelt.")}` : ""}</p>
    {outcome ? <details><summary>{t("Ergebnisbereiche dieses Wurfs")}</summary><ol>{outcome.comparisons.map((band, i) => <li key={band.id}>{band.id} · {band.comparison} {band.threshold} · {band.matched ? t("passt") : t("passt nicht")}{outcome.matchedBand === i ? ` · ${t("ausgewählt")}` : ""}</li>)}</ol></details> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}{replay !== null ? <Notice error={!replay}>{replay ? t("Nachgerechnet: Würfel, Regelversion und Beleg stimmen überein.") : t("Der Beleg konnte nicht bestätigt werden.")}</Notice> : null}
    <div className="button-row">{card.status === "ausstehend" ? <Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaignId, card.vollmachtId ? `/vollmachten/rolls/${encodeURIComponent(card.id)}/confirm` : `/rolls/${encodeURIComponent(card.id)}/confirm`), { method: "POST" }); onChanged(); })}><Check size={16} /> {t("Ergebnis bestätigen")}</Button> : null}<Button disabled={task.busy} onClick={() => void task.run(async () => { const result = await api<{ valid: boolean }>(apiPath(campaignId, `/rolls/${encodeURIComponent(card.id)}/replay`)); setReplay(result.valid); })}><RotateCcw size={14} /> {t("Nachrechnen")}</Button></div>
    <details><summary>{t("Rechenweg und Herkunft")}</summary><dl className="receipt-meta"><dt>{t("Regelwerk")}</dt><dd>{card.receipt.package.id} · {card.receipt.package.version}</dd><dt>{t("Spielzeit")}</dt><dd>{new Date(card.preparedAt).toLocaleString(locale())}</dd><dt>{t("Weltzeit")}</dt><dd>{card.fictionDate}</dd><dt>{t("Beleg")}</dt><dd><code>{card.receiptHash}</code></dd></dl><ol className="trace-list">{card.receipt.trace.map((step, i) => <li key={i}><span>{step.label ?? step.kind}</span><strong>{String(step.value)}</strong></li>)}</ol></details>
  </article>;
}

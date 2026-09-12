// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState, type CSSProperties } from "react";
import { Dice6, RotateCcw, Check } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { TABLE_DICE_ACTION_ID, validTableDice } from "@chronicle/protocol";
import { api, apiPath } from "../api";
import { useFrischeKarten, useResource, useTask } from "../hooks";
import { locale, t } from "../i18n";
import { useCommand, type ActionCard } from "./game-api";
import { tableDiceValues, type TableParticipant } from "./tabletop-model";

export function TableDice({ campaignId, actorId, participants, revision, onChanged }: { campaignId: string; actorId: string; participants: TableParticipant[]; revision: number; onChanged: () => void }) {
  const [count, setCount] = useState(1), [minimum, setMinimum] = useState(1), [maximum, setMaximum] = useState(20), [range, setRange] = useState(false);
  const [accepted, setAccepted] = useState<ActionCard | null>(null), [animateId, setAnimateId] = useState("");
  const task = useTask(), command = useCommand();
  const feed = useResource<ActionCard[]>(apiPath(campaignId, "/tabletop/rolls"), revision, 2500);
  const fresh = useFrischeKarten(feed.data?.map(card => card.id) ?? null);
  const own = participants.some(participant => participant.id === actorId && participant.canControl);
  const visibleIds = participants.map(participant => participant.id).join(",");
  useEffect(() => { setAccepted(null); setAnimateId(""); }, [campaignId, actorId]);
  useEffect(() => {
    if (accepted && (feed.error || !participants.some(person => person.id === accepted.actorId) || feed.data?.some(card => card.id === accepted.id))) setAccepted(null);
  }, [accepted, feed.data, feed.error, visibleIds]);
  // A newly accepted local receipt stays visible while the next server poll catches up.
  const permitted = (feed.data ?? []).filter(card => participants.some(person => person.id === card.actorId));
  const cards = accepted && !feed.error && participants.some(person => person.id === accepted.actorId) && !permitted.some(card => card.id === accepted.id) ? [accepted, ...permitted] : permitted;
  const latest = cards[0], result = latest ? tableDiceValues(latest) : null;
  const spec = { count, minimum: range ? minimum : 1, maximum }, valid = validTableDice(spec);
  return <section className="table-dice" aria-label={t("Würfelschale")}>
    <div className="table-dice-heading"><Dice6 size={22} /><h2>{t("Würfelschale")}</h2></div>
    <div className={`table-dice-tray${task.busy ? " is-rolling" : ""}`} aria-busy={task.busy}>
      {task.busy ? <div className="table-dice-pending" aria-label={t("Würfelt …")}>{Array.from({ length: Math.min(Number.isFinite(count) ? count : 1, 8) }, (_, index) => <Dice6 key={index} size={34} style={{ "--die-index": index } as CSSProperties} />)}</div>
        : result ? <div key={latest!.id} className={`table-dice-faces${animateId === latest!.id || fresh.has(latest!.id) ? " dice-land" : ""}`} role="group" aria-label={t("Gewertete Würfel")}>
          {result.values.map((value, index) => <span className="table-die" key={index} style={{ "--die-index": Math.min(index, 12) } as CSSProperties} role="img" aria-label={t("Würfel {nummer}: {wert}", { nummer: index + 1, wert: value })}>{value}</span>)}
        </div> : <div className="table-dice-waiting"><Dice6 size={42} /><p>{t("Dein nächster Wurf liegt hier.")}</p></div>}
      <div className="table-dice-result" role="status" aria-live="polite">{latest && !task.busy ? <><span>{participants.find(person => person.id === latest.actorId)?.name ?? t("Figur")} · {t("Summe")}</span><strong>{latest.receipt.total}</strong></> : null}</div>
    </div>
    <form onSubmit={event => { event.preventDefault(); if (!own || !valid) return; void task.run(async () => {
      const card = await command<ActionCard>(apiPath(campaignId, "/rolls"), { actorId, actionId: TABLE_DICE_ACTION_ID, tableDice: spec });
      setAccepted(card); setAnimateId(card.id); onChanged();
    }); }}>
      <fieldset disabled={task.busy || !own}>
        <div className="table-dice-fields"><label>{t("Anzahl")}<input type="number" required min={1} max={100} step={1} value={Number.isNaN(count) ? "" : count} onChange={event => setCount(event.target.valueAsNumber)} /></label>
          {range ? <label>{t("Von")}<input type="number" required min={-1_000_000} max={1_000_000} step={1} value={Number.isNaN(minimum) ? "" : minimum} onChange={event => setMinimum(event.target.valueAsNumber)} /></label> : null}
          <label>{range ? t("Bis") : t("Seiten")}<input type="number" required min={range ? -1_000_000 : 2} max={range ? 1_000_000 : 100_000} step={1} value={Number.isNaN(maximum) ? "" : maximum} onChange={event => setMaximum(event.target.valueAsNumber)} /></label></div>
        <label className="check-label"><input type="checkbox" checked={range} onChange={event => { setRange(event.target.checked); if (!event.target.checked && maximum < 2) setMaximum(20); }} /> {t("Eigenen Wertebereich wählen")}</label>
        <div className="table-dice-presets" aria-label={t("Übliche Würfel")}>{[4, 6, 8, 10, 12, 20, 100].map(sides => <button type="button" key={sides} aria-pressed={!range && maximum === sides} onClick={() => { setRange(false); setMaximum(sides); }}>{t("W{seiten}", { seiten: sides })}</button>)}</div>
        <Button type="submit" variant="primary" disabled={!valid || !own || task.busy}><Dice6 size={17} /> {task.busy ? t("Würfelt …") : t("Würfeln")}</Button>
      </fieldset>
      {!own ? <p className="field-help">{t("Wähle eine Figur, die du führen darfst, um zu würfeln.")}</p> : !valid ? <Notice error>{t("Wähle 1 bis 100 Würfel und einen Bereich mit 2 bis 100.000 möglichen Werten.")}</Notice> : <p className="field-help">{t("Jeder Würfel: {von} bis {bis}", { von: spec.minimum, bis: spec.maximum })}</p>}
    </form>
    {task.error || feed.error ? <Notice error>{task.error || feed.error}</Notice> : null}
    <details className="table-dice-history"><summary>{t("Wurfprotokoll")} ({cards.length})</summary><p className="field-help">{t("Tischwürfe der sichtbaren Figuren. Jeder Wurf bleibt mit Zeit und Rechenweg gespeichert.")}</p>
      {cards.map(card => <TableDiceReceipt key={card.id} card={card} campaignId={campaignId} actorName={participants.find(person => person.id === card.actorId)?.name ?? t("Figur")} canConfirm={participants.some(person => person.id === card.actorId && person.canControl)} onChanged={onChanged} />)}
    </details>
  </section>;
}

function TableDiceReceipt({ campaignId, card, actorName, canConfirm, onChanged }: { campaignId: string; card: ActionCard; actorName: string; canConfirm: boolean; onChanged: () => void }) {
  const task = useTask(), [verified, setVerified] = useState<boolean | null>(null), result = tableDiceValues(card);
  return <article className="table-dice-receipt"><p><strong>{actorName}</strong> · {new Date(card.preparedAt).toLocaleTimeString(locale())}</p><p>{result?.values.join(" + ")} = <strong>{card.receipt.total}</strong></p>
    {result ? <p className="field-help">{t("Jeder Würfel: {von} bis {bis}", { von: result.minimum, bis: result.maximum })}</p> : null}
    <div className="button-row">{canConfirm && card.status === "ausstehend" ? <Button disabled={task.busy} onClick={() => void task.run(async () => { await api(apiPath(campaignId, `/rolls/${encodeURIComponent(card.id)}/confirm`), { method: "POST" }); onChanged(); })}><Check size={14} /> {t("Ergebnis bestätigen")}</Button> : null}
      <Button disabled={task.busy} onClick={() => void task.run(async () => { const reply = await api<{ valid: boolean }>(apiPath(campaignId, `/rolls/${encodeURIComponent(card.id)}/replay`)); setVerified(reply.valid); })}><RotateCcw size={14} /> {t("Nachrechnen")}</Button></div>
    {verified !== null ? <Notice error={!verified}>{verified ? t("Nachgerechnet: Würfel, Regelversion und Beleg stimmen überein.") : t("Der Beleg konnte nicht bestätigt werden.")}</Notice> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}<details><summary>{t("Rechenweg und Herkunft")}</summary><p>{card.receipt.expression}</p><time dateTime={new Date(card.preparedAt).toISOString()}>{new Date(card.preparedAt).toLocaleString(locale())}</time><code>{card.receiptHash}</code></details>
  </article>;
}

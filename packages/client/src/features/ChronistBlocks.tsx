// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { plainText, type Block, type Inline } from "../api";
import { BlockReader } from "../Reader";
import { t } from "../i18n";

const textInline = (text: string): Inline[] => [{ text, marks: [] }];
const rowText = (row: readonly Inline[]) => row.map(part => part.text).join("");
/** Edits every generated block; untouched formatting and field metadata remain intact. */
export function ChronistBlocks({ blocks, onChange, disabled = false }: { blocks: readonly Block[]; onChange: (blocks: Block[]) => void; disabled?: boolean }) {
  const update = (index: number, block: Block) => onChange(blocks.map((item, i) => i === index ? block : item));
  const move = (index: number, delta: number) => { const next = [...blocks]; [next[index], next[index + delta]] = [next[index + delta]!, next[index]!]; onChange(next); };
  return <div className="chronist-blocks">{blocks.map((block, i) => <fieldset key={i} disabled={disabled} className="chronist-block">
    <legend>{t("Abschnitt {nummer}", { nummer: i + 1 })}</legend>
    <div className="chronist-block-tools"><Button aria-label={t("Abschnitt {nummer} nach oben", { nummer: i + 1 })} disabled={disabled || i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></Button><Button aria-label={t("Abschnitt {nummer} nach unten", { nummer: i + 1 })} disabled={disabled || i === blocks.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></Button><Button aria-label={t("Abschnitt {nummer} entfernen", { nummer: i + 1 })} disabled={disabled} onClick={() => onChange(blocks.filter((_, index) => index !== i))}><Trash2 size={15} /></Button></div>
    {block.kind === "absatz" || block.kind === "zitat" ? <><label>{t("Abschnittsart")}<select value={block.kind} onChange={event => update(i, { ...block, kind: event.target.value as "absatz" | "zitat" })}><option value="absatz">{t("Absatz")}</option><option value="zitat">{t("Zitat")}</option></select></label><label>{t("Text von Abschnitt {nummer}", { nummer: i + 1 })}<textarea rows={6} maxLength={64_000} value={plainText(block)} onChange={event => update(i, { ...block, inhalt: textInline(event.target.value) })} /></label>{block.inhalt.some(part => part.marks.length > 0) ? <p className="field-help">{t("Eine Textänderung ersetzt die Formatierung dieses Abschnitts durch Klartext.")}</p> : null}</>
      : block.kind === "feld" ? <><div className="chronist-form-row"><label>{t("Feldname")}<input value={block.label} onChange={event => update(i, { ...block, label: event.target.value })} /></label><label>{t("Feldschlüssel")}<input value={block.schluessel} onChange={event => update(i, { ...block, schluessel: event.target.value })} /></label></div><label>{t("Werte von Abschnitt {nummer}", { nummer: i + 1 })}<textarea rows={4} value={block.werte.map(rowText).join("\n")} onChange={event => { const werte = event.target.value.split("\n").map(textInline); update(i, { ...block, werte, mehrwertig: werte.length > 1 }); }} /></label><p className="field-help">{t("Ein Wert pro Zeile.")}</p></>
      : block.kind === "liste" ? <><label className="chronist-check"><input type="checkbox" checked={block.geordnet} onChange={event => update(i, { ...block, geordnet: event.target.checked })} />{t("Nummerierte Liste")}</label><label>{t("Listenpunkte von Abschnitt {nummer}", { nummer: i + 1 })}<textarea rows={5} value={block.punkte.map(rowText).join("\n")} onChange={event => update(i, { ...block, punkte: event.target.value.split("\n").map(textInline) })} /></label><p className="field-help">{t("Ein Listenpunkt pro Zeile.")}</p></>
      : <BlockReader block={block} />}
  </fieldset>)}<div className="button-row"><Button disabled={disabled || blocks.length >= 1000} onClick={() => onChange([...blocks, { kind: "absatz", inhalt: textInline("") }])}><Plus size={15} /> {t("Absatz hinzufügen")}</Button><Button disabled={disabled || blocks.length >= 1000} onClick={() => onChange([...blocks, { kind: "liste", geordnet: false, punkte: [textInline("")] }])}>{t("Liste hinzufügen")}</Button><Button disabled={disabled || blocks.length >= 1000} onClick={() => onChange([...blocks, { kind: "feld", schluessel: "datum", label: "Datum", mehrwertig: false, klauselKandidat: false, werte: [textInline("")] }])}>{t("Feld hinzufügen")}</Button></div></div>;
}

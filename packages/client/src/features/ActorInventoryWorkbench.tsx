// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ItemCard, ItemContract, ItemState, LootRarityValue, TemplateCard } from "@chronicle/protocol";
import { LOOT_RARITIES } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { PackageOpen } from "lucide-react";
import { apiPath, errorText, type EntrySummary, type WikiMedienBestand } from "../api";
import { plural, t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { Lootkarte, seltenheitText } from "./Lootkarte";
import { speicherstats } from "./speicherstats";
import { uebergabeplan } from "./beute";
import { Geldzaehler } from "./Geldzaehler";
import { WikiMedien } from "./WikiMedien";
import "./actors.css";
import "./character-creation.css";

function useTemplateDraft(onDirty: (value: boolean) => void) {
  const [epoch, setEpoch] = useState(0), [dirty, setDirty] = useState(false);
  const active = useRef(0), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const report = useCallback((value: boolean) => {
    if (mounted.current && active.current === epoch) { setDirty(value); onDirty(value); }
  }, [epoch, onDirty]);
  const reset = () => { active.current++; setEpoch(active.current); setDirty(false); onDirty(false); };
  return { epoch, dirty, report, reset, current: () => mounted.current && active.current === epoch };
}
function LoreField({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (value: string | null) => void }) {
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  return <label>{t("Artikel zur Figur oder zum Gegenstand")}<select value={value ?? ""} onChange={event => onChange(event.target.value || null)}>
    <option value="">{t("Ohne Artikelverknüpfung")}</option>{entries.data?.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
  </select>{entries.error ? <span role="alert">{entries.error}</span> : null}</label>;
}
function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>{t("Grund der Änderung")}<input required maxLength={500} value={value} onChange={event => onChange(event.target.value)} /></label>;
}
function RevisionPicker({ head, value, onChange }: { head: number; value: number; onChange: (value: number) => void }) {
  return <label>{t("Revision ansehen")}<select value={value} onChange={event => onChange(Number(event.target.value))}>
    {Array.from({ length: head }, (_, index) => head - index).map(number => <option key={number} value={number}>{number === head ? t("Revision {nummer} (aktuell)", { nummer: number }) : t("Revision {nummer}", { nummer: number })}</option>)}
  </select></label>;
}

function ItemTemplateRevisionView({ campaignId, templateId, revisionNumber }: { campaignId: string; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ItemContract>>(apiPath(campaignId, `/item-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  return <section className="panel"><h2>{definition?.name ?? t("Revision {nummer}", { nummer: revisionNumber })}</h2>
    <p className="field-help">{t("Frühere Revision, schreibgeschützt. Eine neue Revision entsteht nur, wenn die aktuelle Vorlage überarbeitet wird.")}</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <Lootkarte definition={definition} campaignId={campaignId} />
      <p>{t("Etiketten · {etiketten}", { etiketten: definition.tags.length ? definition.tags.join(" · ") : t("Keine") })}</p>
      <fieldset disabled><legend>{t("Verknüpfter Artikel")}</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
    </div> : null}
  </section>;
}
export function ItemTemplates({ campaignId, revision, onChanged, onDirty, onOpenInventory }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void; onOpenInventory?: () => void }) {
  const templates = useResource<TemplateCard<ItemContract>[]>(apiPath(campaignId, "/item-templates"), revision);
  const [selected, setSelected] = useState<TemplateCard<ItemContract> | null>(null);
  const [viewRevision, setViewRevision] = useState<number | null>(null);
  const [query, setQuery] = useState(""), [saved, setSaved] = useState(false);
  const { epoch, dirty, report, reset, current } = useTemplateDraft(onDirty);
  const choose = (card: TemplateCard<ItemContract> | null) => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setSelected(card); setViewRevision(null); setSaved(false); reset(); };
  const pickRevision = (number: number) => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setViewRevision(number); reset(); };
  const visible = templates.data?.filter(card => `${card.definition.name} ${card.definition.tags.join(" ")}`.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de"))) ?? [];
  return <div className="actor-columns actor-template-workspace"><section className="panel actor-template-library"><h2>{t("Deine Kartenvorlagen")}</h2><p className="field-help">{t("Gestalte eine Karte einmal und erzeuge daraus beliebig viele Exemplare. Bereits vergebene Karten behalten ihre bisherige Fassung.")}</p><Button variant="primary" onClick={() => choose(null)}>{t("Neue Lootkarte")}</Button>
    {templates.data?.length ? <label>{t("Lootkarten suchen")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Name oder Stichwort")} /></label> : null}
    {saved ? <Notice>{t("Die Karte wurde gespeichert.")}{onOpenInventory ? <Button variant="quiet" onClick={onOpenInventory}>{t("Jetzt Exemplar erzeugen")}</Button> : null}</Notice> : null}
    {templates.error ? <Notice error>{templates.error}</Notice> : null}{templates.loading ? <Loading /> : !templates.data?.length ? <p className="field-help">{t("Deine erste Karte beginnt mit einem Namen. Bild, Seltenheit und Beschreibung kannst du direkt im Formular gestalten.")}</p> : !visible.length ? <p className="field-help">{t("Keine Karte zu „{suche}“ gefunden.", { suche: query })}</p> : null}
    <ul className="actor-object-list">{visible.map(card => <li key={card.id}><Button aria-pressed={selected?.id === card.id} onClick={() => choose(card)}>{card.definition.name}<small>{t("{angabe} · Revision {revision}", { angabe: card.definition.schemaVersion === 2 ? seltenheitText(card.definition.seltenheit) : t("Ohne Kartengesicht"), revision: card.revision })}</small></Button></li>)}</ul>
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={pickRevision} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ItemTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} templateId={selected.id} revisionNumber={viewRevision} />
    : <ItemTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} original={selected} onDirty={report} onSaved={(archived) => { if (current()) { setSelected(null); setViewRevision(null); reset(); setSaved(!archived); } onChanged(); }} />}</div>;
}
function ItemTemplateForm({ campaignId, original, onDirty, onSaved }: { campaignId: string; original: TemplateCard<ItemContract> | null; onDirty: (value: boolean) => void; onSaved: (archived?: boolean) => void }) {
  const previous = original?.definition, face = previous?.schemaVersion === 2 ? previous : null;
  const [name, setName] = useState(previous?.name ?? ""), [tags, setTags] = useState(previous?.tags.join(", ") ?? ""), [lore, setLore] = useState(previous?.loreEntryId ?? null), [reason, setReason] = useState("");
  const [rarity, setRarity] = useState<LootRarityValue>(face?.seltenheit ?? "gewoehnlich");
  const [category, setCategory] = useState(face?.kategorie ?? ""), [description, setDescription] = useState(face?.spruch ?? "");
  const [image, setImage] = useState<string | null>(face?.bildAssetId ?? null);
  const [rows, setRows] = useState<{ label: string; wert: string }[]>(face ? face.zeilen.map(row => ({ ...row })) : []);
  const [mediaOpen, setMediaOpen] = useState(false), [mediaRevision, setMediaRevision] = useState(0);
  const [formDirty, setFormDirty] = useState(false), [mediaDirty, setMediaDirty] = useState(false);
  const inventory = useResource<WikiMedienBestand>(apiPath(campaignId, "/wiki-medien"), mediaRevision);
  const task = useTask(), command = useCommand();
  useEffect(() => { onDirty(formDirty || mediaDirty); }, [formDirty, mediaDirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const completeRows = rows.filter(row => row.label.trim() && row.wert.trim()).map(row => ({ label: row.label.trim(), wert: row.wert.trim() }));
  const incompleteRows = rows.some(row => Boolean(row.label.trim()) !== Boolean(row.wert.trim()));
  const draft: ItemContract = { schemaVersion: 2, name: name.trim() || t("Deine Lootkarte"), loreEntryId: lore,
    tags: [...new Set(tags.split(",").map(value => value.trim()).filter(Boolean))],
    seltenheit: rarity, kategorie: category.trim(), bildAssetId: image, spruch: description.trim(), zeilen: completeRows };
  const updateRow = (index: number, patch: Partial<{ label: string; wert: string }>) => { setRows(old => old.map((row, i) => i === index ? { ...row, ...patch } : row)); setFormDirty(true); };
  if (mediaOpen) return <section className="loot-media-editor"><p className="field-help">{t("Dein Kartenentwurf bleibt erhalten. Nach dem Hochladen kannst du das Bild auf deiner Karte auswählen.")}</p><WikiMedien campaignId={campaignId} embedded closeLabel={t("Zurück zur Lootkarte")} onDirty={setMediaDirty} onClose={() => {
    if (mediaDirty && !window.confirm(t("Ausgewählte, noch nicht hochgeladene Datei verwerfen?"))) return;
    setMediaOpen(false); setMediaDirty(false); setMediaRevision(value => value + 1);
  }} /></section>;
  return <div className="loot-editor-layout"><form className="panel loot-template-form" onChange={() => setFormDirty(true)} onSubmit={event => { event.preventDefault(); if (incompleteRows || !name.trim()) return; void task.run(async () => {
    await command(apiPath(campaignId, `/item-templates${original ? `/${original.id}` : ""}`), { definition: draft, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST"); setFormDirty(false); onDirty(false); onSaved();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? t("Lootkarte überarbeiten") : t("Lootkarte erstellen")}</h2>
    <p className="field-help">{t("Ein Name genügt für den Anfang. Die Vorschau zeigt jede Änderung sofort.")}</p>
    <label>{t("Gegenstandsname")}<input required maxLength={160} value={name} placeholder={t("z. B. Trank der Morgenröte")} onChange={event => setName(event.target.value)} /></label>
    <div className="loot-basic-fields">
      <label>{t("Art des Gegenstands")}<input value={category} maxLength={80} placeholder={t("z. B. Werkzeug, Waffe, Trank")} onChange={event => setCategory(event.target.value)} /></label>
      <label>{t("Seltenheit")}<select value={rarity} onChange={event => setRarity(event.target.value as LootRarityValue)}>
        {LOOT_RARITIES.map(level => <option key={level} value={level}>{seltenheitText(level)}</option>)}</select></label>
    </div>
    <label>{t("Kartenbild")}<select value={image ?? ""} onChange={event => setImage(event.target.value || null)}>
      <option value="">{t("Ohne Bild")}</option>
      {inventory.data?.assets.filter(asset => asset.vorhanden || asset.id === face?.bildAssetId)
        .map(asset => <option key={asset.id} value={asset.id}>{asset.dateiname}{asset.vorhanden ? "" : ` — ${t("Datei fehlt")}`}</option>)}</select></label>
    <Button variant="quiet" onClick={() => setMediaOpen(true)}>{t("Bild hochladen oder Bestand öffnen")}</Button>
    {inventory.error ? <Notice error>{inventory.error}</Notice> : null}
    {inventory.data && !inventory.data.assets.some(asset => asset.vorhanden) ? <p className="field-help">{t("Noch kein Bild vorhanden. Du kannst jetzt eines hochladen oder die Karte zunächst ohne Bild speichern.")}</p> : null}
    <label>{t("Beschreibung auf der Karte")}<textarea value={description} maxLength={600} rows={3} placeholder={t("Was macht diesen Gegenstand besonders?")} onChange={event => setDescription(event.target.value)} /></label>
    <details className="actor-optional" open={rows.length > 0}><summary>{t("Werte auf der Karte · optional")}</summary><fieldset className="sheet-section"><legend>{t("Eigenschaften und Werte")}</legend>
      <p className="field-help">{t("Zum Beispiel „Heilung: 2W6“ oder „Gewicht: 1 kg“. Diese Angaben stehen auf der Karte; sie lösen keine automatischen Würfelmodifikatoren aus.")}</p>
      {rows.map((row, index) => <div className="loot-value-row" key={index}>
        <label>{t("Bezeichnung")}<input value={row.label} maxLength={40} onChange={event => updateRow(index, { label: event.target.value })} /></label>
        <label>{t("Wert")}<input value={row.wert} maxLength={120} onChange={event => updateRow(index, { wert: event.target.value })} /></label>
        <Button aria-label={t("Zeile {nummer} entfernen", { nummer: index + 1 })} onClick={() => { setRows(old => old.filter((_, i) => i !== index)); setFormDirty(true); }}>{t("Entfernen")}</Button>
      </div>)}
      {rows.length < 8 ? <Button onClick={() => { setRows(old => [...old, { label: "", wert: "" }]); setFormDirty(true); }}>{t("Zeile hinzufügen")}</Button> : <p className="field-help">{t("Bis zu acht Werte passen auf die Karte.")}</p>}
      {incompleteRows ? <p className="field-help" role="status">{t("Ergänze in jeder begonnenen Zeile Bezeichnung und Wert oder entferne die Zeile.")}</p> : null}
    </fieldset></details>
    <details className="actor-optional" open={!!tags || !!lore}><summary>{t("Stichwörter & Artikel · optional")}</summary>
      <label>{t("Etiketten, durch Komma getrennt")}<input value={tags} maxLength={2592} placeholder={t("z. B. Heilung, Alchemie")} onChange={event => setTags(event.target.value)} /></label><LoreField campaignId={campaignId} value={lore} onChange={setLore} />
    </details>
    {original ? <><p className="field-help">{t("Du speicherst eine neue Fassung. Bereits erzeugte Exemplare behalten ihre bisherige Karte.")}</p><Reason value={reason} onChange={setReason} /></> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <div className="loot-save-actions"><Button type="submit" variant="primary" disabled={task.busy || !name.trim() || incompleteRows}>{task.busy ? t("Wird gespeichert …") : original ? t("Neue Fassung speichern") : t("Lootkarte speichern")}</Button></div>
    {original ? <details className="actor-optional"><summary>{t("Vorlage archivieren")}</summary><p className="field-help">{t("Vorhandene Gegenstände und frühere Fassungen bleiben erhalten.")}</p><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm(t("Gegenstandsvorlage archivieren? Vorhandene Gegenstände bleiben erhalten."))) void task.run(async () => {
      await command(apiPath(campaignId, `/item-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); setFormDirty(false); onDirty(false); onSaved(true);
    }); }}>{t("Gegenstandsvorlage archivieren")}</Button></details> : null}
  </fieldset></form><aside className="loot-live-preview" aria-label={t("Live-Vorschau der Lootkarte")}><h3>{t("Deine Karte")}</h3><p className="field-help">{t("Vorschau · noch nicht gespeichert")}</p><Lootkarte definition={draft} campaignId={campaignId} /><p className="field-help">{t("Nach dem Speichern findest du die Vorlage in deiner Sammlung. Unter „Exemplare & Vorrat“ wird daraus Beute für deine Runde.")}</p></aside></div>;
}

export function Inventory({ campaignId, actorId, actors, gm, revision, onChanged, onDirty, onCreateTemplate }: { campaignId: string; actorId: string; actors: ActorCard[]; gm: boolean; revision: number; onChanged: () => void; onDirty: (value: boolean) => void; onCreateTemplate?: () => void }) {
  const [selectedHolder, setSelectedHolder] = useState(actorId), [selected, setSelected] = useState(""), [dirtyParts, setDirtyParts] = useState({ item: false, money: false });
  const dirty = dirtyParts.item || dirtyParts.money;
  const report = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, item: value })), []);
  const reportMoney = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, money: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => { setSelectedHolder(actorId); setSelected(""); }, [actorId]);
  const stock = selectedHolder === "";
  const holder = stock ? null : selectedHolder;
  const items = useResource<ItemCard[]>(stock ? (gm ? apiPath(campaignId, "/items") : null) : apiPath(campaignId, `/actors/${encodeURIComponent(selectedHolder)}/items`), revision);
  const filtered = items.data?.filter(item => item.holderActorId === holder) ?? [];
  const chosen = filtered.find(item => item.id === selected);
  const templates = useResource<TemplateCard<ItemContract>[]>(gm ? apiPath(campaignId, "/item-templates") : null, revision);
  const [templateId, setTemplateId] = useState(""); const task = useTask(), command = useCommand();
  const openActor = actors.find(actor => actor.id === selectedHolder);
  const playerCharacters = actors.filter(actor => actor.kind === "player_character");
  const otherActors = actors.filter(actor => actor.kind !== "player_character");
  const chooseHolder = (value: string) => { if (value === selectedHolder) return; if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; setSelectedHolder(value); setSelected(""); setDirtyParts({ item: false, money: false }); };
  return <section className="inventory-section"><div className="page-heading"><h2>{stock ? t("Vorrat der Spielleitung") : openActor ? t("Inventar · {name}", { name: openActor.name }) : t("Inventar")}</h2>
      <label className="inventar-wahl">{t("Inventar")}<select value={selectedHolder} onChange={event => chooseHolder(event.target.value)}>
        {gm ? <option value="">{t("Vorrat der Spielleitung")}</option> : null}
        {playerCharacters.length ? <optgroup label={t("Figuren")}>{playerCharacters.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</optgroup> : null}
        {otherActors.length ? <optgroup label={t("Behälter und Begleitung")}>{otherActors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}{actor.kind === "vehicle" ? ` · ${t("Fahrzeug")}` : ""}</option>)}</optgroup> : null}
      </select></label></div>
    {items.error || task.error ? <Notice error>{items.error || task.error}</Notice> : null}
    {gm && stock ? <Speicherstand items={items.data ?? []} actors={actors} /> : null}
    {!stock ? <Geldzaehler key={selectedHolder} campaignId={campaignId} actorId={selectedHolder} gm={gm} revision={revision} onChanged={onChanged} onDirty={reportMoney} /> : null}
    {gm && filtered.length ? <Beuteuebergabe campaignId={campaignId} items={filtered} quelle={holder} actors={actors}
      busy={task.busy || dirtyParts.item} onChanged={() => { setSelected(""); onChanged(); }} /> : null}
    {gm && !templates.loading && !templates.error && !templates.data?.length ? <div className="panel actor-empty-hint"><h3>{t("Zuerst eine Lootkarte gestalten")}</h3><p>{t("Speichere eine Kartenvorlage in der Schmiede. Danach kannst du hier ein Exemplar in den Vorrat oder in ein Figureninventar legen.")}</p>{onCreateTemplate ? <Button variant="primary" onClick={onCreateTemplate}>{t("Lootkarte erstellen")}</Button> : null}</div> : null}
    {gm && templates.data?.length ? <form className="panel inventory-create" onSubmit={event => { event.preventDefault(); if (dirtyParts.item && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; const card = templates.data?.find(entry => entry.id === templateId); if (card) void task.run(async () => {
      const item = await command<ItemCard>(apiPath(campaignId, "/items/instantiate"), { templateId: card.id, templateRevision: card.revision, holderActorId: holder }); setSelected(item.id); onChanged();
    }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h3>{t("Ein Exemplar erzeugen")}</h3><p className="field-help">{t("Das Exemplar erhält eine eigene Menge, Notizen und einen Besitzer. Du kannst dieselbe Vorlage mehrfach verwenden.")}</p><label>{t("Gegenstand aus Vorlage")}<select required value={templateId} onChange={event => setTemplateId(event.target.value)}><option value="">{t("Kartenvorlage wählen")}</option>{templates.data?.map(card => <option key={card.id} value={card.id}>{t("{angabe} · Revision {revision}", { angabe: card.definition.name, revision: card.revision })}</option>)}</select></label>
      <Button type="submit" variant="primary" disabled={task.busy || !templateId}>{t("Gegenstand hinzufügen")}</Button>{onCreateTemplate ? <Button variant="quiet" onClick={onCreateTemplate}>{t("Neue Lootkarte gestalten")}</Button> : null}</fieldset></form> : null}
    {templates.error ? <Notice error>{templates.error}</Notice> : null}
    <div className="actor-columns"><div>{items.loading ? <Loading /> : filtered.length ? <ul className="lootkarten-reihe lootkarten-wahl">{filtered.map(item => <li key={item.id}>
      <button type="button" aria-pressed={selected === item.id} className={selected === item.id ? "lootkarte-wahl gewaehlt" : "lootkarte-wahl"}
        onClick={() => { if (selected === item.id) return; if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { setSelected(item.id); report(false); } }}>
        <Lootkarte definition={item.definition} campaignId={campaignId} klein />
        <span className="lootkarte-instanz">{item.state.quantity}×{item.state.equipped ? ` · ${t("Ausgerüstet")}` : ""}</span>
      </button></li>)}</ul> : <p className="muted">{t("Hier liegen noch keine Gegenstände.")}</p>}</div>
      {chosen ? <fieldset className="actor-command-fields" disabled={task.busy}><ItemEditor key={chosen.id} campaignId={campaignId} current={chosen} actors={actors} gm={gm} onDirty={report} onChanged={onChanged} /></fieldset> : null}</div>
  </section>;
}

function Beuteuebergabe({ campaignId, items, quelle, actors, busy, onChanged }: {
  campaignId: string; items: ItemCard[]; quelle: string | null; actors: ActorCard[]; busy: boolean; onChanged: () => void;
}) {
  const VORRAT = "__vorrat";
  const [choice, setChoice] = useState("");
  const [report, setReport] = useState<{ uebergeben: number; fehler: { name: string; grund: string }[] } | null>(null);
  const task = useTask(), command = useCommand();
  const target = choice === VORRAT ? null : choice || "";
  const plan = choice ? uebergabeplan(items, target) : [];
  const targetName = choice === VORRAT ? t("den Vorrat der Spielleitung") : actors.find(actor => actor.id === choice)?.name ?? "";
  const transfer = () => task.run(async () => {
    const errors: { name: string; grund: string }[] = [];
    let transferred = 0;
    for (const item of plan) {
      try {
        await command(apiPath(campaignId, `/items/${encodeURIComponent(item.id)}/custody`),
          { expectedVersion: item.expectedVersion, holderActorId: target, reason: "Beute übernommen" });
        transferred += 1;
      } catch (error) { errors.push({ name: item.name, grund: errorText(error) }); }
    }
    setReport({ uebergeben: transferred, fehler: errors }); setChoice(""); onChanged();
  });
  return <section className="panel beute-uebergabe">
    <div className="section-heading"><h3><PackageOpen size={17} /> {t("Beute übernehmen")}</h3></div>
    <p className="field-help">{t("Übergibt alles aus diesem Inventar auf einmal — was am Ziel schon liegt, bleibt unangetastet.")}</p>
    <div className="button-row"><label className="inventar-wahl">{t("Ziel")}<select value={choice} disabled={busy || task.busy} onChange={event => { setChoice(event.target.value); setReport(null); }}>
      <option value="">{t("Wohin?")}</option>{quelle !== null ? <option value={VORRAT}>{t("Vorrat der Spielleitung")}</option> : null}
      {actors.filter(actor => actor.id !== quelle).map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
      <Button variant="primary" disabled={busy || task.busy || !plan.length} onClick={() => void transfer()}>{plan.length ? plural(plan.length, "{n} Stück an {ziel} übergeben", "{n} Stücke an {ziel} übergeben", { ziel: targetName }) : t("Nichts zu übergeben")}</Button>
    </div>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {report ? <Notice error={report.fehler.length > 0}>{plural(report.uebergeben, "{n} Stück übergeben", "{n} Stücke übergeben")}{report.fehler.length ? t(", {anzahl} nicht:", { anzahl: report.fehler.length }) : "."}{report.fehler.length ? <ul>{report.fehler.map(row => <li key={row.name}>{row.name} — {row.grund}</li>)}</ul> : null}</Notice> : null}
  </section>;
}

function Speicherstand({ items, actors }: { items: ItemCard[]; actors: ActorCard[] }) {
  const state = speicherstats(items, actors);
  if (!state.vorlagen) return <p className="muted">{t("Noch ist nichts im Bestand.")}</p>;
  return <section className="panel speicherstand"><h3>{t("Speicherstand")}</h3>
    <p className="field-help">{t("{vorlagen} Vorlagen · {karten} Karten · {stuecke} Stücke — davon {imVorrat} im Vorrat und {vergeben} vergeben.", { vorlagen: state.vorlagen, karten: state.karten, stuecke: state.stuecke, imVorrat: state.imVorratStuecke, vergeben: state.vergebeneStuecke })}</p>
    <div className="speicherstand-tafel"><table><thead><tr><th scope="col">{t("Lootkarte")}</th><th scope="col">{t("Im Vorrat")}</th><th scope="col">{t("Vergeben an")}</th><th scope="col">{t("Gesamt")}</th></tr></thead>
      <tbody>{state.zeilen.map(row => <tr key={row.templateId}><th scope="row">{row.name}{row.seltenheit ? <small> · {seltenheitText(row.seltenheit)}</small> : null}</th><td>{row.imVorratStuecke}</td><td>{row.vergeben.length ? row.vergeben.map(value => `${value.name} (${value.stuecke})`).join(", ") : <span className="muted">{t("niemandem")}</span>}</td><td>{row.stuecke}{row.karten !== row.stuecke ? <small> {t("in {karten} Karten", { karten: row.karten })}</small> : null}</td></tr>)}</tbody>
    </table></div>
  </section>;
}

function ItemEditor({ campaignId, current, actors, gm, onDirty, onChanged }: { campaignId: string; current: ItemCard; actors: ActorCard[]; gm: boolean; onDirty: (value: boolean) => void; onChanged: () => void }) {
  const [baseline, setBaseline] = useState(current), [state, setState] = useState<ItemState>(current.state), [holder, setHolder] = useState(current.holderActorId ?? ""), [reason, setReason] = useState("");
  const task = useTask(), command = useCommand();
  const dirty = JSON.stringify(state) !== JSON.stringify(baseline.state) || holder !== (baseline.holderActorId ?? "") || !!reason;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const replace = (item: ItemCard) => { setBaseline(item); setState(item.state); setHolder(item.holderActorId ?? ""); setReason(""); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  return <form className="panel" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    const saved = await command<ItemCard>(apiPath(campaignId, `/items/${baseline.id}`), { expectedVersion: baseline.version, state, reason }, "PUT"); replace(saved); onChanged();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h3>{baseline.definition.name}</h3><p className="field-help">{t("Vorlagenrevision {revision} · {etiketten}", { revision: baseline.template.revision, etiketten: baseline.definition.tags.join(" · ") })}</p>
    <Lootkarte definition={baseline.definition} campaignId={campaignId} />
    {current.version > baseline.version ? <Notice>{t("Der Gegenstand wurde inzwischen geändert.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) replace(current); }}>{t("Aktuellen Gegenstand übernehmen")}</Button></Notice> : null}
    <label>{t("Menge")}<input type="number" min={1} max={1_000_000} step={1} required value={state.quantity} onChange={event => setState(old => ({ ...old, quantity: event.target.valueAsNumber }))} /></label>
    <label>{t("Notizen")}<textarea maxLength={4000} value={state.notes} onChange={event => setState(old => ({ ...old, notes: event.target.value }))} /></label>
    <label className="check-label"><input type="checkbox" checked={state.equipped} onChange={event => setState(old => ({ ...old, equipped: event.target.checked }))} /> {t("Ausgerüstet")}</label><Reason value={reason} onChange={setReason} />
    {task.error ? <Notice error>{task.error}</Notice> : null}<Button type="submit" disabled={task.busy}>{t("Gegenstand speichern")}</Button>
    {gm ? <fieldset><legend>{t("Besitz zuordnen")}</legend><label>{t("Träger")}<select value={holder} onChange={event => setHolder(event.target.value)}><option value="">{t("Vorrat der Spielleitung")}</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
      <p className="field-help">{t("Die Zuordnung überträgt den gespeicherten Gegenstand. Ungespeicherte Änderungen zuerst speichern.")}</p>
      <Button disabled={task.busy || !reason.trim() || JSON.stringify(state) !== JSON.stringify(baseline.state)} onClick={() => void task.run(async () => {
        const saved = await command<ItemCard>(apiPath(campaignId, `/items/${baseline.id}/custody`), { expectedVersion: baseline.version, holderActorId: holder || null, reason }); replace(saved); onChanged();
      })}>{t("Besitz übertragen")}</Button><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm(t("Gegenstand archivieren? Sein bisheriger Verlauf bleibt erhalten."))) void task.run(async () => {
        await command(apiPath(campaignId, `/items/${baseline.id}/archive`), { expectedVersion: baseline.version, reason }); onDirty(false); onChanged();
      }); }}>{t("Gegenstand archivieren")}</Button>
    </fieldset> : null}
  </fieldset></form>;
}

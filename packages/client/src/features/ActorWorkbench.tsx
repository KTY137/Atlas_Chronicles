import { useCallback, useEffect, useRef, useState } from "react";
import type { ActorCard, ActorKindValue, ActorTemplateData, ControllerCard, ItemCard, ItemContract, ItemState, LootRarityValue, TemplateCard } from "@chronicle/protocol";
import { LOOT_RARITIES } from "@chronicle/protocol";
import { Lootkarte, SELTENHEIT_TEXT } from "./Lootkarte";
import { speicherstats } from "./speicherstats";
import type { Scalar } from "@chronicle/rules";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type EntrySummary, type Member, type WikiMedienBestand } from "../api";
import { useResource, useTask } from "../hooks";
import { defaults, useCommand, type RulesState } from "./game-api";
import { RuleFields } from "./RuleFields";
import "./actors.css";

const kinds: Record<ActorKindValue, string> = { player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug" };
type View = "actors" | "templates" | "item-templates";
// A completed request belongs to the editor that submitted it, even when the user
// deliberately navigates to a different draft before its response arrives.
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
export function ActorWorkbench({ campaignId, gm, actorId, actors, roster, rules, revision, onChanged, onDirty }: {
  campaignId: string; gm: boolean; actorId: string; actors: ActorCard[]; roster: Member[]; rules: RulesState;
  revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [view, setView] = useState<View>("actors"), [dirtyParts, setDirtyParts] = useState({ details: false, inventory: false, templates: false });
  const dirty = Object.values(dirtyParts).some(Boolean);
  const reportDetails = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, details: value })), []);
  const reportInventory = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, inventory: value })), []);
  const reportTemplates = useCallback((value: boolean) => setDirtyParts(old => ({ ...old, templates: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const selected = actors.find(a => a.id === actorId);
  const createSelect = useRef<HTMLSelectElement>(null);
  return <div className="actor-workbench">
    {gm ? <div className="view-tabs" aria-label="Figurenverwaltung">{([
      ["actors", "Figuren & Besitz"], ["templates", "Figurvorlagen"], ["item-templates", "Gegenstandsvorlagen"],
    ] as const).map(([id, label]) => <Button key={id} aria-pressed={view === id} onClick={() => {
      if (view === id) return;
      if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
      setView(id); setDirtyParts({ details: false, inventory: false, templates: false });
    }}>{label}</Button>)}</div> : null}
    {view === "templates" && gm ? <ActorTemplates campaignId={campaignId} rules={rules} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
      : view === "item-templates" && gm ? <ItemTemplates campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={reportTemplates} />
      : <><div className="actor-columns">{selected ? <ActorDetails key={selected.id} campaignId={campaignId} current={selected} gm={gm} roster={roster} revision={revision} onChanged={onChanged} onDirty={reportDetails} />
        : gm ? <EmptyState title="Noch keine Figur ausgewählt." action={<Button variant="primary" onClick={() => createSelect.current?.focus()}>Figur erschaffen</Button>}>Du musst nicht warten, bis jemand beitritt: Als Spielleitung legst du selbst eine Figurvorlage an und erschaffst daraus direkt eine eigenständige Figur.</EmptyState>
        : <EmptyState title="Noch keine Figur ausgewählt.">Die Spielleitung legt Figurvorlagen an und erschafft daraus eigenständige Figuren.</EmptyState>}
        {gm ? <InstantiateActor campaignId={campaignId} revision={revision} onChanged={onChanged} selectRef={createSelect} /> : null}</div>
        <Inventory key={`${actorId}:${gm}`} campaignId={campaignId} actorId={actorId} actors={actors} gm={gm} revision={revision} onChanged={onChanged} onDirty={reportInventory} />
      </>}
  </div>;
}

function LoreField({ campaignId, value, onChange }: { campaignId: string; value: string | null; onChange: (value: string | null) => void }) {
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  return <label>Artikel zur Figur oder zum Gegenstand<select value={value ?? ""} onChange={e => onChange(e.target.value || null)}>
    <option value="">Ohne Artikelverknüpfung</option>{entries.data?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
  </select>{entries.error ? <span role="alert">{entries.error}</span> : null}</label>;
}
function Reason({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>Grund der Änderung<input required maxLength={500} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
function RevisionPicker({ head, value, onChange }: { head: number; value: number; onChange: (value: number) => void }) {
  return <label>Revision ansehen<select value={value} onChange={e => onChange(Number(e.target.value))}>
    {Array.from({ length: head }, (_, i) => head - i).map(n => <option key={n} value={n}>{n === head ? `Revision ${n} (aktuell)` : `Revision ${n}`}</option>)}
  </select></label>;
}
function ActorTemplateRevisionView({ campaignId, rules, templateId, revisionNumber }: { campaignId: string; rules: RulesState; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ActorTemplateData>>(apiPath(campaignId, `/actor-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  const pkg = definition ? rules.packages.find(p => p.id === definition.package.id && p.version === definition.package.version) : undefined;
  return <section className="panel"><h2>{definition?.name ?? `Revision ${revisionNumber}`}</h2>
    <p className="field-help">Frühere Revision, schreibgeschützt. Eine neue Revision entsteht nur, wenn die aktuelle Vorlage überarbeitet wird.</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <p>Art der Figur · {kinds[definition.kind]}</p>
      <fieldset disabled><legend>Verknüpfter Artikel</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
      <p>Regelpaket der Anfangswerte · {definition.package.id} · {definition.package.version}</p>
      {pkg ? <fieldset><legend>Anfangswerte dieser Revision</legend><RuleFields fields={pkg.fields} values={definition.fields} onChange={() => {}} disabled /></fieldset> : <Notice error>Das Regelpaket dieser Revision ist nicht mehr verfügbar.</Notice>}
    </div> : null}
  </section>;
}
function ActorTemplates({ campaignId, rules, revision, onChanged, onDirty }: {
  campaignId: string; rules: RulesState; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void;
}) {
  const list = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState<TemplateCard<ActorTemplateData> | null>(null);
  const [viewRevision, setViewRevision] = useState<number | null>(null);
  const { epoch, dirty, report, reset, current } = useTemplateDraft(onDirty);
  const choose = (value: TemplateCard<ActorTemplateData> | null) => {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setSelected(value); setViewRevision(null); reset();
  };
  const pickRevision = (n: number) => {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setViewRevision(n); reset();
  };
  return <div className="actor-columns"><section className="panel"><h2>Figurvorlagen</h2><p className="field-help">Jede Revision behält ihre Anfangswerte. Bereits erschaffene Figuren ändern sich durch eine neue Vorlage nicht.</p>
    <Button onClick={() => choose(null)}>Neue Figurvorlage</Button>{list.error ? <Notice error>{list.error}</Notice> : null}
    <ul className="actor-object-list">{list.data?.map(t => <li key={t.id}><Button aria-pressed={selected?.id === t.id} onClick={() => choose(t)}>{t.definition.name} · Revision {t.revision}</Button></li>)}</ul>
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={pickRevision} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ActorTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} rules={rules} templateId={selected.id} revisionNumber={viewRevision} />
    : <ActorTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} rules={rules} original={selected} onDirty={report} onSaved={() => { if (current()) { setSelected(null); setViewRevision(null); reset(); } onChanged(); }} />}</div>;
}
function ActorTemplateForm({ campaignId, rules, original, onDirty, onSaved }: {
  campaignId: string; rules: RulesState; original: TemplateCard<ActorTemplateData> | null; onDirty: (dirty: boolean) => void; onSaved: () => void;
}) {
  const [name, setName] = useState(original?.definition.name ?? ""), [kind, setKind] = useState<ActorKindValue>(original?.definition.kind ?? "npc");
  const [lore, setLore] = useState(original?.definition.loreEntryId ?? null), [reason, setReason] = useState("");
  const [pin, setPin] = useState(original?.definition.package ?? rules.pin);
  const pkg = rules.packages.find(p => p.id === pin.id && p.version === pin.version);
  const [fields, setFields] = useState<Record<string, Scalar>>(original?.definition.fields ?? (pkg ? defaults(pkg.fields) : {}));
  const task = useTask(), command = useCommand();
  useEffect(() => () => onDirty(false), [onDirty]);
  const definition: ActorTemplateData = { schemaVersion: 1, name, kind, loreEntryId: lore, package: pin, fields };
  return <form className="panel" onChange={() => onDirty(true)} onSubmit={event => { event.preventDefault(); void task.run(async () => {
    await command(apiPath(campaignId, `/actor-templates${original ? `/${encodeURIComponent(original.id)}` : ""}`),
      { definition, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST");
    onDirty(false); onSaved();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? "Neue Vorlagenrevision" : "Figurvorlage anlegen"}</h2>
    <label>Vorlagenname<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Art der Figur<select value={kind} onChange={e => setKind(e.target.value as ActorKindValue)}>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <LoreField campaignId={campaignId} value={lore} onChange={setLore} />
    <label>Regelpaket für die Anfangswerte<select value={`${pin.id}@${pin.version}`} onChange={e => {
      const p = rules.packages.find(p => `${p.id}@${p.version}` === e.target.value)!; setPin({ id: p.id, version: p.version }); setFields(defaults(p.fields));
    }}>{rules.packages.map(p => <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>{p.name} · {p.version}</option>)}</select></label>
    {pkg ? <fieldset><legend>Anfangswerte</legend><RuleFields fields={pkg.fields} values={fields} onChange={setFields} /></fieldset> : <Notice error>Das gespeicherte Regelpaket ist nicht verfügbar.</Notice>}
    {original ? <Reason value={reason} onChange={setReason} /> : null}
    {task.error ? <Notice error>{task.error} Lade die Vorlage erneut, falls inzwischen eine neue Revision gespeichert wurde.</Notice> : null}
    <Button type="submit" variant="primary" disabled={task.busy || !pkg}>{original ? "Revision speichern" : "Figurvorlage speichern"}</Button>
    {original ? <Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => {
      if (window.confirm("Vorlage archivieren? Vorhandene Figuren und Revisionen bleiben erhalten.")) void task.run(async () => {
        await command(apiPath(campaignId, `/actor-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); onDirty(false); onSaved();
      });
    }}>Vorlage archivieren</Button> : null}
  </fieldset></form>;
}
function InstantiateActor({ campaignId, revision, onChanged, selectRef }: { campaignId: string; revision: number; onChanged: () => void; selectRef?: { current: HTMLSelectElement | null } }) {
  const templates = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState(""), [name, setName] = useState(""); const task = useTask(), command = useCommand();
  const template = templates.data?.find(t => t.id === selected);
  return <form className="panel" onSubmit={event => { event.preventDefault(); if (template) void task.run(async () => {
    await command(apiPath(campaignId, "/actors/instantiate"), { templateId: template.id, templateRevision: template.revision, ...(name.trim() ? { name } : {}) }); setName(""); onChanged();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>Figur aus Vorlage erschaffen</h2><label>Figurvorlage<select ref={selectRef} required value={selected} onChange={e => setSelected(e.target.value)}><option value="">Vorlage wählen</option>{templates.data?.map(t => <option key={t.id} value={t.id}>{t.definition.name} · Revision {t.revision}</option>)}</select></label>
    <label>Name dieser Figur<input maxLength={160} value={name} placeholder={template?.definition.name ?? "Name aus der Vorlage"} onChange={e => setName(e.target.value)} /></label>
    <p className="field-help">Die neue Figur erhält einen eigenen Bogen. Die Vorlage muss die aktuell aktiven Kampagnenregeln verwenden.</p>
    {task.error || templates.error ? <Notice error>{task.error || templates.error}</Notice> : null}<Button type="submit" disabled={task.busy || !template}>Figur erschaffen</Button>
  </fieldset></form>;
}
function ActorDetails({ campaignId, current, gm, roster, revision, onChanged, onDirty }: {
  campaignId: string; current: ActorCard; gm: boolean; roster: Member[]; revision: number; onChanged: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [baseline, setBaseline] = useState(current), [name, setName] = useState(current.name), [kind, setKind] = useState<ActorKindValue>(current.kind === "unspecified" ? "npc" : current.kind);
  const [lore, setLore] = useState(current.loreEntryId), [reason, setReason] = useState(""), [user, setUser] = useState("");
  const controllers = useResource<ControllerCard[]>(gm ? apiPath(campaignId, `/actors/${current.id}/controllers`) : null, revision);
  const task = useTask(), command = useCommand();
  const dirty = name !== baseline.name || lore !== baseline.loreEntryId || (baseline.kind !== "unspecified" && kind !== baseline.kind) || !!reason;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const replace = (a: ActorCard) => { setBaseline(a); setName(a.name); setKind(a.kind === "unspecified" ? "npc" : a.kind); setLore(a.loreEntryId); setReason(""); };
  const newer = current.version !== null && baseline.version !== null && current.version > baseline.version;
  useEffect(() => { if (!gm || (!dirty && newer)) replace(current); }, [current, dirty, newer, gm]);
  const controlledBy = [...new Set((controllers.data ?? []).filter(c => c.revokedAt === null).map(c => {
    const m = roster.find(r => r.userId === c.userId); return !m ? "Ehemaliges Mitglied" : m.role === "leitung" ? "Spielleitung" : m.displayName;
  }))].join(", ") || "Spielleitung";
  return <section className="panel actor-details"><h2>{baseline.name}</h2><p className="field-help">{baseline.kind === "unspecified" ? "Bestehende Figur" : kinds[baseline.kind]}{baseline.template ? ` · Vorlage, Revision ${baseline.template.revision}` : " · Individuelle Figur"}</p>
    <p className="field-help">{gm ? `Gesteuert von: ${controlledBy}` : "Du steuerst diese Figur."}</p>
    {newer ? <Notice>Die Figur wurde inzwischen geändert. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) replace(current); }}>Aktuelle Figur übernehmen</Button></Notice> : null}
    {gm ? <><form onSubmit={event => { event.preventDefault(); void task.run(async () => {
      const saved = await command<ActorCard>(apiPath(campaignId, `/actors/${baseline.id}`), { expectedVersion: baseline.version, name, kind, loreEntryId: lore, reason }, "PUT"); replace(saved); onChanged();
    }); }}><fieldset className="actor-command-fields" disabled={task.busy}><label>Figurenname<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Art der Figur<select value={kind} onChange={e => setKind(e.target.value as ActorKindValue)}>{Object.entries(kinds).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <LoreField campaignId={campaignId} value={lore} onChange={setLore} /><Reason value={reason} onChange={setReason} />
      <div className="button-row"><Button type="submit" disabled={task.busy}>Figur speichern</Button><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => {
        if (window.confirm("Figur archivieren? Neue Handlungen enden; historische Belege bleiben erhalten.")) void task.run(async () => {
          await command(apiPath(campaignId, `/actors/${baseline.id}/archive`), { expectedVersion: baseline.version, reason }); onDirty(false); onChanged();
        });
      }}>Figur archivieren</Button></div>
    </fieldset></form><fieldset disabled={task.busy}><legend>Kontrolle vergeben</legend><p className="field-help">Verantwortliche können den Bogen bearbeiten, mit dieser Figur handeln und ihren Wissensblick wählen. Ein Zugriff auf bereits vorhandenes Wissen und empfangene Briefe gehört dazu.</p>
      <label>Mitglied<select value={user} onChange={e => setUser(e.target.value)}><option value="">Mitglied wählen</option>{roster.filter(m => m.role !== "beobachter").map(m => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}</select></label>
      <Button disabled={task.busy || !user || !reason.trim()} onClick={() => void task.run(async () => {
        await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${user}`), { expectedVersion: controllers.data?.find(c => c.userId === user)?.version ?? 0, reason }, "PUT"); onChanged();
      })}>Kontrolle erlauben</Button>
      <ul className="actor-object-list">{controllers.data?.filter(c => c.revokedAt === null).map(c => <li key={c.userId}><span>{roster.find(m => m.userId === c.userId)?.displayName ?? "Ehemaliges Mitglied"}</span><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => void task.run(async () => {
        await command(apiPath(campaignId, `/actors/${baseline.id}/controllers/${c.userId}/revoke`), { expectedVersion: c.version, reason }); onChanged();
      })}>Kontrolle entziehen</Button></li>)}</ul>{controllers.error ? <Notice error>{controllers.error}</Notice> : null}
    </fieldset></> : <p>Deinen Bogen und deine Handlungen findest du in den benachbarten Tischansichten.</p>}
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}

function ItemTemplateRevisionView({ campaignId, templateId, revisionNumber }: { campaignId: string; templateId: string; revisionNumber: number }) {
  const shown = useResource<TemplateCard<ItemContract>>(apiPath(campaignId, `/item-templates/${encodeURIComponent(templateId)}?revision=${revisionNumber}`));
  const definition = shown.data?.definition;
  return <section className="panel"><h2>{definition?.name ?? `Revision ${revisionNumber}`}</h2>
    <p className="field-help">Frühere Revision, schreibgeschützt. Eine neue Revision entsteht nur, wenn die aktuelle Vorlage überarbeitet wird.</p>
    {shown.loading ? <Loading /> : null}{shown.error ? <Notice error>{shown.error}</Notice> : null}
    {definition ? <div className="actor-command-fields">
      <Lootkarte definition={definition} campaignId={campaignId} />
      <p>Etiketten · {definition.tags.length ? definition.tags.join(" · ") : "Keine"}</p>
      <fieldset disabled><legend>Verknüpfter Artikel</legend><LoreField campaignId={campaignId} value={definition.loreEntryId} onChange={() => {}} /></fieldset>
    </div> : null}
  </section>;
}
function ItemTemplates({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const templates = useResource<TemplateCard<ItemContract>[]>(apiPath(campaignId, "/item-templates"), revision);
  const [selected, setSelected] = useState<TemplateCard<ItemContract> | null>(null);
  const [viewRevision, setViewRevision] = useState<number | null>(null);
  const { epoch, dirty, report, reset, current } = useTemplateDraft(onDirty);
  const choose = (t: TemplateCard<ItemContract> | null) => { if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; setSelected(t); setViewRevision(null); reset(); };
  const pickRevision = (n: number) => { if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; setViewRevision(n); reset(); };
  return <div className="actor-columns"><section className="panel"><h2>Gegenstandsvorlagen</h2><p className="field-help">Vorlagen beschreiben einen Gegenstand. Menge, Notizen und Träger gehören jeweils zu einer eigenständigen Instanz.</p><Button onClick={() => choose(null)}>Neue Gegenstandsvorlage</Button>
    {templates.error ? <Notice error>{templates.error}</Notice> : null}<ul className="actor-object-list">{templates.data?.map(t => <li key={t.id}><Button aria-pressed={selected?.id === t.id} onClick={() => choose(t)}>{t.definition.name} · Revision {t.revision}</Button></li>)}</ul>
    {selected ? <RevisionPicker head={selected.revision} value={viewRevision ?? selected.revision} onChange={pickRevision} /> : null}
  </section>{selected && viewRevision !== null && viewRevision !== selected.revision
    ? <ItemTemplateRevisionView key={`${selected.id}:${viewRevision}`} campaignId={campaignId} templateId={selected.id} revisionNumber={viewRevision} />
    : <ItemTemplateForm key={`${selected?.id ?? "new"}:${epoch}`} campaignId={campaignId} original={selected} onDirty={report} onSaved={() => { if (current()) { setSelected(null); setViewRevision(null); reset(); } onChanged(); }} />}</div>;
}
function ItemTemplateForm({ campaignId, original, onDirty, onSaved }: { campaignId: string; original: TemplateCard<ItemContract> | null; onDirty: (value: boolean) => void; onSaved: () => void }) {
  const vorher = original?.definition, gesicht = vorher?.schemaVersion === 2 ? vorher : null;
  const [name, setName] = useState(vorher?.name ?? ""), [tags, setTags] = useState(vorher?.tags.join(", ") ?? ""), [lore, setLore] = useState(vorher?.loreEntryId ?? null), [reason, setReason] = useState("");
  const [seltenheit, setSeltenheit] = useState<LootRarityValue>(gesicht?.seltenheit ?? "gewoehnlich");
  const [kategorie, setKategorie] = useState(gesicht?.kategorie ?? ""), [spruch, setSpruch] = useState(gesicht?.spruch ?? "");
  const [bild, setBild] = useState<string | null>(gesicht?.bildAssetId ?? null);
  const [zeilen, setZeilen] = useState<{ label: string; wert: string }[]>(gesicht ? gesicht.zeilen.map(z => ({ ...z })) : []);
  const bestand = useResource<WikiMedienBestand>(apiPath(campaignId, "/wiki-medien"));
  const task = useTask(), command = useCommand(); useEffect(() => () => onDirty(false), [onDirty]);
  // Nur vollstaendige Zeilen werden geschickt: eine halb ausgefuellte Zeile ist keine Aussage.
  const fertigeZeilen = zeilen.filter(z => z.label.trim() && z.wert.trim()).map(z => ({ label: z.label.trim(), wert: z.wert.trim() }));
  const entwurf: ItemContract = { schemaVersion: 2, name: name || "Ohne Namen", loreEntryId: lore,
    tags: [...new Set(tags.split(",").map(t => t.trim()).filter(Boolean))],
    seltenheit, kategorie: kategorie.trim(), bildAssetId: bild, spruch: spruch.trim(), zeilen: fertigeZeilen };
  const setzeZeile = (i: number, teil: Partial<{ label: string; wert: string }>) => { setZeilen(alt => alt.map((z, n) => n === i ? { ...z, ...teil } : z)); onDirty(true); };
  return <form className="panel" onChange={() => onDirty(true)} onSubmit={event => { event.preventDefault(); void task.run(async () => {
    await command(apiPath(campaignId, `/item-templates${original ? `/${original.id}` : ""}`), { definition: entwurf, ...(original ? { expectedVersion: original.version, reason } : {}) }, original ? "PUT" : "POST"); onDirty(false); onSaved();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{original ? "Neue Gegenstandsrevision" : "Gegenstandsvorlage anlegen"}</h2>
    <label>Gegenstandsname<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Etiketten, durch Komma getrennt<input value={tags} maxLength={2592} onChange={e => setTags(e.target.value)} /></label><LoreField campaignId={campaignId} value={lore} onChange={setLore} />
    <p className="field-help">Diese Angaben beschreiben den Gegenstand; sie lösen keine automatischen Würfelmodifikatoren aus.</p>
    <h3>Das Kartengesicht</h3>
    <div className="rule-fields">
      <label>Seltenheit<select value={seltenheit} onChange={e => setSeltenheit(e.target.value as LootRarityValue)}>
        {LOOT_RARITIES.map(stufe => <option key={stufe} value={stufe}>{SELTENHEIT_TEXT[stufe]}</option>)}</select></label>
      <label>Art<input value={kategorie} maxLength={80} placeholder="z. B. Werkzeug, Waffe, Trank" onChange={e => setKategorie(e.target.value)} /></label>
    </div>
    {/* Das Bild kommt aus dem vorhandenen Bildbestand der Chronik — kein zweiter Bilderspeicher. */}
    <label>Bild aus dem Bildbestand<select value={bild ?? ""} onChange={e => setBild(e.target.value || null)}>
      <option value="">Ohne Bild</option>
      {bestand.data?.assets.map(asset => <option key={asset.id} value={asset.id}>{asset.dateiname}</option>)}</select></label>
    <label>Spruch auf der Karte<textarea value={spruch} maxLength={600} rows={2} onChange={e => setSpruch(e.target.value)} /></label>
    <fieldset className="sheet-section"><legend>Zeilen auf der Karte</legend>
      {zeilen.map((zeile, i) => <div className="rule-fields" key={i}>
        <label>Bezeichnung<input value={zeile.label} maxLength={40} onChange={e => setzeZeile(i, { label: e.target.value })} /></label>
        <label>Wert<input value={zeile.wert} maxLength={120} onChange={e => setzeZeile(i, { wert: e.target.value })} /></label>
        <Button onClick={() => { setZeilen(alt => alt.filter((_, n) => n !== i)); onDirty(true); }}>Zeile entfernen</Button>
      </div>)}
      {zeilen.length < 8 ? <Button onClick={() => { setZeilen(alt => [...alt, { label: "", wert: "" }]); onDirty(true); }}>Zeile hinzufügen</Button> : <p className="field-help">Mehr als acht Zeilen trägt die Karte nicht.</p>}
    </fieldset>
    {/* Lebende Vorschau: wer eine Karte baut, soll die Karte sehen, nicht ein Formular erraten. */}
    <div className="lootkarte-vorschau"><p className="field-help">So sieht die Karte aus:</p><Lootkarte definition={entwurf} campaignId={campaignId} /></div>
    {original ? <Reason value={reason} onChange={setReason} /> : null}{task.error ? <Notice error>{task.error}</Notice> : null}
    <Button type="submit" variant="primary" disabled={task.busy}>{original ? "Gegenstandsrevision speichern" : "Gegenstandsvorlage speichern"}</Button>
    {original ? <Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm("Gegenstandsvorlage archivieren? Vorhandene Gegenstände bleiben erhalten.")) void task.run(async () => {
      await command(apiPath(campaignId, `/item-templates/${original.id}/archive`), { expectedVersion: original.version, reason }); onDirty(false); onSaved();
    }); }}>Gegenstandsvorlage archivieren</Button> : null}
  </fieldset></form>;
}

export function Inventory({ campaignId, actorId, actors, gm, revision, onChanged, onDirty }: { campaignId: string; actorId: string; actors: ActorCard[]; gm: boolean; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [stock, setStock] = useState(false), [selected, setSelected] = useState(""), [dirty, setDirty] = useState(false);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const holder = stock && gm ? null : actorId || null;
  const items = useResource<ItemCard[]>(gm && stock ? apiPath(campaignId, "/items") : actorId ? apiPath(campaignId, `/actors/${actorId}/items`) : null, revision);
  const filtered = items.data?.filter(i => i.holderActorId === holder) ?? [];
  const chosen = filtered.find(i => i.id === selected);
  const templates = useResource<TemplateCard<ItemContract>[]>(gm ? apiPath(campaignId, "/item-templates") : null, revision);
  const [templateId, setTemplateId] = useState(""); const task = useTask(), command = useCommand();
  return <section className="inventory-section"><div className="page-heading"><h2>{stock && gm ? "Vorrat der Spielleitung" : "Inventar der Figur"}</h2>{gm ? <Button aria-pressed={stock} onClick={() => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) { setStock(v => !v); setSelected(""); report(false); } }}>{stock ? "Zur Figur" : "Vorrat öffnen"}</Button> : null}</div>
    {items.error || task.error ? <Notice error>{items.error || task.error}</Notice> : null}
    {/* Der Vorrat allein zeigt nur den Tresor. Der Speicherstand beantwortet die andere Frage:
        wo ist der Loot? Er rechnet aus der Liste, die hier ohnehin schon geholt wurde. */}
    {gm && stock ? <Speicherstand items={items.data ?? []} actors={actors} /> : null}
    {gm ? <form className="panel inventory-create" onSubmit={event => { event.preventDefault(); if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; const t = templates.data?.find(t => t.id === templateId); if (t) void task.run(async () => {
      const item = await command<ItemCard>(apiPath(campaignId, "/items/instantiate"), { templateId: t.id, templateRevision: t.revision, holderActorId: holder }); setSelected(item.id); onChanged();
    }); }}><fieldset className="actor-command-fields" disabled={task.busy}><label>Gegenstand aus Vorlage<select required value={templateId} onChange={e => setTemplateId(e.target.value)}><option value="">Gegenstandsvorlage wählen</option>{templates.data?.map(t => <option key={t.id} value={t.id}>{t.definition.name} · Revision {t.revision}</option>)}</select></label><Button type="submit" disabled={task.busy || !templateId || (!stock && !actorId)}>Gegenstand hinzufügen</Button>{templates.error ? <Notice error>{templates.error}</Notice> : null}</fieldset></form> : null}
    <div className="actor-columns"><div>{items.loading ? <Loading /> : filtered.length ? <ul className="lootkarten-reihe lootkarten-wahl">{filtered.map(i => <li key={i.id}>
      {/* Der Bestand liest sich als Kartenblatt. Menge und Ausruestung stehen daneben: sie
          gehoeren zur INSTANZ, nicht zum Kartengesicht der Vorlage. */}
      <button type="button" aria-pressed={selected === i.id} className={selected === i.id ? "lootkarte-wahl gewaehlt" : "lootkarte-wahl"}
        onClick={() => { if (selected === i.id) return; if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) { setSelected(i.id); report(false); } }}>
        <Lootkarte definition={i.definition} campaignId={campaignId} klein />
        <span className="lootkarte-instanz">{i.state.quantity}×{i.state.equipped ? " · Ausgerüstet" : ""}</span>
      </button></li>)}</ul> : <p className="muted">Hier liegen noch keine Gegenstände.</p>}</div>
      {chosen ? <fieldset className="actor-command-fields" disabled={task.busy}><ItemEditor key={chosen.id} campaignId={campaignId} current={chosen} actors={actors} gm={gm} onDirty={report} onChanged={onChanged} /></fieldset> : null}</div>
  </section>;
}
/** Der Speicherstand als Tafel: erst die Summen, dann jede Karte mit ihrem Verbleib. */
function Speicherstand({ items, actors }: { items: ItemCard[]; actors: ActorCard[] }) {
  const stand = speicherstats(items, actors);
  if (!stand.vorlagen) return <p className="muted">Noch ist nichts im Bestand.</p>;
  return <section className="panel speicherstand">
    <h3>Speicherstand</h3>
    <p className="field-help">{stand.vorlagen} Vorlagen · {stand.karten} Karten · {stand.stuecke} Stücke —
      davon {stand.imVorratStuecke} im Vorrat und {stand.vergebeneStuecke} vergeben.</p>
    <div className="speicherstand-tafel"><table>
      <thead><tr><th scope="col">Karte</th><th scope="col">Im Vorrat</th><th scope="col">Vergeben an</th><th scope="col">Gesamt</th></tr></thead>
      <tbody>{stand.zeilen.map(zeile => <tr key={zeile.templateId}>
        <th scope="row">{zeile.name}{zeile.seltenheit ? <small> · {SELTENHEIT_TEXT[zeile.seltenheit]}</small> : null}</th>
        <td>{zeile.imVorratStuecke}</td>
        <td>{zeile.vergeben.length
          ? zeile.vergeben.map(v => `${v.name} (${v.stuecke})`).join(", ")
          : <span className="muted">niemandem</span>}</td>
        <td>{zeile.stuecke}{zeile.karten !== zeile.stuecke ? <small> in {zeile.karten} Karten</small> : null}</td>
      </tr>)}</tbody>
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
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h3>{baseline.definition.name}</h3><p className="field-help">Vorlagenrevision {baseline.template.revision} · {baseline.definition.tags.join(" · ")}</p>
    <Lootkarte definition={baseline.definition} campaignId={campaignId} />
    {current.version > baseline.version ? <Notice>Der Gegenstand wurde inzwischen geändert. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) replace(current); }}>Aktuellen Gegenstand übernehmen</Button></Notice> : null}
    <label>Menge<input type="number" min={1} max={1_000_000} step={1} required value={state.quantity} onChange={e => setState(s => ({ ...s, quantity: e.target.valueAsNumber }))} /></label>
    <label>Notizen<textarea maxLength={4000} value={state.notes} onChange={e => setState(s => ({ ...s, notes: e.target.value }))} /></label>
    <label className="check-label"><input type="checkbox" checked={state.equipped} onChange={e => setState(s => ({ ...s, equipped: e.target.checked }))} /> Ausgerüstet</label><Reason value={reason} onChange={setReason} />
    {task.error ? <Notice error>{task.error}</Notice> : null}<Button type="submit" disabled={task.busy}>Gegenstand speichern</Button>
    {gm ? <fieldset><legend>Besitz zuordnen</legend><label>Träger<select value={holder} onChange={e => setHolder(e.target.value)}><option value="">Vorrat der Spielleitung</option>{actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <p className="field-help">Die Zuordnung überträgt den gespeicherten Gegenstand. Ungespeicherte Änderungen zuerst speichern.</p>
      <Button disabled={task.busy || !reason.trim() || JSON.stringify(state) !== JSON.stringify(baseline.state)} onClick={() => void task.run(async () => {
        await command(apiPath(campaignId, `/items/${baseline.id}/custody`), { expectedVersion: baseline.version, holderActorId: holder || null, reason }); onDirty(false); onChanged();
      })}>Besitz übertragen</Button><Button variant="danger" disabled={task.busy || !reason.trim()} onClick={() => { if (window.confirm("Gegenstand archivieren? Sein bisheriger Verlauf bleibt erhalten.")) void task.run(async () => {
        await command(apiPath(campaignId, `/items/${baseline.id}/archive`), { expectedVersion: baseline.version, reason }); onDirty(false); onChanged();
      }); }}>Gegenstand archivieren</Button>
    </fieldset> : null}
  </fieldset></form>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState, type ReactNode } from "react";
import type { ActorCard, ActorTemplateData, TemplateCard } from "@chronicle/protocol";
import type { AnyRulePackage, PackagePin, RuleRuntime, Scalar } from "@chronicle/rules";
import { Button, Loading, Notice, StepList, ViewIntro, announce, confirmAction, focusHeading } from "@chronicle/ui";
import { api, apiPath, errorText } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { useCommand, type ActorSheet, type RulesState } from "./game-api";
import { useHostRules, type HostRuleEditorState } from "./useHostRules";
import { HostRuleFields } from "./HostRuleFields";
import { CharacterProgress } from "./CharacterProgress";
import { VitalBar } from "./Vitalanzeige";
import { displayRuleRuntime } from "./rule-runtime-display";
import { matchesRuleRuntime, ruleIdList } from "./rule-runtime-state";
import { Begriff } from "./Begriff";
import "./character-creation.css";

const FIGURENART_LABEL: Record<ActorTemplateData["kind"], string> = {
  player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug",
};

/**
 * Figur anlegen ist ein geführter Weg (E15, Kaya 2026-09-26): *Wer ist die Figur?* — *Was kann
 * sie?* — *Fertig*. Spielleitung (hier) und Figurantrag (`FigurAntrag.tsx`) teilen denselben Rahmen
 * `FigurWeg`, damit beide Wege gleich aussehen und sich gleich bedienen lassen.
 *
 * Der Rahmen bekommt den Inhalt des Schritts als `children`. So bleiben Name, Vorlage und Werte
 * Felder der aufrufenden Komponente — mit ihrem Entwurf, ihrem Schmutzmelder und ihren Tests.
 */
export type FigurSchritt = "wer" | "was" | "fertig";
const FIGUR_SCHRITTE: readonly FigurSchritt[] = ["wer", "was", "fertig"];
function schrittTitel(schritt: FigurSchritt): string {
  return schritt === "wer" ? t("Wer ist die Figur?") : schritt === "was" ? t("Was kann sie?") : t("Fertig");
}
const anzeigeWert = (wert: Scalar | undefined) => typeof wert === "boolean" ? wert ? t("Ja") : t("Nein") : String(wert ?? "");

export function FigurWeg({ idPrefix, schritt, onSchritt, sperre, absenden, busy, ebene = 3, vorschau, children }: {
  idPrefix: string; schritt: FigurSchritt; onSchritt: (schritt: FigurSchritt) => void;
  /** Warum es gerade nicht weitergeht; leer heißt frei. Steht sichtbar unter dem Knopf. */
  sperre: string; absenden: string; busy: boolean; ebene?: 3 | 4; vorschau: ReactNode; children: ReactNode;
}) {
  const index = FIGUR_SCHRITTE.indexOf(schritt), Titel = ebene === 3 ? "h3" : "h4", sperrId = `${idPrefix}-sperre`;
  const gehe = (ziel: FigurSchritt) => {
    onSchritt(ziel);
    focusHeading(`${idPrefix}-schritt`);
    announce(t("Schritt {nummer} von 3: {titel}", { nummer: FIGUR_SCHRITTE.indexOf(ziel) + 1, titel: schrittTitel(ziel) }));
  };
  const beschrieben = sperre ? sperrId : undefined;
  return <div className="figur-weg">
    <StepList className="figur-weg-schritte" label={t("Schritte zur Figur")} steps={FIGUR_SCHRITTE.map((id, i) => ({
      id, label: schrittTitel(id), state: i < index ? "done" as const : i === index ? "current" as const : "todo" as const, onSelect: i < index ? () => gehe(id) : undefined,
    }))} />
    <div className="figur-weg-raster">
      <div className="figur-weg-schritt">
        <Titel id={`${idPrefix}-schritt`} tabIndex={-1}>{schrittTitel(schritt)}</Titel>
        {children}
        <div className="figur-weg-knoepfe">
          {index > 0 ? <Button variant="quiet" onClick={() => gehe(FIGUR_SCHRITTE[index - 1]!)}>{t("Zurück")}</Button> : null}
          {/* Eigene Schlüssel: sonst verwendet React denselben Knopf weiter, der Klick auf „Weiter“ macht ihn
              noch während des Klicks zum Absende-Knopf, und der Browser legt die Figur ohne „Fertig“ an. */}
          {schritt === "fertig"
            ? <Button key="absenden" type="submit" variant="primary" disabled={busy || !!sperre} aria-describedby={beschrieben}>{absenden}</Button>
            : <Button key="weiter" variant="primary" disabled={!!sperre} aria-describedby={beschrieben} onClick={() => gehe(FIGUR_SCHRITTE[index + 1]!)}>{t("Weiter")}</Button>}
        </div>
        {sperre ? <p id={sperrId} className="figur-weg-sperre">{sperre}</p> : null}
      </div>
      {/* Breit steht die Vorschau daneben, schmal klappt sie unter „Bogen ansehen“ auf. Beide
          Hüllen tragen dieselbe, zustandslose Vorschau; das CSS zeigt je Breite genau eine. */}
      <aside className="figur-weg-seite" aria-label={t("Bogen ansehen")}>{vorschau}</aside>
      <details className="figur-weg-klapp"><summary>{t("Bogen ansehen")}</summary>{vorschau}</details>
    </div>
  </div>;
}

/** Die Live-Vorschau: so erscheint die Figur am Tisch. Sie rechnet nichts selbst, sie liest die Antwort des Hosts. */
export function FigurVorschau({ name, zeile, editor, source }: { name: string; zeile: string; editor: HostRuleEditorState; source?: AnyRulePackage | undefined }) {
  const display = editor.manifest ? displayRuleRuntime(editor.manifest, editor.error ? null : editor.preview, source) : null;
  const runtime = display?.runtime ?? null, preview = display?.preview?.valid ? display.preview : null;
  const werte = preview?.fields ?? editor.values ?? {};
  const kennzahlen = runtime?.computed.length
    ? runtime.computed.slice(0, 6).map(field => ({ id: field.id, label: field.label, wert: preview ? String(preview.computed[field.id] ?? "") : "" }))
    : Object.entries(runtime?.fields ?? {}).filter(([, field]) => field.type === "integer" || field.type === "number").slice(0, 6).map(([id, field]) => ({ id, label: field.label, wert: anzeigeWert(werte[id]) }));
  const gelernt = runtime?.abilityField ? ruleIdList(werte[runtime.abilityField]).map(id => runtime.abilities.find(row => row.id === id)?.name ?? id) : [];
  return <div className="figur-vorschau">
    <div className="figur-vorschau-kopf"><span className="creation-monogram" aria-hidden="true">{name.trim().slice(0, 1).toLocaleUpperCase() || "?"}</span>
      <div><strong>{name.trim() || t("Noch ohne Namen")}</strong><span>{zeile}</span></div></div>
    {editor.pending && !preview ? <p className="field-help">{t("Die Vorschau wird berechnet …")}</p> : null}
    {preview?.vitals.length ? <div className="figur-vorschau-balken">{preview.vitals.map(vital => <VitalBar key={vital.id} vital={vital} label={vital.label} />)}</div> : null}
    {kennzahlen.length ? <dl className="creation-stat-preview">{kennzahlen.map(zahl => <div key={zahl.id}><dt>{zahl.label}</dt><dd>{zahl.wert}</dd></div>)}</dl> : null}
    {gelernt.length ? <p className="figur-vorschau-text">{t("Gelernte Fähigkeiten: {liste}", { liste: gelernt.join(", ") })}</p> : null}
  </div>;
}

/** Schritt „Fertig“: was entsteht, was von der Vorlage abweicht, was gelernt ist. */
export function FigurZusammenfassung({ name, vorlage, editor, basis, source, wuenscheTitel }: {
  name: string; vorlage: string; editor: HostRuleEditorState; basis: Readonly<Record<string, Scalar>>; source?: AnyRulePackage | undefined; wuenscheTitel: string;
}) {
  const display = editor.manifest ? displayRuleRuntime(editor.manifest, editor.error ? null : editor.preview, source) : null;
  const runtime = display?.runtime ?? null, preview = display?.preview?.valid ? display.preview : null, werte = editor.values ?? {};
  const besonders = new Set(["name", runtime?.abilityField, runtime?.conditionField]);
  const geaendert = runtime ? Object.keys(werte).filter(key => !besonders.has(key) && runtime.fields[key] && !Object.is(werte[key], basis[key])) : [];
  const gelernt = runtime?.abilityField ? ruleIdList(werte[runtime.abilityField]).map(id => runtime.abilities.find(row => row.id === id)?.name ?? id) : [];
  return <div className="figur-zusammenfassung">
    <dl className="figur-zusammenfassung-kopf"><div><dt>{t("Name")}</dt><dd>{name}</dd></div><div><dt>{t("Figurvorlage")}</dt><dd>{vorlage}</dd></div></dl>
    {preview?.vitals.length ? <p className="figur-vorschau-text">{preview.vitals.map(vital => t("{name} {wert} von {maximum}", { name: vital.label, wert: vital.value, maximum: vital.maximum })).join(" · ")}</p> : null}
    {geaendert.length ? <><p>{wuenscheTitel}</p><dl className="creation-stat-preview figur-zusammenfassung-werte">{geaendert.map(key => <div key={key}><dt>{runtime!.fields[key]!.label}</dt><dd>{anzeigeWert(werte[key])}</dd></div>)}</dl></>
      : <p className="field-help">{t("Alle Anfangswerte bleiben wie in der Vorlage.")}</p>}
    {gelernt.length ? <p className="figur-vorschau-text">{t("Gelernte Fähigkeiten: {liste}", { liste: gelernt.join(", ") })}</p> : null}
  </div>;
}

/**
 * „Mit Beispiel beginnen“ (E12): eine gültige Figurvorlage „Beispielfigur“ aus den Vorgaben des
 * aktiven Regelwerks. Die Vorgaben kommen vom Host, nie aus einer Browserkopie des Pakets; der
 * Inhaltsabgleich (`packageContentHash`) ist derselbe wie beim Speichern im Vorlagenformular.
 */
export async function beispielvorlageAnlegen(campaignId: string, pin: PackagePin, command: ReturnType<typeof useCommand>): Promise<TemplateCard<ActorTemplateData>> {
  const runtime = await api<RuleRuntime>(apiPath(campaignId, `/rules/runtime?${new URLSearchParams({ packageId: pin.id, packageVersion: pin.version })}`));
  if (!matchesRuleRuntime(runtime, pin)) throw new Error(t("Die Regelantwort passt nicht zum aktuellen Entwurf. Bitte erneut laden."));
  const definition: ActorTemplateData = { schemaVersion: 1, name: t("Beispielfigur"), kind: "player_character", loreEntryId: null, package: pin, fields: { ...runtime.defaults } };
  return command<TemplateCard<ActorTemplateData>>(apiPath(campaignId, "/actor-templates"), { definition, packageContentHash: runtime.contentHash }, "POST");
}

/** Figur anlegen (Spielleitung): aus einer Figurvorlage, mit eigenem Namen und angepassten Werten. */
export function InstantiateActor({ campaignId, rules, initialTemplateId = "", revision, onChanged, selectRef, onDirty, onCreateTemplate, onOpenTable, ebene = 2 }: {
  campaignId: string; rules?: RulesState; initialTemplateId?: string; revision: number; onChanged: () => void;
  selectRef?: { current: HTMLSelectElement | null }; onDirty?: (dirty: boolean) => void; onCreateTemplate?: () => void; onOpenTable?: (actorId?: string) => void; ebene?: 2 | 3;
}) {
  const templates = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState(initialTemplateId), [name, setName] = useState(""), [created, setCreated] = useState(""), [createdId, setCreatedId] = useState("");
  const [werte, setWerte] = useState<Record<string, Scalar> | null>(null), [schritt, setSchritt] = useState<FigurSchritt>("wer"), [nachtrag, setNachtrag] = useState("");
  const task = useTask(), command = useCommand();
  const dirty = !!name.trim() || werte !== null;
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  // Eine einzige Vorlage ist keine Wahl: sie steht gleich im Feld.
  const einzige = templates.data?.length === 1 ? templates.data[0]!.id : "";
  useEffect(() => { if (!selected && einzige) setSelected(einzige); }, [selected, einzige]);
  const template = templates.data?.find(row => row.id === selected) ?? null;
  const pin = template?.definition.package ?? null;
  const source = pin ? rules?.packages.find(pkg => pkg.id === pin.id && pkg.version === pin.version) : undefined;
  const basis: Readonly<Record<string, Scalar>> = template?.definition.fields ?? {};
  // Der Name der Figur steht auch auf ihrem Bogen, wenn das Regelwerk ein Namensfeld führt.
  const nameFeld = source?.fields.name?.type === "string", eigenerName = name.trim();
  const entwurf = template ? { ...(werte ?? basis), ...(nameFeld && eigenerName ? { name: eigenerName } : {}) } : null;
  const runtime = useHostRules(campaignId, pin ?? { id: "none", version: "none" }, entwurf);
  const figurName = eigenerName || template?.definition.name || "";
  const zeile = template ? `${t(FIGURENART_LABEL[template.definition.kind])} · ${t("Vorlage „{name}“", { name: template.definition.name })}` : "";
  const ungueltig = runtime.error ? t("Die Regeln sind gerade nicht erreichbar. Lade sie über „Erneut laden“ neu.")
    : runtime.preview && !runtime.preview.valid ? t("Ein Wert passt noch nicht zu den Regeln. Die Meldung oben nennt ihn.") : "";
  const sperre = !template ? t("Wähle zuerst eine Figurvorlage.") : ungueltig
    || (schritt === "fertig" && !runtime.canSave ? t("Die Regeln prüfen die Werte noch …") : "");

  const zurueckAufVorgaben = () => void confirmAction({ title: t("Zurück auf die Vorgaben?"), message: t("Alle Werte gehen zurück auf die Vorgaben der Vorlage. Deine Änderungen daran gehen verloren."), confirmLabel: t("Werte zurücksetzen"), danger: true })
    .then(ok => { if (ok) setWerte(null); });
  const beispiel = () => { if (!rules) return; void task.run(async () => { const karte = await beispielvorlageAnlegen(campaignId, rules.pin, command); setSelected(karte.id); setWerte(null); onChanged(); }); };
  const anlegen = () => {
    if (!template || !runtime.canSave || !runtime.manifest || !runtime.preview?.fields) return;
    const felder = runtime.preview.fields, hash = runtime.manifest.contentHash;
    const abweichend = werte !== null || (nameFeld && !!eigenerName && basis.name !== eigenerName);
    void task.run(async () => {
      const actor = await command<ActorCard>(apiPath(campaignId, "/actors/instantiate"), { templateId: template.id, templateRevision: template.revision, ...(eigenerName ? { name: eigenerName } : {}) });
      setCreated(figurName); setCreatedId(actor.id); setName(""); setWerte(null); setSchritt("wer"); setNachtrag(""); onChanged();
      if (!abweichend) return;
      // Die Figur steht bereits. Geänderte Werte folgen als zweiter Befehl auf ihren eigenen Bogen;
      // scheitert er, wird nicht erneut angelegt, sondern gesagt, was noch fehlt.
      try {
        const bogen = apiPath(campaignId, `/actors/${encodeURIComponent(actor.id)}/sheet`);
        const sheet = await api<ActorSheet>(bogen);
        await api(bogen, { method: "PUT", body: { fields: felder, expectedVersion: sheet.version, packageContentHash: hash } });
        onChanged();
      } catch (error) {
        setNachtrag(t("„{name}“ ist angelegt, aber die geänderten Werte fehlen noch ({fehler}). Trage sie auf dem Bogen der Figur nach.", { name: figurName, fehler: errorText(error) }));
      }
    });
  };

  return <form className="panel creation-instantiate" onSubmit={event => {
    event.preventDefault();
    // Die Eingabetaste führt einen Schritt weiter; angelegt wird erst im Schritt „Fertig“.
    if (schritt !== "fertig") { if (!sperre) setSchritt(schritt === "wer" ? "was" : "fertig"); return; }
    anlegen();
  }}>
    <ViewIntro id="figur-anlegen-titel" level={ebene} title={t("Figur anlegen")} steps={[
      t("Wähle eine Figurvorlage und gib der Figur einen Namen."),
      t("Prüfe ihre Werte und passe sie an, wenn du magst."),
      t("Lege die Figur an. Danach findest du sie und ihren Bogen am Tisch."),
    ]}>{t("Hier machst du aus einer Figurvorlage eine eigene Figur für eure Runde. Name und Werte kannst du vorher anpassen.")}</ViewIntro>
    {nachtrag ? <Notice tone="warn">{nachtrag}</Notice> : null}
    {/* Nach dem Anlegen steht das Ergebnis mit genau einem nächsten Schritt. Vorher sprang der Weg
        sofort zurück auf „Wer ist die Figur?“ mit hervorgehobenem „Weiter“ — so entstanden Doppel. */}
    {created ? <div className="creation-saved creation-created" role="status">
      <div><strong>{t("„{name}“ ist angelegt.", { name: created })}</strong><p className="field-help">{t("Du findest die Figur und ihren Bogen am Tisch unter „Figuren“.")}</p></div>
      <div className="button-row">{onOpenTable ? <Button variant="primary" onClick={() => onOpenTable(createdId || undefined)}>{t("Zur Figur am Tisch")}</Button> : null}
        <Button variant={onOpenTable ? "default" : "primary"} onClick={() => { setCreated(""); setNachtrag(""); }}>{t("Noch eine Figur anlegen")}</Button></div>
    </div> : templates.loading ? <Loading /> : !templates.data?.length && !templates.error
      ? <div className="actor-empty-hint"><p>{t("Für eine Figur brauchst du eine Figurvorlage. Am schnellsten geht es mit der Beispielfigur deines Regelwerks; du kannst sie danach anpassen.")}</p>
        <div className="button-row"><Button variant="primary" disabled={!rules || task.busy} onClick={beispiel}>{task.busy ? t("Beispiel wird angelegt …") : t("Mit Beispiel beginnen")}</Button>
          {onCreateTemplate ? <Button onClick={onCreateTemplate}>{t("Eigene Figurvorlage anlegen")}</Button> : null}</div></div>
      : <fieldset className="actor-command-fields" disabled={task.busy}>
        <FigurWeg idPrefix="figur-anlegen" ebene={ebene === 2 ? 3 : 4} schritt={schritt} onSchritt={setSchritt} sperre={sperre} busy={task.busy}
          absenden={task.busy ? t("Figur wird angelegt …") : t("Figur anlegen")}
          vorschau={<FigurVorschau name={figurName} zeile={zeile} editor={runtime} source={source} />}>
          {schritt === "wer" ? <>
            <div className="creation-identity-fields">
              <label>{t("Aus welcher Figurvorlage?")}<select ref={selectRef} required value={selected} onChange={event => { setSelected(event.target.value); setWerte(null); setCreated(""); }}>
                <option value="">{t("Vorlage wählen")}</option>
                {templates.data?.map(row => <option key={row.id} value={row.id}>{row.definition.name}</option>)}</select></label>
              <label>{t("Name dieser Figur")}<input maxLength={160} value={name} placeholder={template?.definition.name ?? t("Name aus der Vorlage")} onChange={event => setName(event.target.value)} /></label>
            </div>
            <p className="field-help">{t("Ohne eigenen Namen heißt die Figur wie ihre Vorlage.")} <Begriff id="figurvorlage" /></p>
            {template ? <HostRuleFields state={runtime} source={source} onChange={setWerte} disabled={task.busy} part="identity" omit={["name"]} /> : null}
          </> : schritt === "was" ? <>
            <p className="field-help">{t("Die Werte kommen aus der Vorlage. Ändere, was für diese Figur anders sein soll.")}</p>
            {source && runtime.values ? <CharacterProgress pkg={source} fields={runtime.values} /> : null}
            <HostRuleFields state={runtime} source={source} onChange={setWerte} disabled={task.busy} part="values" omit={["name"]} />
            <div className="button-row"><Button variant="quiet" disabled={werte === null} onClick={zurueckAufVorgaben}>{t("Zurück auf die Vorgaben")}</Button></div>
          </> : <FigurZusammenfassung name={figurName} vorlage={template?.definition.name ?? ""} editor={runtime} basis={basis} source={source}
            wuenscheTitel={t("Diese Werte weichen von der Vorlage ab:")} />}
        </FigurWeg>
      </fieldset>}
    {task.error || templates.error ? <Notice error>{task.error || templates.error}</Notice> : null}
  </form>;
}

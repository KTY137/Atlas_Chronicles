import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, JSX } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Eye,
  Hash,
  Image as ImageIcon,
  Link2,
  List,
  ListChecks,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  FIELD_TYPES,
  INFOBOX_TEMPLATES,
  type FieldType,
  type InfoboxTemplateDef,
  type TemplateField,
} from "../infoboxFixture";

/**
 * Infobox Studio: Vorlagen als Formular, nicht als Code.
 *
 * World Anvil verlangt HTML+TWIG hinter einem Abo. Foundry verlangt
 * JavaScript. Hier gibt es Felder, Typen, Reihenfolge — und sonst nichts,
 * das ausgeführt werden könnte. `role="player"` zeigt dieselben Vorlagen nur
 * lesend; Bearbeiten bleibt der Spielleitung vorbehalten.
 */

/* ------------------------------------------------------------- Hilfen */

function cloneTemplates(): InfoboxTemplateDef[] {
  return INFOBOX_TEMPLATES.map((template) => ({
    ...template,
    fields: template.fields.map((field) => ({
      ...field,
      options: field.options ? [...field.options] : undefined,
      exampleItems: field.exampleItems ? [...field.exampleItems] : undefined,
    })),
  }));
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function nextFieldId(fields: TemplateField[]): string {
  const used = new Set(fields.map((f) => f.id));
  let n = fields.length + 1;
  while (used.has(`feld-${n}`)) n += 1;
  return `feld-${n}`;
}

function isFieldType(value: string): value is FieldType {
  return FIELD_TYPES.some((meta) => meta.id === value);
}

/** Räumt typ-spezifische Daten auf, wenn ein Feld den Typ wechselt. */
function retypeField(field: TemplateField, type: FieldType): TemplateField {
  if (type === field.type) return field;

  let example = field.example;
  let exampleItems = field.exampleItems;
  let options = field.options;
  let imageUrl = field.imageUrl;

  if (field.type === "liste" && exampleItems) {
    example = exampleItems.filter((item) => item.trim()).join(", ");
  }

  exampleItems = type === "liste" ? (example ? [example] : []) : undefined;

  if (type === "auswahl") {
    options = options && options.length > 0 ? options : ["Option A", "Option B"];
    if (!options.includes(example)) example = options[0] ?? "";
  } else {
    options = undefined;
  }

  if (type !== "bild") imageUrl = undefined;

  return { ...field, type, example, exampleItems, options, imageUrl };
}

/** Ob ein Feld für die Vorschau einen (auch nur teilweise gepflegten) Wert hat. */
function fieldHasValue(field: TemplateField): boolean {
  if (field.type === "liste") return (field.exampleItems ?? []).some((item) => item.trim().length > 0);
  if (field.type === "bild") return Boolean(field.imageUrl) || field.example.trim().length > 0;
  return field.example.trim().length > 0;
}

const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text: Type,
  zahl: Hash,
  datum: CalendarDays,
  auswahl: ListChecks,
  verweis: Link2,
  liste: List,
  bild: ImageIcon,
};

function FieldTypeIcon({ type }: { type: FieldType }): JSX.Element {
  const Icon = FIELD_TYPE_ICON[type];
  return <Icon size={13} />;
}

/* ---------------------------------------------------------------- Bühne */

export function InfoboxStudio({ role }: { role: "gm" | "player" }): JSX.Element {
  const readOnly = role === "player";
  const baseline = useRef<InfoboxTemplateDef[]>(cloneTemplates());
  const [templates, setTemplates] = useState<InfoboxTemplateDef[]>(() => cloneTemplates());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  const active = templates.find((t) => t.id === activeId) ?? null;
  const activeBaseline = baseline.current.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (!focusFieldId) return;
    const el = document.getElementById(`studio-label-${focusFieldId}`);
    if (el instanceof HTMLInputElement) el.focus();
    setFocusFieldId(null);
  }, [focusFieldId]);

  function patchTemplate(id: string, patch: (t: InfoboxTemplateDef) => InfoboxTemplateDef): void {
    setTemplates((prev) => prev.map((t) => (t.id === id ? patch(t) : t)));
  }

  function patchField(
    templateId: string,
    fieldId: string,
    patch: (f: TemplateField) => TemplateField,
  ): void {
    patchTemplate(templateId, (t) => ({
      ...t,
      fields: t.fields.map((f) => (f.id === fieldId ? patch(f) : f)),
    }));
  }

  function addField(templateId: string): void {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const id = nextFieldId(template.fields);
    patchTemplate(templateId, (t) => ({
      ...t,
      fields: [...t.fields, { id, label: "", type: "text", required: false, help: "", example: "" }],
    }));
    setFocusFieldId(id);
  }

  function removeField(templateId: string, fieldId: string): void {
    patchTemplate(templateId, (t) => ({ ...t, fields: t.fields.filter((f) => f.id !== fieldId) }));
  }

  function moveField(templateId: string, fieldId: string, direction: -1 | 1): void {
    patchTemplate(templateId, (t) => {
      const index = t.fields.findIndex((f) => f.id === fieldId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= t.fields.length) return t;
      return { ...t, fields: moveItem(t.fields, index, target) };
    });
  }

  return (
    <div className="stage-scroll">
      <div className="studio-wrap">
        <header>
          {active ? (
            <button
              type="button"
              className="chip"
              onClick={() => setActiveId(null)}
              style={{ marginBottom: 14 }}
            >
              <ArrowLeft size={11} />
              Zurück zum Regal
            </button>
          ) : null}
          <div className="eyebrow">Infobox Studio · Vorlagen ohne Code</div>
          <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
            {active ? active.name : "Vorlagen-Regal"}
          </h1>
          {!active ? (
            <p className="studio-lead">
              Jede Infobox ist eine Struktur aus Feldern — entworfen in einem
              Formular, von jemandem ohne Programmierkenntnisse. Wähle eine
              Vorlage, um ihre Felder zu {readOnly ? "sehen" : "bearbeiten"}.
            </p>
          ) : null}
        </header>

        <div className="studio-notice">
          <ShieldCheck size={16} aria-hidden="true" />
          <p>
            <strong>Vorlagen kennen hier keinen Code.</strong> Nur Felder, ihre
            Typen und ihre Reihenfolge — nichts, das im Browser oder auf einem
            Server ausgeführt wird. Das hält jede Vorlage lesbar, prüfbar und
            migrierbar, unabhängig davon, ob hier je jemand eine Zeile Code
            geschrieben hat.
          </p>
        </div>

        {active ? (
          <Editor
            template={active}
            baseline={activeBaseline}
            readOnly={readOnly}
            onPatchField={(fieldId, patch) => patchField(active.id, fieldId, patch)}
            onAddField={() => addField(active.id)}
            onRemoveField={(fieldId) => removeField(active.id, fieldId)}
            onMoveField={(fieldId, dir) => moveField(active.id, fieldId, dir)}
          />
        ) : (
          <Shelf templates={templates} readOnly={readOnly} onOpen={setActiveId} />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Regal */

interface ShelfProps {
  templates: InfoboxTemplateDef[];
  readOnly: boolean;
  onOpen: (id: string) => void;
}

function Shelf({ templates, readOnly, onOpen }: ShelfProps): JSX.Element {
  return (
    <div className="studio-shelf">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          className="card studio-template-card"
          aria-label={`Vorlage ${template.name} ${readOnly ? "ansehen" : "bearbeiten"}`}
          onClick={() => onOpen(template.id)}
        >
          <h3>{template.name}</h3>
          <p className="studio-template-summary">{template.summary}</p>
          <div className="studio-template-meta">
            <span className="chip">{template.fields.length} Felder</span>
            <span className="chip">{template.usageCount} Artikel</span>
          </div>
          <span className="studio-template-source">{template.sourceTemplate}</span>
          <span className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            {readOnly ? <Eye size={13} /> : <Pencil size={13} />}
            {readOnly ? "Ansehen" : "Bearbeiten"}
          </span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Editor */

interface EditorProps {
  template: InfoboxTemplateDef;
  baseline: InfoboxTemplateDef | null;
  readOnly: boolean;
  onPatchField: (fieldId: string, patch: (f: TemplateField) => TemplateField) => void;
  onAddField: () => void;
  onRemoveField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
}

function Editor({
  template,
  baseline,
  readOnly,
  onPatchField,
  onAddField,
  onRemoveField,
  onMoveField,
}: EditorProps): JSX.Element {
  const baselineFieldsById = new Map((baseline?.fields ?? []).map((f) => [f.id, f] as const));
  const newlyRequired =
    template.usageCount > 0
      ? template.fields.filter((f) => f.required && !(baselineFieldsById.get(f.id)?.required ?? false))
      : [];
  const currentIds = new Set(template.fields.map((f) => f.id));
  const removedFields = (baseline?.fields ?? []).filter((f) => !currentIds.has(f.id));
  const impactedIds = new Set(newlyRequired.map((f) => f.id));

  return (
    <div>
      <div className="studio-editor-head">
        <div className="studio-editor-title-row">
          <span className="chip accent">
            {template.usageCount} Artikel verwenden diese Vorlage bereits
          </span>
          <span className="studio-template-source">{template.sourceTemplate}</span>
          {readOnly ? (
            <span className="chip studio-readonly-chip">
              <Eye size={11} />
              Nur Ansicht — die Spielleitung bearbeitet Vorlagen
            </span>
          ) : null}
        </div>
        <p className="studio-lead" style={{ margin: 0 }}>
          {template.summary}
        </p>
      </div>

      <div className="studio-editor-grid" style={{ marginTop: 20 }}>
        <div>
          {!readOnly ? (
            <div className="studio-field-toolbar">
              <div className="studio-type-legend">
                {FIELD_TYPES.map((ft) => (
                  <span key={ft.id} className="chip" title={ft.hint}>
                    <FieldTypeIcon type={ft.id} />
                    {ft.label}
                  </span>
                ))}
              </div>
              <button type="button" className="btn btn-primary studio-add-field" onClick={onAddField}>
                <Plus size={13} />
                Feld hinzufügen
              </button>
            </div>
          ) : null}

          {!readOnly && newlyRequired.length > 0 ? (
            <div className="studio-migration" role="status">
              <TriangleAlert size={16} aria-hidden="true" />
              <div>
                <strong>
                  {template.usageCount} bestehende{template.usageCount === 1 ? "r" : ""} Artikel{" "}
                  {template.usageCount === 1 ? "ist" : "sind"} betroffen.
                </strong>
                <p>
                  {newlyRequired.length > 1 ? "Neue Pflichtfelder" : "Neues Pflichtfeld"}:{" "}
                  {newlyRequired.map((f) => `„${f.label || "(ohne Beschriftung)"}"`).join(", ")}.{" "}
                  {template.usageCount === 1
                    ? "Der bestehende Artikel hat"
                    : `Alle ${template.usageCount} bestehenden Artikel haben`}{" "}
                  aktuell keinen Wert dafür und gelten ab sofort als unvollständig, bis
                  jemand ihn nachträgt. Nichts wird automatisch geraten, ausgefüllt oder
                  gelöscht.
                </p>
              </div>
            </div>
          ) : null}

          {!readOnly && removedFields.length > 0 && template.usageCount > 0 ? (
            <p className="studio-removed-note">
              Entfernt seit dem Öffnen dieser Vorlage:{" "}
              {removedFields.map((f) => `„${f.label || "(ohne Beschriftung)"}"`).join(", ")}. Vorhandene
              Werte bleiben in den {template.usageCount} Artikeln erhalten, erscheinen aber nicht mehr
              in der Infobox.
            </p>
          ) : null}

          <div className="studio-field-list">
            {template.fields.length === 0 ? (
              <p className="studio-empty-note">Diese Vorlage hat noch keine Felder.</p>
            ) : (
              template.fields.map((field, index) =>
                readOnly ? (
                  <FieldReadRow key={field.id} field={field} />
                ) : (
                  <FieldEditorRow
                    key={field.id}
                    field={field}
                    index={index}
                    total={template.fields.length}
                    impacted={impactedIds.has(field.id)}
                    onPatch={(patch) => onPatchField(field.id, patch)}
                    onRemove={() => onRemoveField(field.id)}
                    onMove={(direction) => onMoveField(field.id, direction)}
                  />
                ),
              )
            )}
          </div>
        </div>

        <div className="studio-preview-column">
          <span className="studio-preview-label">Vorschau · so erscheint die Infobox im Artikel</span>
          <InfoboxPreview template={template} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Feld-Zeile */

interface FieldEditorRowProps {
  field: TemplateField;
  index: number;
  total: number;
  impacted: boolean;
  onPatch: (patch: (f: TemplateField) => TemplateField) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

function FieldEditorRow({
  field,
  index,
  total,
  impacted,
  onPatch,
  onRemove,
  onMove,
}: FieldEditorRowProps): JSX.Element {
  const [newOption, setNewOption] = useState("");
  const labelId = `studio-label-${field.id}`;
  const typeId = `studio-type-${field.id}`;
  const requiredCaptionId = `studio-required-${field.id}`;
  const helpId = `studio-help-${field.id}`;
  const exampleId = `studio-example-${field.id}`;
  const newOptionId = `studio-new-option-${field.id}`;
  const fieldName = field.label || "dieses Feld";

  function addOption(): void {
    const value = newOption.trim();
    if (!value) return;
    onPatch((f) => ({ ...f, options: [...(f.options ?? []), value] }));
    setNewOption("");
  }

  function removeOption(option: string): void {
    onPatch((f) => {
      const options = (f.options ?? []).filter((o) => o !== option);
      const example = f.example === option ? (options[0] ?? "") : f.example;
      return { ...f, options, example };
    });
  }

  return (
    <div className="card studio-field-row" data-impacted={impacted}>
      <div className="studio-field-top">
        <div className="studio-order-btns">
          <button
            type="button"
            className="studio-icon-btn"
            aria-label={`„${fieldName}" nach oben verschieben`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            className="studio-icon-btn"
            aria-label={`„${fieldName}" nach unten verschieben`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={13} />
          </button>
        </div>

        <span className="studio-type-icon" aria-hidden="true">
          <FieldTypeIcon type={field.type} />
        </span>

        <label htmlFor={labelId} className="sr-only">
          Beschriftung
        </label>
        <input
          id={labelId}
          className="studio-label-input"
          type="text"
          value={field.label}
          placeholder="Beschriftung des Feldes"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onPatch((f) => ({ ...f, label: event.target.value }))
          }
        />

        {impacted ? (
          <span className="chip danger" title="Neues Pflichtfeld — betrifft bestehende Artikel">
            <TriangleAlert size={11} />
            betrifft bestehende Artikel
          </span>
        ) : null}

        <button
          type="button"
          className="studio-icon-btn studio-remove-btn"
          aria-label={`Feld „${fieldName}" entfernen`}
          onClick={onRemove}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="studio-field-grid">
        <div className="studio-field-line">
          <label htmlFor={typeId} className="studio-caption">
            Typ
          </label>
          <select
            id={typeId}
            className="studio-select"
            value={field.type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const value = event.target.value;
              if (isFieldType(value)) onPatch((f) => retypeField(f, value));
            }}
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.label}
              </option>
            ))}
          </select>
        </div>

        <div className="studio-field-line">
          <span className="studio-caption" id={requiredCaptionId}>
            Pflicht
          </span>
          <div className="studio-required-toggle" role="group" aria-labelledby={requiredCaptionId}>
            <button
              type="button"
              aria-pressed={field.required}
              onClick={() => onPatch((f) => ({ ...f, required: true }))}
            >
              Pflicht
            </button>
            <button
              type="button"
              aria-pressed={!field.required}
              onClick={() => onPatch((f) => ({ ...f, required: false }))}
            >
              Optional
            </button>
          </div>
        </div>
      </div>

      {field.type === "auswahl" ? (
        <div className="studio-field-line">
          <span className="studio-caption">Optionen</span>
          <div className="studio-options-editor">
            {(field.options ?? []).map((option) => (
              <span key={option} className="studio-option-chip">
                {option}
                <button
                  type="button"
                  aria-label={`Option „${option}" entfernen`}
                  onClick={() => removeOption(option)}
                >
                  ×
                </button>
              </span>
            ))}
            <span className="studio-option-add">
              <label htmlFor={newOptionId} className="sr-only">
                Neue Option
              </label>
              <input
                id={newOptionId}
                type="text"
                placeholder="Neue Option"
                value={newOption}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewOption(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOption();
                  }
                }}
              />
              <button
                type="button"
                className="studio-icon-btn"
                aria-label="Option hinzufügen"
                onClick={addOption}
              >
                <Plus size={13} />
              </button>
            </span>
          </div>
        </div>
      ) : null}

      <div className="studio-field-line">
        <label htmlFor={helpId} className="studio-caption">
          Hilfetext
        </label>
        <input
          id={helpId}
          className="studio-text-input"
          type="text"
          value={field.help}
          placeholder="Erklärt Autor:innen, was hier hingehört."
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onPatch((f) => ({ ...f, help: event.target.value }))
          }
        />
      </div>

      <div className="studio-field-line">
        <label htmlFor={exampleId} className="studio-caption">
          {field.type === "liste"
            ? "Beispielwerte (eine Zeile pro Eintrag)"
            : field.type === "bild"
              ? "Bildunterschrift (Beispiel)"
              : "Beispielwert"}
        </label>
        {field.type === "liste" ? (
          <textarea
            id={exampleId}
            className="studio-textarea"
            value={(field.exampleItems ?? []).join("\n")}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onPatch((f) => ({ ...f, exampleItems: event.target.value.split("\n") }))
            }
          />
        ) : field.type === "auswahl" ? (
          <select
            id={exampleId}
            className="studio-select"
            value={field.example}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onPatch((f) => ({ ...f, example: event.target.value }))
            }
          >
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={exampleId}
            className="studio-text-input"
            type="text"
            value={field.example}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onPatch((f) => ({ ...f, example: event.target.value }))
            }
          />
        )}
      </div>

      {field.type === "verweis" ? (
        <p className="studio-field-help">
          <Link2 size={11} style={{ verticalAlign: -1 }} /> Erzeugt einen echten Backlink im
          verlinkten Artikel.
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------- Nur-Lesen-Zeile */

function FieldReadRow({ field }: { field: TemplateField }): JSX.Element {
  const typeLabel = FIELD_TYPES.find((ft) => ft.id === field.type)?.label ?? field.type;
  return (
    <div className="card studio-field-readrow">
      <span className="studio-type-icon" aria-hidden="true">
        <FieldTypeIcon type={field.type} />
      </span>
      <div className="studio-field-read-body">
        <div className="studio-field-read-head">
          <span>{field.label || "(ohne Beschriftung)"}</span>
          <span className="chip">{typeLabel}</span>
          {field.required ? <span className="chip accent">Pflichtfeld</span> : null}
        </div>
        {field.help ? <p className="studio-field-read-help">{field.help}</p> : null}
        {field.type === "verweis" ? (
          <p className="studio-field-read-help">Erzeugt einen echten Backlink im verlinkten Artikel.</p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Vorschau */

function InfoboxPreview({ template }: { template: InfoboxTemplateDef }): JSX.Element {
  const imageField = template.fields.find((f) => f.type === "bild");
  const rowFields = template.fields.filter(
    (f) => f.type !== "bild" && (fieldHasValue(f) || f.required),
  );

  return (
    <div className="studio-infobox">
      <div className="studio-infobox-title">{template.exampleArticle}</div>

      {imageField && imageField.imageUrl ? (
        <>
          <img
            className="studio-infobox-image"
            src={imageField.imageUrl}
            alt={imageField.example || template.exampleArticle}
          />
          {imageField.example ? <div className="studio-infobox-caption">{imageField.example}</div> : null}
        </>
      ) : imageField && (imageField.required || imageField.example) ? (
        <div className="studio-infobox-image-empty">
          <ImageIcon size={20} aria-hidden="true" />
          <span>{imageField.example || "Kein Bild hinterlegt"}</span>
        </div>
      ) : null}

      {rowFields.length === 0 ? (
        <p className="studio-infobox-empty">Noch keine Felder mit Beispielwerten.</p>
      ) : (
        <dl className="studio-infobox-rows">
          {rowFields.map((field) => {
            const hasValue = fieldHasValue(field);
            return (
              <div key={field.id} className="studio-infobox-row">
                <dt>{field.label || "(ohne Beschriftung)"}</dt>
                {!hasValue ? (
                  <dd className="incomplete">– Pflichtfeld ohne Wert –</dd>
                ) : field.type === "liste" ? (
                  <dd>
                    <ul className="studio-infobox-list">
                      {(field.exampleItems ?? [])
                        .filter((item) => item.trim())
                        .map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                    </ul>
                  </dd>
                ) : field.type === "verweis" ? (
                  <dd>
                    <span className="studio-infobox-link" title="Erzeugt einen Backlink im verlinkten Artikel">
                      <Link2 size={11} aria-hidden="true" />
                      {field.example}
                    </span>
                  </dd>
                ) : (
                  <dd>{field.example}</dd>
                )}
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import type { RuleDraft } from "./rule-forge-model";
import { renameRuleEntry, removeRuleEntry, ruleEntryReferences, type RuleEntryEdit, type RuleEntryKind, type RuleEntryReference } from "./rule-ability-references";

interface Props { draft: RuleDraft; kind: RuleEntryKind; id: string; onChange(draft: RuleDraft): void }
type EditError = Extract<RuleEntryEdit, { ok: false }>["reason"];
function errorLabel(reason: EditError): string {
  switch (reason) {
    case "identifier": return t("Die Kennung braucht Kleinbuchstaben, Ziffern, _ oder -, beginnt mit einem Buchstaben und hat höchstens 96 Zeichen. Reservierte Namen sind nicht erlaubt.");
    case "duplicate": return t("Diese Kennung ist schon vergeben. Wähle eine andere.");
    case "length": return t("Mit dieser Kennung wäre eine gespeicherte Auswahl zu lang. Kürze die Kennung oder erhöhe die Zeichengrenze des betroffenen Attributs.");
    case "used": return t("Entfernen ist gesperrt, solange andere Einträge diese Kennung benutzen.");
    case "missing": return t("Der Eintrag fehlt oder seine Kennung ist mehrfach vergeben. Prüfe zuerst die Liste.");
  }
}
function referenceLabel(reference: RuleEntryReference): string {
  switch (reference.kind) {
    case "ability": return t("Vorstufe von {name}", { name: reference.name });
    case "field": return t("Vorgabe für {name}", { name: reference.name });
    case "action": return t("Einsatz-Vorgabe für {name}", { name: reference.name });
    case "test": return t("Pakettest {name}", { name: reference.name });
    case "migration": return t("Umstellung von {name}", { name: reference.name });
  }
}

/** The parent keys this control by entry identity, so changing the selection discards unfinished text. */
export function RuleEntryIdentifier({ draft, kind, id, onChange }: Props) {
  const [value, setValue] = useState(id), [error, setError] = useState<EditError | null>(null);
  const helpId = useId(), errorId = useId();
  const apply = () => {
    const result = renameRuleEntry(draft, kind, id, value);
    if (!result.ok) { setError(result.reason); return; }
    setError(null);
    if (result.draft !== draft) onChange(result.draft);
  };
  return <div>
    <label>{t("Kennung")}<input value={value} maxLength={96} spellCheck={false} aria-invalid={error ? true : undefined}
      aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`} onChange={event => { setValue(event.target.value); setError(null); }}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); apply(); } else if (event.key === "Escape") { event.preventDefault(); setValue(id); setError(null); } }} /></label>
    <Button disabled={value === id} onClick={apply}>{t("Kennung übernehmen")}</Button>
    <small id={helpId}>{t("Nur Verweise im Entwurf werden mitgeändert. Freie Texte, Formeln und bestehende Figuren bleiben unverändert.")} {t("Steht im Bogen jeder Figur, die sie gelernt hat. Nach dem ersten Spielabend nicht mehr ändern.")}</small>
    {error ? <p id={errorId} role="alert">{errorLabel(error)}</p> : null}
  </div>;
}

/** Show blockers instead of silently deleting prerequisites from other abilities. */
export function RuleEntryRemoval({ draft, kind, id, onChange, onRemoved }: Props & { onRemoved(): void }) {
  const refs = ruleEntryReferences(draft, kind, id), descriptionId = useId();
  const [error, setError] = useState<EditError | null>(null);
  const remove = () => {
    const result = removeRuleEntry(draft, kind, id);
    if (!result.ok) { setError(result.reason); return; }
    setError(null); onChange(result.draft); onRemoved();
  };
  return <div>
    <Button variant="quiet" disabled={refs.length > 0} aria-describedby={refs.length ? descriptionId : undefined} onClick={remove}><Trash2 size={15} />{kind === "ability" ? t("Fähigkeit entfernen") : t("Zustand entfernen")}</Button>
    {refs.length ? <p className="rf-help" id={descriptionId}>{t("Entfernen ist gesperrt, solange andere Einträge diese Kennung benutzen.")} {refs.slice(0, 8).map(referenceLabel).join(" · ")}{refs.length > 8 ? ` · ${t("{n} weitere Verweise", { n: refs.length - 8 })}` : ""}</p> : null}
    {error ? <p role="alert">{errorLabel(error)}</p> : null}
  </div>;
}

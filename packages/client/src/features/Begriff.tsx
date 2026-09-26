// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, useState, type ReactNode } from "react";
import { t } from "../i18n";
import { BEGRIFF_ERKLAERUNG_LABEL, BEGRIFF_LABEL, type BegriffId } from "./begriffe";

/**
 * Ein Wort mit einem kleinen „?“ daneben. Ein Druck klappt die Erklärung auf — kein Schweben mit
 * der Maus nötig, damit es auch auf dem Handy und mit der Tastatur geht.
 */
export function Begriff({ id, children }: { id: BegriffId; children?: ReactNode }) {
  const [open, setOpen] = useState(false), panel = useId(), word = t(BEGRIFF_LABEL[id]);
  return <span className="begriff">{children ?? word}
    <button type="button" className="begriff-hilfe" aria-expanded={open} aria-controls={panel}
      aria-label={t("Was bedeutet „{begriff}“?", { begriff: word })} onClick={() => setOpen(value => !value)}>?</button>
    <span id={panel} className="begriff-erklaerung" hidden={!open}>{t(BEGRIFF_ERKLAERUNG_LABEL[id])}</span>
  </span>;
}

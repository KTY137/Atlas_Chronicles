// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo } from "react";
import { abilityOverview, evaluateComputedFields, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { t } from "../i18n";
import { hasChronicleGuidance } from "./RuleComputedFields";
import "./character-sheet.css";

/** All totals come from the package engine, including an agreed budget adjustment and spent XP. */
export function CharacterProgress({ pkg, fields }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>> }) {
  const progress = useMemo(() => {
    try { return { values: evaluateComputedFields(pkg, fields), abilities: abilityOverview(pkg, fields) }; }
    catch { return null; }
  }, [pkg, fields]);
  if (!hasChronicleGuidance(pkg) || !progress) return null;
  const points = progress.values.points_available, spent = progress.values.points_spent;
  const abilityBudget = progress.abilities.budget, abilitySpent = progress.abilities.spent;
  return <section className="character-progress" aria-label={t("Punkte und Entwicklung")}>
    <dl>
      {typeof points === "number" ? <div className={points < 0 ? "character-progress-primary over-budget" : "character-progress-primary"}><dt>{t("Verfügbare Fertigkeitspunkte")}</dt><dd><span className="character-progress-value">{points}</span><small className="character-progress-note">{t("{n} Punkte verteilt", { n: spent ?? 0 })}</small></dd></div> : null}
      {typeof fields.erfahrung === "number" ? <div><dt>{t("Erfahrung gesamt")}</dt><dd><span className="character-progress-value">{fields.erfahrung}</span><small className="character-progress-note">{t("{n} Erfahrung auf Fertigkeiten gelegt", { n: Number(fields.erfahrung_fertigkeiten ?? 0) })}</small></dd></div> : null}
      {abilityBudget !== null ? <div><dt>{t("Verfügbare Erfahrung für Fähigkeiten")}</dt><dd><span className="character-progress-value">{abilityBudget - abilitySpent}</span><small className="character-progress-note">{t("{ausgegeben} von {budget} Erfahrung ausgegeben", { ausgegeben: abilitySpent, budget: abilityBudget })}</small></dd></div> : null}
      {typeof progress.values.funken_remaining === "number" ? <div><dt>{t("Funken übrig")}</dt><dd>{progress.values.funken_remaining}<small> / {progress.values.funken_max}</small></dd></div> : null}
    </dl>
    <p className="field-help">{points !== undefined && points < 0 ? t("Das Punktebudget ist überschritten. Verteile weniger Punkte oder passe das vereinbarte Budget an.") : t("Die Übersicht folgt deinem Entwurf. Speichere den Bogen, damit die Werte am Tisch gelten.")}</p>
  </section>;
}

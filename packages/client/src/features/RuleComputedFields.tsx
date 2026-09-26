// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo } from "react";
import { evaluateComputedFields, validatePackageFields, CHRONICLE_HEROES_PACKAGE, CHRONICLE_EXAMPLE_CHARACTERS, CHRONICLE_RULE_GUIDANCE, CHRONICLE_START_POINTS, type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { displayRulePackage } from "./chronicle-heroes-display";
import { explainValidationError } from "./forge-navigation-model";

export function RuleAttribution({ pkg }: { pkg: AnyRulePackage }) {
  const display = displayRulePackage(pkg), attribution = display.schemaVersion === 2 ? display.attribution : undefined;
  return attribution ? <details className="rule-attribution"><summary>{t("Regelquelle und Nutzung")} · {attribution.title}</summary>
    <p>{attribution.notice}</p><p>{attribution.changes}</p>
    <ul>{attribution.sources.map((source, i) => <li key={i}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.revision}<br />{source.authors.join(", ")}</li>)}</ul>
    <p><a href={attribution.licenseUrl} target="_blank" rel="noreferrer">{pkg.license}</a> · {pkg.authors.join(", ")}</p>
  </details> : null;
}
/** Convenience guidance only; the versioned package remains authority for calculations. */
export const hasChronicleGuidance = (pkg: AnyRulePackage) => pkg.schemaVersion === 2 && pkg.attribution?.sources.some(source => source.url.includes("/packages/rules/src/templates/chronicle-heroes.ts"));
/** These characters describe one specific catalogue. Renaming labels is harmless;
 * changing its fields or calculations requires the round's own example figures. */
export function hasChronicleExamples(pkg: AnyRulePackage): boolean {
  if (!hasChronicleGuidance(pkg) || pkg.schemaVersion !== 2) return false;
  const template = CHRONICLE_HEROES_PACKAGE;
  if (Object.keys(pkg.fields).length !== Object.keys(template.fields).length || Object.keys(template.fields).some(id => !pkg.fields[id])) return false;
  if (template.computed?.some(field => pkg.computed?.find(candidate => candidate.id === field.id)?.expression !== field.expression)) return false;
  try {
    return CHRONICLE_EXAMPLE_CHARACTERS.every(example => {
      validatePackageFields(pkg, example.fields);
      return evaluateComputedFields(pkg, example.fields).points_spent === CHRONICLE_START_POINTS;
    });
  } catch { return false; }
}
export function RuleComputedFields({ pkg, fields }: { pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>> }) {
  const result = useMemo(() => {
    try { return { values: evaluateComputedFields(pkg, fields), error: "" }; }
    catch (error) { return { values: null, error: error instanceof Error ? error.message : t("Die Werte sind noch nicht gültig.") }; }
  }, [pkg, fields]);
  if (pkg.schemaVersion !== 2) return null;
  const display = displayRulePackage(pkg);
  return <section aria-label={t("Berechnete Charakterwerte")} className="rule-computed">
    <h3>{t("Berechnete Werte")}</h3>{result.error ? <Notice error>{explainValidationError(result.error)}</Notice> : <dl className="rf-value-list">{display.computed?.map(field => <div key={field.id}><dt>{field.label}</dt><dd>{result.values?.[field.id]}</dd></div>)}</dl>}
    {hasChronicleGuidance(pkg) ? <><p className="field-help">{t(CHRONICLE_RULE_GUIDANCE.health)}</p>
      {typeof fields.lebenskraft === "number" && fields.lebenskraft === 0 ? <Notice tone="warn">{t("Regelhinweis: Bei 0 Lebenskraft ist die Figur außer Gefecht.")} {t("Den Zustand bestätigt ihr ausdrücklich am Tisch.")}</Notice> : null}
      {result.values && result.values.points_available !== undefined ? <p className="field-help">{result.values.points_available < 0 ? t("Mehr als das vereinbarte Punktebudget verteilt: Punkte korrigieren oder die vereinbarte Anpassung ausdrücklich im Bogen eintragen, bevor die Figur spielbereit ist.") : result.values.points_available > 0 ? t("Startpunkte sind noch unverteilt. Bei späterer Entwicklung gilt eure vereinbarte Punkteanpassung.") : t("Das vereinbarte Punktebudget ist vollständig verteilt.")}</p> : null}
    </> : null}
  </section>;
}

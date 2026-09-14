// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { D20_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE, type RulePackageV2 } from "@chronicle/rules";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";

const references: readonly { pkg: RulePackageV2; summary: string; proves: string }[] = [
  {
    pkg: D20_REFERENCE_PACKAGE,
    summary: "W20 plus Attributsmodifikator, abgeleitete Werte, Ressourcen und verschachtelte Wertebereiche.",
    proves: "Geeignet als Strukturstart für D20-Familien wie klassische Fantasy-, Abenteuer- oder taktische Systeme.",
  },
  {
    pkg: THREE_D20_REFERENCE_PACKAGE,
    summary: "Drei unabhängige W20 gegen unterschiedliche Attribute, gemeinsamer Talentvorrat und getrennte Talentkategorien.",
    proves: "Zeigt Mehrwürfel-Proben und eine völlig andere Bogenstruktur ohne eigenen React- oder Serverpfad.",
  },
];

export function UniversalRuleTemplates({ disabled, onCreate }: { disabled: boolean; onCreate(pkg: RulePackageV2): void }) {
  return <section className="rf-reference-templates" aria-label={t("Universelle Referenzsysteme")}>
    <div className="rf-section-heading"><div><h2>{t("Strukturelle Referenzen")}</h2><p className="rf-help">{t("Diese Atlas-eigenen Pakete enthalten keine fremden Regeltexte. Sie demonstrieren unterschiedliche Mechanikfamilien auf derselben Engine und können als bearbeitbare Ausgangspunkte dienen.")}</p></div></div>
    <div className="rf-template-grid">{references.map(({ pkg, summary, proves }) => <article className="rf-card" key={pkg.id}>
      <h3>{pkg.name}</h3><p>{t(summary)}</p><p className="rf-help">{t(proves)}</p>
      <dl className="rf-value-list"><div><dt>{t("Bogenfelder")}</dt><dd>{Object.keys(pkg.fields).length}</dd></div><div><dt>{t("Aktionen")}</dt><dd>{pkg.actions.length}</dd></div><div><dt>{t("Kategorien")}</dt><dd>{pkg.layout.sections.length}</dd></div></dl>
      <Button variant="primary" disabled={disabled} onClick={() => onCreate(pkg)}>{t("Als Regelentwurf öffnen")}</Button>
    </article>)}</div>
  </section>;
}

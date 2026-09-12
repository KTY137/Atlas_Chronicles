// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo } from "react";
import { evaluateVitals, type AnyRulePackage, type Scalar, type VitalReading } from "@chronicle/rules";
import { t } from "../i18n";
import { displayRulePackage } from "./chronicle-heroes-display";
import "./vitalanzeige.css";

/**
 * Leben, Mana, Ausdauer — die Vitalwerte als Balken.
 *
 * **Angezeigt wird, was das Regelpaket AUSWEIST.** Die Deklaration kam mit Feature 1
 * (`vitals`: Feld, Beschriftung, Höchstwert-Ausdruck, Bedeutung der Erschöpfung); hier wird sie
 * gelesen, nicht erfunden. Ein Paket ohne Vitalwerte zeigt keine Balken — das ist ein zulässiger
 * Zustand und kein leeres Gerüst.
 *
 * **Gerechnet wird mit derselben Funktion wie auf dem Server.** `evaluateVitals` ist rein und
 * liegt in `@chronicle/rules`; eine eigene Rechnung hier wäre eine zweite Wahrheit, die beim
 * ersten Ausdruck mit Klammern auseinanderliefe.
 *
 * **Die Zahl steht immer da.** Der Balken ist die Illustration, nicht die Aussage: wer ihn nicht
 * sieht — Farbenblindheit, schmales Fenster, abgeschaltete Stile —, liest trotzdem „37 / 100".
 *
 * Die Beschriftung eines Vitalwerts stammt aus dem Regelpaket und bleibt dessen Text: sie ist
 * Inhalt der Runde, nicht Oberfläche dieses Programms.
 */

export function Vitalanzeige({ pkg, fields, kompakt = false }: {
  pkg: AnyRulePackage; fields: Readonly<Record<string, Scalar>>; kompakt?: boolean;
}) {
  // Ein Bogen mitten im Bearbeiten kann ungültig sein — dann gibt es eben keine Balken, statt
  // einer Fehlermeldung an einer Stelle, die nur illustriert.
  const werte = useMemo<readonly VitalReading[]>(() => {
    try { return evaluateVitals(pkg, fields); } catch { return []; }
  }, [pkg, fields]);
  if (!werte.length) return null;
  const display = displayRulePackage(pkg);

  return <div className={kompakt ? "vitalanzeige kompakt" : "vitalanzeige"}>
    {werte.map(vital => {
      const label = display.schemaVersion === 2 ? display.vitals?.find(row => row.id === vital.id)?.label ?? vital.label : vital.label;
      // Über dem Höchststand wird der Balken voll, die Zahl bleibt ehrlich. Ein Höchstwert von 0
      // ergäbe eine Division durch null — dann bleibt der Balken leer.
      const anteil = vital.maximum > 0 ? Math.max(0, Math.min(1, vital.value / vital.maximum)) : 0;
      const stand = `${vital.value} / ${vital.maximum}`;
      return <div key={vital.id} className={vital.depleted ? "vitalwert erschoepft" : "vitalwert"}>
        <div className="vitalwert-kopf">
          <span className="vitalwert-name">{label}</span>
          <span className="vitalwert-stand">{stand}</span>
        </div>
        <div className="vitalwert-balken" role="meter" aria-label={label}
          aria-valuenow={vital.value} aria-valuemin={0} aria-valuemax={vital.maximum} aria-valuetext={stand}>
          <span style={{ inlineSize: `${anteil * 100}%` }} />
        </div>
        {/* Erschöpfung als WORT, nicht nur als leerer Balken: was Niederlage bedeutet, hat das
            Regelpaket erklärt, und wer es liest, soll es lesen können. */}
        {vital.depleted ? <p className="vitalwert-hinweis">{vital.depletion === "defeat"
          ? t("Aufgebraucht — die Spielleitung kann die Niederlage bestätigen.")
          : t("Aufgebraucht.")}</p> : null}
      </div>;
    })}
  </div>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ReactNode } from "react";
import { Eye, EyeOff, Gauge, Type, type LucideIcon } from "lucide-react";
import type { BalkenFuerRunde, BalkenMaske } from "@chronicle/protocol";
import { t } from "../i18n";
import { MASKE_LABEL, WORT_LEBEN_LABEL, WORT_VORRAT_LABEL, regelFarbe, type BalkenAnsicht, type BalkenFarbe } from "./kampftisch-model";
import { vitalColorClass, vitalColorStyle } from "./Vitalanzeige";

/**
 * Ein Balken auf der Karte. Er zeigt, was er bekommt: eine Zahl, einen Füllstand in Zehnteln
 * oder ein Wort. Die Beschriftung stammt aus dem Regelpaket und bleibt dessen Text.
 *
 * **Die Zahl steht immer da, wo es eine gibt.** Der Füllstand trägt seine Aussage zusätzlich als
 * Text für Vorleseprogramme („etwa 6 von 10“), ein Wort ist ohnehin Text.
 */
export function rundeSieht(balken: BalkenFuerRunde | null): string {
  if (!balken) return t("nichts");
  if (balken.anzeige === "genau") return `${balken.wert} / ${balken.hoechst}`;
  if (balken.anzeige === "fuellstand") return t("etwa {n} von 10", { n: balken.zehntel });
  return balken.art === "leben" ? t(WORT_LEBEN_LABEL[balken.stufe]) : t(WORT_VORRAT_LABEL[balken.stufe]);
}
const SYMBOL: Readonly<Record<BalkenMaske, LucideIcon>> = { genau: Eye, fuellstand: Gauge, worte: Type, verborgen: EyeOff };

export function KampfBalken({ balken, farbe, onMaske, onWert, schwebe }: {
  balken: BalkenAnsicht; farbe: BalkenFarbe; onMaske?: (() => void) | undefined; onWert?: (() => void) | undefined; schwebe?: ReactNode;
}) {
  const { anzeige, leitung } = balken;
  const text = anzeige.anzeige === "fuellstand" ? null : rundeSieht(anzeige);
  const Symbol = leitung ? SYMBOL[leitung.maske] : null;
  const anteil = anzeige.anzeige === "genau" && anzeige.hoechst > 0 ? Math.max(0, Math.min(1, anzeige.wert / anzeige.hoechst)) * 100 : 0;
  // Eine Farbe aus dem Regelpaket läuft über dieselben Klassen wie in der Vitalanzeige; sonst färbt der Tisch.
  const regel = regelFarbe(farbe);
  return <div className={regel ? `kampf-balken kampf-anker mit-regelfarbe${vitalColorClass(regel)}` : "kampf-balken kampf-anker"}
    data-farbe={regel ? undefined : farbe} style={regel ? vitalColorStyle(regel) : undefined}>
    <div className="kampf-balken-kopf">
      {onMaske && leitung && Symbol ? <button type="button" className="kampf-auge" data-maske={leitung.maske} onClick={onMaske}
        aria-label={t("Was die Runde bei {balken} sieht: {anzeige}", { balken: anzeige.label, anzeige: t(MASKE_LABEL[leitung.maske]) })}>
        <Symbol size={13} aria-hidden="true" /></button> : null}
      <span className="kampf-balken-name">{anzeige.label}</span>
      {text === null ? null : onWert
        ? <button type="button" className="kampf-balken-wert" onClick={onWert} aria-label={t("{balken} ändern, jetzt {wert}", { balken: anzeige.label, wert: text })}>{text}</button>
        : <span className={anzeige.anzeige === "worte" ? "kampf-balken-wort" : "kampf-balken-wert"}>{text}</span>}
    </div>
    {anzeige.anzeige === "genau"
      ? <div className="kampf-spur" role="meter" aria-label={anzeige.label} aria-valuemin={0} aria-valuemax={anzeige.hoechst} aria-valuenow={anzeige.wert} aria-valuetext={text ?? ""}>
          <span style={{ inlineSize: `${anteil}%` }} /></div>
      : anzeige.anzeige === "fuellstand"
        ? <div className="kampf-spur in-zehnteln" role="meter" aria-label={anzeige.label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={anzeige.zehntel}
            aria-valuetext={t("etwa {n} von 10", { n: anzeige.zehntel })}><span style={{ inlineSize: `${anzeige.zehntel * 10}%` }} /></div>
        : null}
    {leitung && leitung.maske !== "genau" ? <p className="kampf-balken-runde">{t("Die Runde sieht: {was}", { was: rundeSieht(leitung.fuerRunde) })}</p> : null}
    {schwebe}
  </div>;
}

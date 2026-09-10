// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Auswahl des Looks — als Kachelwand, nicht als Aufklappliste.
 *
 * Vorher stand hier ein `<select>` mit den rohen Kennungen „Cyberpunk", „Medieval",
 * „Fantasy", „PixelArt", „Aurora". Das war aus zwei Gründen falsch: die Wörter erklären
 * nichts (siehe GUI-Klartext-Regel), und eine Aufklappliste zeigt Farben nicht. Wer einen
 * Look waehlt, waehlt ein Aussehen — also muss er das Aussehen sehen, bevor er klickt.
 *
 * Semantisch ist es eine echte Radiogruppe aus nativen `<input type="radio">`: damit
 * funktionieren Pfeiltasten, Sprachausgabe und Formular-Rücksetzung ohne eigenen Code.
 * Der Knopf ist unsichtbar, liegt aber DECKEND über der ganzen Kachel statt in eine Ecke
 * weggeklippt. Das ist der Unterschied zwischen erreichbar und zielbar: Maus, Finger und
 * jedes Prüfwerkzeug treffen genau die Fläche, die man sieht. `:focus-visible` am Knopf
 * zeichnet den Rahmen um die Kachel (`zustaende.css`).
 *
 * Die Farbproben stehen als Inline-Stil an der Kachel, nicht in der CSS-Datei: sie gehören
 * dem jeweiligen Look, nicht dem Stylesheet, und ändern sich mit ihm.
 */
import type { ThemePresetId } from "@chronicle/theme";
import { t } from "../i18n";
import { LOOK_ERKLAERUNG_LABEL, LOOK_LABEL, LOOK_VORSCHAU } from "./look-namen";

export interface LookAuswahlProps {
  /** `null` heißt: dem folgen, was die Spielleitung für die Runde festgelegt hat. */
  readonly gewaehlt: ThemePresetId | null;
  /** Der Look, der gerade tatsächlich gilt — auch wenn „wie die Runde" gewählt ist. */
  readonly aktiv: ThemePresetId;
  readonly aendere: (naechster: ThemePresetId | null) => void;
}

export function LookAuswahl({ gewaehlt, aktiv, aendere }: LookAuswahlProps) {
  return <fieldset className="look-auswahl">
    <legend>{t("Aussehen")}</legend>
    <p className="field-help">{t("Wähle, wie die App bei dir aussieht. Die Auswahl gilt nur für dich — die anderen am Tisch sehen weiter ihre eigene.")}</p>
    <div className="look-gitter">
      <label className={`look-karte look-karte-runde ${gewaehlt === null ? "ist-gewaehlt" : ""}`}>
        <input type="radio" name="chronicle-look" className="look-knopf" value="campaign"
          aria-label={t("Wie die Runde es festgelegt hat")}
          checked={gewaehlt === null} onChange={() => aendere(null)} />
        <span className="look-probe look-probe-runde" aria-hidden="true">
          {LOOK_VORSCHAU.filter(look => look.id === aktiv).flatMap(look => look.proben).map((farbe, nummer) =>
            <span key={nummer} style={{ background: farbe }} />)}
        </span>
        <span className="look-kopf">
          <strong>{t("Wie die Runde es festgelegt hat")}</strong>
          <span className="look-marke">{t("Vorgabe")}</span>
        </span>
        <span className="look-text">{t("Die Spielleitung bestimmt das Aussehen für alle. Gerade ist das {look}.", { look: t(LOOK_LABEL[aktiv]) })}</span>
      </label>
      {LOOK_VORSCHAU.map(look => <label key={look.id}
        className={`look-karte ${gewaehlt === look.id ? "ist-gewaehlt" : ""}`}
        style={{ "--look-grund": look.grund, "--look-schrift": look.schrift, "--look-rand": look.rand, "--look-radius": `${look.radius}px` } as React.CSSProperties}>
        <input type="radio" name="chronicle-look" className="look-knopf" value={look.id}
          aria-label={t(LOOK_LABEL[look.id])}
          checked={gewaehlt === look.id} onChange={() => aendere(look.id)} />
        <span className="look-probe" aria-hidden="true">
          {look.proben.map((farbe, nummer) => <span key={nummer} style={{ background: farbe }} />)}
        </span>
        <span className="look-kopf">
          <strong>{t(LOOK_LABEL[look.id])}</strong>
          <span className="look-marke">{look.hell ? t("Hell") : t("Dunkel")}</span>
        </span>
        <span className="look-text">{t(LOOK_ERKLAERUNG_LABEL[look.id])}</span>
      </label>)}
    </div>
  </fieldset>;
}

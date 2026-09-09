// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { DEFAULT_ACCESSIBILITY_PREFERENCES, THEME_PRESET_IDS, type AccessibilityPreferencesV2 } from "@chronicle/theme";
import { Button, Notice } from "@chronicle/ui";
import { useState } from "react";
import { setzeSprache, t } from "../i18n";
import { spracheFehlerText, useAppearance } from "./Appearance";

export function AppearanceSettings() {
  const { preferences, resolved, preferencesRecovered, spracheFehler, storageError, update } = useAppearance();
  const [wechselFehler, setWechselFehler] = useState("");
  const change = <K extends keyof AccessibilityPreferencesV2>(key: K, value: AccessibilityPreferencesV2[K]) => update({ ...preferences, [key]: value });
  // Der Sprachwechsel baut die ganze Ansicht neu auf. Wer gerade schreibt, verliert den
  // Entwurf, also wird vorher gefragt; erst nach geladenem Katalog wird die Wahl gespeichert.
  const wechsleSprache = async (naechste: AccessibilityPreferencesV2["language"]) => {
    if (naechste === preferences.language) return;
    if (!window.confirm(t("Sprache wechseln? Ungespeicherte Entwürfe gehen dabei verloren."))) return;
    try { await setzeSprache(naechste); setWechselFehler(""); update({ ...preferences, language: naechste }); }
    catch { setWechselFehler(spracheFehlerText()); }
  };
  return <section className="panel appearance-settings"><h2>{t("Deine Darstellung")}</h2><p>{t("Diese Einstellungen gelten für deinen Browser. Sie verändern weder die Kampagne noch die Ansicht der anderen Mitspieler.")}</p>
    <div className="rule-fields">
      <label>{t("Sprache")}<select aria-label={t("Sprache")} value={preferences.language} onChange={e => void wechsleSprache(e.target.value as AccessibilityPreferencesV2["language"])}><option value="de">Deutsch</option><option value="en">English</option></select></label>
      <label>{t("Lokaler Look")}<select aria-label={t("Lokaler Look")} value={preferences.localSkin ?? "campaign"} onChange={e => change("localSkin", e.target.value === "campaign" ? null : e.target.value as AccessibilityPreferencesV2["localSkin"])}><option value="campaign">{t("Kampagnentheme verwenden")}</option>{THEME_PRESET_IDS.map(preset => <option key={preset}>{preset}</option>)}</select></label>
      <label>{t("Kontrast")}<select aria-label={t("Kontrast")} value={preferences.contrast} onChange={e => change("contrast", e.target.value as AccessibilityPreferencesV2["contrast"])}><option value="system">{t("Systemeinstellung")}</option><option value="normal">{t("Standard")}</option><option value="high">{t("Hoher Kontrast")}</option></select></label>
      <label>{t("Bewegung")}<select aria-label={t("Bewegung")} value={preferences.motion} onChange={e => change("motion", e.target.value as AccessibilityPreferencesV2["motion"])}><option value="system">{t("Systemeinstellung")}</option><option value="reduced">{t("Bewegung reduzieren")}</option></select></label>
      <label>{t("Transparenz")}<select aria-label={t("Transparenz")} value={preferences.transparency} onChange={e => change("transparency", e.target.value as AccessibilityPreferencesV2["transparency"])}><option value="system">{t("Systemeinstellung")}</option><option value="reduced">{t("Transparenz reduzieren")}</option></select></label>
      <label>{t("Leseschrift")}<select aria-label={t("Leseschrift")} value={preferences.font} onChange={e => change("font", e.target.value as AccessibilityPreferencesV2["font"])}><option value="theme">{t("Theme-Schrift")}</option><option value="system">{t("Systemschrift")}</option><option value="reader">{t("Leseschrift")}</option></select></label>
      <label>{t("Abstände")}<select aria-label={t("Abstände")} value={preferences.density} onChange={e => change("density", e.target.value as AccessibilityPreferencesV2["density"])}><option value="comfortable">{t("Großzügig")}</option><option value="compact">{t("Kompakt")}</option></select></label>
      <label>{t("Gestaltung")}<select aria-label={t("Gestaltung")} value={preferences.atmosphere} onChange={e => change("atmosphere", e.target.value as AccessibilityPreferencesV2["atmosphere"])}><option value="clean">{t("Schlicht")}</option><option value="crafted">{t("Ausgestaltet")}</option><option value="cinematic">{t("Szenisch")}</option></select></label>
    </div>
    <label className="check-label"><input type="checkbox" checked={preferences.art === "off"} onChange={e => change("art", e.target.checked ? "off" : "on")} /> {t("Dekoration ausblenden")}</label>
    <label className="check-label"><input type="checkbox" checked={preferences.lowPower} onChange={e => change("lowPower", e.target.checked)} /> {t("Ruhige Darstellung für geringe Leistung")}</label>
    <p className="field-help">{t("Aktiv: {preset}. Einschränkungen deines Betriebssystems haben Vorrang. Browserzoom und erzwungene Systemfarben bleiben verfügbar.", { preset: resolved.basePreset })}</p>
    {wechselFehler || spracheFehler ? <Notice error>{wechselFehler || spracheFehler}</Notice> : null}
    {storageError ? <Notice error>{storageError}</Notice> : null}
    {/* Roh deutsch ohne t(): dieser Satz entsteht nach den acht Übersetzungspaketen und hat
        noch keinen Katalogeintrag. Er ist gemeldet und gehört in das nächste Sprachpaket. */}
    {preferencesRecovered ? <Notice error>{t("Deine gespeicherte Darstellung war beschädigt und wurde auf die Vorgabe zurückgesetzt.")}</Notice> : null}
    <Button onClick={() => update(DEFAULT_ACCESSIBILITY_PREFERENCES)}>{t("Lokale Darstellung zurücksetzen")}</Button>
  </section>;
}

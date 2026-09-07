// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { DEFAULT_ACCESSIBILITY_PREFERENCES, THEME_PRESET_IDS, type AccessibilityPreferencesV1 } from "@chronicle/theme";
import { Button, Notice } from "@chronicle/ui";
import { useAppearance } from "./Appearance";

export function AppearanceSettings() {
  const { preferences, resolved, storageError, update } = useAppearance();
  const change = <K extends keyof AccessibilityPreferencesV1>(key: K, value: AccessibilityPreferencesV1[K]) => update({ ...preferences, [key]: value });
  return <section className="panel appearance-settings"><h2>Deine Darstellung</h2><p>Diese Einstellungen gelten für deinen Browser. Sie verändern weder die Kampagne noch die Ansicht der anderen Mitspieler.</p>
    <div className="rule-fields">
      <label>Lokaler Look<select aria-label="Lokaler Look" value={preferences.localSkin ?? "campaign"} onChange={e => change("localSkin", e.target.value === "campaign" ? null : e.target.value as AccessibilityPreferencesV1["localSkin"])}><option value="campaign">Kampagnentheme verwenden</option>{THEME_PRESET_IDS.map(preset => <option key={preset}>{preset}</option>)}</select></label>
      <label>Kontrast<select aria-label="Kontrast" value={preferences.contrast} onChange={e => change("contrast", e.target.value as AccessibilityPreferencesV1["contrast"])}><option value="system">Systemeinstellung</option><option value="normal">Standard</option><option value="high">Hoher Kontrast</option></select></label>
      <label>Bewegung<select aria-label="Bewegung" value={preferences.motion} onChange={e => change("motion", e.target.value as AccessibilityPreferencesV1["motion"])}><option value="system">Systemeinstellung</option><option value="reduced">Bewegung reduzieren</option></select></label>
      <label>Transparenz<select aria-label="Transparenz" value={preferences.transparency} onChange={e => change("transparency", e.target.value as AccessibilityPreferencesV1["transparency"])}><option value="system">Systemeinstellung</option><option value="reduced">Transparenz reduzieren</option></select></label>
      <label>Leseschrift<select aria-label="Leseschrift" value={preferences.font} onChange={e => change("font", e.target.value as AccessibilityPreferencesV1["font"])}><option value="theme">Theme-Schrift</option><option value="system">Systemschrift</option><option value="reader">Leseschrift</option></select></label>
      <label>Abstände<select aria-label="Abstände" value={preferences.density} onChange={e => change("density", e.target.value as AccessibilityPreferencesV1["density"])}><option value="comfortable">Großzügig</option><option value="compact">Kompakt</option></select></label>
      <label>Gestaltung<select aria-label="Gestaltung" value={preferences.atmosphere} onChange={e => change("atmosphere", e.target.value as AccessibilityPreferencesV1["atmosphere"])}><option value="clean">Schlicht</option><option value="crafted">Ausgestaltet</option><option value="cinematic">Szenisch</option></select></label>
    </div>
    <label className="check-label"><input type="checkbox" checked={preferences.art === "off"} onChange={e => change("art", e.target.checked ? "off" : "on")} /> Dekoration ausblenden</label>
    <label className="check-label"><input type="checkbox" checked={preferences.lowPower} onChange={e => change("lowPower", e.target.checked)} /> Ruhige Darstellung für geringe Leistung</label>
    <p className="field-help">Aktiv: {resolved.basePreset}. Einschränkungen deines Betriebssystems haben Vorrang. Browserzoom und erzwungene Systemfarben bleiben verfügbar.</p>
    {storageError ? <Notice error>{storageError}</Notice> : null}
    <Button onClick={() => update(DEFAULT_ACCESSIBILITY_PREFERENCES)}>Lokale Darstellung zurücksetzen</Button>
  </section>;
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Fragment, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { DEFAULT_ACCESSIBILITY_PREFERENCES, getThemePreset, parseAccessibilityPreferences, recoverAccessibilityPreferences, resolveTheme, serializeAccessibilityPreferences,
  type AccessibilityPreferencesV2, type ResolvedThemeV1, type Sprache, type SystemAccessibility, type ThemeManifestV1 } from "@chronicle/theme";
import { aktuelleSprache, initialisiereSprache, setzeSprache, spracheStand, subscribe, t } from "../i18n";

const STORAGE_KEY = "chronicle.appearance.v1";
/** Die tatsaechlichen Schriftfamilien je Kennung. Exportiert, damit die Werkstatt eine
 * Schriftprobe IN der jeweiligen Schrift zeigen kann statt nur ihren Namen — eine Liste
 * von Schriftnamen, alle in derselben Schrift gesetzt, waehlt man blind. */
export const SCHRIFT_FAMILIEN = { cinzel: '"Cinzel", Georgia, serif', plex: '"IBM Plex Sans Variable", system-ui, sans-serif', system: "system-ui, sans-serif", serif: "Georgia, Cambria, serif", mono: "ui-monospace, Consolas, monospace" };
const queries = { forcedColors: "(forced-colors: active)", highContrast: "(prefers-contrast: more)", reducedMotion: "(prefers-reduced-motion: reduce)", reducedTransparency: "(prefers-reduced-transparency: reduce)" } as const;

export function appearanceStyle(theme: ResolvedThemeV1): CSSProperties {
  return { ...Object.fromEntries(Object.entries(theme.colors).map(([key, value]) => [`--${key}`, value])),
    "--muted": theme.colors["text-muted"], "--surface-1": theme.colors.surface,
    "--font-display": SCHRIFT_FAMILIEN[theme.typography.display], "--font-body": SCHRIFT_FAMILIEN[theme.typography.body], "--font-mono": SCHRIFT_FAMILIEN.mono,
    "--radius": `${theme.geometry.radius}px`, "--theme-border": `${theme.geometry.border}px`, "--theme-space": `${theme.geometry.spacing}px`,
    "--control-motion": `${theme.motion.controlMs}ms`, "--panel-motion": `${theme.motion.panelMs}ms`,
    "--motion-easing": theme.motion.cadence === "steps" ? "steps(4, end)" : "ease",
  } as CSSProperties;
}

/** Ein fehlgeschlagener Katalog-Import darf nicht still deutsch bleiben; die Auswahl zeigt ihn.
 * Als Funktion, damit `t` den Satz beim Anzeigen liest: eine Konstante stuende schon fest,
 * bevor die Sprache ueberhaupt gewaehlt ist. Der deutsche Satz bleibt der Katalogschluessel. */
export const spracheFehlerText = (): string => t("Das englische Sprachpaket konnte nicht geladen werden.");

interface AppearanceState {
  preferences: AccessibilityPreferencesV2; resolved: ResolvedThemeV1; system: SystemAccessibility; sprache: Sprache; spracheFehler: string; storageError: string;
  /** Der gespeicherte Stand war unlesbar und wurde auf die Vorgabe zurückgesetzt. */
  preferencesRecovered: boolean;
  update: (next: AccessibilityPreferencesV2) => void; setCampaignTheme: (theme: ThemeManifestV1 | null) => void;
}
const AppearanceContext = createContext<AppearanceState | null>(null);
export function useAppearance(): AppearanceState {
  const context = useContext(AppearanceContext); if (!context) throw new Error("AppearanceProvider is missing"); return context;
}
/** Erstwert ohne gespeicherte Wahl: die Browsersprache. Nur Englisch wird erkannt. */
function browserSprache(): Sprache {
  try { return navigator.language.startsWith("en") ? "en" : "de"; } catch { return "de"; }
}
/** `?lang=en` ist ein bewusster Override fuer Browserablaeufe; er schlaegt die gespeicherte Wahl. */
function adressSprache(): Sprache | null {
  try { const wert = new URLSearchParams(location.search).get("lang"); return wert === "en" || wert === "de" ? wert : null; }
  catch { return null; }
}
/**
 * Der gespeicherte Stand, so wie er heute gelesen wird.
 *
 * Ein beschädigter Eintrag läuft über `recoverAccessibilityPreferences` statt über einen
 * stillen `catch`: das Theme-Paket hat die Wiederherstellung samt Merkzeichen genau dafür,
 * und wessen Darstellung sich ohne Zutun zurücksetzt, soll den Grund lesen statt zu raten.
 * Ein gesperrter Speicher ist etwas anderes als ein beschädigter Eintrag — dort gibt es
 * nichts wiederherzustellen, also auch nichts zu melden.
 *
 * `roh` bleibt daneben stehen, damit der Aufrufer eine migrierte oder wiederhergestellte
 * Fassung zurückschreiben kann; ohne das bliebe eine gespeicherte Fassung 1 bis zur
 * nächsten Nutzeränderung Fassung 1.
 */
function gespeicherteDarstellung(): { basis: AccessibilityPreferencesV2; roh: string | null; wiederhergestellt: boolean } {
  let roh: string | null = null;
  try { roh = localStorage.getItem(STORAGE_KEY); }
  catch { return { basis: DEFAULT_ACCESSIBILITY_PREFERENCES, roh: null, wiederhergestellt: false }; }
  if (roh === null) return { basis: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, language: browserSprache() }, roh: null, wiederhergestellt: false };
  const { preferences, recovered } = recoverAccessibilityPreferences(roh);
  return { basis: preferences, roh, wiederhergestellt: recovered };
}
/** `?lang=` übersteuert die Anzeige, wird aber nie gespeichert: es ist ein Testschalter. */
function mitAdressSprache(basis: AccessibilityPreferencesV2): AccessibilityPreferencesV2 {
  const override = adressSprache();
  return override && override !== basis.language ? { ...basis, language: override } : basis;
}
function readPreferences(): AccessibilityPreferencesV2 { return mitAdressSprache(gespeicherteDarstellung().basis); }

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Die Startsprache steht vor dem ersten Rendern fest: sonst zeigt der Start erst Deutsch
  // und baut die ganze Ansicht samt Verbindungen sofort wieder neu auf.
  const [start] = useState(() => {
    const stand = gespeicherteDarstellung(), erste = mitAdressSprache(stand.basis);
    initialisiereSprache(erste.language);
    return { ...stand, erste };
  });
  const [preferences, setPreferences] = useState(start.erste), [preferencesRecovered, setPreferencesRecovered] = useState(start.wiederhergestellt),
    [campaignTheme, setCampaignTheme] = useState<ThemeManifestV1 | null>(null), [storageError, setStorageError] = useState(""), [spracheFehler, setSpracheFehler] = useState("");
  // Was gelesen wurde, wird sofort in seiner heutigen Fassung zurückgeschrieben: eine migrierte
  // Fassung 1 bliebe sonst auf der Platte Fassung 1, und ein beschädigter Eintrag meldete sich
  // bei jedem Start erneut. Die Adressübersteuerung bleibt draußen — sie gilt nur diesem Fenster.
  useEffect(() => {
    if (start.roh === null) return;
    let kanonisch: string;
    try { kanonisch = serializeAccessibilityPreferences(start.basis); } catch { return; }
    if (kanonisch === start.roh) return;
    try { localStorage.setItem(STORAGE_KEY, kanonisch); } catch { /* gesperrter Speicher: der gelesene Stand gilt trotzdem */ }
  }, []);
  const [system, setSystem] = useState<SystemAccessibility>(() => Object.fromEntries(Object.entries(queries).map(([key, query]) => [key, matchMedia(query).matches])));
  useEffect(() => {
    const media = Object.entries(queries).map(([key, query]) => [key, matchMedia(query)] as const);
    const refresh = () => setSystem(Object.fromEntries(media.map(([key, query]) => [key, query.matches])));
    media.forEach(([, query]) => query.addEventListener("change", refresh));
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) setPreferences(readPreferences()); };
    window.addEventListener("storage", storage);
    return () => { media.forEach(([, query]) => query.removeEventListener("change", refresh)); window.removeEventListener("storage", storage); };
  }, []);
  // Der Sprachzustand liegt als Modulvariable in i18n.ts; React haengt hier daran.
  // Der Stand ist der Anlass zum Neuzeichnen, die Sprache das Ergebnis: der Katalog kommt
  // nach dem ersten Zeichnen an, ohne dass sich die Sprache dabei aendert.
  const stand = useSyncExternalStore(subscribe, spracheStand, spracheStand);
  const sprache = useMemo(() => aktuelleSprache(), [stand]);
  // Der Katalog kommt nach; weil er die Sprache nicht ändert, bleibt der Baum stehen.
  useEffect(() => { setzeSprache(preferences.language).then(() => setSpracheFehler(""), () => setSpracheFehler(spracheFehlerText())); }, [preferences.language]);
  useLayoutEffect(() => { document.documentElement.lang = sprache; }, [sprache]);
  const update = useCallback((input: AccessibilityPreferencesV2) => {
    const next = parseAccessibilityPreferences(input); setPreferences(next); setPreferencesRecovered(false);
    try { localStorage.setItem(STORAGE_KEY, serializeAccessibilityPreferences(next)); setStorageError(""); }
    catch { setStorageError(t("Diese Darstellung gilt gerade nur für das geöffnete Fenster, weil der Browser keine lokale Speicherung erlaubt.")); }
  }, []);
  const resolved = useMemo(() => resolveTheme(campaignTheme ?? getThemePreset("Fantasy"), preferences, system), [campaignTheme, preferences, system]);
  useLayoutEffect(() => {
    const root = document.documentElement, styles = appearanceStyle(resolved);
    for (const [key, value] of Object.entries(styles)) root.style.setProperty(key, String(value));
    const attributes = { theme: resolved.basePreset, density: resolved.density, atmosphere: resolved.atmosphere,
      art: resolved.art ? "on" : "off", transparency: resolved.transparency ? "on" : "off", contrast: resolved.highContrast ? "high" : "normal",
      motion: resolved.motion.cadence, edges: resolved.geometry.edges, icons: resolved.geometry.icons, sampling: resolved.sampling, lowPower: String(resolved.lowPower) };
    for (const [key, value] of Object.entries(attributes)) root.setAttribute(`data-appearance-${key}`, value);
    return () => { for (const key of Object.keys(styles)) root.style.removeProperty(key); for (const key of Object.keys(attributes)) root.removeAttribute(`data-appearance-${key}`); };
  }, [resolved]);
  // `t` liest die Modulvariable beim Rendern; ein Sprachwechsel muss den Baum daher neu
  // aufbauen. Das kostet den lokalen Zustand einer Ansicht, aber nur bei einer bewussten Wahl.
  return <AppearanceContext.Provider value={{ preferences, resolved, system, sprache, spracheFehler, storageError, preferencesRecovered, update, setCampaignTheme }}><Fragment key={sprache}>{children}</Fragment></AppearanceContext.Provider>;
}

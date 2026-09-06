import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { DEFAULT_ACCESSIBILITY_PREFERENCES, getThemePreset, parseAccessibilityPreferences, resolveTheme, serializeAccessibilityPreferences,
  type AccessibilityPreferencesV1, type ResolvedThemeV1, type SystemAccessibility, type ThemeManifestV1 } from "@chronicle/theme";

const STORAGE_KEY = "chronicle.appearance.v1";
const fonts = { cinzel: '"Cinzel", Georgia, serif', plex: '"IBM Plex Sans Variable", system-ui, sans-serif', system: "system-ui, sans-serif", serif: "Georgia, Cambria, serif", mono: "ui-monospace, Consolas, monospace" };
const queries = { forcedColors: "(forced-colors: active)", highContrast: "(prefers-contrast: more)", reducedMotion: "(prefers-reduced-motion: reduce)", reducedTransparency: "(prefers-reduced-transparency: reduce)" } as const;

export function appearanceStyle(theme: ResolvedThemeV1): CSSProperties {
  return { ...Object.fromEntries(Object.entries(theme.colors).map(([key, value]) => [`--${key}`, value])),
    "--muted": theme.colors["text-muted"], "--surface-1": theme.colors.surface,
    "--font-display": fonts[theme.typography.display], "--font-body": fonts[theme.typography.body], "--font-mono": fonts.mono,
    "--radius": `${theme.geometry.radius}px`, "--theme-border": `${theme.geometry.border}px`, "--theme-space": `${theme.geometry.spacing}px`,
    "--control-motion": `${theme.motion.controlMs}ms`, "--panel-motion": `${theme.motion.panelMs}ms`,
    "--motion-easing": theme.motion.cadence === "steps" ? "steps(4, end)" : "ease",
  } as CSSProperties;
}

interface AppearanceState {
  preferences: AccessibilityPreferencesV1; resolved: ResolvedThemeV1; system: SystemAccessibility; storageError: string;
  update: (next: AccessibilityPreferencesV1) => void; setCampaignTheme: (theme: ThemeManifestV1 | null) => void;
}
const AppearanceContext = createContext<AppearanceState | null>(null);
export function useAppearance(): AppearanceState {
  const context = useContext(AppearanceContext); if (!context) throw new Error("AppearanceProvider is missing"); return context;
}
function readPreferences(): AccessibilityPreferencesV1 {
  try { const source = localStorage.getItem(STORAGE_KEY); return source ? parseAccessibilityPreferences(source) : DEFAULT_ACCESSIBILITY_PREFERENCES; }
  catch { return DEFAULT_ACCESSIBILITY_PREFERENCES; }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences), [campaignTheme, setCampaignTheme] = useState<ThemeManifestV1 | null>(null), [storageError, setStorageError] = useState("");
  const [system, setSystem] = useState<SystemAccessibility>(() => Object.fromEntries(Object.entries(queries).map(([key, query]) => [key, matchMedia(query).matches])));
  useEffect(() => {
    const media = Object.entries(queries).map(([key, query]) => [key, matchMedia(query)] as const);
    const refresh = () => setSystem(Object.fromEntries(media.map(([key, query]) => [key, query.matches])));
    media.forEach(([, query]) => query.addEventListener("change", refresh));
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) setPreferences(readPreferences()); };
    window.addEventListener("storage", storage);
    return () => { media.forEach(([, query]) => query.removeEventListener("change", refresh)); window.removeEventListener("storage", storage); };
  }, []);
  const update = useCallback((input: AccessibilityPreferencesV1) => {
    const next = parseAccessibilityPreferences(input); setPreferences(next);
    try { localStorage.setItem(STORAGE_KEY, serializeAccessibilityPreferences(next)); setStorageError(""); }
    catch { setStorageError("Diese Darstellung gilt gerade nur für das geöffnete Fenster, weil der Browser keine lokale Speicherung erlaubt."); }
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
  return <AppearanceContext.Provider value={{ preferences, resolved, system, storageError, update, setCampaignTheme }}>{children}</AppearanceContext.Provider>;
}

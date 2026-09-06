import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES, HIGH_CONTRAST_COLORS, PUBLIC_DEFAULT_THEME, THEME_COLOR_TOKENS,
  THEME_CONTRAST_PAIRS, THEME_LIMITS, THEME_PRESET_IDS, THEME_PRESETS, ThemeValidationError,
  contrastRatio, evaluateThemeAccessibility, getThemePreset, parseAccessibilityPreferences, parseThemeManifest,
  recoverAccessibilityPreferences, relativeLuminance, resolveTheme, serializeAccessibilityPreferences,
  serializeThemeManifest, themeCanonicalJson,
} from "../src/index.ts";

const draft = () => JSON.parse(serializeThemeManifest(THEME_PRESETS.Fantasy)) as Record<string, any>;

describe("ThemeManifestV1 boundary and portable files", () => {
  it("roundtrips actual tweaks without changing an existing preset or losing metadata", () => {
    const original = serializeThemeManifest(THEME_PRESETS.Fantasy), edited = draft();
    edited.name = "Séras Werkstatt 🦉"; edited.colors.accent = "#f4bd74"; edited.geometry.radius = 8;
    edited.attribution = { creator: "Sera", license: "All-Rights-Reserved", notice: "Eigener Entwurf" };
    const file = serializeThemeManifest(edited), imported = parseThemeManifest(file);
    expect(serializeThemeManifest(imported)).toBe(file);
    expect(imported.name).toBe("Séras Werkstatt 🦉");
    expect(imported.geometry.radius).toBe(8);
    expect(imported.attribution).toEqual(edited.attribution);
    expect(serializeThemeManifest(THEME_PRESETS.Fantasy)).toBe(original);
    expect(Object.isFrozen(imported.colors)).toBe(true);
    expect(Object.isFrozen(imported.attribution)).toBe(true);
  });

  it("rejects literal and escaped duplicate keys at root and nested levels", () => {
    const text = serializeThemeManifest(THEME_PRESETS.Fantasy);
    for (const bad of [
      text.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'),
      text.replace('"schemaVersion":1', '"schemaVersion":1,"schema\\u0056ersion":1'),
      text.replace('"body":"plex"', '"body":"plex","body":"mono"'),
    ]) expect(() => parseThemeManifest(bad)).toThrow(/duplicate/);
  });

  it.each([
    ["unknown root", (value: any) => { value.css = "body {display:none}"; }],
    ["unknown color", (value: any) => { value.colors.remote = "#ffffff"; }],
    ["missing meaningful color", (value: any) => { delete value.colors.focus; }],
    ["remote font", (value: any) => { value.typography.body = "https://example.invalid/font.woff"; }],
    ["CSS paint", (value: any) => { value.colors.bg = "url(https://example.invalid/pixel)"; }],
    ["alpha", (value: any) => { value.colors.bg = "#ffffff00"; }],
    ["shorthand", (value: any) => { value.colors.bg = "#fff"; }],
    ["HTML", (value: any) => { value.name = "<img src=x>"; }],
    ["HTML attribution", (value: any) => { value.attribution.notice = "<script>x</script>"; }],
    ["executable recipe", (value: any) => { value.motion = "cubic-bezier(0,1,1,0)"; }],
    ["unbounded geometry", (value: any) => { value.geometry.spacing = 900; }],
    ["future version", (value: any) => { value.schemaVersion = 2; }],
    ["lone surrogate", (value: any) => { value.name = "\ud800"; }],
    ["bidi override", (value: any) => { value.name = "Test\u202e"; }],
  ] as const)("rejects %s", (_label, mutate) => {
    const value = draft(); mutate(value); expect(() => parseThemeManifest(value)).toThrow(ThemeValidationError);
  });

  it("enforces actual UTF-8 bytes at exactly 64 KiB, including whitespace", () => {
    const value = draft(); value.name = "é 🦉";
    const json = JSON.stringify(value), bytes = Buffer.byteLength(json, "utf8");
    const atLimit = json + " ".repeat(THEME_LIMITS.bytes - bytes);
    expect(Buffer.byteLength(atLimit)).toBe(THEME_LIMITS.bytes);
    expect(parseThemeManifest(atLimit).name).toBe("é 🦉");
    expect(() => parseThemeManifest(atLimit + " ")).toThrow(/byte limit/);
    expect(() => themeCanonicalJson({ value: "🦉".repeat(17000) })).toThrow(/byte limit/);
  });

  it("denies prototype keys and non-JSON object behavior without invoking accessors", () => {
    for (const key of ["__proto__", "constructor", "prototype"]) {
      expect(() => parseThemeManifest(`{"${key}":{}}`)).toThrow(/prototype/);
      const value = draft(); Object.defineProperty(value, key, { enumerable: true, value: {} });
      expect(() => parseThemeManifest(value)).toThrow(/prototype/);
    }
    let calls = 0;
    const value = draft(); Object.defineProperty(value, "name", { enumerable: true, get: () => { calls++; return "Injected"; } });
    expect(() => parseThemeManifest(value)).toThrow(/data property/); expect(calls).toBe(0);
    expect(() => parseThemeManifest(Object.create({ inherited: true }))).toThrow(/plain object/);
    expect(() => themeCanonicalJson(new Date())).toThrow(/plain object/);
    expect(() => themeCanonicalJson({ toJSON: () => { calls++; return {}; } })).toThrow(/JSON value/); expect(calls).toBe(0);
    expect(() => themeCanonicalJson({ [Symbol("private")]: 1 })).toThrow(/symbol/);
    expect(() => themeCanonicalJson(Object.defineProperty({}, "secret", { value: 1 }))).toThrow(/data property/);
  });

  it("rejects cycles, non-finite data, sparse arrays, deep and high-node inputs", () => {
    const cyclic: any = {}; cyclic.self = cyclic;
    for (const input of [cyclic, NaN, Infinity, 1n, undefined, new Array(2), { x: undefined }]) expect(() => themeCanonicalJson(input)).toThrow(ThemeValidationError);
    const deep = "[".repeat(20) + "0" + "]".repeat(20);
    expect(() => themeCanonicalJson(deep)).toThrow(/complexity/);
    expect(() => themeCanonicalJson(Array.from({ length: 4100 }, () => 0))).toThrow(ThemeValidationError);
    const customArray = [1]; Object.setPrototypeOf(customArray, {});
    expect(() => themeCanonicalJson(customArray)).toThrow(/plain dense/);
  });

  it("uses explicit UTF-16 key ordering and JSON number spelling independent of insertion order", () => {
    const first = { "\ud83d\ude00": 2, "\ue000": 1, "2": -0, "10": 3 };
    expect(themeCanonicalJson(first)).toBe('{"10":3,"2":0,"😀":2,"":1}');
    expect(themeCanonicalJson({ b: [3, 2], a: true })).toBe(themeCanonicalJson({ a: true, b: [3, 2] }));
    const raw = draft(), reordered = Object.fromEntries(Object.entries(raw).reverse());
    expect(serializeThemeManifest(raw)).toBe(serializeThemeManifest(reordered));
  });
});

describe("declared contrast evidence", () => {
  it("matches independent W3C sRGB anchors and both sides of the transfer breakpoint", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(relativeLuminance("#ff0000")).toBe(0.2126);
    expect(relativeLuminance("#00ff00")).toBe(0.7152);
    expect(relativeLuminance("#0000ff")).toBe(0.0722);
    expect(relativeLuminance("#0a0a0a")).toBeCloseTo(0.003035269835488375, 15);
    expect(relativeLuminance("#0b0b0b")).toBeCloseTo(0.003346535763899161, 15);
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#000000")).toBe(21);
    expect(contrastRatio("#336699", "#336699")).toBe(1);
    expect(() => relativeLuminance("rgba(0,0,0,.2)")).toThrow(ThemeValidationError);
  });

  it("does not round a failing 4.478... to a passing 4.5", () => {
    const value = draft(); value.colors.text = "#777777"; value.colors.bg = "#ffffff";
    const report = evaluateThemeAccessibility(value), actual = report.pairs.find(pair => pair.id === "text/bg")!;
    expect(actual.ratio).toBeCloseTo(4.478089453577214, 12);
    expect(actual.minimum).toBe(4.5); expect(actual.passes).toBe(false);
    expect(report.failures).toContain("text/bg"); expect(report.passes).toBe(false);
    value.colors.text = "#767676";
    expect(evaluateThemeAccessibility(value).pairs.find(pair => pair.id === "text/bg")!.passes).toBe(true);
    expect(parseThemeManifest(value)).toBeTruthy(); // Structural drafts remain repairable.
  });

  it("reports missing contrast for text, placeholders, active boundaries and status instead of silently passing", () => {
    const value = draft(); value.colors.focus = value.colors.bg; value.colors["control-line"] = value.colors["input-bg"];
    value.colors["text-faint"] = value.colors["input-bg"]; value.colors.danger = value.colors["danger-soft"];
    const report = evaluateThemeAccessibility(value);
    expect(report.failures).toEqual(expect.arrayContaining(["focus/bg", "control-line/input-bg", "text-faint/input-bg", "danger/danger-soft"]));
    expect(report.pairs.find(pair => pair.id === "disabled/disabled-bg")?.kind).toBe("inactive-product");
    expect(new Set(THEME_CONTRAST_PAIRS.map(pair => pair.id)).size).toBe(THEME_CONTRAST_PAIRS.length);
  });

  it.each(THEME_PRESET_IDS)("%s passes every declared pair and roundtrips its deterministic report", id => {
    const theme = getThemePreset(id), report = evaluateThemeAccessibility(theme);
    expect(report.failures).toEqual([]); expect(report.passes).toBe(true);
    expect(evaluateThemeAccessibility(serializeThemeManifest(theme))).toEqual(report);
    expect(Object.keys(theme.colors).sort()).toEqual([...THEME_COLOR_TOKENS].sort());
    expect(report.pairs.every(pair => Number.isFinite(pair.ratio))).toBe(true);
  });

  it("keeps PixelArt distinct in typography, geometry, icons, sampling and cadence", () => {
    const pixel = THEME_PRESETS.PixelArt;
    expect(pixel.typography).toEqual({ display: "mono", body: "mono", mono: "mono" });
    expect(pixel.geometry).toMatchObject({ radius: 0, border: 2, edges: "pixel", icons: "pixel" });
    expect(pixel.sampling).toBe("nearest"); expect(resolveTheme(pixel).motion.cadence).toBe("steps");
    expect(new Set(THEME_PRESET_IDS.map(id => serializeThemeManifest(THEME_PRESETS[id]))).size).toBe(5);
    expect(THEME_PRESETS.Medieval.colors.bg).not.toBe(THEME_PRESETS.Fantasy.colors.bg);
    expect(THEME_PRESETS.Cyberpunk.geometry.edges).not.toBe(THEME_PRESETS.Fantasy.geometry.edges);
    expect(PUBLIC_DEFAULT_THEME).toBe(THEME_PRESETS.Fantasy);
  });
});

describe("local accessibility resolution", () => {
  it("roundtrips all preferences independently of a campaign manifest", () => {
    const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, contrast: "high", font: "reader", density: "compact", atmosphere: "cinematic", localSkin: "Medieval" };
    const file = serializeAccessibilityPreferences(preferences);
    expect(parseAccessibilityPreferences(file)).toEqual(preferences);
    expect(Object.isFrozen(parseAccessibilityPreferences(file))).toBe(true);
    expect(recoverAccessibilityPreferences(file).recovered).toBe(false);
    expect(serializeThemeManifest(THEME_PRESETS.Fantasy)).not.toContain("localSkin");
  });

  it("restores malformed/future local storage to explicit safe defaults", () => {
    for (const input of [null, "{broken", { schemaVersion: 2 }, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, css: "unsafe" }]) {
      expect(() => parseAccessibilityPreferences(input)).toThrow(ThemeValidationError);
      expect(recoverAccessibilityPreferences(input)).toEqual({ preferences: DEFAULT_ACCESSIBILITY_PREFERENCES, recovered: true });
    }
  });

  it("preserves each OS restriction despite a local normal contrast or cinematic skin preference", () => {
    const preferences = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, contrast: "normal", atmosphere: "cinematic", localSkin: "PixelArt" };
    const resolved = resolveTheme(THEME_PRESETS.Medieval, preferences, { forcedColors: true, highContrast: true, reducedMotion: true, reducedTransparency: true });
    expect(resolved).toMatchObject({ basePreset: "PixelArt", forcedColors: true, highContrast: true, art: false, transparency: false, atmosphere: "clean", motion: { controlMs: 0, panelMs: 0, ambientMs: 0, cadence: "none" } });
    expect(resolved.colors).toEqual(HIGH_CONTRAST_COLORS);
    expect(evaluateThemeAccessibility({ ...THEME_PRESETS.PixelArt, colors: resolved.colors }).passes).toBe(true);
  });

  it("honors separate local art, reader font, density, motion and transparency choices", () => {
    const resolved = resolveTheme(THEME_PRESETS.PixelArt, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, art: "off", font: "reader", density: "compact", motion: "reduced", transparency: "reduced" });
    expect(resolved).toMatchObject({ art: false, transparency: false, highContrast: false, density: "compact", typography: { display: "plex", body: "plex", mono: "mono" }, sampling: "nearest", motion: { cadence: "none" } });
    expect(resolveTheme(THEME_PRESETS.PixelArt, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, font: "system" }).typography.body).toBe("system");
    expect(resolveTheme(THEME_PRESETS.PixelArt, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, atmosphere: "clean" }).art).toBe(false);
  });

  it("low power disables decorative work; contrast corrections cannot be disabled by a bad manifest", () => {
    const lowPower = resolveTheme(THEME_PRESETS.Fantasy, DEFAULT_ACCESSIBILITY_PREFERENCES, { lowPower: true });
    expect(lowPower).toMatchObject({ lowPower: true, art: false, transparency: false, atmosphere: "clean", motion: { cadence: "none" } });
    const value = draft(); value.colors.text = value.colors.bg;
    const resolved = resolveTheme(value, { ...DEFAULT_ACCESSIBILITY_PREFERENCES, contrast: "normal" });
    expect(resolved).toMatchObject({ correctedContrast: true, highContrast: true });
    expect(resolved.colors).toEqual(HIGH_CONTRAST_COLORS);
    expect(value.colors.text).toBe(value.colors.bg); // Source draft was not rewritten.
  });
});

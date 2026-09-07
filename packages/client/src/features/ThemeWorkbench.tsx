// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { evaluateThemeAccessibility, getThemePreset, parseThemeManifest, resolveTheme, serializeThemeManifest, THEME_COLOR_TOKENS, THEME_FONT_IDS, THEME_LICENSE_IDS, THEME_MOTION_IDS, THEME_PRESET_IDS, type ThemeManifestV1, type ThemePresetId } from "@chronicle/theme";
import type { AuthoringAck, ThemeCard, ThemePin } from "@chronicle/protocol";
import { api, apiPath, errorText, type Campaign } from "../api";
import { useResource, useTask } from "../hooks";
import { appearanceStyle, useAppearance } from "./Appearance";
import { useCommand } from "./game-api";
import { Dice6 } from "lucide-react";

const pretty = (theme: ThemeManifestV1) => JSON.stringify(theme, null, 2);
// A text field may be temporarily empty while typing. Keep its editor mounted;
// only the unchanged closed parser can admit a save or a resolved preview.
function editableTheme(text: string): ThemeManifestV1 | null {
  try {
    const raw = JSON.parse(text);
    if (typeof raw?.name !== "string" || typeof raw?.attribution?.creator !== "string") return null;
    const valid = parseThemeManifest({ ...raw, name: raw.name.trim() ? raw.name : "Entwurf", attribution: { ...raw.attribution, creator: raw.attribution.creator.trim() ? raw.attribution.creator : "Urheber" } });
    return { ...valid, name: raw.name, attribution: { ...valid.attribution, creator: raw.attribution.creator } };
  } catch { return null; }
}
export function ThemeWorkbench({ campaign, liveRevision, onDirty, onChanged }: { campaign: Campaign; liveRevision: number; onDirty: (dirty: boolean) => void; onChanged: () => void }) {
  const [revision, setRevision] = useState(0), [base, setBase] = useState<ThemeCard | null>(null);
  const [savedText, setSavedText] = useState(() => pretty(getThemePreset("Fantasy"))), [text, setText] = useState(savedText), [notice, setNotice] = useState("");
  const task = useTask(), command = useCommand(), upload = useRef<HTMLInputElement>(null), alive = useRef(true);
  const acknowledged = useRef(new Map<string, AuthoringAck>());
  const { preferences, system } = useAppearance();
  const themes = useResource<ThemeCard[]>(apiPath(campaign.id, "/themes"), revision + liveRevision);
  const pin = useResource<{ pin: ThemePin | null; manifest: ThemeManifestV1 }>(apiPath(campaign.id, "/theme-pin"), revision + liveRevision);
  const unavailable = !!themes.error && !themes.loaded;
  useEffect(() => {
    if (!unavailable) return;
    const fallback = pretty(getThemePreset("Fantasy"));
    setBase(null); setText(fallback); setSavedText(fallback); setNotice(""); acknowledged.current.clear();
  }, [unavailable]);
  const dirty = text !== savedText;
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const parsed = useMemo(() => { try { const manifest = parseThemeManifest(text); return { manifest, report: evaluateThemeAccessibility(manifest), error: "" }; } catch (error) { return { manifest: null, report: null, error: errorText(error) }; } }, [text]);
  const formManifest = useMemo(() => parsed.manifest ?? editableTheme(text), [parsed.manifest, text]);
  const preview = useMemo(() => parsed.manifest ? resolveTheme(parsed.manifest, { ...preferences, localSkin: null }, system) : null, [parsed.manifest, preferences, system]);
  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  const replace = (manifest: ThemeManifestV1, card: ThemeCard | null) => {
    if (dirty && !window.confirm("Ungespeicherten Theme-Entwurf verwerfen?")) return;
    const next = pretty(manifest); setBase(card); setText(next); setSavedText(card ? next : ""); setNotice(""); task.setError("");
  };
  const edit = (update: Partial<ThemeManifestV1>) => { if (formManifest) setText(pretty({ ...formManifest, ...update })); };
  const save = () => { if (!parsed.manifest || !parsed.report?.passes) return; const manifest = parsed.manifest, origin = base;
    void task.run(async () => {
      const key = JSON.stringify({ origin: origin ? [origin.id, origin.version] : null, manifest });
      const ack = acknowledged.current.get(key) ?? await command<AuthoringAck>(apiPath(campaign.id, origin ? `/themes/${encodeURIComponent(origin.id)}` : "/themes"), { manifest, ...(origin ? { expectedVersion: origin.version } : {}) }, origin ? "PUT" : "POST");
      acknowledged.current.set(key, ack);
      if (!alive.current) return;
      // Pin this acknowledged immutable revision, even if another GM already saved a newer one.
      const card = await api<ThemeCard>(apiPath(campaign.id, `/themes/${encodeURIComponent(ack.subjectId)}?revision=${ack.version}`));
      if (!alive.current) return;
      acknowledged.current.delete(key);
      setBase({ ...card, version: ack.version }); setText(pretty(card.manifest)); setSavedText(pretty(card.manifest)); setNotice("Theme-Version gespeichert. Die Runde behält ihr Theme bis zur ausdrücklichen Übernahme."); refresh();
    });
  };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    void task.run(async () => { if (file.size > 65_536) throw new Error("Eine Theme-Datei darf höchstens 64 KiB groß sein."); const manifest = parseThemeManifest(await file.text()); if (alive.current) replace(manifest, null); });
  };
  const download = () => { if (!base || dirty) return; const url = URL.createObjectURL(new Blob([serializeThemeManifest(base.manifest)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `theme-${base.id}-r${base.revision}.chronicle-theme`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (unavailable) return <Notice error>{themes.error}<Button onClick={refresh}>Zugriff erneut prüfen</Button></Notice>;
  return <section className="authoring-workbench"><header><p className="eyebrow">Darstellung für {campaign.name}</p><h1>Theme-Werkstatt</h1><p>Gestalte eine Vorlage, prüfe die Lesbarkeit und übernimm eine gespeicherte Version bewusst für die Runde.</p></header>
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {themes.error || pin.error ? <Notice error>{themes.error || pin.error} <Button onClick={refresh}>Erneut laden</Button></Notice> : null}
    <fieldset disabled={task.busy} className="authoring-controls"><div className="button-row">{THEME_PRESET_IDS.map(id => <Button key={id} onClick={() => replace(getThemePreset(id), null)}>Vorlage {id}</Button>)}<Button onClick={() => upload.current?.click()}>Theme-Datei öffnen</Button><input ref={upload} hidden type="file" accept=".chronicle-theme,.json,application/json" onChange={importFile} /></div></fieldset>
    {base && themes.data?.some(card => card.id === base.id && card.version > base.version) ? <Notice>Für dieses Theme liegt eine neuere Revision vor. Dein Entwurf behält seinen ursprünglichen Stand; wähle die neuere Version in der Bibliothek, bevor du weitere Änderungen übernimmst.</Notice> : null}
    <div className="authoring-columns"><aside className="panel"><h2>Gespeicherte Themes</h2>{themes.loading ? <Loading /> : null}{!themes.loading && !themes.data?.length ? <p>Noch keine eigene Vorlage gespeichert.</p> : null}
      {themes.data?.map(card => <Button key={card.id} disabled={task.busy} aria-pressed={base?.id === card.id} onClick={() => replace(card.manifest, card)}>{card.manifest.name} · Revision {card.revision}{pin.data?.pin?.themeId === card.id ? ` · Runde: ${pin.data.pin.revision}` : ""}</Button>)}
      <p>Versionen bleiben erhalten. Eine Datei öffnet stets einen neuen Entwurf.</p>
    </aside><section className="panel"><div className="section-heading"><h2>{base ? `Revision ${base.revision} bearbeiten` : "Neues Theme"}</h2><span>{dirty ? "Ungespeichert" : base ? "Gespeichert" : "Vorlage"}</span></div>
      <fieldset disabled={task.busy} className="authoring-controls">{formManifest ? <><div className="rule-fields"><label>Name<input maxLength={100} value={formManifest.name} onChange={e => edit({ name: e.target.value })} /></label><label>Grundstil<select value={formManifest.basePreset} onChange={e => edit({ basePreset: e.target.value as ThemePresetId })}>{THEME_PRESET_IDS.map(id => <option key={id}>{id}</option>)}</select></label>
        {(["display", "body"] as const).map(role => <label key={role}>{role === "display" ? "Überschriften" : "Lesetext"}<select value={formManifest!.typography[role]} onChange={e => edit({ typography: { ...formManifest!.typography, [role]: e.target.value } as ThemeManifestV1["typography"] })}>{THEME_FONT_IDS.map(id => <option key={id}>{id}</option>)}</select></label>)}
        <label>Bewegungsrhythmus<select value={formManifest.motion} onChange={e => edit({ motion: e.target.value as ThemeManifestV1["motion"] })}>{THEME_MOTION_IDS.map(id => <option key={id}>{id}</option>)}</select></label>
        <label>Bilddarstellung<select value={formManifest.sampling} onChange={e => edit({ sampling: e.target.value as ThemeManifestV1["sampling"] })}><option value="linear">Weich</option><option value="nearest">Pixelgenau</option></select></label>
      </div><details><summary>Farben bearbeiten</summary><div className="theme-colors">{THEME_COLOR_TOKENS.map(token => <label key={token}>{token}<input aria-label={`Farbe ${token}`} type="color" value={formManifest!.colors[token]} onChange={e => edit({ colors: { ...formManifest!.colors, [token]: e.target.value } })} /><code>{formManifest!.colors[token]}</code></label>)}</div></details>
      <details><summary>Kanten und Abstände</summary><div className="rule-fields">{(["spacing", "radius", "border", "edges", "icons"] as const).map(key => <label key={key}>{({ spacing: "Abstandseinheit", radius: "Rundung", border: "Linienstärke", edges: "Kanten", icons: "Symbole" })[key]}<select value={formManifest!.geometry[key]} onChange={e => edit({ geometry: { ...formManifest!.geometry, [key]: ["spacing", "radius", "border"].includes(key) ? Number(e.target.value) : e.target.value } as ThemeManifestV1["geometry"] })}>{({ spacing: [4, 6, 8], radius: [0, 4, 8, 12], border: [1, 2], edges: ["clean", "etched", "cut", "pixel"], icons: ["stroke", "rune", "facet", "pixel"] })[key].map(value => <option key={value}>{value}</option>)}</select></label>)}</div></details>
      <details><summary>Urheberschaft</summary><div className="rule-fields"><label>Urheber<input maxLength={200} value={formManifest.attribution.creator} onChange={e => edit({ attribution: { ...formManifest!.attribution, creator: e.target.value } })} /></label><label>Lizenz<select value={formManifest.attribution.license} onChange={e => edit({ attribution: { ...formManifest!.attribution, license: e.target.value as ThemeManifestV1["attribution"]["license"] } })}>{THEME_LICENSE_IDS.map(id => <option key={id}>{id}</option>)}</select></label></div><label>Hinweis<textarea maxLength={2000} value={formManifest.attribution.notice} onChange={e => edit({ attribution: { ...formManifest!.attribution, notice: e.target.value } })} /></label></details></> : null}
      <details open={!parsed.manifest}><summary>Theme-Datei bearbeiten</summary><label>Manifest<textarea className="theme-source" value={text} onChange={e => setText(e.target.value)} spellCheck={false} /></label></details></fieldset>
      {parsed.error ? <Notice error>{parsed.error}</Notice> : parsed.report ? <details className="theme-report" open={!parsed.report.passes}><summary>{parsed.report.passes ? `${parsed.report.pairs.length} geprüfte Kontrastpaare bestanden` : `${parsed.report.failures.length} Kontrastpaare müssen korrigiert werden`}</summary><p>Diese Prüfung bewertet die angegebenen Farbpaare. Prüfe zusätzlich die Vorschau mit deinen lokalen Leseeinstellungen.</p><ul>{parsed.report.pairs.filter(pair => !pair.passes).map(pair => <li key={pair.id}>{pair.id}: {pair.ratio.toFixed(2)}:1 · erforderlich {pair.minimum}:1</li>)}</ul></details> : null}
      <div className="button-row"><Button variant="primary" disabled={task.busy || !parsed.report?.passes || (!!base && !dirty)} onClick={save}>{base ? "Neue Revision speichern" : "Als neues Theme speichern"}</Button><Button disabled={task.busy || !base || dirty} onClick={download}>Gespeicherte Theme-Datei</Button>
        <Button disabled={task.busy || !base || dirty || !pin.loaded || !!pin.error || (pin.data?.pin?.themeId === base?.id && pin.data?.pin?.revision === base?.revision)} onClick={() => { if (!base) return; void task.run(async () => { await command(apiPath(campaign.id, "/theme-pin"), { expectedVersion: pin.data?.pin?.version ?? 0, themeId: base.id, revision: base.revision }, "PUT"); if (alive.current) { setNotice("Diese Theme-Version gilt jetzt für die Runde. Lokale Leseeinstellungen behalten Vorrang."); refresh(); } }); }}>Gespeicherte Revision für die Runde übernehmen</Button></div>
    </section></div>
    {preview ? <section className="panel theme-preview" aria-label="Theme-Vorschau" style={appearanceStyle(preview)} data-appearance-edges={preview.geometry.edges} data-appearance-icons={preview.geometry.icons} data-appearance-sampling={preview.sampling} data-appearance-motion={preview.motion.cadence} data-appearance-atmosphere={preview.atmosphere} data-appearance-density={preview.density}><h2>Vorschau: {formManifest!.name}</h2><p>Am Rand des Nebelwaldes beginnt ein neuer Pfad. <a href="#theme-example">Ein bekanntes Ziel</a> weist den Weg.</p><div className="rule-fields"><label>Charaktername<input defaultValue="Arin" /></label><label>Ausdauer<input type="number" defaultValue={12} /></label><label>Zustand<select><option>Bereit</option><option>Erschöpft</option></select></label></div><p id="theme-example"><strong>Wurf bestätigt:</strong> 17 · Probe gelungen</p><div className="button-row"><Button variant="primary"><Dice6 size={18} />Primäre Aktion</Button><Button disabled>Gerade nicht verfügbar</Button><Button variant="danger">Gefährliche Aktion</Button></div><Notice>Deine Auswahl ist gespeichert.</Notice><Notice error>Dieser Wert muss korrigiert werden.</Notice>{preview.correctedContrast ? <p>Für diese Vorschau ist eine Kontrastkorrektur aktiv. Ungültige Originalfarben können nicht gespeichert werden.</p> : null}</section> : null}
  </section>;
}

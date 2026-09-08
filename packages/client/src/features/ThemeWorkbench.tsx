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
import { t } from "../i18n";

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
    if (dirty && !window.confirm(t("Ungespeicherten Theme-Entwurf verwerfen?"))) return;
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
      setBase({ ...card, version: ack.version }); setText(pretty(card.manifest)); setSavedText(pretty(card.manifest)); setNotice(t("Theme-Version gespeichert. Die Runde behält ihr Theme bis zur ausdrücklichen Übernahme.")); refresh();
    });
  };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    void task.run(async () => { if (file.size > 65_536) throw new Error(t("Eine Theme-Datei darf höchstens 64 KiB groß sein.")); const manifest = parseThemeManifest(await file.text()); if (alive.current) replace(manifest, null); });
  };
  const download = () => { if (!base || dirty) return; const url = URL.createObjectURL(new Blob([serializeThemeManifest(base.manifest)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `theme-${base.id}-r${base.revision}.chronicle-theme`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (unavailable) return <Notice error>{themes.error}<Button onClick={refresh}>{t("Zugriff erneut prüfen")}</Button></Notice>;
  return <section className="authoring-workbench"><header><p className="eyebrow">{t("Darstellung für {name}", { name: campaign.name })}</p><h1>{t("Theme-Werkstatt")}</h1><p>{t("Gestalte eine Vorlage, prüfe die Lesbarkeit und übernimm eine gespeicherte Version bewusst für die Runde.")}</p></header>
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {themes.error || pin.error ? <Notice error>{themes.error || pin.error} <Button onClick={refresh}>{t("Erneut laden")}</Button></Notice> : null}
    <fieldset disabled={task.busy} className="authoring-controls"><div className="button-row">{THEME_PRESET_IDS.map(id => <Button key={id} onClick={() => replace(getThemePreset(id), null)}>{t("Vorlage {id}", { id })}</Button>)}<Button onClick={() => upload.current?.click()}>{t("Theme-Datei öffnen")}</Button><input ref={upload} hidden type="file" accept=".chronicle-theme,.json,application/json" onChange={importFile} /></div></fieldset>
    {base && themes.data?.some(card => card.id === base.id && card.version > base.version) ? <Notice>{t("Für dieses Theme liegt eine neuere Revision vor. Dein Entwurf behält seinen ursprünglichen Stand; wähle die neuere Version in der Bibliothek, bevor du weitere Änderungen übernimmst.")}</Notice> : null}
    <div className="authoring-columns"><aside className="panel"><h2>{t("Gespeicherte Themes")}</h2>{themes.loading ? <Loading /> : null}{!themes.loading && !themes.data?.length ? <p>{t("Noch keine eigene Vorlage gespeichert.")}</p> : null}
      {themes.data?.map(card => <Button key={card.id} disabled={task.busy} aria-pressed={base?.id === card.id} onClick={() => replace(card.manifest, card)}>{pin.data?.pin?.themeId === card.id ? t("{name} · Revision {revision} · Runde: {rundenRevision}", { name: card.manifest.name, revision: card.revision, rundenRevision: pin.data.pin.revision }) : t("{name} · Revision {revision}", { name: card.manifest.name, revision: card.revision })}</Button>)}
      <p>{t("Versionen bleiben erhalten. Eine Datei öffnet stets einen neuen Entwurf.")}</p>
    </aside><section className="panel"><div className="section-heading"><h2>{base ? t("Revision {revision} bearbeiten", { revision: base.revision }) : t("Neues Theme")}</h2><span>{dirty ? t("Ungespeichert") : base ? t("Gespeichert") : /* „Vorlage" ist der Wiki-Namensraum aus `packages/io` und im Katalog gesperrt (Deny-Liste); das Wort bleibt daher deutsch. */ "Vorlage"}</span></div>
      <fieldset disabled={task.busy} className="authoring-controls">{formManifest ? <><div className="rule-fields"><label>{t("Name")}<input maxLength={100} value={formManifest.name} onChange={e => edit({ name: e.target.value })} /></label><label>{t("Grundstil")}<select value={formManifest.basePreset} onChange={e => edit({ basePreset: e.target.value as ThemePresetId })}>{THEME_PRESET_IDS.map(id => <option key={id}>{id}</option>)}</select></label>
        {(["display", "body"] as const).map(role => <label key={role}>{role === "display" ? t("Überschriften") : t("Lesetext")}<select value={formManifest!.typography[role]} onChange={e => edit({ typography: { ...formManifest!.typography, [role]: e.target.value } as ThemeManifestV1["typography"] })}>{THEME_FONT_IDS.map(id => <option key={id}>{id}</option>)}</select></label>)}
        <label>{t("Bewegungsrhythmus")}<select value={formManifest.motion} onChange={e => edit({ motion: e.target.value as ThemeManifestV1["motion"] })}>{THEME_MOTION_IDS.map(id => <option key={id}>{id}</option>)}</select></label>
        <label>{t("Bilddarstellung")}<select value={formManifest.sampling} onChange={e => edit({ sampling: e.target.value as ThemeManifestV1["sampling"] })}><option value="linear">{t("Weich")}</option><option value="nearest">{t("Pixelgenau")}</option></select></label>
      </div><details><summary>{t("Farben bearbeiten")}</summary><div className="theme-colors">{THEME_COLOR_TOKENS.map(token => <label key={token}>{token}<input aria-label={t("Farbe {token}", { token })} type="color" value={formManifest!.colors[token]} onChange={e => edit({ colors: { ...formManifest!.colors, [token]: e.target.value } })} /><code>{formManifest!.colors[token]}</code></label>)}</div></details>
      <details><summary>{t("Kanten und Abstände")}</summary><div className="rule-fields">{(["spacing", "radius", "border", "edges", "icons"] as const).map(key => <label key={key}>{({ spacing: t("Abstandseinheit"), radius: t("Rundung"), border: t("Linienstärke"), edges: t("Kanten"), icons: t("Symbole") })[key]}<select value={formManifest!.geometry[key]} onChange={e => edit({ geometry: { ...formManifest!.geometry, [key]: ["spacing", "radius", "border"].includes(key) ? Number(e.target.value) : e.target.value } as ThemeManifestV1["geometry"] })}>{({ spacing: [4, 6, 8], radius: [0, 4, 8, 12], border: [1, 2], edges: ["clean", "etched", "cut", "pixel"], icons: ["stroke", "rune", "facet", "pixel"] })[key].map(value => <option key={value}>{value}</option>)}</select></label>)}</div></details>
      <details><summary>{t("Urheberschaft")}</summary><div className="rule-fields"><label>{t("Urheber")}<input maxLength={200} value={formManifest.attribution.creator} onChange={e => edit({ attribution: { ...formManifest!.attribution, creator: e.target.value } })} /></label><label>{t("Lizenz")}<select value={formManifest.attribution.license} onChange={e => edit({ attribution: { ...formManifest!.attribution, license: e.target.value as ThemeManifestV1["attribution"]["license"] } })}>{THEME_LICENSE_IDS.map(id => <option key={id}>{id}</option>)}</select></label></div><label>{t("Hinweis")}<textarea maxLength={2000} value={formManifest.attribution.notice} onChange={e => edit({ attribution: { ...formManifest!.attribution, notice: e.target.value } })} /></label></details></> : null}
      <details open={!parsed.manifest}><summary>{t("Theme-Datei bearbeiten")}</summary><label>{t("Manifest")}<textarea className="theme-source" value={text} onChange={e => setText(e.target.value)} spellCheck={false} /></label></details></fieldset>
      {parsed.error ? <Notice error>{parsed.error}</Notice> : parsed.report ? <details className="theme-report" open={!parsed.report.passes}><summary>{parsed.report.passes ? t("{anzahl} geprüfte Kontrastpaare bestanden", { anzahl: parsed.report.pairs.length }) : t("{anzahl} Kontrastpaare müssen korrigiert werden", { anzahl: parsed.report.failures.length })}</summary><p>{t("Diese Prüfung bewertet die angegebenen Farbpaare. Prüfe zusätzlich die Vorschau mit deinen lokalen Leseeinstellungen.")}</p><ul>{parsed.report.pairs.filter(pair => !pair.passes).map(pair => <li key={pair.id}>{t("{id}: {verhaeltnis}:1 · erforderlich {minimum}:1", { id: pair.id, verhaeltnis: pair.ratio.toFixed(2), minimum: pair.minimum })}</li>)}</ul></details> : null}
      <div className="button-row"><Button variant="primary" disabled={task.busy || !parsed.report?.passes || (!!base && !dirty)} onClick={save}>{base ? t("Neue Revision speichern") : t("Als neues Theme speichern")}</Button><Button disabled={task.busy || !base || dirty} onClick={download}>{t("Gespeicherte Theme-Datei")}</Button>
        <Button disabled={task.busy || !base || dirty || !pin.loaded || !!pin.error || (pin.data?.pin?.themeId === base?.id && pin.data?.pin?.revision === base?.revision)} onClick={() => { if (!base) return; void task.run(async () => { await command(apiPath(campaign.id, "/theme-pin"), { expectedVersion: pin.data?.pin?.version ?? 0, themeId: base.id, revision: base.revision }, "PUT"); if (alive.current) { setNotice(t("Diese Theme-Version gilt jetzt für die Runde. Lokale Leseeinstellungen behalten Vorrang.")); refresh(); } }); }}>{t("Gespeicherte Revision für die Runde übernehmen")}</Button></div>
    </section></div>
    {preview ? <section className="panel theme-preview" aria-label={t("Theme-Vorschau")} style={appearanceStyle(preview)} data-appearance-edges={preview.geometry.edges} data-appearance-icons={preview.geometry.icons} data-appearance-sampling={preview.sampling} data-appearance-motion={preview.motion.cadence} data-appearance-atmosphere={preview.atmosphere} data-appearance-density={preview.density}><h2>{t("Vorschau: {name}", { name: formManifest!.name })}</h2><p>{t("Am Rand des Nebelwaldes beginnt ein neuer Pfad.")} <a href="#theme-example">{t("Ein bekanntes Ziel weist den Weg.")}</a></p><div className="rule-fields"><label>{t("Charaktername")}<input defaultValue="Arin" /></label><label>{t("Ausdauer")}<input type="number" defaultValue={12} /></label><label>{t("Zustand")}<select><option>{t("Bereit")}</option><option>{t("Erschöpft")}</option></select></label></div><p id="theme-example"><strong>{t("Wurf bestätigt:")}</strong> {t("17 · Probe gelungen")}</p><div className="button-row"><Button variant="primary"><Dice6 size={18} />{t("Primäre Aktion")}</Button><Button disabled>{t("Gerade nicht verfügbar")}</Button><Button variant="danger">{t("Gefährliche Aktion")}</Button></div><Notice>{t("Deine Auswahl ist gespeichert.")}</Notice><Notice error>{t("Dieser Wert muss korrigiert werden.")}</Notice>{preview.correctedContrast ? <p>{t("Für diese Vorschau ist eine Kontrastkorrektur aktiv. Ungültige Originalfarben können nicht gespeichert werden.")}</p> : null}</section> : null}
  </section>;
}

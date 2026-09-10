// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { LOOK_LABEL } from "./look-namen";
import {
  ABSTAND_LABEL, FARBGRUPPEN, FARBGRUPPE_LABEL, FARBROLLE_ERKLAERUNG_LABEL, FARBROLLE_LABEL, FORM_LABEL,
  KANTE_ERKLAERUNG_LABEL, KANTE_LABEL, LIZENZ_LABEL, RUNDUNG_LABEL, SCHRIFT_ERKLAERUNG_LABEL, SCHRIFT_LABEL,
  STRICH_LABEL, SYMBOL_LABEL, TEMPO_ERKLAERUNG_LABEL, TEMPO_LABEL,
} from "./gestaltung-namen";
import { Button, Loading, Notice } from "@chronicle/ui";
import { evaluateThemeAccessibility, getThemePreset, parseThemeManifest, resolveTheme, serializeThemeManifest, suggestAccessibleColor, THEME_FONT_IDS, THEME_LICENSE_IDS, THEME_MOTION_IDS, THEME_PRESET_IDS, type ThemeColorToken, type ThemeManifestV1, type ThemePresetId } from "@chronicle/theme";
import type { AuthoringAck, ThemeCard, ThemePin } from "@chronicle/protocol";
import { api, apiPath, errorText, type Campaign } from "../api";
import { useResource, useTask } from "../hooks";
import { appearanceStyle, SCHRIFT_FAMILIEN, useAppearance } from "./Appearance";
import { useCommand } from "./game-api";
import { Dice6 } from "lucide-react";
import { locale, t } from "../i18n";

const pretty = (theme: ThemeManifestV1) => JSON.stringify(theme, null, 2);
/** Zwei Nachkommastellen in der Schreibweise der gewählten Sprache. */
const zahl = (wert: number) => wert.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/**
 * Die Schriftwahl als Schaltfläche je Schrift — und jede trägt ihren Namen IN ihrer Schrift.
 *
 * Vorher war das eine Auswahlliste mit den Einträgen `cinzel`, `plex`, `system`, `serif`,
 * `mono`, alle in derselben Schrift gesetzt. Man wählte also blind zwischen fünf Wörtern, die
 * nichts bedeuten. Jetzt ist die Schrift ihr eigenes Muster: was man liest, bekommt man.
 */
function Schriftwahl({ typography, aendere }: {
  typography: ThemeManifestV1["typography"];
  aendere: (rolle: "display" | "body", schrift: ThemeManifestV1["typography"]["display"]) => void;
}) {
  return <div className="schrift-wahl">
    {(["display", "body"] as const).map(rolle => <fieldset key={rolle} className="schrift-rolle">
      <legend>{rolle === "display" ? t("Überschriften") : t("Lesetext")}</legend>
      <div className="schrift-knoepfe">
        {THEME_FONT_IDS.map(schrift => <button key={schrift} type="button" className="schrift-knopf"
          aria-pressed={typography[rolle] === schrift} onClick={() => aendere(rolle, schrift)}
          style={{ fontFamily: SCHRIFT_FAMILIEN[schrift] }}>
          <strong>{t(SCHRIFT_LABEL[schrift])}</strong>
          <span>{t("Am Rand des Nebelwaldes · 17")}</span>
        </button>)}
      </div>
      <p className="field-help">{t(SCHRIFT_ERKLAERUNG_LABEL[typography[rolle]])}</p>
    </fieldset>)}
    <div className="schrift-probe">
      <span className="probe-marke">{t("So sieht die Kombination aus")}</span>
      <p className="probe-titel" style={{ fontFamily: SCHRIFT_FAMILIEN[typography.display] }}>{t("Die offenen Annalen")}</p>
      <p className="probe-text" style={{ fontFamily: SCHRIFT_FAMILIEN[typography.body] }}>{t("Am Rand des Nebelwaldes beginnt ein neuer Pfad. Zwei Tagesmärsche nördlich liegen die Ruinen von Hallstett.")}</p>
      <p className="probe-zahlen" style={{ fontFamily: SCHRIFT_FAMILIEN.mono }}>{t("Wurf: d20 → 17 + 3 = 20")}</p>
    </div>
  </div>;
}

/**
 * `#rrggbb`, ausgeschrieben statt als Regex.
 *
 * Das ist kein Stilentscheid: ein `#` INNERHALB eines Regex-Literals bringt den
 * TypeScript-Lexer zum Stehen, den `tools/gate-sprache.mjs` zum Lesen dieser Datei benutzt.
 * Das Gate bricht seit dem 10. September 2026 mit einer klaren Meldung ab, statt die halbe
 * Datei stillschweigend zu verschlucken — aber abbrechen würde es trotzdem.
 */
const ZIFFERN = "0123456789abcdef";
function istFarbwert(wert: string): boolean {
  if (wert.length !== 7 || wert[0] !== "#") return false;
  for (const zeichen of wert.slice(1)) if (!ZIFFERN.includes(zeichen.toLowerCase())) return false;
  return true;
}

/**
 * Ein Farbfeld: Rollenname, Erklärsatz, Farbwähler UND ein Textfeld für den Wert.
 *
 * Das Textfeld ist nicht Bequemlichkeit, sondern Bedienbarkeit: wo der Farbwähler des
 * Betriebssystems nicht mit der Tastatur bedienbar ist, war die Farbe vorher gar nicht
 * erreichbar — der Wert stand nur als unveränderlicher Text daneben.
 *
 * `entwurf` hält, was gerade getippt wird. Ohne das könnte man „#1e" nicht schreiben: die
 * Zwischenstufe ist kein gültiger Wert und würde bei jedem Tastendruck zurückgesetzt.
 */
function Farbfeld({ token, wert, fehlend, vorschlag, aendere, uebernehmen }: {
  token: ThemeColorToken; wert: string; fehlend: number; vorschlag: string | null;
  aendere: (naechster: string) => void; uebernehmen: () => void;
}) {
  const [entwurf, setEntwurf] = useState<string | null>(null);
  const tippen = (eingabe: string) => {
    setEntwurf(eingabe);
    if (istFarbwert(eingabe)) { aendere(eingabe.toLowerCase()); setEntwurf(null); }
  };
  return <div className={`farbfeld${fehlend > 0 ? " farbfeld-fehlend" : ""}`}>
    <span className="farb-probe" style={{ background: wert }} aria-hidden="true" />
    <div className="farb-koerper">
      <label className="farb-name">{t(FARBROLLE_LABEL[token])}
        <input type="color" value={wert} onChange={ereignis => { setEntwurf(null); aendere(ereignis.target.value); }} />
      </label>
      <label className="farb-wert">{t("Farbwert")}
        <input type="text" inputMode="text" spellCheck={false} maxLength={7} value={entwurf ?? wert}
          onChange={ereignis => tippen(ereignis.target.value)} onBlur={() => setEntwurf(null)} />
      </label>
      <p className="field-help">{t(FARBROLLE_ERKLAERUNG_LABEL[token])}</p>
      {fehlend > 0 ? <div className="farb-warnung">
        <p>{fehlend === 1
          ? t("Auf einer Fläche hebt sich diese Farbe zu wenig ab.")
          : t("Auf {anzahl} Flächen hebt sich diese Farbe zu wenig ab.", { anzahl: fehlend })}</p>
        {vorschlag
          ? <Button onClick={uebernehmen}>{t("Auf {farbe} aufhellen oder abdunkeln", { farbe: vorschlag })}</Button>
          : <p className="field-help">{t("Keine Helligkeit dieser Farbe reicht aus. Ändere stattdessen die Fläche, auf der sie liegt.")}</p>}
      </div> : null}
    </div>
  </div>;
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

  /**
   * Was der Bericht meldet, umgerechnet auf die FARBEN statt auf die Paarungen.
   *
   * Eine zu dunkle Schrift erzeugt zwölf Meldungen — eine je Fläche. Zwölf Zeilen, die alle
   * dieselbe Reparatur verlangen, sind keine Hilfe. Deshalb steht hier je Farbe ein Eintrag
   * mit der Anzahl ihrer verfehlten Flächen und einem fertigen Vorschlag.
   *
   * **Gezählt wird nur der Vordergrund.** Beim ersten Versuch zählte auch der Hintergrund mit,
   * und dann färbte eine einzige zu dunkle Schrift dreizehn Felder rot: die Schrift und alle
   * zwölf Flächen, auf denen sie liegt. Wer eine Farbe verstellt hat, sucht die Farbe, die er
   * verstellt hat — nicht die Liste aller Flächen, die sie berührt. Der Vorschlag selbst
   * betrachtet weiterhin beide Rollen, sonst repariert er die Schrift und zerbricht die
   * Statusfarbe auf derselben Fläche; und die Aufklappliste darunter nennt ohnehin beide
   * Farben beim Namen, sodass auch die Gegenrichtung auffindbar bleibt.
   */
  const problemfarben = useMemo(() => {
    if (!parsed.manifest || !parsed.report || parsed.report.passes) return [];
    const zaehler = new Map<ThemeColorToken, number>();
    for (const paar of parsed.report.pairs) {
      if (!paar.passes) zaehler.set(paar.foreground, (zaehler.get(paar.foreground) ?? 0) + 1);
    }
    return [...zaehler].map(([token, anzahl]) => {
      const vorschlag = suggestAccessibleColor(parsed.manifest!, token);
      return { token, anzahl, suggestion: vorschlag.suggestion };
    });
  }, [parsed.manifest, parsed.report]);

  const refresh = () => { setRevision(value => value + 1); onChanged(); };
  const replace = (manifest: ThemeManifestV1, card: ThemeCard | null) => {
    if (dirty && !window.confirm(t("Deinen Entwurf verwerfen? Du hast Änderungen am Aussehen, die noch nicht gespeichert sind."))) return;
    const next = pretty(manifest); setBase(card); setText(next); setSavedText(card ? next : ""); setNotice(""); task.setError("");
  };
  const edit = (update: Partial<ThemeManifestV1>) => { if (formManifest) setText(pretty({ ...formManifest, ...update })); };
  const setzeFarbe = (token: ThemeColorToken, wert: string) => { if (formManifest) edit({ colors: { ...formManifest.colors, [token]: wert } }); };
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
      setBase({ ...card, version: ack.version }); setText(pretty(card.manifest)); setSavedText(pretty(card.manifest)); setNotice(t("Dein Entwurf ist gespeichert. Am Tisch sieht noch niemand etwas davon — erst der Knopf „Für alle am Tisch freischalten“ zeigt ihn der Runde.")); refresh();
    });
  };
  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    void task.run(async () => { if (file.size > 65_536) throw new Error(t("Diese Datei ist zu groß. Eine Gestaltungsdatei darf höchstens 64 Kilobyte haben.")); const manifest = parseThemeManifest(await file.text()); if (alive.current) replace(manifest, null); });
  };
  const download = () => { if (!base || dirty) return; const url = URL.createObjectURL(new Blob([serializeThemeManifest(base.manifest)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `theme-${base.id}-r${base.revision}.chronicle-theme`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (unavailable) return <Notice error>{themes.error}<Button onClick={refresh}>{t("Nochmal versuchen")}</Button></Notice>;

  const gesperrt = !parsed.report?.passes;
  return <section className="authoring-workbench"><header><p className="eyebrow">{t("Darstellung für {name}", { name: campaign.name })}</p><h1>{t("Aussehen der Runde gestalten")}</h1><p>{t("Stelle Farben, Schriften und Formen ein, lass die Lesbarkeit prüfen, speichere den Entwurf — und schalte ihn erst dann für alle am Tisch frei.")}</p></header>
    {task.error ? <Notice error>{task.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {themes.error || pin.error ? <Notice error>{themes.error || pin.error} <Button onClick={refresh}>{t("Erneut laden")}</Button></Notice> : null}
    <fieldset disabled={task.busy} className="authoring-controls"><div className="button-row">{THEME_PRESET_IDS.map(id => <Button key={id} onClick={() => replace(getThemePreset(id), null)}>{t("Mit {name} beginnen", { name: t(LOOK_LABEL[id]) })}</Button>)}<Button onClick={() => upload.current?.click()}>{t("Gestaltung aus Datei laden")}</Button><input ref={upload} hidden type="file" accept=".chronicle-theme,.json,application/json" onChange={importFile} /></div></fieldset>
    {base && themes.data?.some(card => card.id === base.id && card.version > base.version) ? <Notice>{t("Jemand anders hat diese Gestaltung inzwischen geändert. Du bearbeitest noch die ältere Fassung — wähle links die neueste, sonst überschreibst du fremde Änderungen.")}</Notice> : null}
    <div className="authoring-columns"><aside className="panel"><h2>{t("Deine gespeicherten Gestaltungen")}</h2>{themes.loading ? <Loading /> : null}{!themes.loading && !themes.data?.length ? <p>{t("Du hast noch keine eigene Gestaltung gespeichert.")}</p> : null}
      {themes.data?.map(card => <Button key={card.id} disabled={task.busy} aria-pressed={base?.id === card.id} onClick={() => replace(card.manifest, card)}>{pin.data?.pin?.themeId === card.id ? t("{name} — Fassung {revision} · am Tisch: Fassung {rundenRevision}", { name: card.manifest.name, revision: card.revision, rundenRevision: pin.data.pin.revision }) : t("{name} — Fassung {revision}", { name: card.manifest.name, revision: card.revision })}</Button>)}
      <p>{t("Ältere Fassungen werden nie gelöscht — du kannst jederzeit zurück. Eine geladene Datei überschreibt nichts, sondern beginnt einen neuen Entwurf.")}</p>
    </aside><section className="panel"><div className="section-heading"><h2>{base ? t("Fassung {revision} bearbeiten", { revision: base.revision }) : t("Neue Gestaltung")}</h2><span role="status">{dirty ? t("Noch nicht gespeichert") : base ? t("Gespeichert") : t("Unverändertes Beispiel")}</span></div>
      <fieldset disabled={task.busy} className="authoring-controls">{formManifest ? <><div className="rule-fields"><label>{t("Name")}<input maxLength={100} value={formManifest.name} onChange={e => edit({ name: e.target.value })} /></label><label>{t("Ausgangs-Aussehen")}<select value={formManifest.basePreset} onChange={e => edit({ basePreset: e.target.value as ThemePresetId })}>{THEME_PRESET_IDS.map(id => <option key={id} value={id}>{t(LOOK_LABEL[id])}</option>)}</select></label></div>
        <p className="field-help">{t("Das Ausgangs-Aussehen bestimmt die Grundform, von der du losgehst. Deine eigenen Farben stehen darüber.")}</p>

        <details open><summary>{t("Schriften")}</summary>
          <Schriftwahl typography={formManifest.typography}
            aendere={(rolle, schrift) => edit({ typography: { ...formManifest.typography, [rolle]: schrift } as ThemeManifestV1["typography"] })} />
        </details>

        <details><summary>{t("Farben")}</summary>
          <p className="field-help">{t("Vierunddreißig Farben ergeben ein Aussehen. Jede hat eine feste Aufgabe — der Satz unter dem Feld sagt, wo im Bild du sie siehst.")}</p>
          {FARBGRUPPEN.map(({ gruppe, token }) => <section key={gruppe} className="farbgruppe">
            <h3>{t(FARBGRUPPE_LABEL[gruppe])}</h3>
            <div className="farbfelder">{token.map(name => {
              const eintrag = problemfarben.find(kandidat => kandidat.token === name);
              return <Farbfeld key={name} token={name} wert={formManifest.colors[name]}
                fehlend={eintrag?.anzahl ?? 0} vorschlag={eintrag?.suggestion ?? null}
                aendere={wert => setzeFarbe(name, wert)}
                uebernehmen={() => { if (eintrag?.suggestion) setzeFarbe(name, eintrag.suggestion); }} />;
            })}</div>
          </section>)}
        </details>

        <details><summary>{t("Form und Abstände")}</summary>
          <div className="rule-fields">
            <label>{t(FORM_LABEL.spacing)}<select value={formManifest.geometry.spacing} onChange={e => edit({ geometry: { ...formManifest.geometry, spacing: Number(e.target.value) } as ThemeManifestV1["geometry"] })}>{[4, 6, 8].map(wert => <option key={wert} value={wert}>{t(ABSTAND_LABEL[wert]!)}</option>)}</select></label>
            <label>{t(FORM_LABEL.radius)}<select value={formManifest.geometry.radius} onChange={e => edit({ geometry: { ...formManifest.geometry, radius: Number(e.target.value) } as ThemeManifestV1["geometry"] })}>{[0, 4, 8, 12].map(wert => <option key={wert} value={wert}>{t(RUNDUNG_LABEL[wert]!)}</option>)}</select></label>
            <label>{t(FORM_LABEL.border)}<select value={formManifest.geometry.border} onChange={e => edit({ geometry: { ...formManifest.geometry, border: Number(e.target.value) } as ThemeManifestV1["geometry"] })}>{[1, 2].map(wert => <option key={wert} value={wert}>{t(STRICH_LABEL[wert]!)}</option>)}</select></label>
            <label>{t(FORM_LABEL.edges)}<select value={formManifest.geometry.edges} onChange={e => edit({ geometry: { ...formManifest.geometry, edges: e.target.value } as ThemeManifestV1["geometry"] })}>{(["clean", "etched", "cut", "pixel"] as const).map(wert => <option key={wert} value={wert}>{t(KANTE_LABEL[wert])}</option>)}</select></label>
            <label>{t(FORM_LABEL.icons)}<select value={formManifest.geometry.icons} onChange={e => edit({ geometry: { ...formManifest.geometry, icons: e.target.value } as ThemeManifestV1["geometry"] })}>{(["stroke", "rune", "facet", "pixel"] as const).map(wert => <option key={wert} value={wert}>{t(SYMBOL_LABEL[wert])}</option>)}</select></label>
          </div>
          <p className="field-help">{t(KANTE_ERKLAERUNG_LABEL[formManifest.geometry.edges])} {t("Die Beispielansicht ganz unten zeigt dir sofort, wie das aussieht.")}</p>
        </details>

        <details><summary>{t("Bewegung und Bilder")}</summary>
          <div className="rule-fields">
            <label>{t("Tempo der Übergänge")}<select value={formManifest.motion} onChange={e => edit({ motion: e.target.value as ThemeManifestV1["motion"] })}>{THEME_MOTION_IDS.map(id => <option key={id} value={id}>{t(TEMPO_LABEL[id])}</option>)}</select></label>
            <label>{t("Bilder beim Vergrößern")}<select value={formManifest.sampling} onChange={e => edit({ sampling: e.target.value as ThemeManifestV1["sampling"] })}><option value="linear">{t("Weichzeichnen")}</option><option value="nearest">{t("Harte Pixel zeigen")}</option></select></label>
          </div>
          <p className="field-help">{t(TEMPO_ERKLAERUNG_LABEL[formManifest.motion])} {t("Harte Pixel passen zu Pixelgrafik-Karten, Weichzeichnen zu gemalten Karten und Fotos.")}</p>
        </details>

        <details><summary>{t("Urheberschaft")}</summary><div className="rule-fields"><label>{t("Urheber")}<input maxLength={200} value={formManifest.attribution.creator} onChange={e => edit({ attribution: { ...formManifest.attribution, creator: e.target.value } })} /></label><label>{t("Wer darf diese Gestaltung weiterverwenden?")}<select value={formManifest.attribution.license} onChange={e => edit({ attribution: { ...formManifest.attribution, license: e.target.value as ThemeManifestV1["attribution"]["license"] } })}>{THEME_LICENSE_IDS.map(id => <option key={id} value={id}>{t(LIZENZ_LABEL[id])}</option>)}</select></label></div>
          <p className="field-help">{t("Das ist deine eigene Angabe. Das Programm prüft nicht, ob sie stimmt.")}</p>
          <label>{t("Hinweis zur Herkunft (freiwillig)")}<textarea maxLength={2000} value={formManifest.attribution.notice} onChange={e => edit({ attribution: { ...formManifest.attribution, notice: e.target.value } })} /></label>
          <p className="field-help">{t("Zum Beispiel: woher die Farben stammen oder wem du danken möchtest. Erscheint bei einer veröffentlichten Welt.")}</p>
        </details></> : null}
      <details open={!parsed.manifest}><summary>{t("Für Fortgeschrittene: Gestaltung als Text")}</summary>
        <label>{t("Textfassung der Gestaltung")}<textarea className="theme-source" value={text} onChange={e => setText(e.target.value)} spellCheck={false}
          aria-invalid={!!parsed.error} aria-describedby={parsed.error ? "gestaltung-textfehler" : undefined} /></label>
        <p className="field-help">{t("Hier steht dieselbe Gestaltung als Text. Du brauchst das nur, wenn du eine Datei von Hand reparieren willst.")}</p>
      </details></fieldset>

      {parsed.error ? <Notice error><span id="gestaltung-textfehler">{t("Die Textfassung lässt sich nicht lesen: {grund}", { grund: parsed.error })}</span></Notice>
        : parsed.report ? <div className="lesbarkeit" data-besteht={parsed.report.passes ? "ja" : "nein"}>
          <h3>{parsed.report.passes
            ? t("Lesbarkeit geprüft: alle {anzahl} Farbkombinationen sind gut lesbar.", { anzahl: parsed.report.pairs.length })
            : t("{anzahl} Farbkombinationen sind zu blass zum Lesen.", { anzahl: parsed.report.failures.length })}</h3>
          <p className="field-help">{t("Geprüft wird, ob sich Schrift von ihrem Hintergrund deutlich genug abhebt. Die Prüfung erfasst nur die Farben, nicht die Schriftgröße — schau dir die Beispielansicht zusätzlich mit deinen eigenen Einstellungen an.")}</p>
          {!parsed.report.passes ? <>
            <ul className="lesbarkeit-farben">{problemfarben.map(eintrag => <li key={eintrag.token}>
              <strong>{t(FARBROLLE_LABEL[eintrag.token])}</strong>
              <span>{eintrag.anzahl === 1 ? t("verfehlt eine Kombination") : t("verfehlt {anzahl} Kombinationen", { anzahl: eintrag.anzahl })}</span>
              {eintrag.suggestion ? <Button onClick={() => setzeFarbe(eintrag.token, eintrag.suggestion!)}>{t("Auf {farbe} ändern", { farbe: eintrag.suggestion })}</Button> : null}
            </li>)}</ul>
            <details className="theme-report"><summary>{t("Welche Kombinationen genau")}</summary>
              <ul>{parsed.report.pairs.filter(paar => !paar.passes).map(paar => <li key={paar.id}>
                {t("„{vorn}“ auf „{hinten}“ — gemessen {ist} zu 1, nötig sind {soll} zu 1.", {
                  vorn: t(FARBROLLE_LABEL[paar.foreground]), hinten: t(FARBROLLE_LABEL[paar.background]),
                  ist: zahl(paar.ratio), soll: zahl(paar.minimum),
                })}
              </li>)}</ul>
            </details>
          </> : null}
        </div> : null}

      <div className="button-row">
        <Button variant="primary" aria-describedby={gesperrt ? "speichern-gesperrt" : undefined} disabled={task.busy || gesperrt || (!!base && !dirty)} onClick={save}>{base ? t("Als neue Fassung speichern") : t("Als neue Gestaltung speichern")}</Button>
        <Button disabled={task.busy || !base || dirty} onClick={download}>{t("Gestaltung als Datei herunterladen")}</Button>
        <Button disabled={task.busy || !base || dirty || !pin.loaded || !!pin.error || (pin.data?.pin?.themeId === base?.id && pin.data?.pin?.revision === base?.revision)} onClick={() => { if (!base) return; void task.run(async () => { await command(apiPath(campaign.id, "/theme-pin"), { expectedVersion: pin.data?.pin?.version ?? 0, themeId: base.id, revision: base.revision }, "PUT"); if (alive.current) { setNotice(t("Freigeschaltet. Alle in dieser Runde sehen jetzt dieses Aussehen — außer, sie haben sich selbst ein anderes eingestellt.")); refresh(); } }); }}>{t("Für alle am Tisch freischalten")}</Button>
      </div>
      {/* Ein gesperrter Knopf ist nicht fokussierbar; ohne diesen Satz stolpert niemand über
          den Grund. Er steht sichtbar da UND haengt per `aria-describedby` am Knopf. */}
      {gesperrt ? <p className="field-help" id="speichern-gesperrt">{t("Speichern ist gesperrt, solange oben Farbkombinationen zu blass zum Lesen sind.")}</p> : null}
    </section></div>

    {preview ? <section className="panel theme-preview" aria-label={t("Beispielansicht — nur zum Ansehen")} inert style={appearanceStyle(preview)} data-appearance-edges={preview.geometry.edges} data-appearance-icons={preview.geometry.icons} data-appearance-sampling={preview.sampling} data-appearance-motion={preview.motion.cadence} data-appearance-atmosphere={preview.atmosphere} data-appearance-density={preview.density}>
      <h2>{t("Beispielansicht: {name}", { name: formManifest!.name })}</h2>
      <p className="vorschau-hinweis">{t("Alles unterhalb dieser Zeile ist ein Beispiel und tut nichts. Es zeigt nur, wie deine Gestaltung aussieht.")}</p>
      <p>{t("Am Rand des Nebelwaldes beginnt ein neuer Pfad.")} <a href="#theme-example">{t("Ein bekanntes Ziel weist den Weg.")}</a></p>
      <div className="rule-fields"><label>{t("Charaktername")}<input defaultValue="Arin" /></label><label>{t("Ausdauer")}<input type="number" defaultValue={12} /></label><label>{t("Zustand")}<select><option>{t("Bereit")}</option><option>{t("Erschöpft")}</option></select></label></div>
      <p id="theme-example"><strong>{t("Wurf bestätigt:")}</strong> {t("17 · Probe gelungen")}</p>
      <div className="button-row"><Button variant="primary"><Dice6 size={18} />{t("Wichtigster Knopf")}</Button><Button disabled>{t("Gerade nicht verfügbar")}</Button><Button variant="danger">{t("Gefährliche Aktion")}</Button></div>
      <Notice>{t("Deine Auswahl ist gespeichert.")}</Notice><Notice error>{t("Dieser Wert muss korrigiert werden.")}</Notice>
      {preview.correctedContrast ? <p>{t("In dieser Beispielansicht sind einige Farben notgedrungen abgeändert. Zwei deiner Farben wären zusammen unlesbar — so, wie sie jetzt sind, lassen sie sich nicht speichern.")}</p> : null}
    </section> : null}
  </section>;
}

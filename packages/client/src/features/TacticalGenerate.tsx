// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Dices, Eye, WandSparkles } from "lucide-react";
import type { GrundrissBericht, SiedlungBericht } from "@chronicle/forge";
import type { TacticalCartographyV1, TacticalMapDocumentV1 } from "@chronicle/szene";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { locale, t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { MapGenerationControls } from "./MapGenerationControls";
import { generationError, generationOptions, generationSettings, mapDocumentScene, type GenerationDefaults, type MapNode } from "./map-generation";
import "./map-workshop.css";

interface Vorschau {
  keimHash: string; art: string; groesse: readonly [number, number]; document: TacticalMapDocumentV1; cartography?: TacticalCartographyV1; nodes: MapNode[];
  bericht: GrundrissBericht | SiedlungBericht; raeume?: number; bauwerke?: number; strassen?: number;
}

export function TacticalGenerate({ campaignId, onCreated, onDirty }: { campaignId: string; onCreated: (mapId: string) => void; onDirty?: (dirty: boolean) => void }) {
  const defaults = useResource<GenerationDefaults>(apiPath(campaignId, "/tactical/generate/defaults"));
  const [settings, setSettings] = useState(() => generationSettings());
  const [name, setName] = useState(""), [keim, setKeim] = useState(() => crypto.randomUUID().slice(0, 8));
  const [preview, setPreview] = useState<{ fingerprint: string; data: Vorschau } | null>(null);
  const command = useCommand(), task = useTask();
  const initial = useRef(JSON.stringify([name, keim, settings]));
  const dirty = JSON.stringify([name, keim, settings]) !== initial.current;
  useEffect(() => { onDirty?.(dirty || task.busy); }, [dirty, task.busy, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  const fingerprint = JSON.stringify([campaignId, name.trim(), keim.trim(), settings]);
  const latest = useRef(fingerprint); latest.current = fingerprint;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const visiblePreview = preview?.fingerprint === fingerprint ? preview.data : null;
  const scene = useMemo(() => visiblePreview ? mapDocumentScene(`preview:${visiblePreview.keimHash}`, visiblePreview.document, visiblePreview.nodes, visiblePreview.art, undefined, settings.setting, visiblePreview.cartography) : null, [visiblePreview, settings.setting]);
  if (defaults.loading) return <Loading text={t("Kartenwerkstatt wird vorbereitet …")} />;
  if (defaults.error || !defaults.data) return <Notice error>{defaults.error || t("Der Generator ist nicht verfügbar.")}</Notice>;
  const problem = generationError(settings, defaults.data), ready = !!name.trim() && !!keim.trim() && !problem;
  const request = () => ({ name: name.trim(), keim: keim.trim(), art: settings.art, stil: settings.stil, optionen: generationOptions(settings, defaults.data!) });
  return <section className="panel tactical-generate map-workshop" aria-label={t("Kartenwerkstatt")}>
    <header className="map-workshop-heading"><div><p className="eyebrow">{t("Vom Ort zum Abenteuer")}</p><h2><Compass size={25} /> {t("Kartenwerkstatt")}</h2><p>{t("Baue eine Stadt, betritt ihre Gebäude und gestalte die Orte eurer Geschichte.")}</p></div><span className="map-workshop-badge">{t("Stadt → Gebäude → Raum")}</span></header>
    <div className="map-workshop-layout"><form className="map-workshop-form" onSubmit={event => { event.preventDefault(); if (!ready || task.busy) return; const current = fingerprint; void task.run(async () => {
      const data = await command<Vorschau>(apiPath(campaignId, "/tactical/generate/preview"), request());
      if (mounted.current && latest.current === current) setPreview({ fingerprint: current, data });
    }); }}><fieldset disabled={task.busy}>
      <label>{t("Name der Karte")}<input value={name} maxLength={160} required placeholder={settings.setting === "scifi" ? t("z. B. Kolonie Aurora") : settings.setting === "gegenwart" ? t("z. B. Hafenviertel Nord") : settings.art === "siedlung" ? t("z. B. Nebelhafen") : t("z. B. Kapelle des Morgenlichts")} onChange={event => setName(event.target.value)} /></label>
      <MapGenerationControls value={settings} defaults={defaults.data} onChange={setSettings} />
      <label>{t("Weltkeim")}<div className="map-seed-field"><input value={keim} maxLength={256} required onChange={event => setKeim(event.target.value)} /><Button variant="quiet" aria-label={t("Neuen Keim würfeln")} title={t("Neuen Keim würfeln")} onClick={() => setKeim(crypto.randomUUID().slice(0, 8))}><Dices size={18} /></Button></div><small>{t("Gleicher Keim und gleiche Einstellungen ergeben dieselbe Karte.")}</small></label>
      {problem ? <Notice error>{problem}</Notice> : null}
      <div className="map-create-actions"><Button type="submit" disabled={!ready} variant="primary"><Eye size={17} /> {task.busy ? t("Karte entsteht …") : t("Vorschau")}</Button>
        <Button disabled={!ready || !visiblePreview} onClick={() => { if (!ready || !visiblePreview || task.busy) return; const current = fingerprint; void task.run(async () => {
          const result = await command<{ ack: { subjectId: string } }>(apiPath(campaignId, "/tactical/generate"), request());
          if (mounted.current && latest.current === current) {
            const freshSettings = generationSettings(), freshSeed = crypto.randomUUID().slice(0, 8);
            initial.current = JSON.stringify(["", freshSeed, freshSettings]);
            setName(""); setKeim(freshSeed); setSettings(freshSettings); setPreview(null); onDirty?.(false); onCreated(result.ack.subjectId);
          }
        }); }}><WandSparkles size={17} /> {t("Erzeugen und speichern")}</Button></div>
    </fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}</form>
    <div className="map-workshop-preview" aria-label={t("Kartenvorschau")}>{scene && visiblePreview ? <>
      <div className="map-preview-title"><div><span className="eyebrow">{t("Vorschau")}</span><h3>{name}</h3></div><span>{t("Noch nicht gespeichert")}</span></div>
      <TacticalCanvas scene={scene} tileBase="" />
      <div className="map-preview-stats"><span><strong>{visiblePreview.bauwerke ?? visiblePreview.raeume ?? visiblePreview.nodes.length}</strong>{visiblePreview.art === "siedlung" ? t("Gebäude") : t("Räume")}</span>
        {visiblePreview.strassen !== undefined ? <span><strong>{visiblePreview.strassen}</strong>{t("Straßen")}</span> : "tueren" in visiblePreview.bericht ? <span><strong>{visiblePreview.bericht.tueren}</strong>{t("Türen")}</span> : null}
        <span><strong>{visiblePreview.groesse[0].toLocaleString(locale())} × {visiblePreview.groesse[1].toLocaleString(locale())}</strong>{t("Pixel")}</span></div>
      {visiblePreview.art === "siedlung" ? <p className="field-help">{t("Nach dem Speichern kannst du jedes Gebäude auswählen, benennen und seinen passenden Innenraum erzeugen.")}</p> : null}
      {"angefordert" in visiblePreview.bericht && visiblePreview.bericht.bauwerke < visiblePreview.bericht.angefordert ? <Notice>{t("Für {angefordert} Gebäude reicht die bebaubare Fläche nicht. Die Vorschau enthält {bauwerke} Gebäude; vergrößere die Karte, wenn du mehr brauchst.", { angefordert: visiblePreview.bericht.angefordert, bauwerke: visiblePreview.bericht.bauwerke })}</Notice> : null}
      {visiblePreview.bericht.nichtBedient.length ? <Notice>{t("Für {anzahl} Einrichtungswünsche enthält der Stil kein passendes Objekt.", { anzahl: visiblePreview.bericht.nichtBedient.length })}</Notice> : null}
    </> : <div className="map-preview-empty"><Compass size={58} strokeWidth={1} /><span className="eyebrow">{t("Deine Welt beginnt hier")}</span><h3>{preview ? t("Neue Einstellungen, neuer Entwurf.") : t("Ein Ort. Viele Geschichten.")}</h3><p>{t("Wähle Kartenart, Größe und Stil. Mit „Vorschau“ siehst du die fertige Karte, bevor du sie speicherst.")}</p><div className="map-preview-journey"><span>{t("Stadt")}</span><span>→</span><span>{t("Gebäude")}</span><span>→</span><span>{t("Innenraum")}</span></div></div>}</div></div>
  </section>;
}

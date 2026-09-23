// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { BALKEN_MASKEN, type BalkenFuerLeitung, type BalkenMaske, type KarteFuerLeitung, type KartenLage, type KartenSichtDaten } from "@chronicle/protocol";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { rundeSieht } from "./KampfBalken";
import { LAGE_WEGE, LAGE_WEG_LABEL, MASKE_ERKLAERUNG_LABEL, MASKE_LABEL, zielDes } from "./kampftisch-model";

/**
 * Die kleinen Fenster am Kampftisch. Jede Rückfrage steht hier in der Oberfläche, nie über
 * `window.confirm`: dessen nativer Dialog lässt in Electron den Tastaturfokus liegen.
 * Escape und ein Klick daneben schließen; der erste Knopf bekommt den Fokus.
 */
export function Schwebe({ titel, onClose, children }: { titel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), schliessen = useRef(onClose);
  schliessen.current = onClose;
  useEffect(() => {
    // Eine Karte trägt den ersten Fokus ausdrücklich weiter, wenn ihr erster Knopf eine
    // gefährliche Handlung wäre (Löschen, Beenden) — sonst bekäme genau der gefährliche Knopf
    // den Fokus, weil er im Markup zuerst steht.
    const inhalt = ref.current?.querySelector<HTMLElement>(".kampf-schwebe-inhalt");
    (inhalt?.querySelector<HTMLElement>("[data-erstfokus]") ?? inhalt?.querySelector<HTMLElement>("button, input, select"))?.focus();
    const taste = (event: KeyboardEvent) => { if (event.key === "Escape") schliessen.current(); };
    const zeiger = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) schliessen.current(); };
    document.addEventListener("keydown", taste); document.addEventListener("pointerdown", zeiger);
    return () => { document.removeEventListener("keydown", taste); document.removeEventListener("pointerdown", zeiger); };
  }, []);
  return <div ref={ref} className="kampf-schwebe" role="dialog" aria-label={titel}>
    <div className="kampf-schwebe-kopf"><h4>{titel}</h4>
      <button type="button" className="kampf-schwebe-zu" aria-label={t("Schließen")} onClick={() => schliessen.current()}><X size={14} aria-hidden="true" /></button></div>
    <div className="kampf-schwebe-inhalt">{children}</div>
  </div>;
}

export function MaskenWahl({ balken, onWahl, onClose }: { balken: BalkenFuerLeitung; onWahl: (maske: BalkenMaske) => void; onClose: () => void }) {
  return <Schwebe titel={t("Was sieht die Runde bei „{balken}“?", { balken: balken.label })} onClose={onClose}>
    <div role="radiogroup" aria-label={t("Anzeige für die Runde")}>
      {BALKEN_MASKEN.map(maske => <button key={maske} type="button" role="radio" aria-checked={maske === balken.maske} className="kampf-option" onClick={() => onWahl(maske)}>
        <b>{t(MASKE_LABEL[maske])}</b><span>{t(MASKE_ERKLAERUNG_LABEL[maske])}</span></button>)}
    </div>
    <p className="kampf-vorschau">{t("So sieht es die Runde gerade: {was}", { was: rundeSieht(balken.fuerRunde) })}</p>
    <p className="field-help">{t("Wer die Figur selbst führt, sieht ihre Werte immer genau.")}</p>
  </Schwebe>;
}

export function WertAendern({ label, wert, hoechst, onSetzen, onClose }: { label: string; wert: number; hoechst: number; onSetzen: (wert: number) => void; onClose: () => void }) {
  const [neu, setNeu] = useState(wert);
  const schritt = (d: number) => setNeu(alt => (Number.isFinite(alt) ? alt : wert) + d);
  return <Schwebe titel={t("{balken} ändern", { balken: label })} onClose={onClose}>
    <div className="kampf-stepper">
      <button type="button" aria-label={t("{n} abziehen", { n: 5 })} onClick={() => schritt(-5)}>−5</button>
      <button type="button" aria-label={t("{n} abziehen", { n: 1 })} onClick={() => schritt(-1)}>−1</button>
      <input type="number" aria-label={t("Neuer Wert")} value={Number.isFinite(neu) ? neu : ""} onChange={event => setNeu(event.target.valueAsNumber)} />
      <button type="button" aria-label={t("{n} dazu", { n: 1 })} onClick={() => schritt(1)}>+1</button>
      <button type="button" aria-label={t("{n} dazu", { n: 5 })} onClick={() => schritt(5)}>+5</button>
    </div>
    <p className="field-help">{t("Höchstwert {n}. Der Wert steht im Bogen der Figur; die Karte zeigt ihn nur an.", { n: hoechst })}</p>
    <Button variant="primary" disabled={!Number.isFinite(neu)} onClick={() => onSetzen(neu)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function KartenMenue({ karte, onLage, onSicht, onInitiative, onInventar, onLoeschen, onClose }: {
  karte: KarteFuerLeitung; onLage: (ziel: KartenLage) => void; onSicht: () => void; onInitiative: () => void;
  onInventar?: (() => void) | undefined; onLoeschen: () => void; onClose: () => void;
}) {
  return <Schwebe titel={karte.name} onClose={onClose}>
    <ul className="kampf-menue">
      {LAGE_WEGE[karte.lage].map(weg => <li key={weg}><button type="button" onClick={() => onLage(zielDes(weg))}>{t(LAGE_WEG_LABEL[weg])}</button></li>)}
      <li className="kampf-menue-trenner" role="separator" />
      <li><button type="button" onClick={onSicht}>{t("Was sieht die Runde?")}</button></li>
      <li><button type="button" onClick={onInitiative}>{t("Initiative ändern")}</button></li>
      {onInventar ? <li><button type="button" onClick={onInventar}>{t("Inventar öffnen")}</button></li> : null}
      <li className="kampf-menue-trenner" role="separator" />
      <li><button type="button" className="gefahr" onClick={onLoeschen}>{t("Kampfkarte löschen …")}</button></li>
    </ul>
  </Schwebe>;
}

export function SichtBearbeiten({ karte, onSpeichern, onClose }: { karte: KarteFuerLeitung; onSpeichern: (sicht: KartenSichtDaten, nameFuerRunde: string | null) => void; onClose: () => void }) {
  const [name, setName] = useState(karte.nameFuerRunde ?? ""), [bild, setBild] = useState(karte.sicht.bild);
  const [zustaende, setZustaende] = useState(karte.sicht.zustaende), [standard, setStandard] = useState<BalkenMaske>(karte.sicht.standard);
  return <Schwebe titel={t("Was sieht die Runde von „{name}“?", { name: karte.name })} onClose={onClose}>
    <label>{t("Name für die Runde")}<input value={name} maxLength={160} placeholder={t("leer lassen für „{name}“", { name: karte.name })} onChange={event => setName(event.target.value)} /></label>
    <label className="kampf-haken"><input type="checkbox" checked={bild} onChange={event => setBild(event.target.checked)} /> {t("Bild zeigen")}</label>
    <label className="kampf-haken"><input type="checkbox" checked={zustaende} onChange={event => setZustaende(event.target.checked)} /> {t("Zustände zeigen")}</label>
    <label>{t("Alle Balken ohne eigene Einstellung")}<select value={standard} onChange={event => setStandard(event.target.value as BalkenMaske)}>
      {BALKEN_MASKEN.map(maske => <option key={maske} value={maske}>{t(MASKE_LABEL[maske])}</option>)}</select></label>
    <p className="field-help">{t("Einzelne Balken stellst du am Auge neben dem Balken ein.")}</p>
    <Button variant="primary" onClick={() => onSpeichern({ ...karte.sicht, bild, zustaende, standard }, name.trim() || null)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function InitiativeAendern({ karte, wurf, onSetzen, onClose }: { karte: KarteFuerLeitung; wurf: ActionCard | null; onSetzen: (initiative: number, rollId: string | null) => void; onClose: () => void }) {
  const [wert, setWert] = useState(karte.initiative);
  return <Schwebe titel={t("Initiative von {name}", { name: karte.name })} onClose={onClose}>
    <label>{t("Initiative")}<input type="number" value={Number.isFinite(wert) ? wert : ""} onChange={event => setWert(event.target.valueAsNumber)} /></label>
    {wurf ? <p className="kampf-wurf">{t("Jüngster Initiativwurf dieser Figur:")} <strong>{Math.trunc(wurf.receipt.total)}</strong>
      <Button onClick={() => onSetzen(Math.trunc(wurf.receipt.total), wurf.id)}>{t("Wert übernehmen")}</Button></p> : null}
    <p className="field-help">{t("Von Hand gesetzt gilt der Wert als gesetzt, nicht als gewürfelt. Ab dem nächsten Zug gilt die neue Reihenfolge.")}</p>
    <Button variant="primary" disabled={!Number.isInteger(wert)} onClick={() => onSetzen(wert, null)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function LoeschenRueckfrage({ karte, onLoeschen, onClose }: { karte: KarteFuerLeitung; onLoeschen: () => void; onClose: () => void }) {
  return <Schwebe titel={t("Karte löschen?")} onClose={onClose}>
    <p>{t("„{name}“ verschwindet ganz vom Tisch, auch aus Hand und Ablage. Das ist für Versehen gedacht; wer nur vom Feld soll, kommt in die Ablage.", { name: karte.name })}</p>
    <div className="button-row"><Button variant="danger" onClick={onLoeschen}>{t("Löschen")}</Button><Button data-erstfokus onClick={onClose}>{t("Abbrechen")}</Button></div>
  </Schwebe>;
}

export function BeendenRueckfrage({ angelegt, onBeenden, onClose }: { angelegt: number; onBeenden: (archivieren: boolean) => void; onClose: () => void }) {
  const [archivieren, setArchivieren] = useState(true);
  return <Schwebe titel={t("Kampf beenden?")} onClose={onClose}>
    <p>{t("Danach ist niemand mehr am Zug, und der Kampf nimmt keine Karten mehr auf.")}</p>
    {angelegt ? <>
      <label className="kampf-haken"><input type="checkbox" checked={archivieren} onChange={event => setArchivieren(event.target.checked)} />
        {" "}{t("Gegner, die für diesen Kampf angelegt wurden, ins Archiv legen ({n})", { n: angelegt })}</label>
      <p className="field-help">{t("Archivieren löscht nichts: Inventar und Beute bleiben an der Figur, und du kannst sie zurückholen.")}</p>
    </> : null}
    <div className="button-row"><Button variant="primary" onClick={() => onBeenden(angelegt > 0 && archivieren)}>{t("Beenden")}</Button><Button data-erstfokus onClick={onClose}>{t("Abbrechen")}</Button></div>
  </Schwebe>;
}

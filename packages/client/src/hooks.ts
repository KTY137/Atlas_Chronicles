// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useRef, useState } from "react";
import { aktuellerSchreibStand, api, ApiError, errorText } from "./api";

/**
 * Gleichzeitige Abfragen derselben Adresse laufen einmal. Nach jeder Änderung laden viele Bausteine
 * dieselben Listen neu — am Tisch bis zu 29-mal `/actors` in zehn Sekunden, bis der Server die
 * Spielleitung mit „Zu viele Anfragen“ bremste (240 je Minute, 2026-09-26). Geteilt wird nur, was im
 * selben Schreibstand und höchstens 50 ms zuvor begonnen hat; die Abfrage bricht erst ab, wenn alle
 * Wartenden abgebrochen haben.
 */
interface GeteilteAbfrage { stand: number; beginn: number; abbruch: AbortController; wartende: number; ergebnis: Promise<unknown> }
const laufend = new Map<string, GeteilteAbfrage>();
export function gemeinsamLaden<T>(path: string, signal: AbortSignal): Promise<T> {
  const stand = aktuellerSchreibStand(), jetzt = Date.now();
  let abfrage = laufend.get(path);
  if (!abfrage || abfrage.stand !== stand || jetzt - abfrage.beginn > 50) {
    const abbruch = new AbortController();
    const neu: GeteilteAbfrage = { stand, beginn: jetzt, abbruch, wartende: 0, ergebnis: Promise.resolve() };
    neu.ergebnis = api<T>(path, { signal: abbruch.signal }).finally(() => { if (laufend.get(path) === neu) laufend.delete(path); });
    laufend.set(path, neu); abfrage = neu;
  }
  const geteilt = abfrage; geteilt.wartende++;
  signal.addEventListener("abort", () => { if (--geteilt.wartende === 0) geteilt.abbruch.abort(); }, { once: true });
  return geteilt.ergebnis as Promise<T>;
}

export function useResource<T>(path: string | null, revision = 0, interval = 0) {
  const [state, setState] = useState<{ path: string | null; data: T | null; loaded: boolean; loading: boolean; error: string }>({ path, data: null, loaded: false, loading: !!path, error: "" });
  useEffect(() => {
    if (!path) { setState({ path, data: null, loaded: false, loading: false, error: "" }); return; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Keep mounted controls intact while refreshing the same resource.
    setState(current => current.path === path && current.loaded
      ? { ...current, loading: false, error: "" }
      : { path, data: null, loaded: false, loading: true, error: "" });
    const load = async () => {
      try { const data = await gemeinsamLaden<T>(path, controller.signal); if (!controller.signal.aborted) setState({ path, data, loaded: true, loading: false, error: "" }); }
      catch (error) {
        if (!controller.signal.aborted) setState(current => {
          const retain = current.path === path && !(error instanceof ApiError && error.status < 500 && ![408, 429].includes(error.status));
          return { path, data: retain ? current.data : null, loaded: retain && current.loaded, loading: false, error: errorText(error) };
        });
      }
      if (interval && !controller.signal.aborted) timer = setTimeout(load, interval);
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, revision, interval]);
  return state.path === path ? state : { path, data: null, loaded: false, loading: !!path, error: "" };
}

export function useTask() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  // Der HTTP-Status wird mitgeführt, damit eine Oberfläche einen Konflikt am Code erkennt und
  // nicht am Fehlertext: ein Textvergleich fällt still aus, sobald jemand den Satz umformuliert
  // oder seine Übersetzung ändert.
  const [status, setStatus] = useState(0);
  const pending = useRef<Promise<void> | null>(null), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback((work: () => Promise<void>): Promise<void> => {
    // The DOM's disabled state is one render too late for same-frame event bursts.
    // Join the in-flight command rather than enqueue a second mutation or unlock early.
    if (pending.current) return pending.current;
    if (!mounted.current) return Promise.resolve();
    setBusy(true); setError(""); setStatus(0);
    const job = Promise.resolve().then(work).catch(error => {
      if (mounted.current) { setError(errorText(error)); setStatus(error instanceof ApiError ? error.status : 0); }
    }).finally(() => {
      pending.current = null;
      if (mounted.current) setBusy(false);
    });
    pending.current = job;
    return job;
  }, []);
  return { busy, error, status, setError, run };
}

/**
 * Die Regel hinter der Wuerfelbewegung, als reine Funktion — und deshalb pruefbar.
 *
 * `bekannt === null` ist der ERSTE Datenstand: er zaehlt vollstaendig als Bestand, nichts daran
 * ist frisch. Wer den Reiter oeffnet, sieht die alten Wuerfe LIEGEN, nicht fallen. Erst was
 * danach dazukommt, faellt. Ohne diese Unterscheidung liesse jede Abfrage — alle paar Sekunden —
 * die ganze Historie erneut fallen, und Bewegung, die nichts mitteilt, ist Unruhe.
 *
 * Verschwundene Kennungen bleiben bekannt: taucht ein Wurf wieder auf, ist er kein neues
 * Ereignis, sondern dieselbe Karte.
 */
export function frischeAuswahl(bekannt: ReadonlySet<string> | null, ids: readonly string[]): { bekannt: Set<string>; frisch: readonly string[] } {
  if (bekannt === null) return { bekannt: new Set(ids), frisch: [] };
  const frisch = ids.filter(id => !bekannt.has(id));
  return { bekannt: new Set([...bekannt, ...ids]), frisch };
}

/** Welche dieser Karten sind gerade neu dazugekommen? Siehe {@link frischeAuswahl}. */
export function useFrischeKarten(ids: readonly string[] | null): ReadonlySet<string> {
  const [frisch, setFrisch] = useState<ReadonlySet<string>>(() => new Set<string>());
  const bekannt = useRef<ReadonlySet<string> | null>(null);
  // Wurfkennungen sind UUIDs; das Komma kommt darin nicht vor und trennt daher eindeutig.
  const schluessel = ids?.join(",") ?? null;
  useEffect(() => {
    // Noch nicht geladen ist kein leerer Bestand. Erst eine erlaubte Antwort setzt die Basis.
    if (schluessel === null) return;
    const stand = frischeAuswahl(bekannt.current, schluessel ? schluessel.split(",") : []);
    bekannt.current = stand.bekannt;
    if (stand.frisch.length) setFrisch(new Set(stand.frisch));
  }, [schluessel]);
  return frisch;
}

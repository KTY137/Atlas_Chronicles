// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useRef, useState } from "react";
import { ArrowLeft, CircleAlert, Download, ImageOff, ShieldQuestion, Trash2, Upload } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, assetPath, errorText, type WikiAsset, type WikiMedienBestand } from "../api";
import { useResource, useTask } from "../hooks";

/**
 * DIE BILDER — Bestand, Herkunft und der Knopf, der die Dateien wirklich holt.
 *
 * Die Bytes werden hier im BROWSER geholt, nicht auf dem Server. Das ist kein Umweg, sondern die
 * sichere Richtung: ein Server, der eine vom Nutzer genannte Adresse abruft, ist ein Werkzeug zum
 * Abtasten fremder Netze (SSRF). Der Browser darf das ohnehin, das Bild-CDN erlaubt es per CORS,
 * und was hier hochgeladen wird, hat der Server danach selbst vermessen.
 *
 * Ein Fehlschlag pro Datei ist kein Fehlschlag des Laufs: jede Datei zählt einzeln, und was nicht
 * ankommt, steht danach mit Grund in der Liste.
 */

const LIZENZ_TEXT: Record<WikiAsset["lizenzStatus"], string> = {
  frei: "Freie Lizenz",
  zitat: "Bildzitat — nicht vom Wiki selbst erstellt",
  unbekannt: "Lizenz unbekannt",
};

/** Deckungsgleich mit `WIKI_ASSET_GRENZEN.bytes` — hier nur, damit die Absage vor dem Upload kommt. */
const GRENZE_BYTES = 24 * 1024 * 1024;
const BILDTYPEN = "image/png,image/jpeg,image/webp,image/gif";

const groesse = (bytes: number | null): string =>
  bytes === null ? "—" : bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

interface Fortschritt { geholt: number; gesamt: number; fehler: number; laeuft: boolean; aktuell: string }

export function WikiMedien({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const task = useTask();
  const [revision, setRevision] = useState(0);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [fehlgeschlagen, setFehlgeschlagen] = useState<{ dateiname: string; grund: string }[]>([]);
  const [nurOffene, setNurOffene] = useState(false);
  const abbruch = useRef<AbortController | null>(null);
  const bestand = useResource<WikiMedienBestand>(apiPath(campaignId, "/wiki-medien"), revision);
  const [datei, setDatei] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [lizenz, setLizenz] = useState<WikiAsset["lizenzStatus"]>("unbekannt");
  const [angekommen, setAngekommen] = useState<string | null>(null);
  const dateiFeld = useRef<HTMLInputElement>(null);
  const nachreichung = useRef<HTMLInputElement>(null);
  const nachreichungZiel = useRef<WikiAsset | null>(null);

  /**
   * Der eine Byteweg. Ob die Datei aus dem Quell-Wiki geholt oder von der Festplatte gewählt
   * wurde: sie geht durch dieselbe Route und dieselbe Vermessung. Zwei Uploadwege wären zwei
   * Wahrheiten darüber, was ein Bild ist.
   */
  const sendeBytes = async (assetId: string, daten: ArrayBuffer, signal?: AbortSignal) => {
    const antwort = await fetch(apiPath(campaignId, `/wiki-medien/${encodeURIComponent(assetId)}/bytes`), {
      method: "PUT", credentials: "same-origin", body: daten,
      headers: { "Content-Type": "application/octet-stream" }, ...(signal ? { signal } : {}),
    });
    if (!antwort.ok) {
      const körper = await antwort.json().catch(() => null) as { error?: string } | null;
      throw new Error(körper?.error ?? `Der Server lehnte die Datei ab (Status ${antwort.status}).`);
    }
  };

  const gewaehlt = (gewaehlteDatei: File | null) => {
    // Ohne dieses Zurücksetzen behielte das Feld nach dem Hochladen den alten Dateinamen und
    // behauptete eine Auswahl, die es nicht mehr gibt.
    if (!gewaehlteDatei && dateiFeld.current) dateiFeld.current.value = "";
    setDatei(gewaehlteDatei);
    // Der Dateiname ist ein Vorschlag, kein Zwang: er lässt sich vor dem Hochladen ändern, und
    // genau das braucht, wer schon eine „karte.png" im Bestand hat.
    setName(gewaehlteDatei?.name ?? "");
    setAngekommen(null);
  };

  const hochladen = () => task.run(async () => {
    if (!datei) return;
    if (datei.size > GRENZE_BYTES) throw new Error(`Die Datei ist ${groesse(datei.size)} groß; erlaubt sind 24 MB.`);
    // Zwei Schritte, absichtlich: erst die Zeile, dann die Bytes. Scheitert der zweite, bleibt die
    // Zeile leer liegen und derselbe Name lässt sich erneut hochladen.
    const zeile = await api<{ id: string; dateiname: string }>(apiPath(campaignId, "/wiki-medien"), {
      method: "POST", body: { dateiname: name.trim(), lizenz },
    });
    await sendeBytes(zeile.id, await datei.arrayBuffer());
    gewaehlt(null);
    setAngekommen(zeile.dateiname);
    setRevision((value) => value + 1);
  });

  /** Eine Datei, die das Quell-Wiki nicht mehr hergibt, von Hand nachreichen. Dieselbe Zeile, dieselbe Route. */
  const nachreichen = (asset: WikiAsset, gewaehlteDatei: File) => task.run(async () => {
    if (gewaehlteDatei.size > GRENZE_BYTES) throw new Error(`Die Datei ist ${groesse(gewaehlteDatei.size)} groß; erlaubt sind 24 MB.`);
    await sendeBytes(asset.id, await gewaehlteDatei.arrayBuffer());
    setAngekommen(asset.dateiname);
    setRevision((value) => value + 1);
  });

  const holen = (auswahl: readonly WikiAsset[]) => task.run(async () => {
    const controller = new AbortController();
    abbruch.current = controller;
    const fehler: { dateiname: string; grund: string }[] = [];
    setFehlgeschlagen([]);
    setFortschritt({ geholt: 0, gesamt: auswahl.length, fehler: 0, laeuft: true, aktuell: "" });
    try {
      for (const [index, asset] of auswahl.entries()) {
        if (controller.signal.aborted) break;
        setFortschritt({ geholt: index, gesamt: auswahl.length, fehler: fehler.length, laeuft: true, aktuell: asset.dateiname });
        try {
          const antwort = await fetch(asset.quellUrl!, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
          if (!antwort.ok) throw new Error(`Das Wiki antwortete mit Status ${antwort.status}.`);
          await sendeBytes(asset.id, await antwort.arrayBuffer(), controller.signal);
        } catch (error) {
          if (controller.signal.aborted) break;
          fehler.push({ dateiname: asset.dateiname, grund: errorText(error) });
        }
      }
      setFortschritt((current) => current ? { ...current, geholt: auswahl.length - fehler.length, fehler: fehler.length, laeuft: false, aktuell: "" } : null);
      setFehlgeschlagen(fehler);
    } finally {
      abbruch.current = null;
      setRevision((value) => value + 1);
    }
  });

  /**
   * Ein Bild wieder loswerden. Der Knopf steht nur an Zeilen, die niemand zeigt — und der Server
   * prüft es trotzdem noch einmal: was die Liste beim Laden wusste, kann inzwischen veraltet sein.
   */
  const loesche = (asset: WikiAsset) => {
    if (!window.confirm(`„${asset.dateiname}“ endgültig aus dem Bestand entfernen? Das lässt sich nicht rückgängig machen.`)) return;
    void task.run(async () => {
      await api(apiPath(campaignId, `/wiki-medien/${encodeURIComponent(asset.id)}`), { method: "DELETE" });
      setAngekommen(null);
      setRevision((value) => value + 1);
    });
  };

  const setzeLizenz = (asset: WikiAsset, status: WikiAsset["lizenzStatus"]) => task.run(async () => {
    await api(apiPath(campaignId, `/wiki-medien/${encodeURIComponent(asset.id)}/lizenz`), { method: "POST", body: { status } });
    setRevision((value) => value + 1);
  });

  const alle = bestand.data?.assets ?? [];
  // Der Name ist je Kampagne eindeutig. Das sagen wir vor dem Klick, nicht erst als Absage danach —
  // eine noch leere Zeile darf denselben Namen behalten, die füllt der Upload einfach auf.
  const vergeben = alle.some((asset) => asset.dateiname === name.trim() && asset.vorhanden);
  const offen = alle.filter((asset) => !asset.vorhanden && !asset.verwaist && asset.quellUrl);
  const sichtbar = nurOffene ? alle.filter((asset) => !asset.vorhanden) : alle;
  const bilanz = bestand.data?.bilanz;

  return <section className="import-view">
    <div className="document-toolbar"><Button variant="quiet" onClick={onClose}><ArrowLeft size={16} /> Zur Chronik</Button><span>Bilder der Chronik</span></div>
    <div className="import-content">
      <p className="eyebrow">Was eure Welt zeigt</p><h1>Bilder mit belegter Herkunft.</h1>
      <p className="muted">Jede Datei, die eure Artikel zeigen, mit Uploader, Quelladresse und Lizenzstand. Was das Quell-Wiki über eine Lizenz nicht weiß, steht hier als „unbekannt“ — und nicht als frei.</p>
      {task.error ? <Notice error>{task.error}</Notice> : null}
      {bestand.error ? <Notice error>{bestand.error} <Button variant="quiet" onClick={() => setRevision((v) => v + 1)}>Erneut versuchen</Button></Notice> : null}
      {bestand.loading && !bestand.data ? <Loading text="Bildbestand wird geladen …" /> : <>
        {/* Der Uploadkasten steht VOR der Fallunterscheidung und damit auch dann da, wenn der
            Bestand leer ist. Genau dort wurde er gebraucht: eine Runde ohne Wiki-Import hatte
            bisher gar keine Möglichkeit, ein eigenes Bild in die Kampagne zu bekommen. */}
        <section className="panel">
          <div className="section-heading"><h2><Upload size={18} /> Eigenes Bild hochladen</h2></div>
          <p className="field-help">PNG, JPEG, WebP oder GIF, bis 24 MB. Was hier liegt, kannst du als Bild einer Lootkarte wählen — und wer die Karte im Inventar hat, sieht es. Typ und Maße bestimmt der Server aus der Datei selbst; die Endung im Namen ist nur Beschriftung.</p>
          <div className="medien-upload">
            <label>Bilddatei<input ref={dateiFeld} type="file" accept={BILDTYPEN} disabled={task.busy}
              onChange={(event) => gewaehlt(event.target.files?.[0] ?? null)} /></label>
            <label>Name im Bestand<input value={name} maxLength={512} disabled={!datei || task.busy}
              onChange={(event) => setName(event.target.value)} /></label>
            <label>Lizenz<select value={lizenz} disabled={task.busy}
              onChange={(event) => setLizenz(event.target.value as WikiAsset["lizenzStatus"])}>
              <option value="unbekannt">Lizenz unbekannt</option>
              <option value="frei">Freie Lizenz</option>
              <option value="zitat">Bildzitat</option>
            </select></label>
          </div>
          {vergeben ? <Notice error>„{name.trim()}“ liegt schon im Bestand. Wähle einen anderen Namen.</Notice> : null}
          <div className="button-row">
            <Button variant="primary" disabled={!datei || !name.trim() || vergeben || task.busy} onClick={() => void hochladen()}><Upload size={16} /> Hochladen</Button>
            {datei ? <Button variant="quiet" disabled={task.busy} onClick={() => gewaehlt(null)}>Verwerfen</Button> : null}
          </div>
          {angekommen ? <Notice>„{angekommen}“ liegt jetzt im Bestand.</Notice> : null}
        </section>
        <input ref={nachreichung} type="file" accept={BILDTYPEN} hidden onChange={(event) => {
          const gewaehlteDatei = event.target.files?.[0], ziel = nachreichungZiel.current;
          event.target.value = "";
          if (gewaehlteDatei && ziel) void nachreichen(ziel, gewaehlteDatei);
        }} />
        {!alle.length ? (
        <EmptyState title="Noch keine Bilder in dieser Chronik.">Lade oben ein eigenes Bild hoch — oder importiere ein Wiki: sobald ein importierter Artikel eine Datei zeigt, erscheint sie hier mit ihrer Herkunft.</EmptyState>
      ) : <>
        {bilanz ? <div className="import-metrics">
          <div><strong>{bilanz.vorhanden}</strong><span>Dateien geholt</span></div>
          <div><strong>{bilanz.offen}</strong><span>noch abzuholen</span></div>
          <div><strong>{bilanz.nachLizenz.unbekannt}</strong><span>ohne dokumentierte Lizenz</span></div>
          <div><strong>{bilanz.verwaist}</strong><span>von keinem Artikel benutzt</span></div>
        </div> : null}

        {bilanz && bilanz.formatwidersprueche > 0 ? <Notice>
          Bei {bilanz.formatwidersprueche} {bilanz.formatwidersprueche === 1 ? "Datei" : "Dateien"} widerspricht der tatsächliche Inhalt der Dateiendung des Quell-Wikis — dort heißt sie etwa <code>.jpg</code>, geliefert wurde WebP. Wir speichern den gemessenen Typ, nicht den behaupteten.
        </Notice> : null}

        {offen.length ? <section className="panel">
          <div className="section-heading"><h2><Download size={18} /> Bilddateien holen</h2><span className="muted">{offen.length} offen</span></div>
          <p className="field-help">Die Dateien werden aus deinem Browser direkt beim Quell-Wiki geholt und hier gespeichert. Das dauert bei vielen Bildern einen Moment; du kannst jederzeit abbrechen und später fortsetzen — bereits geholte Dateien werden nicht erneut geladen.</p>
          {fortschritt?.laeuft ? <>
            <p role="status">Holt {fortschritt.geholt + 1} von {fortschritt.gesamt}{fortschritt.aktuell ? ` — ${fortschritt.aktuell}` : ""}{fortschritt.fehler ? ` · ${fortschritt.fehler} fehlgeschlagen` : ""}</p>
            <Button onClick={() => abbruch.current?.abort()}>Abbrechen</Button>
          </> : <div className="button-row">
            <Button variant="primary" disabled={task.busy} onClick={() => void holen(offen)}><Download size={16} /> {offen.length} {offen.length === 1 ? "Datei" : "Dateien"} holen</Button>
          </div>}
        </section> : null}

        {/* Das Ergebnis steht ABSICHTLICH außerhalb des Abschnitts „Bilder holen": sobald nichts
            mehr offen ist, verschwindet jener Abschnitt — und mit ihm verschwand die Bestätigung
            für genau den Klick, der ihn leer gemacht hat. Wer holt, soll lesen, dass es geklappt
            hat, und nicht aus einem Zähler schließen müssen. */}
        {fortschritt && !fortschritt.laeuft ? <Notice error={fortschritt.fehler > 0}>
          {fortschritt.geholt} von {fortschritt.gesamt} {fortschritt.gesamt === 1 ? "Datei" : "Dateien"} geholt{fortschritt.fehler ? `, ${fortschritt.fehler} fehlgeschlagen` : ""}.
        </Notice> : null}
        {fehlgeschlagen.length ? <details><summary>{fehlgeschlagen.length} {fehlgeschlagen.length === 1 ? "Datei kam nicht an" : "Dateien kamen nicht an"}</summary>
          <div className="import-losses">{fehlgeschlagen.map((row) => <details key={row.dateiname}><summary>{row.dateiname}</summary><pre>{row.grund}</pre></details>)}</div>
        </details> : null}

        <section className="panel">
          <div className="section-heading"><h2>Der Bestand</h2>
            <label className="check-label"><input type="checkbox" checked={nurOffene} onChange={(event) => setNurOffene(event.target.checked)} /> Nur Dateien ohne Bild</label>
          </div>
          <ul className="medien-liste">{sichtbar.map((asset) => <li key={asset.id} className={asset.vorhanden ? "medien-zeile" : "medien-zeile medien-zeile-offen"}>
            <div className="medien-vorschau">{asset.vorhanden
              ? <img src={assetPath(campaignId, asset.id)} alt="" loading="lazy" decoding="async" />
              : <span className="medien-leer" aria-hidden="true"><ImageOff size={18} /></span>}</div>
            <div className="medien-text">
              <strong>{asset.dateiname}</strong>
              <p className="muted">
                {asset.vorhanden ? `${asset.mime?.replace("image/", "").toUpperCase()} · ${asset.breite}×${asset.hoehe} · ${groesse(asset.bytes)}`
                  : asset.selbstHochgeladen ? "Angelegt, aber ohne Bild — Datei wählen" : asset.imBestand ? "Datei noch nicht geholt" : "Im Quell-Wiki nicht vorhanden"}
                {asset.urheber ? ` · hochgeladen von ${asset.urheber}` : ""}
              </p>
              <p className="muted">
                {/* „Im Quell-Wiki nicht vorhanden" wäre über ein selbst hochgeladenes Bild schlicht
                    falsch: es war nie in einem Wiki. */}
                {asset.selbstHochgeladen ? "Selbst hochgeladen" : asset.verwaist ? "Von keinem Artikel benutzt" : asset.verwendetVon.length ? `Benutzt von ${asset.verwendetVon.slice(0, 3).join(", ")}${asset.verwendetVon.length > 3 ? " …" : ""}` : "Verwendung nicht bekannt"}
                {asset.beschreibungsseiteUrl ? <> · <a href={asset.beschreibungsseiteUrl} target="_blank" rel="noreferrer noopener">Dateiseite im Wiki</a></> : null}
              </p>
              {/* Auch für eine Wiki-Zeile: was das CDN nicht mehr hergibt, kann von Hand kommen —
                  dieselbe Zeile, dieselbe Route, keine zweite Geschichte über dieselbe Datei. */}
              <div className="button-row">
                {!asset.vorhanden ? <Button variant="quiet" disabled={task.busy}
                  onClick={() => { nachreichungZiel.current = asset; nachreichung.current?.click(); }}>
                  <Upload size={14} /> Datei wählen</Button> : null}
                {/* Kein Kaskadenlöschen: ein Bild, das ein Artikel oder eine Lootkarte zeigt,
                    ließe leere Rahmen zurück. Der Knopf sagt das, statt ihn wortlos zu sperren. */}
                {asset.loeschbar
                  ? <Button variant="quiet" disabled={task.busy} onClick={() => loesche(asset)}><Trash2 size={14} /> Entfernen</Button>
                  : <span className="muted medien-gebunden" title="Solange ein Artikel oder eine Lootkarte dieses Bild zeigt, bleibt es im Bestand.">Wird gezeigt — nicht entfernbar</span>}
              </div>
              {asset.formatWiderspruch ? <p className="medien-warnung"><CircleAlert size={14} aria-hidden="true" /> Der Name im Wiki sagt {asset.behaupteterMime?.replace("image/", "")}, geliefert wurde {asset.mime?.replace("image/", "")}.</p> : null}
            </div>
            <div className="medien-lizenz">
              <span className={`medien-marke medien-marke-${asset.lizenzStatus}`}>
                {asset.lizenzStatus === "unbekannt" ? <ShieldQuestion size={13} aria-hidden="true" /> : null}{LIZENZ_TEXT[asset.lizenzStatus]}
              </span>
              {asset.lizenzQuelle ? <small title={`Grundlage der Einstufung: ${asset.lizenzQuelle}`}>laut „{asset.lizenzQuelle}“</small> : null}
              <label className="sr-only" htmlFor={`lizenz-${asset.id}`}>Lizenzstatus von {asset.dateiname}</label>
              <select id={`lizenz-${asset.id}`} value={asset.lizenzStatus} disabled={task.busy}
                onChange={(event) => void setzeLizenz(asset, event.target.value as WikiAsset["lizenzStatus"])}>
                <option value="unbekannt">Lizenz unbekannt</option>
                <option value="frei">Freie Lizenz</option>
                <option value="zitat">Bildzitat</option>
              </select>
            </div>
          </li>)}</ul>
          {!sichtbar.length ? <p className="muted"><Trash2 size={14} aria-hidden="true" /> Für diese Auswahl gibt es keine Dateien.</p> : null}
        </section>
      </>}
      </>}
    </div>
  </section>;
}

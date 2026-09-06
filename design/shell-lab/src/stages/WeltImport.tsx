import { useRef, useState } from "react";
import { ArrowLeft, Check, Download, Loader2, TriangleAlert } from "lucide-react";

import {
  ImportError,
  estimateBytes,
  importWiki,
  probeWiki,
  type ImportedPage,
  type ImportProgress,
  type WikiProbe,
} from "../importer";
import { importArticles, clearImported, importedCount } from "../wikiStore";

type Phase =
  | { at: "idle" }
  | { at: "probing" }
  | { at: "found"; probe: WikiProbe }
  | { at: "loading"; probe: WikiProbe; progress: ImportProgress }
  | { at: "done"; probe: WikiProbe; pages: ImportedPage[] }
  | { at: "error"; error: ImportError };

const BEISPIELE = [
  "https://eron.fandom.com/de",
  "https://de.wikipedia.org/wiki/Pen-&-Paper-Rollenspiel",
];

interface Props {
  onClose: () => void;
  onOpenArticle: (title: string) => void;
}

/**
 * „Füg deine Wiki-Adresse ein." Der Import läuft direkt aus dem Browser gegen
 * die MediaWiki-API — kein Proxy, kein Konto. Was er nicht mitnimmt, steht auf
 * dem Schirm und nicht im Kleingedruckten.
 */
export function WeltImport({ onClose, onOpenArticle }: Props) {
  const [input, setInput] = useState("https://eron.fandom.com/de");
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const abort = useRef<AbortController | null>(null);
  const alreadyImported = importedCount();

  const fail = (error: unknown) => {
    setPhase({
      at: "error",
      error:
        error instanceof ImportError
          ? error
          : new ImportError(
              "Der Import ist fehlgeschlagen.",
              error instanceof Error ? error.message : undefined,
            ),
    });
  };

  const probe = async () => {
    setPhase({ at: "probing" });
    abort.current = new AbortController();
    try {
      const found = await probeWiki(input, abort.current.signal);
      setPhase({ at: "found", probe: found });
    } catch (error) {
      fail(error);
    }
  };

  const load = async (found: WikiProbe) => {
    setPhase({ at: "loading", probe: found, progress: { fetched: 0, total: found.articles, batch: 0 } });
    abort.current = new AbortController();
    try {
      const pages = await importWiki(
        found,
        (progress) => setPhase({ at: "loading", probe: found, progress }),
        abort.current.signal,
      );
      importArticles(pages, {
        source: new URL(found.endpoint).host + (found.language ? ` (${found.language})` : ""),
        license: found.license?.text ?? "unbekannt",
      });
      setPhase({ at: "done", probe: found, pages });
    } catch (error) {
      fail(error);
    }
  };

  return (
    <div className="stage-scroll">
      <div className="import-wrap">
        <button type="button" className="chip" onClick={onClose}>
          <ArrowLeft size={11} />
          Zurück
        </button>

        <div className="eyebrow" style={{ marginTop: 18 }}>
          Welt · Import
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px,4.2vw,44px)", margin: "6px 0 10px" }}>
          Bring deine Welt mit
        </h1>
        <p className="import-lead">
          Füg die Adresse deines Wikis ein — die, die du im Browser siehst.
          Chronicle liest sie direkt über die MediaWiki-Schnittstelle. Fandom,
          Wikipedia und jede eigene Instanz funktionieren.
        </p>

        <div className="import-field">
          <input
            value={input}
            spellCheck={false}
            aria-label="Wiki-Adresse"
            placeholder="https://dein-wiki.fandom.com/de"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && phase.at !== "probing") probe();
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={phase.at === "probing" || phase.at === "loading"}
            onClick={probe}
          >
            {phase.at === "probing" ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Download size={14} />
            )}
            Wiki prüfen
          </button>
        </div>

        <div className="import-examples">
          {BEISPIELE.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => setInput(example)}
            >
              {example.replace("https://", "")}
            </button>
          ))}
        </div>

        {phase.at === "error" ? (
          <div className="import-card danger">
            <div className="import-card-head">
              <TriangleAlert size={14} />
              {phase.error.message}
            </div>
            {phase.error.hint ? <p className="import-hint">{phase.error.hint}</p> : null}
          </div>
        ) : null}

        {phase.at === "found" ? (
          <div className="import-card">
            <div className="import-card-head">
              <Check size={14} />
              Gefunden: {phase.probe.siteName}
            </div>
            <dl className="import-facts">
              <dt>Artikel</dt>
              <dd>{phase.probe.articles.toLocaleString("de")}</dd>
              <dt>Bilder</dt>
              <dd>{phase.probe.images.toLocaleString("de")}</dd>
              <dt>Sprache</dt>
              <dd>{phase.probe.language || "—"}</dd>
              <dt>Lizenz</dt>
              <dd>{phase.probe.license?.text ?? "nicht angegeben"}</dd>
              <dt>Schnittstelle</dt>
              <dd className="mono">{phase.probe.endpoint}</dd>
            </dl>

            <div className="import-terms">
              <strong>Was übernommen wird:</strong> Titel, Text, Verweise,
              Infobox-Felder und die Revision jedes Artikels.
              <br />
              <strong>Was nicht:</strong> Bilder — Uploads tragen oft fremde
              Rechte und werden einzeln bestätigt. Vorlagen werden nicht
              ausgeführt, nur ihre Felder gelesen. Und Chronicle schreibt
              niemals zurück.
              {phase.probe.license ? (
                <>
                  <br />
                  <strong>Lizenz bleibt bestehen:</strong> Jeder Artikel trägt{" "}
                  {phase.probe.license.text} samt Quelle und Revision weiter.
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => load(phase.probe)}
            >
              <Download size={14} />
              {phase.probe.articles.toLocaleString("de")} Artikel importieren
            </button>
          </div>
        ) : null}

        {phase.at === "loading" ? (
          <div className="import-card">
            <div className="import-card-head">
              <Loader2 size={14} className="spin" />
              {phase.probe.siteName} wird gelesen
            </div>
            <div className="import-bar" role="progressbar" aria-valuenow={phase.progress.fetched} aria-valuemin={0} aria-valuemax={phase.progress.total || undefined}>
              <span
                style={{
                  width: phase.progress.total
                    ? `${Math.min(100, (phase.progress.fetched / phase.progress.total) * 100)}%`
                    : "40%",
                }}
              />
            </div>
            <p className="import-hint">
              {phase.progress.fetched.toLocaleString("de")}
              {phase.progress.total ? ` von ${phase.progress.total.toLocaleString("de")}` : ""}{" "}
              Artikeln · Anfrage {phase.progress.batch}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => abort.current?.abort()}
            >
              Abbrechen
            </button>
          </div>
        ) : null}

        {phase.at === "done" ? (
          <div className="import-card ok">
            <div className="import-card-head">
              <Check size={14} />
              {phase.pages.length.toLocaleString("de")} Artikel aus{" "}
              {phase.probe.siteName} sind da
            </div>
            <p className="import-hint">
              {Math.round(estimateBytes(phase.pages) / 1024).toLocaleString("de")} kB Text ·
              Verweise, Backlinks und Keime wurden neu berechnet. Die Artikel
              sind ab sofort durchsuchbar und bearbeitbar.
            </p>
            <div className="seed-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onOpenArticle(phase.pages[0].title)}
              >
                Ersten Artikel öffnen
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Zum Verzeichnis
              </button>
            </div>
          </div>
        ) : null}

        {alreadyImported > 0 && phase.at !== "loading" ? (
          <p className="import-hint" style={{ marginTop: 22 }}>
            {alreadyImported.toLocaleString("de")} Artikel stammen aus einem
            Live-Import.{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                clearImported();
                setPhase({ at: "idle" });
              }}
            >
              Live-Import verwerfen
            </button>{" "}
            — selbst Geschriebenes bleibt erhalten.
          </p>
        ) : null}
      </div>
    </div>
  );
}

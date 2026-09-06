import { Fragment, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  FolderTree,
  NotebookText,
  LibraryBig,
  Pencil,
  RotateCcw,
  Sprout,
  X,
} from "lucide-react";

import {
  allArticles,
  articleExists,
  corpusStats,
  getArticle,
  seedWikitext,
  topRedLinks,
  type Block,
  type Span,
} from "../wiki";
import { revertArticle, saveArticle } from "../wikiStore";

const words = (n: number) => `${n.toLocaleString("de")} ${n === 1 ? "Wort" : "Wörter"}`;
import type { LensSelection } from "../shell/Lens";

interface Props {
  title: string;
  onOpen: (title: string) => void;
  onSelect: (selection: LensSelection) => void;
  canGoBack: boolean;
  onBack: () => void;
  /** „__index__" zeigt das Verzeichnis statt eines Artikels. */
  showIndex: boolean;
  onShowIndex: (show: boolean) => void;
  onImport: () => void;
  onJournal: () => void;
  onSammlungen: () => void;
}

export const WELT_INDEX = "__index__";

export function Welt({
  title,
  onOpen,
  onSelect,
  canGoBack,
  onBack,
  showIndex,
  onShowIndex,
  onImport,
  onJournal,
  onSammlungen,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const article = getArticle(title);

  /* Beim Wechsel des Artikels nie im Bearbeitungsmodus hängen bleiben. */
  useEffect(() => {
    setEditing(false);
  }, [title, showIndex]);

  if (showIndex) {
    return (
      <Index
        onOpen={onOpen}
        onClose={() => onShowIndex(false)}
        onImport={onImport}
        onJournal={onJournal}
        onSammlungen={onSammlungen}
      />
    );
  }

  /* Roter Link: der Artikel existiert noch nicht. */
  if (!article) {
    return (
      <div className="stage-scroll">
        <div className="article-wrap">
          <div className="eyebrow">Keim · noch kein Artikel</div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {title}
          </h1>
          <p className="seed-note">
            Dieser Name ist im Korpus verlinkt, aber noch nicht geschrieben. In
            Chronicle ist das kein Fehler, sondern ein Keim: Der rote Link hält
            die Stelle frei, bis jemand — oder ein Abend am Tisch — sie füllt.
          </p>
          <div className="seed-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                saveArticle(title, seedWikitext(title), true);
                onOpen(title);
              }}
            >
              <Sprout size={14} />
              Artikel anlegen
            </button>
            {canGoBack ? (
              <button type="button" className="btn" onClick={onBack}>
                <ArrowLeft size={14} />
                Zurück
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="stage-scroll">
        <div className="article-wrap">
          <div className="editor-head">
            <div>
              <div className="eyebrow">Bearbeiten · Wikitext</div>
              <h1 className="display" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
                {article.title}
              </h1>
            </div>
            <div className="editor-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setEditing(false)}
              >
                <X size={14} />
                Verwerfen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  saveArticle(article.title, draft, article.created);
                  setEditing(false);
                }}
              >
                <Check size={14} />
                Speichern
              </button>
            </div>
          </div>
          <textarea
            className="editor"
            value={draft}
            spellCheck={false}
            aria-label={`Wikitext von ${article.title}`}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className="editor-hint">
            <code>== Überschrift ==</code> · <code>[[Verweis]]</code> ·{" "}
            <code>[[Ziel|Anzeige]]</code> · <code>'''fett'''</code> ·{" "}
            <code>* Liste</code> — ein Verweis auf einen unbekannten Namen wird
            zum roten Keim, und Backlinks entstehen sofort.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-scroll" key={article.id}>
      <article className="article-wrap">
        <header className="article-head">
          <div className="article-toolbar">
            {canGoBack ? (
              <button type="button" className="chip" onClick={onBack}>
                <ArrowLeft size={11} />
                Zurück
              </button>
            ) : null}
            <button
              type="button"
              className="chip"
              onClick={() => onShowIndex(true)}
            >
              <LibraryBig size={11} />
              Alle Artikel
            </button>
            <span className="toolbar-spacer" />
            {article.edited ? (
              <button
                type="button"
                className="chip"
                title="Auf die importierte Fassung zurücksetzen"
                onClick={() => revertArticle(article.title)}
              >
                <RotateCcw size={11} />
                Import wiederherstellen
              </button>
            ) : null}
            <button
              type="button"
              className="chip accent"
              onClick={() => {
                setDraft(article.wikitext);
                setEditing(true);
              }}
            >
              <Pencil size={11} />
              Bearbeiten
            </button>
          </div>

          <div className="eyebrow">Eron · Enzyklopädie · {article.kind}</div>
          <h1 className="display">{article.title}</h1>
          <div className="article-meta">
            <span>
              {article.lastEdit} · {words(article.words)}
            </span>
            {article.created ? (
              <span className="chip accent">in Chronicle entstanden</span>
            ) : article.edited ? (
              <span className="chip accent">lokal bearbeitet</span>
            ) : (
              <span className="chip">Kanon</span>
            )}
            {article.backlinks.length ? (
              <span className="chip">{article.backlinks.length} Backlinks</span>
            ) : null}
            <button
              type="button"
              className="chip"
              onClick={() => onSelect("olav")}
            >
              Sicht &amp; Rechte
            </button>
          </div>
        </header>

        <div className="article">
          {(article.facts.length > 0 || article.image) && (
            <aside className="facts card" aria-label="Registerdaten">
              {article.image ? (
                <img className="facts-image" src={article.image} alt="" />
              ) : null}
              {article.facts.length ? (
                <>
                  <h3>Register</h3>
                  <dl>
                    {article.facts.map(([key, value]) => (
                      <Fragment key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </>
              ) : null}
            </aside>
          )}

          {article.lead ? (
            <p className="lead">
              <Spans spans={article.lead} onOpen={onOpen} />
            </p>
          ) : null}

          {article.sections.map((section, index) => (
            <section key={`${section.heading ?? "intro"}-${index}`}>
              {section.heading ? (
                section.level <= 2 ? (
                  <h2 className="section-h2">{section.heading}</h2>
                ) : (
                  <h3 className="section-h3">{section.heading}</h3>
                )
              ) : null}
              {section.blocks.map((block, blockIndex) => (
                <BlockView key={blockIndex} block={block} onOpen={onOpen} />
              ))}
            </section>
          ))}
        </div>

        {article.backlinks.length ? (
          <footer className="backlinks">
            <span className="eyebrow" style={{ color: "var(--text-faint)" }}>
              Hierher verlinkt
            </span>
            {article.backlinks.slice(0, 16).map((backlink) => (
              <button
                key={backlink}
                type="button"
                className="chip"
                onClick={() => onOpen(backlink)}
              >
                {backlink}
              </button>
            ))}
            {article.backlinks.length > 16 ? (
              <span className="chip">+{article.backlinks.length - 16}</span>
            ) : null}
          </footer>
        ) : null}

        <p className="attribution">
          {article.origin
            ? `Prosa: ${article.origin.source} · ${article.origin.license}${
                article.origin.revision ? ` · Revision ${article.origin.revision}` : ""
              }${article.edited ? " · lokal bearbeitet, bleibt share-alike" : ""}`
            : "In Chronicle entstanden · Beispiel-Universum, nie Produktinhalt"}
        </p>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------ Verzeichnis */

function Index({
  onOpen,
  onClose,
  onImport,
  onJournal,
  onSammlungen,
}: {
  onOpen: (title: string) => void;
  onClose: () => void;
  onImport: () => void;
  onJournal: () => void;
  onSammlungen: () => void;
}) {
  const articles = allArticles();
  const stats = corpusStats();
  const wanted = topRedLinks(12);

  const byKind = new Map<string, typeof articles>();
  for (const article of articles) {
    const list = byKind.get(article.kind) ?? [];
    list.push(article);
    byKind.set(article.kind, list);
  }

  return (
    <div className="stage-scroll">
      <div className="index-wrap">
        <header className="index-head">
          <div className="eyebrow">Eron · Enzyklopädie</div>
          <h1 className="display">Alle Artikel</h1>
          <p className="index-stats">
            {stats.articles} Artikel · {stats.words.toLocaleString("de")} Wörter ·{" "}
            {stats.links.toLocaleString("de")} Verweise · {stats.redLinks} Keime
            {stats.edited ? ` · ${stats.edited} lokal bearbeitet` : ""}
            {stats.created ? ` · ${stats.created} hier entstanden` : ""}
          </p>
          <div className="article-toolbar" style={{ marginTop: 4 }}>
            <button type="button" className="chip" onClick={onClose}>
              <ArrowLeft size={11} />
              Zurück zum Artikel
            </button>
            <button type="button" className="chip" onClick={onJournal}>
              <NotebookText size={11} />
              Journale
            </button>
            <button type="button" className="chip" onClick={onSammlungen}>
              <FolderTree size={11} />
              Sammlungen
            </button>
            <button type="button" className="chip accent" onClick={onImport}>
              <Download size={11} />
              Wiki importieren
            </button>
          </div>
        </header>

        {[...byKind.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([kind, list]) => (
            <section key={kind} className="index-group">
              <h2 className="section-h2">
                {kind} <span className="index-count">{list.length}</span>
              </h2>
              <div className="index-grid">
                {list.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    className="index-item"
                    onClick={() => onOpen(article.title)}
                  >
                    <span className="index-item-title">{article.title}</span>
                    <span className="index-item-meta">
                      {words(article.words)} · {article.backlinks.length} Backlinks
                      {article.created ? " · neu" : article.edited ? " · bearbeitet" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}

        <section className="index-group">
          <h2 className="section-h2">
            Am meisten vermisst <span className="index-count">{stats.redLinks}</span>
          </h2>
          <p className="index-stats" style={{ marginBottom: 14 }}>
            Namen, die der Korpus verlinkt, aber niemand geschrieben hat. Die
            Zahl sagt, wie oft ein Artikel auf sie zeigt.
          </p>
          <div className="index-grid">
            {wanted.map((entry) => (
              <button
                key={entry.title}
                type="button"
                className="index-item red"
                onClick={() => onOpen(entry.title)}
              >
                <span className="index-item-title">{entry.title}</span>
                <span className="index-item-meta">
                  {entry.wanted}× verlangt · Keim anlegen
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Render */

function Spans({
  spans,
  onOpen,
}: {
  spans: Span[];
  onOpen: (title: string) => void;
}) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.t === "b") return <strong key={index}>{span.v}</strong>;
        if (span.t === "i") return <em key={index}>{span.v}</em>;
        if (span.t === "link") {
          const exists = articleExists(span.to);
          return (
            <button
              key={index}
              type="button"
              className={exists ? "link" : "link red"}
              onClick={() => onOpen(span.to)}
              title={
                exists ? span.to : `${span.to} — roter Link: Keim, noch nicht geschrieben`
              }
            >
              {span.v}
            </button>
          );
        }
        return <Fragment key={index}>{span.v}</Fragment>;
      })}
    </>
  );
}

function BlockView({
  block,
  onOpen,
}: {
  block: Block;
  onOpen: (title: string) => void;
}) {
  if (block.kind === "p") {
    return (
      <p>
        <Spans spans={block.spans} onOpen={onOpen} />
      </p>
    );
  }
  if (block.kind === "ul" || block.kind === "ol") {
    const List = block.kind === "ul" ? "ul" : "ol";
    return (
      <List className="article-list">
        {block.items.map((item, index) => (
          <li key={index}>
            <Spans spans={item} onOpen={onOpen} />
          </li>
        ))}
      </List>
    );
  }
  return (
    <div className="table-scroll">
      <table className="article-table">
        {block.headers.length ? (
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <Spans spans={cell} onOpen={onOpen} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

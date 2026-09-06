import { Fragment } from "react";
import { ArrowLeft, Sprout } from "lucide-react";

import { ATTRIBUTION } from "../fixture";
import {
  ARTICLE_BY_TITLE,
  articleExists,
  articleWords,
  type Block,
  type Span,
  type WikiArticle,
} from "../wiki";
import type { LensSelection } from "../shell/Lens";

interface Props {
  title: string;
  onOpen: (title: string) => void;
  onSelect: (selection: LensSelection) => void;
  history: string[];
  onBack: () => void;
}

/**
 * Welt: der importierte Eron-Korpus als Lesedokument. Genau ein Artikel auf der
 * Bühne; navigiert wird über die Links im Text, die Backlinks und ⌘K — nie über
 * eine zweite Spalte (Gate §2).
 */
export function Welt({ title, onOpen, onSelect, history, onBack }: Props) {
  const article = ARTICLE_BY_TITLE.get(title);

  if (!article) {
    return (
      <div className="stage-scroll">
        <div className="article-wrap">
          <div className="eyebrow">Keim · noch kein Artikel</div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {title}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 12, maxWidth: "48ch" }}>
            Dieser Ort ist im Korpus verlinkt, aber noch nicht geschrieben. In
            Chronicle ist das kein Fehler, sondern ein Keim: Der rote Link hält
            die Stelle frei, bis jemand — oder ein Abend am Tisch — sie füllt.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button type="button" className="btn btn-primary">
              <Sprout size={14} />
              Artikel anlegen
            </button>
            {history.length > 1 ? (
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

  const words = articleWords(article);

  return (
    <div className="stage-scroll" key={article.id}>
      <article className="article-wrap">
        <header className="article-head">
          {history.length > 1 ? (
            <button type="button" className="chip back-chip" onClick={onBack}>
              <ArrowLeft size={11} />
              Zurück
            </button>
          ) : null}
          <div className="eyebrow">
            Eron · Enzyklopädie · {article.kind}
          </div>
          <h1 className="display">{article.title}</h1>
          <div className="article-meta">
            <span>
              {article.lastEdit} · {words.toLocaleString("de")} Wörter
            </span>
            <span className="chip">Kanon</span>
            {article.backlinks.length ? (
              <span className="chip">{article.backlinks.length} Backlinks</span>
            ) : null}
            <button
              type="button"
              className="chip"
              onClick={() => onSelect("olav")}
              title="Öffnet die Kontextlinse"
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
            {article.backlinks.slice(0, 14).map((backlink) => (
              <button
                key={backlink}
                type="button"
                className="chip"
                onClick={() => onOpen(backlink)}
              >
                {backlink}
              </button>
            ))}
            {article.backlinks.length > 14 ? (
              <span className="chip">+{article.backlinks.length - 14}</span>
            ) : null}
          </footer>
        ) : null}

        <p className="attribution">{ATTRIBUTION}</p>
      </article>
    </div>
  );
}

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
                exists
                  ? span.to
                  : `${span.to} — roter Link: noch kein Artikel, aber ein Keim`
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

import { ATTRIBUTION, ARTICLE } from "../fixture";
import type { LensSelection } from "../shell/Lens";

interface Props {
  onSelect: (selection: LensSelection) => void;
}

/** Welt: Lesedokument mit direkter Bearbeitung, kein Formular. */
export function Welt({ onSelect }: Props) {
  return (
    <div className="stage-scroll">
      <article className="article-wrap">
        <header className="article-head">
          <div className="eyebrow">{ARTICLE.eyebrow}</div>
          <h1 className="display">{ARTICLE.title}</h1>
          <div className="article-meta">
            <span>{ARTICLE.lastEdit}</span>
            <span className="chip">Kanon</span>
            <span className="chip">Sicht: alle am Tisch</span>
          </div>
        </header>

        <div className="article">
          <aside className="facts card" aria-label="Registerdaten">
            <h3>Register</h3>
            <dl>
              {ARTICLE.facts.map(([key, value]) => (
                <div key={key} style={{ display: "contents" }}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <p className="lead">{ARTICLE.lead}</p>
          {ARTICLE.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <p>
            Mitglieder der aktuellen Runde:{" "}
            <button type="button" className="link" onClick={() => onSelect("olav")}>
              Olav der Ehrliche
            </button>
            {", "}
            <span className="link">Song Kayn</span>
            {" und "}
            <span className="link">Oggugat</span>
            {". Die "}
            <button
              type="button"
              className="link red"
              onClick={() => onSelect("passage")}
              title="Roter Link — dieser Artikel existiert noch nicht. Ein Klick legt einen Keim an."
            >
              versiegelte Passage
            </button>
            {" verweist auf den "}
            <span className="link red">Bardenzirkel</span>
            {" — beides wartet noch auf einen Artikel."}
          </p>
        </div>

        <footer className="backlinks">
          <span className="eyebrow" style={{ color: "var(--text-faint)" }}>
            Backlinks
          </span>
          {ARTICLE.backlinks.map((backlink) => (
            <span key={backlink} className="chip">
              {backlink}
            </span>
          ))}
        </footer>
        <p className="attribution">{ATTRIBUTION}</p>
      </article>
    </div>
  );
}

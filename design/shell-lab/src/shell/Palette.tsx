import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";

import { corpusStats, searchArticles } from "../wiki";

interface Props {
  onOpen: (title: string) => void;
  onClose: () => void;
}

/**
 * Die Omnibox aus Doc 06 §6.4. Ein transienter Overlay — kein Instrument im
 * Sinne des Gates (§2), weil er sich beim ersten Befehl wieder schließt.
 * Er ist der Grund, warum die Welt keine Artikelspalte braucht.
 */
export function Palette({ onOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchArticles(query, 40), [query]);
  const stats = corpusStats();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [query]);

  const choose = (title: string) => {
    onOpen(title);
    onClose();
  };

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Suchen und springen">
        <div className="palette-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Suchen, springen, würfeln …"
            aria-label="Suche"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, hits.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (event.key === "Enter" && hits[active]) {
                choose(hits[active].article.title);
              }
            }}
          />
          <kbd>ESC</kbd>
        </div>

        <div className="palette-results" role="listbox">
          {hits.length === 0 ? (
            <p className="palette-empty">
              Kein Artikel trägt diesen Namen. In Chronicle wäre der nächste
              Schritt, ihn als Keim anzulegen.
            </p>
          ) : (
            hits.map((hit, index) => (
              <button
                key={hit.article.id}
                type="button"
                role="option"
                aria-selected={index === active}
                className="palette-hit"
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(hit.article.title)}
              >
                <span className="palette-hit-main">
                  <span className="palette-hit-title">{hit.article.title}</span>
                  <span className="palette-hit-snippet">{hit.snippet}</span>
                </span>
                <span className="palette-hit-kind">{hit.article.kind}</span>
                {index === active ? <CornerDownLeft size={13} /> : null}
              </button>
            ))
          )}
        </div>

        <div className="palette-foot">
          {stats.articles} Artikel · {stats.words.toLocaleString("de")} Wörter ·{" "}
          {stats.redLinks} Keime
          {stats.created ? ` · ${stats.created} hier entstanden` : ""} — ↑↓ wählen,
          ⏎ öffnen
        </div>
      </div>
    </div>
  );
}

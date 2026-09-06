import { useMemo, useState } from "react";
import { ArrowLeft, Filter, Hand, Minus, Plus, Trash2 } from "lucide-react";

import { allArticles, type WikiArticle } from "../wiki";
import {
  COLLECTIONS,
  OPERATOR_LABEL,
  VALUELESS,
  resolve,
  type Collection,
  type Condition,
  type Operator,
} from "../sammlungenFixture";

interface Props {
  onOpenArticle: (title: string) => void;
}

const OPERATORS = Object.keys(OPERATOR_LABEL) as Operator[];

/**
 * Sammlungen: Ordner, die keine Schubladen sind. Eine Abfrage-Sammlung rechnet
 * live über den echten Korpus; derselbe Artikel liegt dadurch in mehreren,
 * ohne kopiert zu werden. Das ist der Unterschied zu Roll20 und Foundry, und
 * die Oberfläche zeigt ihn, statt ihn zu behaupten.
 */
export function Sammlungen({ onOpenArticle }: Props) {
  const [collections, setCollections] = useState<Collection[]>(COLLECTIONS);
  const [openId, setOpenId] = useState<string | null>(null);
  const articles = allArticles();

  const resolved = useMemo(
    () =>
      new Map(
        collections.map((collection) => [
          collection.id,
          resolve(collection, articles),
        ]),
      ),
    [collections, articles],
  );

  /* Der Beleg für „keine Schubladen": in wie vielen Sammlungen liegt ein Titel? */
  const membership = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const collection of collections) {
      for (const article of resolved.get(collection.id) ?? []) {
        counts.set(article.title, [
          ...(counts.get(article.title) ?? []),
          collection.name,
        ]);
      }
    }
    return counts;
  }, [collections, resolved]);

  const shared = useMemo(
    () =>
      [...membership.entries()]
        .filter(([, names]) => names.length > 1)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 4),
    [membership],
  );

  const update = (id: string, change: (collection: Collection) => Collection) =>
    setCollections((list) =>
      list.map((collection) => (collection.id === id ? change(collection) : collection)),
    );

  const open = openId ? collections.find((c) => c.id === openId) : null;

  if (open) {
    return (
      <Detail
        collection={open}
        hits={resolved.get(open.id) ?? []}
        membership={membership}
        onBack={() => setOpenId(null)}
        onOpenArticle={onOpenArticle}
        onChange={(change) => update(open.id, change)}
      />
    );
  }

  return (
    <div className="stage-scroll">
      <div className="sammlungen-wrap">
        <header className="index-head">
          <div className="eyebrow">Welt · Sammlungen</div>
          <h1 className="display">Sammlungen</h1>
          <p className="index-stats">
            {collections.length} Sammlungen über {articles.length} Artikel. Eine
            Sammlung ist eine gespeicherte Abfrage, keine Schublade — derselbe
            Artikel liegt in so vielen, wie auf ihn zutreffen.
          </p>
        </header>

        <div className="index-grid">
          {collections.map((collection) => {
            const hits = resolved.get(collection.id) ?? [];
            return (
              <button
                key={collection.id}
                type="button"
                className="index-item"
                onClick={() => setOpenId(collection.id)}
              >
                <span className="index-item-title">
                  {collection.kind === "abfrage" ? (
                    <Filter size={12} aria-hidden="true" />
                  ) : (
                    <Hand size={12} aria-hidden="true" />
                  )}{" "}
                  {collection.name}
                </span>
                <span className="index-item-meta">
                  {hits.length} {hits.length === 1 ? "Treffer" : "Treffer"} ·{" "}
                  {collection.kind === "abfrage" ? "Abfrage" : "handgepflegt"}
                </span>
                <span className="sammlung-hint">{collection.hint}</span>
              </button>
            );
          })}
        </div>

        {shared.length ? (
          <section className="index-group">
            <h2 className="section-h2">
              In mehreren zugleich <span className="index-count">{shared.length}</span>
            </h2>
            <p className="index-stats" style={{ marginBottom: 12 }}>
              Diese Artikel liegen in mehreren Sammlungen — nicht als Kopie,
              sondern weil mehrere Abfragen auf sie zutreffen. In einem
              Ordnerbaum müsste man sich für einen Ort entscheiden.
            </p>
            <div className="index-grid">
              {shared.map(([title, names]) => (
                <button
                  key={title}
                  type="button"
                  className="index-item"
                  onClick={() => onOpenArticle(title)}
                >
                  <span className="index-item-title">{title}</span>
                  <span className="index-item-meta">{names.join(" · ")}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Detail */

function Detail({
  collection,
  hits,
  membership,
  onBack,
  onOpenArticle,
  onChange,
}: {
  collection: Collection;
  hits: WikiArticle[];
  membership: Map<string, string[]>;
  onBack: () => void;
  onOpenArticle: (title: string) => void;
  onChange: (change: (collection: Collection) => Collection) => void;
}) {
  const [adding, setAdding] = useState("");
  const isQuery = collection.kind === "abfrage";

  const setCondition = (id: string, patch: Partial<Condition>) =>
    onChange((current) => ({
      ...current,
      conditions: current.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition,
      ),
    }));

  return (
    <div className="stage-scroll">
      <div className="sammlungen-wrap">
        <div className="article-toolbar">
          <button type="button" className="chip" onClick={onBack}>
            <ArrowLeft size={11} />
            Alle Sammlungen
          </button>
        </div>

        <div className="eyebrow">
          Welt · {isQuery ? "Abfrage-Sammlung" : "Handgepflegte Sammlung"}
        </div>
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
          {collection.name}
        </h1>
        <p className="index-stats">{collection.hint}</p>

        {isQuery ? (
          <section className="query-card card">
            <h3 className="query-head">
              Bedingungen — alle müssen zutreffen
              <span className="query-count">
                {hits.length} {hits.length === 1 ? "Treffer" : "Treffer"}
              </span>
            </h3>

            {collection.conditions.map((condition) => (
              <div className="query-row" key={condition.id}>
                <label className="visually-hidden" htmlFor={`op-${condition.id}`}>
                  Bedingung
                </label>
                <select
                  id={`op-${condition.id}`}
                  value={condition.operator}
                  onChange={(event) =>
                    setCondition(condition.id, {
                      operator: event.target.value as Operator,
                    })
                  }
                >
                  {OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {OPERATOR_LABEL[operator]}
                    </option>
                  ))}
                </select>

                {VALUELESS.includes(condition.operator) ? (
                  <span className="query-novalue">— kein Wert nötig</span>
                ) : (
                  <>
                    <label className="visually-hidden" htmlFor={`val-${condition.id}`}>
                      Wert
                    </label>
                    <input
                      id={`val-${condition.id}`}
                      value={condition.value}
                      onChange={(event) =>
                        setCondition(condition.id, { value: event.target.value })
                      }
                    />
                  </>
                )}

                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Bedingung entfernen"
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      conditions: current.conditions.filter(
                        (item) => item.id !== condition.id,
                      ),
                    }))
                  }
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn"
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  conditions: [
                    ...current.conditions,
                    {
                      id: `c-${Date.now()}`,
                      operator: "art-ist",
                      value: "Person",
                    },
                  ],
                }))
              }
            >
              <Plus size={14} />
              Bedingung hinzufügen
            </button>

            {collection.conditions.length === 0 ? (
              <p className="query-empty">
                Ohne Bedingung trifft eine Abfrage nichts. Das ist Absicht — eine
                leere Abfrage, die alles zeigt, wäre keine Sammlung.
              </p>
            ) : null}
          </section>
        ) : (
          <section className="query-card card">
            <h3 className="query-head">
              Handverlesen
              <span className="query-count">{hits.length} Einträge</span>
            </h3>
            <p className="query-empty" style={{ marginTop: 0 }}>
              Keine Abfrage trifft, was an einem Abend wichtig war. Solche
              Sammlungen bleiben Handarbeit.
            </p>
            <div className="query-row">
              <label className="visually-hidden" htmlFor="add-title">
                Artikeltitel aufnehmen
              </label>
              <input
                id="add-title"
                value={adding}
                placeholder="Artikeltitel aufnehmen …"
                onChange={(event) => setAdding(event.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={!adding.trim()}
                onClick={() => {
                  onChange((current) => ({
                    ...current,
                    members: [...new Set([...current.members, adding.trim()])],
                  }));
                  setAdding("");
                }}
              >
                <Plus size={14} />
                Aufnehmen
              </button>
            </div>
          </section>
        )}

        <section className="index-group">
          <h2 className="section-h2">
            Treffer <span className="index-count">{hits.length}</span>
          </h2>
          {hits.length === 0 ? (
            <p className="index-stats">
              Nichts im Korpus erfüllt diese Bedingungen.
            </p>
          ) : (
            <div className="index-grid">
              {hits.map((article) => (
                <div className="index-item sammlung-treffer" key={article.id}>
                  <button
                    type="button"
                    className="sammlung-treffer-open"
                    onClick={() => onOpenArticle(article.title)}
                  >
                    <span className="index-item-title">{article.title}</span>
                    <span className="index-item-meta">
                      {article.kind} · {article.words.toLocaleString("de")}{" "}
                      {article.words === 1 ? "Wort" : "Wörter"} ·{" "}
                      {article.backlinks.length} Backlinks
                    </span>
                    <span className="sammlung-hint">
                      auch in: {(membership.get(article.title) ?? [])
                        .filter((name) => name !== collection.name)
                        .join(" · ") || "keiner weiteren"}
                    </span>
                  </button>
                  {!isQuery ? (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${article.title} entfernen`}
                      onClick={() =>
                        onChange((current) => ({
                          ...current,
                          members: current.members.filter(
                            (title) => title !== article.title,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

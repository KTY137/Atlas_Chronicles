import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  Map as MapIcon,
  ScrollText,
  Users,
} from "lucide-react";

import {
  FIGUREN,
  JOURNALS,
  JOURNAL_ATTRIBUTION,
  PLAYER_SELF_ID,
  SICHT_LEITUNG,
  SICHT_TISCH,
  sichtEinzeln,
  type Journal as JournalType,
  type JournalPage,
  type Sicht,
} from "../journalFixture";

interface Props {
  role: "gm" | "player";
  onOpenArticle: (title: string) => void;
}

/**
 * Journale und Handouts — Foundrys und Roll20s Modell, mit einem Unterschied,
 * der alles verändert: Freigabe ist keine Checkbox, sondern `Sicht`.
 *
 * Was ein Spieler nicht kennt, ist für ihn nicht ausgegraut, sondern
 * **abwesend** — dieselbe Berechtigungskante wie beim Flüsterkanal (07 §4).
 * Die Leitung sieht daneben, was der Tisch sieht; das ist die einzige Stelle,
 * an der beide Wahrheiten nebeneinander stehen dürfen.
 */
export function Journal({ role, onOpenArticle }: Props) {
  const [sichten, setSichten] = useState<Record<string, Sicht>>(() =>
    Object.fromEntries(
      JOURNALS.flatMap((journal) =>
        journal.pages.map((page) => [page.id, page.sicht]),
      ),
    ),
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const sichtVon = (pageId: string, fallback: Sicht) =>
    sichten[pageId] ?? fallback;

  const darfSehen = (sicht: Sicht) => {
    if (role === "gm") return true;
    if (sicht.modus === "leitung") return false;
    if (sicht.modus === "tisch") return true;
    return sicht.figuren.includes(PLAYER_SELF_ID);
  };

  /* Für den Spieler existieren verborgene Seiten nicht — sie werden gefiltert,
     nicht markiert. Für die Leitung bleibt alles sichtbar, mit Zustand. */
  const sichtbareSeiten = (journal: JournalType) =>
    journal.pages.filter((page) => darfSehen(sichtVon(page.id, page.sicht)));

  /* Zwei verschiedene Zahlen: was ICH sehe, und was der Tisch sieht. Fuer die
     Leitung sind das nie dieselben — genau das ist der Punkt der Freigabe. */
  const amTisch = (journal: JournalType) =>
    journal.pages.filter((page) => {
      const sicht = sichtVon(page.id, page.sicht);
      return sicht.modus === "tisch";
    }).length;

  const journale = useMemo(
    () =>
      JOURNALS.map((journal) => ({
        journal,
        sichtbar: sichtbareSeiten(journal),
        offen: amTisch(journal),
      })).filter((entry) => role === "gm" || entry.sichtbar.length > 0),
    [role, sichten],
  );

  const offen = openId ? JOURNALS.find((j) => j.id === openId) : null;

  if (offen) {
    return (
      <Detail
        journal={offen}
        role={role}
        sichtVon={sichtVon}
        darfSehen={darfSehen}
        onSicht={(pageId, sicht) =>
          setSichten((current) => ({ ...current, [pageId]: sicht }))
        }
        onBack={() => setOpenId(null)}
        onOpenArticle={onOpenArticle}
      />
    );
  }

  return (
    <div className="stage-scroll">
      <div className="journal-wrap">
        <header className="index-head">
          <div className="eyebrow">Welt · Journale</div>
          <h1 className="display">Journale &amp; Handouts</h1>
          <p className="index-stats">
            {role === "gm"
              ? "Jede Seite trägt, wer sie kennt. Was du hier freigibst, erscheint beim Tisch — was du zurücknimmst, verschwindet dort wieder."
              : "Was deine Spielleitung freigegeben hat. Seiten, die du nicht kennst, stehen hier nicht — auch nicht als Andeutung."}
          </p>
        </header>

        <div className="index-grid">
          {journale.map(({ journal, sichtbar, offen }) => (
            <button
              key={journal.id}
              type="button"
              className="index-item"
              onClick={() => setOpenId(journal.id)}
            >
              <span className="index-item-title">{journal.title}</span>
              <span className="index-item-meta">
                {role === "gm"
                  ? `${journal.pages.length} Seiten · ${offen} beim ganzen Tisch`
                  : `${sichtbar.length} ${sichtbar.length === 1 ? "Seite" : "Seiten"}`}
              </span>
              <span className="journal-summary">{journal.summary}</span>
            </button>
          ))}
        </div>

        {journale.length === 0 ? (
          <p className="index-stats">
            Deine Spielleitung hat noch nichts freigegeben.
          </p>
        ) : null}

        <p className="attribution">{JOURNAL_ATTRIBUTION}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Detail */

function Detail({
  journal,
  role,
  sichtVon,
  darfSehen,
  onSicht,
  onBack,
  onOpenArticle,
}: {
  journal: JournalType;
  role: "gm" | "player";
  sichtVon: (pageId: string, fallback: Sicht) => Sicht;
  darfSehen: (sicht: Sicht) => boolean;
  onSicht: (pageId: string, sicht: Sicht) => void;
  onBack: () => void;
  onOpenArticle: (title: string) => void;
}) {
  const seiten = journal.pages.filter((page) =>
    darfSehen(sichtVon(page.id, page.sicht)),
  );

  return (
    <div className="stage-scroll">
      <div className="journal-wrap">
        <div className="article-toolbar">
          <button type="button" className="chip" onClick={onBack}>
            <ArrowLeft size={11} />
            Alle Journale
          </button>
        </div>

        <div className="eyebrow">{journal.eyebrow}</div>
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
          {journal.title}
        </h1>
        <p className="index-stats">{journal.summary}</p>

        <div className="journal-pages">
          {seiten.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              role={role}
              sicht={sichtVon(page.id, page.sicht)}
              onSicht={(sicht) => onSicht(page.id, sicht)}
              onOpenArticle={onOpenArticle}
            />
          ))}
        </div>

        <p className="attribution">{JOURNAL_ATTRIBUTION}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Seite */

const PAGE_ICON = {
  text: FileText,
  bild: ImageIcon,
  brief: Mail,
  karte: MapIcon,
  steckbrief: ScrollText,
} as const;

function pageIcon(page: JournalPage) {
  return page.kind === "handout" ? PAGE_ICON[page.handout] : PAGE_ICON[page.kind];
}

function PageCard({
  page,
  role,
  sicht,
  onSicht,
  onOpenArticle,
}: {
  page: JournalPage;
  role: "gm" | "player";
  sicht: Sicht;
  onSicht: (sicht: Sicht) => void;
  onOpenArticle: (title: string) => void;
}) {
  const Icon = pageIcon(page);

  return (
    <article className="journal-page card" data-sicht={sicht.modus}>
      <header className="journal-page-head">
        <Icon size={14} aria-hidden="true" />
        <h2>{page.title}</h2>
        <SichtChip sicht={sicht} />
      </header>

      <div className="journal-page-body">
        <PageBody page={page} />
      </div>

      {page.refs?.length ? (
        <footer className="journal-refs">
          <span className="eyebrow" style={{ color: "var(--text-faint)" }}>
            Im Buch
          </span>
          {page.refs.map((ref) => (
            <button
              key={ref}
              type="button"
              className="chip"
              onClick={() => onOpenArticle(ref)}
            >
              {ref}
            </button>
          ))}
        </footer>
      ) : null}

      {role === "gm" ? (
        <SichtSteuerung sicht={sicht} onSicht={onSicht} />
      ) : null}
    </article>
  );
}

function PageBody({ page }: { page: JournalPage }) {
  if (page.kind === "text") {
    return (
      <>
        {page.body.map((paragraph) => (
          <p key={paragraph.slice(0, 30)}>{paragraph}</p>
        ))}
      </>
    );
  }
  if (page.kind === "bild") {
    return (
      <figure className="journal-figure">
        <img src={page.src} alt="" />
        <figcaption>{page.caption}</figcaption>
      </figure>
    );
  }
  if (page.handout === "brief") {
    return (
      <div className="handout handout-brief">
        <div className="handout-meta">
          von {page.von}
          {page.an ? ` · an ${page.an}` : ""}
        </div>
        {page.body.map((paragraph) => (
          <p key={paragraph.slice(0, 30)}>{paragraph}</p>
        ))}
      </div>
    );
  }
  if (page.handout === "karte") {
    return (
      <div className="handout handout-karte">
        <img src={page.src} alt="" />
        <div className="handout-meta">{page.ort}</div>
        <ul>
          {page.notiz.map((note) => (
            <li key={note.slice(0, 30)}>{note}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="handout handout-steckbrief">
      <div className="steckbrief-name">{page.name}</div>
      {page.kopfgeld ? (
        <div className="steckbrief-kopfgeld">{page.kopfgeld}</div>
      ) : null}
      {page.zuletztGesehen ? (
        <div className="handout-meta">zuletzt gesehen: {page.zuletztGesehen}</div>
      ) : null}
      <dl className="steckbrief-listen">
        <dt>Merkmale</dt>
        <dd>{page.merkmale.join(" · ")}</dd>
        <dt>Verbrechen</dt>
        <dd>{page.verbrechen.join(" · ")}</dd>
      </dl>
    </div>
  );
}

/* ---------------------------------------------------------------- Sicht */

function SichtChip({ sicht }: { sicht: Sicht }) {
  if (sicht.modus === "leitung") {
    return (
      <span className="chip journal-sicht danger">
        <Lock size={10} /> nur Leitung
      </span>
    );
  }
  if (sicht.modus === "tisch") {
    return (
      <span className="chip journal-sicht accent">
        <Eye size={10} /> am Tisch
      </span>
    );
  }
  const namen = FIGUREN.filter((figur) => sicht.figuren.includes(figur.id)).map(
    (figur) => figur.name,
  );
  return (
    <span className="chip journal-sicht accent">
      <Users size={10} /> {namen.join(", ") || "niemand"}
    </span>
  );
}

function SichtSteuerung({
  sicht,
  onSicht,
}: {
  sicht: Sicht;
  onSicht: (sicht: Sicht) => void;
}) {
  const einzeln = sicht.modus === "einzeln" ? sicht.figuren : [];

  return (
    <div className="journal-sicht-steuerung">
      <span className="eyebrow" style={{ color: "var(--text-faint)" }}>
        Wer kennt diese Seite
      </span>
      <div className="journal-sicht-reihe">
        <button
          type="button"
          className="chip"
          aria-pressed={sicht.modus === "leitung"}
          onClick={() => onSicht(SICHT_LEITUNG)}
        >
          <EyeOff size={11} />
          nur ich
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={sicht.modus === "tisch"}
          onClick={() => onSicht(SICHT_TISCH)}
        >
          <Eye size={11} />
          ganzer Tisch
        </button>
        {FIGUREN.map((figur) => {
          const an = einzeln.includes(figur.id);
          return (
            <button
              key={figur.id}
              type="button"
              className="chip"
              aria-pressed={an}
              onClick={() =>
                onSicht(
                  sichtEinzeln(
                    an
                      ? einzeln.filter((id) => id !== figur.id)
                      : [...einzeln, figur.id],
                  ),
                )
              }
            >
              {figur.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

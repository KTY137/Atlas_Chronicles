import { ArrowRight } from "lucide-react";

import { ATTRIBUTION, CAMPAIGN, type Role, type StageId } from "../fixture";
import { CORPUS_STATS } from "../wiki";

interface Props {
  role: Role;
  goTo: (stage: StageId) => void;
}

/** Heute ist Router, kein Dashboard-Friedhof: der nächste sinnvolle Schritt. */
export function Heute({ role, goTo }: Props) {
  return (
    <div className="stage-scroll">
      <div className="heute">
        <div>
          <div className="eyebrow">
            {CAMPAIGN.universe} · {CAMPAIGN.campaign}
          </div>
          <h1 className="display">
            {role === "gm" ? "Guten Abend, Kaya." : "Guten Abend, Timo."}
          </h1>
          <p className="heute-sub">
            {role === "gm"
              ? "Die Vollmacht ist eingelöst, der Kanon ist geprägt. Die Passage wartet auf ihr Lied — und der Tisch auf Samstag."
              : "Dein Dienstagswurf sitzt im Kanon. Die Passage gehorcht einem Lied — und Samstag wird gesungen."}
          </p>
        </div>

        <div className="card next-card">
          <div className="grow">
            <div className="eyebrow">Nächste Sitzung · {CAMPAIGN.nextSession}</div>
            <h2>„{CAMPAIGN.sessionTitle}"</h2>
            <div className="meta">
              4 am Tisch · Szene: Die Nördlichen Minenreiche · 1 offene Passage
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goTo("tisch")}
          >
            Weiter zum Tisch
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="heute-row">
          <button
            type="button"
            className="card mini-card"
            onClick={() => goTo("kanal")}
          >
            <span className="eyebrow">Seit Samstag</span>
            <b>Kanon geprägt: die Namensrune</b>
            <span>Vollmacht #7 · Wurf 17 gegen SG 14 · Dienstag 22:10</span>
          </button>
          <button
            type="button"
            className="card mini-card"
            onClick={() => goTo("welt")}
          >
            <span className="eyebrow">Im Buch weiterlesen</span>
            <b>{CORPUS_STATS.articles} Artikel · Eron</b>
            <span>
              {CORPUS_STATS.words.toLocaleString("de")} Wörter ·{" "}
              {CORPUS_STATS.redLinks} rote Links warten auf einen Keim
            </span>
          </button>
          {role === "gm" ? (
            <button
              type="button"
              className="card mini-card"
              onClick={() => goTo("schmiede")}
            >
              <span className="eyebrow">Schmiede</span>
              <b>1 Pakettest schlägt fehl</b>
              <span>eron-regeln 0.3.2 · Vollmacht · Widerruf nach Einlösung</span>
            </button>
          ) : null}
        </div>

        <div className="heute-foot">{ATTRIBUTION}</div>
      </div>
    </div>
  );
}

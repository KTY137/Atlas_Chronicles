import { Activity, Search } from "lucide-react";

import { CAMPAIGN, type LookId, type Role } from "../fixture";

const LOOK_LABEL: Record<LookId, string> = {
  obsidian: "Obsidian",
  vellum: "Vellum",
  aurora: "Aurora",
};

interface Props {
  look: LookId;
  onLook: (look: LookId) => void;
  role: Role;
  onRole: (role: Role) => void;
  reducedMotion: boolean;
  onReducedMotion: (reduced: boolean) => void;
}

export function ContextBar({
  look,
  onLook,
  role,
  onRole,
  reducedMotion,
  onReducedMotion,
}: Props) {
  return (
    <header className="context-bar">
      <div className="wordmark">
        Chronicle<span> · Shell Lab</span>
      </div>
      <nav className="crumbs" aria-label="Scope">
        <span>{CAMPAIGN.universe}</span>
        <span className="sep">/</span>
        <span>{CAMPAIGN.campaign}</span>
        <span className="sep">/</span>
        <span className="here">
          {CAMPAIGN.session} · „{CAMPAIGN.sessionTitle}"
        </span>
      </nav>
      <button className="search-pill" type="button">
        <Search size={13} />
        <span>Suchen, springen, würfeln …</span>
        <kbd>⌘K</kbd>
      </button>
      <div className="context-controls">
        <div className="seg" role="group" aria-label="Look" data-optional="true">
          {(Object.keys(LOOK_LABEL) as LookId[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={look === id}
              onClick={() => onLook(id)}
            >
              {LOOK_LABEL[id]}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Rolle">
          <button
            type="button"
            aria-pressed={role === "gm"}
            onClick={() => onRole("gm")}
          >
            Leitung
          </button>
          <button
            type="button"
            aria-pressed={role === "player"}
            onClick={() => onRole("player")}
          >
            Spieler
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={reducedMotion}
          aria-label="Reduzierte Bewegung"
          title="Reduzierte Bewegung"
          onClick={() => onReducedMotion(!reducedMotion)}
        >
          <Activity size={15} />
        </button>
        <span className="sync-dot" title="Befehlsbus verbunden · seq 4 812" />
      </div>
    </header>
  );
}

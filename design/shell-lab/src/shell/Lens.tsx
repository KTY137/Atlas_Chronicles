import { useState } from "react";
import { X } from "lucide-react";

import { ATTRIBUTION, OLAV_LENS, SCENE, type Role } from "../fixture";

export type LensSelection = "olav" | "passage";

type TabId = "uebersicht" | "sicht" | "historie";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "sicht", label: "Sicht" },
  { id: "historie", label: "Historie" },
];

interface Props {
  selection: LensSelection;
  role: Role;
  onClose: () => void;
}

export function Lens({ selection, role, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("uebersicht");

  const isOlav = selection === "olav";
  /* Die versiegelte Passage ist für Spieler nur als Umriss bekannt —
     die Sicht-Projektion entscheidet, was die Lens überhaupt erhält. */
  const title = isOlav ? "Olav der Ehrliche" : "Die versiegelte Passage";
  const eyebrow = isOlav
    ? "Person · Eron · Kampagne Hauptrunde"
    : role === "gm"
      ? "Passage · nicht kanon · nur Leitung"
      : "Passage · bekannt als Umriss";

  return (
    <aside
      className="lens instrument"
      data-instrument="lens"
      aria-label={`Kontextlinse: ${title}`}
    >
      <div className="lens-head">
        <button
          type="button"
          className="icon-btn lens-close"
          aria-label="Linse schließen"
          onClick={onClose}
        >
          <X size={15} />
        </button>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      <div className="lens-tabs" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className="lens-tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="lens-body" role="tabpanel">
        {isOlav ? <OlavPanel tab={tab} /> : <PassagePanel tab={tab} role={role} />}
        <p className="attribution">{ATTRIBUTION}</p>
      </div>
    </aside>
  );
}

function OlavPanel({ tab }: { tab: TabId }) {
  if (tab === "uebersicht") {
    return (
      <dl className="lens-fields">
        {OLAV_LENS.fields.map(([key, value]) => (
          <div key={key} style={{ display: "contents" }}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (tab === "sicht") {
    return (
      <div>
        {OLAV_LENS.sicht.map((row) => (
          <div key={row.wer} className="sicht-row">
            <span className="wer">{row.wer}</span>
            <span className="was">{row.was}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      {OLAV_LENS.history.map((entry) => (
        <div key={entry} className="history-row">
          {entry}
        </div>
      ))}
    </div>
  );
}

function PassagePanel({ tab, role }: { tab: TabId; role: Role }) {
  if (tab === "uebersicht") {
    return (
      <div>
        <p style={{ marginBottom: 12 }}>
          Hinter der Wand antwortet Metall auf einen Namen. Die Rune nennt den
          Bardenzirkel selbst — die Passage gehorcht einem Lied, nicht einem
          Schlüssel.
        </p>
        <dl className="lens-fields">
          <dt>Ort</dt>
          <dd>{SCENE.name}</dd>
          <dt>Zustand</dt>
          <dd>{role === "gm" ? "versiegelt · 3 Namen · 1 Schlüssel" : "versiegelt"}</dd>
          <dt>Kanon</dt>
          <dd>Rune entziffert (Di 22:10)</dd>
        </dl>
      </div>
    );
  }
  if (tab === "sicht") {
    return (
      <div>
        <div className="sicht-row">
          <span className="wer">Timo (Olav)</span>
          <span className="was">Rune + Kanon-Absatz</span>
        </div>
        <div className="sicht-row">
          <span className="wer">Übrige Spieler</span>
          <span className="was">Umriss, kein Inhalt</span>
        </div>
        {role === "gm" ? (
          <div className="sicht-row">
            <span className="wer">Nur Leitung</span>
            <span className="was">dritter Name, Öffnungsbedingung</span>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      <div className="history-row">Di 22:10 · Kanon geprägt: Namensrune entziffert</div>
      <div className="history-row">Sa 23:14 · Vollmacht #7 ausgestellt (Olav)</div>
      <div className="history-row">Sitzung 15 · Passage entdeckt, versiegelt</div>
    </div>
  );
}

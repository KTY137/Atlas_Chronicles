import { EyeOff, Minus, Plus, Sparkles } from "lucide-react";

import {
  ATTRIBUTION,
  CAMPAIGN,
  PARTY,
  SCENE,
  personById,
  type Role,
} from "../fixture";
import type { LensSelection } from "../shell/Lens";

interface Props {
  role: Role;
  selection: LensSelection | null;
  onSelect: (selection: LensSelection) => void;
}

/** Tisch: die Karte besitzt die Bühne. Werkzeuge sind ein schwebendes Glas­instrument. */
export function Tisch({ role, selection, onSelect }: Props) {
  return (
    <div className="table-stage">
      <img
        className="table-map"
        src={CAMPAIGN.map.url}
        alt={`Karte von ${CAMPAIGN.map.name}`}
      />
      <div className="table-vignette" aria-hidden="true" />

      <div className="scene-plate glass">
        <div className="eyebrow">{SCENE.region}</div>
        <div className="name">{SCENE.name}</div>
      </div>

      <div className="initiative-strip glass" aria-label="Initiative">
        <span>Runde {SCENE.round}</span>
        {SCENE.initiative.map((entry) => (
          <span key={entry.id}>
            <b>{entry.value}</b> {personById(entry.id).short}
          </span>
        ))}
      </div>

      {PARTY.map((person) =>
        person.pos ? (
          <button
            key={person.id}
            type="button"
            className="token"
            style={{ left: `${person.pos[0]}%`, top: `${person.pos[1]}%` }}
            data-selected={person.id === "olav" && selection === "olav"}
            title={`${person.name} · ${person.subtitle}`}
            onClick={() => (person.id === "olav" ? onSelect("olav") : undefined)}
          >
            {person.portrait ? (
              <img src={person.portrait} alt="" />
            ) : (
              person.initials
            )}
          </button>
        ) : null,
      )}

      {role === "gm" ? (
        <button
          type="button"
          className="hidden-marker"
          style={{
            left: `${SCENE.hidden.pos[0]}%`,
            top: `${SCENE.hidden.pos[1]}%`,
          }}
          onClick={() => onSelect("passage")}
          title="Nur die Leitung sieht diese Markierung. Auswahl öffnet die Linse."
        >
          <EyeOff size={15} />
          <span>
            {SCENE.hidden.name}
            <span className="hint"> · {SCENE.hidden.hint}</span>
          </span>
        </button>
      ) : null}

      {/* Höchstens ein Instrument: Ist die Linse offen, klappt das
          Werkzeugpanel auf einen Griff zusammen. */}
      {selection ? (
        <div className="float-tools glass float-tools-collapsed" aria-label="Tischwerkzeuge eingeklappt">
          <span className="icon-btn" aria-hidden="true">
            <Plus size={15} />
          </span>
        </div>
      ) : (
        <div
          className="float-tools glass"
          role="toolbar"
          aria-label="Tischwerkzeuge"
          data-instrument="tischwerkzeuge"
        >
          <button type="button" className="icon-btn" aria-label="Herauszoomen">
            <Minus size={15} />
          </button>
          <button type="button" className="icon-btn" aria-label="Hineinzoomen">
            <Plus size={15} />
          </button>
          {role === "gm" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSelect("passage")}
            >
              <Sparkles size={14} />
              Schwelle öffnen
            </button>
          ) : null}
        </div>
      )}
      <p className="table-attribution">{ATTRIBUTION}</p>
    </div>
  );
}

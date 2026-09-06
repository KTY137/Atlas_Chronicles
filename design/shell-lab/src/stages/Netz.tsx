import { Check, Radio, TriangleAlert } from "lucide-react";

import { NETZ } from "../fixture";

interface Props {
  voiceDown: boolean;
  onToggleVoice: (down: boolean) => void;
}

/**
 * Netz: der Forge-Anteil — Betrieb als eigenes Bühnenobjekt.
 * Drei getrennte Ebenen; die Degradationsleiter ist benannt, nie still.
 */
export function Netz({ voiceDown, onToggleVoice }: Props) {
  const points = NETZ.bandwidth;
  const max = Math.max(...points);
  const path = points
    .map(
      (value, index) =>
        `${(index / (points.length - 1)) * 100},${48 - (value / max) * 40}`,
    )
    .join(" ");

  return (
    <div className="stage-scroll">
      <div className="netz-wrap">
        <div>
          <div className="eyebrow">Netz · Betrieb</div>
          <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
            {NETZ.room.name}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
            {NETZ.room.online} verbunden · Region {NETZ.room.region} ·{" "}
            {NETZ.room.rtt} ms
          </p>
        </div>

        <div className="netz-grid">
          <div className="card forge-card">
            <h3>Drei Ebenen, getrennt</h3>
            {NETZ.services.map((service) => (
              <div key={service.name} className="service-row">
                {service.ok && !(voiceDown && service.name === "Medienebene") ? (
                  <Check size={14} style={{ color: "var(--ok)" }} />
                ) : (
                  <TriangleAlert size={14} style={{ color: "var(--danger)" }} />
                )}
                <b>{service.name}</b>
                <span className="detail">
                  {voiceDown && service.name === "Medienebene"
                    ? "Ausfall · Degradation aktiv"
                    : service.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="card forge-card">
            <h3>Degradationsleiter — nie stilles Downgrade</h3>
            <div className="ladder">
              {NETZ.ladder.map((rung, index) => (
                <div key={rung.step} className="ladder-step">
                  <span className="idx">{index + 1}</span>
                  <span>{rung.step}</span>
                  <span
                    className={`chip state ${
                      index === 0 && !voiceDown
                        ? "ok"
                        : index === NETZ.ladder.length - 1 && voiceDown
                          ? "danger"
                          : ""
                    }`}
                  >
                    {voiceDown
                      ? index === NETZ.ladder.length - 1
                        ? "aktiv"
                        : "übersprungen"
                      : rung.state}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn"
              style={{ marginTop: 14 }}
              onClick={() => onToggleVoice(!voiceDown)}
            >
              <Radio size={14} />
              {voiceDown ? "Medienebene wiederherstellen" : "Voice-Ausfall simulieren"}
            </button>
          </div>
        </div>

        <div className="card forge-card">
          <h3>Medien-Durchsatz (Opus, kb/s)</h3>
          <svg
            className="spark"
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
            role="img"
            aria-label="Durchsatzverlauf der Medienebene"
          >
            <polygon className="fill" points={`0,48 ${path} 100,48`} />
            <polyline points={path} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="selfhost">{NETZ.selfhost}</div>
      </div>
    </div>
  );
}

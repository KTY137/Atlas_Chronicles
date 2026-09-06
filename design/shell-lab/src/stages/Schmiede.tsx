import { BookMarked, Check, Hammer, LayoutTemplate, X } from "lucide-react";

import { FORGE } from "../fixture";

interface Props {
  role: "gm" | "player";
  onVorlagen: () => void;
  onKompendien: () => void;
}

/** Schmiede: maximale Tiefe hinter einer ehrlichen Schwelle — eigener Creator-Kontext. */
export function Schmiede({ role, onVorlagen, onKompendien }: Props) {
  return (
    <div className="stage-scroll">
      <div className="forge-wrap">
        <div>
          <div className="eyebrow">Schmiede · Creator-Kontext</div>
          <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
            {FORGE.package}{" "}
            <span style={{ color: "var(--text-faint)" }}>{FORGE.version}</span>
          </h1>
        </div>

        <div className="article-toolbar" style={{ marginTop: 4 }}>
          <button type="button" className="chip accent" onClick={onVorlagen}>
            <LayoutTemplate size={11} />
            {role === "gm" ? "Infobox-Vorlagen bearbeiten" : "Infobox-Vorlagen ansehen"}
          </button>
          <button type="button" className="chip" onClick={onKompendien}>
            <BookMarked size={11} />
            Kompendien
          </button>
        </div>

        <div className="forge-grid">
          <div className="card forge-card">
            <h3>
              <Hammer size={13} style={{ verticalAlign: -2 }} /> Regelkarte ·{" "}
              {FORGE.rule.name}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {FORGE.rule.formula}
            </p>
            <div className="trace">
              {FORGE.rule.trace.map((step, index) => (
                <span
                  key={step}
                  className={index === FORGE.rule.trace.length - 1 ? "final" : ""}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="card forge-card">
            <h3>Pakettests</h3>
            {FORGE.tests.map((test) => (
              <div key={test.name} className="test-row">
                {test.ok ? (
                  <Check size={14} style={{ color: "var(--ok)" }} />
                ) : (
                  <X size={14} style={{ color: "var(--danger)" }} />
                )}
                <span style={{ color: test.ok ? undefined : "var(--danger)" }}>
                  {test.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card forge-card">
          <h3>Schemata im Paket</h3>
          <div className="schema-chips">
            {FORGE.schemas.map((schema) => (
              <span key={schema} className="chip">
                {schema}
              </span>
            ))}
            <span className="chip accent">+ Schema entwerfen</span>
          </div>
        </div>
      </div>
    </div>
  );
}

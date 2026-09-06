import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  BookMarked,
  Check,
  Download,
  Pin,
  PinOff,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  KOMPENDIUM_PAKETE,
  type KompendiumEintrag,
  type KompendiumPaket,
  type Weitergabe,
} from "../kompendiumFixture";

interface Props {
  role: "gm" | "player";
}

const WEITERGABE_LABEL: Record<Weitergabe, string> = {
  frei: "frei weitergebbar",
  eingeschränkt: "eingeschränkt",
  gesperrt: "nicht weitergebbar",
};

/**
 * Kompendium-Pakete — Foundrys Compendia und Roll20s lizenzierte Inhalte, mit
 * Chronicles Herkunftsdisziplin: Lizenz und Weitergaberecht stehen auf der
 * Fläche, nicht im Kleingedruckten, und ein Paket ohne Rechte lässt sich gar
 * nicht erst installieren. Ein angeheftetes Paket zeigt Version UND Prüfsumme,
 * weil Reproduzierbarkeit ein Produktversprechen ist.
 */
export function Kompendium({ role }: Props) {
  const [pakete, setPakete] = useState<KompendiumPaket[]>(() =>
    KOMPENDIUM_PAKETE.map((paket) => ({ ...paket })),
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (id: string, change: (paket: KompendiumPaket) => KompendiumPaket) =>
    setPakete((list) =>
      list.map((paket) => (paket.id === id ? change(paket) : paket)),
    );

  const offen = openId ? pakete.find((p) => p.id === openId) : null;

  if (offen) {
    return (
      <Detail
        paket={offen}
        role={role}
        onBack={() => setOpenId(null)}
        onChange={(change) => update(offen.id, change)}
      />
    );
  }

  const installiert = pakete.filter((p) => p.installiert);
  const verfuegbar = pakete.filter((p) => !p.installiert);

  return (
    <div className="stage-scroll">
      <div className="komp-wrap">
        <div className="eyebrow">Schmiede · Kompendien</div>
        <h1 className="display" style={{ fontSize: "clamp(28px,4.2vw,44px)" }}>
          Kompendium-Regal
        </h1>
        <p className="komp-lead">
          Fertige Inhalte, versioniert und angeheftet. Jedes Paket trägt seine
          Lizenz sichtbar — was ihr nicht weitergeben dürft, steht hier und nicht
          in einer Fußnote.
        </p>

        <Regal
          titel="Installiert"
          pakete={installiert}
          onOpen={setOpenId}
          leer="Noch kein Paket installiert."
        />
        <Regal
          titel="Verfügbar"
          pakete={verfuegbar}
          onOpen={setOpenId}
          leer="Alles installiert."
        />
      </div>
    </div>
  );
}

function Regal({
  titel,
  pakete,
  onOpen,
  leer,
}: {
  titel: string;
  pakete: KompendiumPaket[];
  onOpen: (id: string) => void;
  leer: string;
}) {
  return (
    <section className="komp-section">
      <h2 className="section-h2">
        {titel} <span className="index-count">{pakete.length}</span>
      </h2>
      {pakete.length === 0 ? (
        <p className="komp-empty">{leer}</p>
      ) : (
        <div className="komp-shelf">
          {pakete.map((paket) => (
            <button
              key={paket.id}
              type="button"
              className="komp-pkg-card card"
              data-gesperrt={Boolean(paket.sperrung)}
              onClick={() => onOpen(paket.id)}
            >
              <div className="komp-pkg-head">
                {paket.sperrung ? (
                  <Ban size={13} aria-hidden="true" />
                ) : (
                  <BookMarked size={13} aria-hidden="true" />
                )}
                <span>{paket.name}</span>
              </div>
              <div className="komp-pkg-meta">
                {paket.anbieter} · {paket.inhaltsart} ·{" "}
                {paket.eintraegeGesamt.toLocaleString("de")} Einträge
              </div>
              <div className="komp-badge-row">
                <span className={`chip ${badgeClass(paket.lizenz.weitergabe)}`}>
                  {paket.lizenz.name} · {WEITERGABE_LABEL[paket.lizenz.weitergabe]}
                </span>
                {paket.angeheftet ? (
                  <span className="chip accent">
                    <Pin size={10} /> {paket.angeheftet.version}
                  </span>
                ) : (
                  <span className="chip">{paket.aktuelleVersion}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const badgeClass = (weitergabe: Weitergabe) =>
  weitergabe === "frei" ? "ok" : weitergabe === "gesperrt" ? "danger" : "";

/* -------------------------------------------------------------- Detail */

function Detail({
  paket,
  role,
  onBack,
  onChange,
}: {
  paket: KompendiumPaket;
  role: "gm" | "player";
  onBack: () => void;
  onChange: (change: (paket: KompendiumPaket) => KompendiumPaket) => void;
}) {
  const [filter, setFilter] = useState("");

  const treffer = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return paket.eintraege;
    return paket.eintraege.filter((eintrag) =>
      eintrag.name.toLowerCase().includes(needle),
    );
  }, [filter, paket.eintraege]);

  const veraltet =
    paket.angeheftet !== null &&
    paket.angeheftet.version !== paket.aktuelleVersion;

  return (
    <div className="stage-scroll">
      <div className="komp-wrap">
        <div className="article-toolbar">
          <button type="button" className="chip" onClick={onBack}>
            <ArrowLeft size={11} />
            Alle Pakete
          </button>
        </div>

        <div className="eyebrow">Kompendium · {paket.inhaltsart}</div>
        <h1 className="display" style={{ fontSize: "clamp(24px,3.6vw,36px)" }}>
          {paket.name}
        </h1>
        <div className="komp-detail-meta">
          {paket.anbieter} · {paket.eintraegeGesamt.toLocaleString("de")} Einträge
          im Paket
        </div>
        <p className="komp-lead">{paket.beschreibung}</p>

        {/* Lizenz zuerst, nicht zuletzt. */}
        <section className={`card komp-section komp-lizenz ${badgeClass(paket.lizenz.weitergabe)}`}>
          <div className="komp-detail-head">
            <ShieldAlert size={14} aria-hidden="true" />
            {paket.lizenz.name} — {WEITERGABE_LABEL[paket.lizenz.weitergabe]}
          </div>
          <p className="komp-pin-note">{paket.lizenz.hinweis}</p>
          {paket.lizenz.quelle ? (
            <p className="komp-pin-note">Quelle: {paket.lizenz.quelle}</p>
          ) : null}
        </section>

        {paket.sperrung ? (
          <section className="card komp-section komp-blocked-note">
            <div className="komp-detail-head">
              <Ban size={14} aria-hidden="true" />
              Installation nicht möglich
            </div>
            <p className="komp-pin-note">{paket.sperrung.grund}</p>
            <p className="komp-pin-note">Gesperrt seit {paket.sperrung.seit}.</p>
          </section>
        ) : null}

        {role === "gm" ? (
          <section className="card komp-section">
            <div className="komp-detail-head">
              <Pin size={14} aria-hidden="true" />
              Stand für diese Kampagne
            </div>
            {paket.angeheftet ? (
              <>
                <p className="komp-pin-note">
                  Angeheftet auf <strong>{paket.angeheftet.version}</strong> ·{" "}
                  <code>{paket.angeheftet.pruefsumme}</code>
                </p>
                <p className="komp-pin-note">
                  {veraltet
                    ? `Der Anbieter führt inzwischen ${paket.aktuelleVersion}. Solange dieser Stand angeheftet ist, ändert sich am Tisch nichts — das ist der Sinn der Anheftung.`
                    : "Entspricht dem aktuellen Stand des Anbieters."}
                </p>
              </>
            ) : (
              <p className="komp-pin-note">
                Nicht angeheftet. Ohne Anheftung kann sich Inhalt unter der
                laufenden Kampagne ändern.
              </p>
            )}
            <div className="komp-actions">
              {paket.installiert ? (
                paket.angeheftet ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      onChange((current) => ({ ...current, angeheftet: null }))
                    }
                  >
                    <PinOff size={14} />
                    Anheftung lösen
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        angeheftet: {
                          version: current.aktuelleVersion,
                          pruefsumme: current.aktuellePruefsumme,
                        },
                      }))
                    }
                  >
                    <Pin size={14} />
                    Auf {paket.aktuelleVersion} anheften
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={Boolean(paket.sperrung)}
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      installiert: true,
                      angeheftet: {
                        version: current.aktuelleVersion,
                        pruefsumme: current.aktuellePruefsumme,
                      },
                    }))
                  }
                >
                  <Download size={14} />
                  {paket.sperrung ? "Rechte fehlen" : "Installieren und anheften"}
                </button>
              )}
            </div>
          </section>
        ) : null}

        <section className="komp-section">
          <h2 className="section-h2">
            Einträge <span className="index-count">{treffer.length}</span>
          </h2>
          {paket.eintraege.length < paket.eintraegeGesamt ? (
            <p className="komp-empty">
              {paket.eintraege.length} von {paket.eintraegeGesamt.toLocaleString("de")}{" "}
              geladen — der Rest kommt beim Öffnen nach.
            </p>
          ) : null}

          <div className="komp-filters">
            <label className="komp-search">
              <Search size={14} aria-hidden="true" />
              <span className="visually-hidden">Einträge filtern</span>
              <input
                value={filter}
                placeholder="Eintrag suchen …"
                onChange={(event) => setFilter(event.target.value)}
              />
            </label>
          </div>

          {treffer.length === 0 ? (
            <p className="komp-empty">Kein Eintrag trägt diesen Namen.</p>
          ) : (
            <div className="komp-entry-list">
              {treffer.map((eintrag) => (
                <EintragRow key={eintrag.id} eintrag={eintrag} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Eintrag */

function EintragRow({ eintrag }: { eintrag: KompendiumEintrag }) {
  return (
    <article className="komp-entry-row card">
      <div className="komp-detail-head">
        <Check size={12} aria-hidden="true" />
        {eintrag.name}
        {eintrag.herkunftsartikel ? (
          <span className="chip">aus: {eintrag.herkunftsartikel}</span>
        ) : null}
      </div>
      <EintragFelder eintrag={eintrag} />
    </article>
  );
}

/** Ein Kompendiumeintrag ist ein typisiertes Objekt, kein Fließtext. */
function EintragFelder({ eintrag }: { eintrag: KompendiumEintrag }) {
  if (eintrag.art === "Gegenstände") {
    return (
      <>
        <dl className="komp-detail-meta komp-felder">
          <dt>Klasse</dt>
          <dd>{eintrag.klasse}</dd>
          <dt>Seltenheit</dt>
          <dd>{eintrag.seltenheit}</dd>
          {eintrag.traeger ? (
            <>
              <dt>Träger</dt>
              <dd>{eintrag.traeger}</dd>
            </>
          ) : null}
          {eintrag.preis ? (
            <>
              <dt>Preis</dt>
              <dd>
                Kauf {eintrag.preis.kauf} · Verkauf {eintrag.preis.verkauf}
              </dd>
            </>
          ) : null}
          {eintrag.effekt ? (
            <>
              <dt>Effekt</dt>
              <dd>{eintrag.effekt}</dd>
            </>
          ) : null}
        </dl>
        <div className="komp-schaden">
          {eintrag.schaden.map((stufe) => (
            <span key={stufe.stufe} className="chip">
              {stufe.stufe} {stufe.wert}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (eintrag.art === "Monster") {
    return (
      <>
        <dl className="komp-detail-meta komp-felder">
          <dt>Gefahrenstufe</dt>
          <dd>{eintrag.gefahrenstufe}</dd>
          <dt>Trefferpunkte</dt>
          <dd>{eintrag.trefferpunkte}</dd>
          <dt>Rüstungsklasse</dt>
          <dd>{eintrag.ruestungsklasse}</dd>
          <dt>Lebensraum</dt>
          <dd>{eintrag.lebensraum}</dd>
        </dl>
        <div className="komp-attacks">
          {eintrag.angriffe.map((angriff) => (
            <span key={angriff} className="chip">
              {angriff}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (eintrag.art === "Zauber") {
    return (
      <dl className="komp-detail-meta komp-felder">
        <dt>Schule</dt>
        <dd>
          {eintrag.schule} · Stufe {eintrag.stufe}
        </dd>
        <dt>Wirkung</dt>
        <dd>
          {eintrag.wirkungsbereich} · {eintrag.wirkungsdauer}
        </dd>
        <dt>Kurz</dt>
        <dd>{eintrag.beschreibungKurz}</dd>
      </dl>
    );
  }

  if (eintrag.art === "Regeln") {
    return (
      <dl className="komp-detail-meta komp-felder">
        <dt>Kategorie</dt>
        <dd>{eintrag.kategorie}</dd>
        <dt>Formel</dt>
        <dd>
          <code>{eintrag.formel}</code>
        </dd>
        <dt>Anwendung</dt>
        <dd>{eintrag.anwendung}</dd>
      </dl>
    );
  }

  return (
    <dl className="komp-detail-meta komp-felder">
      <dt>Region</dt>
      <dd>
        {eintrag.region} · {eintrag.typ}
      </dd>
      {eintrag.bevoelkerung ? (
        <>
          <dt>Bevölkerung</dt>
          <dd>{eintrag.bevoelkerung}</dd>
        </>
      ) : null}
      <dt>Bekannt für</dt>
      <dd>{eintrag.bekanntFuer}</dd>
    </dl>
  );
}

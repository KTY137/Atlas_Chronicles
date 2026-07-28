import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Aperture,
  Archive,
  BookOpenText,
  ChevronRight,
  CircleHelp,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Gem,
  Map,
  Maximize2,
  Minus,
  MoonStar,
  Plus,
  RotateCcw,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
  Volume2,
  X,
} from "lucide-react";
import mapUrl from "../../fixtures/eron/media/Karte_von_Andaria.webp";
import songKaynUrl from "../../fixtures/eron/media/SongKayn.webp";
import yalitUrl from "../../fixtures/eron/media/Yalit.webp";

type Phase = "idle" | "casting" | "revealed" | "minted";
type Role = "gm" | "player";

type Actor = {
  id: string;
  name: string;
  short: string;
  detail: string;
  hp: string;
  image?: string;
  color: string;
};

const actors: Actor[] = [
  {
    id: "olav",
    name: "Olav der Ehrliche",
    short: "OL",
    detail: "Zwergenbarde · Flüsterer",
    hp: "63 / 71",
    color: "#f1b85f",
  },
  {
    id: "song",
    name: "Song Kayn",
    short: "SK",
    detail: "Schattenkorsar · Kapitän",
    hp: "42 / 48",
    image: songKaynUrl,
    color: "#7edbd0",
  },
  {
    id: "oggugat",
    name: "Oggugat",
    short: "OG",
    detail: "Ork · Weggefährte",
    hp: "58 / 66",
    color: "#ff8375",
  },
  {
    id: "yalit",
    name: "Yal'it der Wissbegierige",
    short: "YA",
    detail: "Waldelf · früher bei der Gruppe",
    hp: "36 / 41",
    image: yalitUrl,
    color: "#d495ff",
  },
];

const navItems = [
  { label: "Sitzung", icon: Aperture },
  { label: "Chronik", icon: BookOpenText },
  { label: "Figuren", icon: Users },
  { label: "Atlas", icon: Map, active: true },
  { label: "Archiv", icon: Archive },
];

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          className={`icon-button${active ? " is-active" : ""}`}
          type="button"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="right" sideOffset={12}>
          {label}
          <Tooltip.Arrow className="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ActorPortrait({
  actor,
  compact = false,
}: {
  actor: Actor;
  compact?: boolean;
}) {
  return (
    <span
      className={`actor-portrait${compact ? " is-compact" : ""}`}
      style={{ "--actor-color": actor.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {actor.image ? <img src={actor.image} alt="" /> : <b>{actor.short}</b>}
    </span>
  );
}

function App() {
  const systemReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(() => {
    const moment = new URLSearchParams(window.location.search).get("moment");
    if (moment === "minted") return "minted";
    if (moment === "reveal" || moment === "revealed") return "revealed";
    return "idle";
  });
  const [role, setRole] = useState<Role>("gm");
  const [selectedActor, setSelectedActor] = useState("olav");
  const [artEnabled, setArtEnabled] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoom, setZoom] = useState(1.08);
  const timerRef = useRef<number | null>(null);

  const shouldReduceMotion = Boolean(systemReducedMotion || reduceMotion);
  const actor = useMemo(
    () => actors.find((item) => item.id === selectedActor) ?? actors[0],
    [selectedActor],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "r" &&
        phase === "idle" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        startReveal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function startReveal() {
    if (phase !== "idle") return;
    setPhase("casting");
    timerRef.current = window.setTimeout(
      () => setPhase("revealed"),
      shouldReduceMotion ? 120 : 1500,
    );
  }

  function resetMoment() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPhase("idle");
  }

  const revealed = phase === "revealed" || phase === "minted";

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>
      <Tooltip.Provider delayDuration={280}>
        <main
          className={[
            "app-shell",
            highContrast ? "is-high-contrast" : "",
            !artEnabled ? "is-art-off" : "",
            revealed ? "is-revealed" : "",
          ].join(" ")}
        >
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="grain" aria-hidden="true" />

          <header className="topbar glass-instrument">
            <a className="brand" href="#" aria-label="Chronicle Start">
              <span className="brand-mark" aria-hidden="true">
                <Gem size={18} strokeWidth={1.6} />
              </span>
              <span>
                <b>CHRONICLE</b>
                <small>Die lebende Sternwarte</small>
              </span>
            </a>

            <div className="session-heading">
              <span className="eyebrow">ERON · SITZUNG XV</span>
              <strong>Das Kind und die Flüsterer</strong>
              <span className="live-status">
                <i />
                Samstag, 21:47
              </span>
            </div>

            <div className="top-actions">
              <div className="role-switch" aria-label="Ansicht wechseln">
                <button
                  type="button"
                  className={role === "gm" ? "is-selected" : ""}
                  onClick={() => setRole("gm")}
                >
                  Leitung
                </button>
                <button
                  type="button"
                  className={role === "player" ? "is-selected" : ""}
                  onClick={() => setRole("player")}
                >
                  Spieler
                </button>
              </div>
              <IconButton
                label={soundEnabled ? "Klang ausschalten" : "Klang einschalten"}
                onClick={() => setSoundEnabled((value) => !value)}
              >
                {soundEnabled ? <Volume2 size={18} /> : <EyeOff size={18} />}
              </IconButton>
              <SettingsDialog
                artEnabled={artEnabled}
                setArtEnabled={setArtEnabled}
                reduceMotion={reduceMotion}
                setReduceMotion={setReduceMotion}
                highContrast={highContrast}
                setHighContrast={setHighContrast}
              />
            </div>
          </header>

          <aside className="nav-rail glass-instrument" aria-label="Hauptnavigation">
            <div className="nav-stack">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <IconButton
                    key={item.label}
                    label={item.label}
                    active={item.active}
                  >
                    <Icon size={20} strokeWidth={1.7} />
                  </IconButton>
                );
              })}
            </div>
            <IconButton label="Hilfe">
              <CircleHelp size={20} strokeWidth={1.7} />
            </IconButton>
          </aside>

          <section className="world-stage" aria-label="Interaktive Karte von Andaria">
            <motion.div
              className="map-plane"
              animate={{
                scale: zoom + (phase === "casting" ? 0.055 : revealed ? 0.028 : 0),
                x: phase === "idle" ? "0%" : "-1.5%",
                y: phase === "idle" ? "0%" : "1%",
              }}
              transition={{ type: "spring", stiffness: 85, damping: 22 }}
            >
              {artEnabled ? (
                <img src={mapUrl} alt="" className="map-art" />
              ) : (
                <div className="map-fallback" aria-hidden="true" />
              )}
            </motion.div>
            <div className="map-vignette" aria-hidden="true" />
            <div className="map-scan" aria-hidden="true" />

            <div className="map-caption glass-instrument">
              <Compass size={16} />
              <span>
                <small>ANDARIA · NORDWEST</small>
                <b>Die Nördlichen Minenreiche</b>
              </span>
              <span className="coordinate">48°12′ · 11°05′</span>
            </div>

            <div className="zoom-controls glass-instrument" aria-label="Kartengröße">
              <button
                type="button"
                aria-label="Verkleinern"
                onClick={() => setZoom((value) => Math.max(1, value - 0.06))}
              >
                <Minus size={17} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                aria-label="Vergrößern"
                onClick={() => setZoom((value) => Math.min(1.35, value + 0.06))}
              >
                <Plus size={17} />
              </button>
              <button
                type="button"
                aria-label="Karte einpassen"
                onClick={() => setZoom(1.08)}
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <motion.button
              className={`threshold-marker${revealed ? " is-open" : ""}`}
              type="button"
              aria-label="Schwelle: Die versiegelte Passage"
              onClick={startReveal}
              animate={{
                scale: phase === "casting" ? [1, 1.08, 0.98, 1.04] : 1,
              }}
              transition={{ duration: 1.25, repeat: phase === "casting" ? Infinity : 0 }}
            >
              <span className="marker-aura" />
              <span className="marker-core">
                {revealed ? <Eye size={22} /> : <EyeOff size={21} />}
              </span>
              <span className="marker-label glass-instrument">
                <small>{revealed ? "OFFENBART" : "VERBORGENE SCHWELLE"}</small>
                <b>{revealed ? "Die Silberader" : "Die versiegelte Passage"}</b>
                <em>{revealed ? "+2 Passagen geprägt" : "3 Namen · 1 Schlüssel"}</em>
              </span>
            </motion.button>

            <div className="party-constellation" aria-label="Gruppe auf der Karte">
              {actors.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className={`map-actor${
                    selectedActor === item.id ? " is-selected" : ""
                  }`}
                  style={
                    {
                      "--actor-index": index,
                      "--actor-color": item.color,
                    } as React.CSSProperties
                  }
                  onClick={() => setSelectedActor(item.id)}
                  aria-label={`${item.name} auswählen`}
                  whileHover={{ y: -5, scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <ActorPortrait actor={item} compact />
                </motion.button>
              ))}
              <span className="party-path" aria-hidden="true" />
            </div>

            <AnimatePresence>
              {phase === "casting" && (
                <motion.div
                  className="ritual-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="ritual-ring ring-one"
                    initial={{ scale: 0.35, rotate: -35 }}
                    animate={{ scale: 1, rotate: 18 }}
                    transition={{ duration: 1.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div
                    className="ritual-ring ring-two"
                    initial={{ scale: 0.25, rotate: 25 }}
                    animate={{ scale: 1, rotate: -20 }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div
                    className="die-result"
                    initial={{ scale: 0.45, opacity: 0, rotateX: 70 }}
                    animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ delay: 0.36, type: "spring", stiffness: 180 }}
                  >
                    <small>WURF · 1W20 + 4</small>
                    <strong>17</strong>
                    <span>Die Welt erinnert sich</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <aside className="context-lens glass-instrument" aria-label="Kontextlinse">
            <div className="lens-topline">
              <span className="eyebrow">
                <Crosshair size={13} />
                KONTEXTLINSE
              </span>
              <span className="visibility-chip">
                <ShieldCheck size={13} />
                {role === "gm" ? "Leitung" : "Spieler"}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${phase}-${actor.id}-${role}`}
                className="lens-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
              >
                {phase === "idle" || phase === "casting" ? (
                  <>
                    <div className="lens-title">
                      <span className="threshold-glyph">
                        <EyeOff size={21} />
                      </span>
                      <div>
                        <small>SCHWELLE · NICHT KANON</small>
                        <h1>Die versiegelte Passage</h1>
                      </div>
                    </div>
                    <p className="lens-lead">
                      Hinter der Wand antwortet Metall auf einen Namen, den nur
                      zwei Figuren gehört haben.
                    </p>

                    <div className="knowledge-preview">
                      <span className="eyebrow">WAS DER TASTENDRUCK ÄNDERT</span>
                      {actors.map((item) => {
                        const delta =
                          item.id === "olav"
                            ? "+2 Passagen"
                            : item.id === "song"
                              ? "+1 Passage"
                              : "keine Änderung";
                        return (
                          <button
                            className={`knowledge-row${
                              selectedActor === item.id ? " is-selected" : ""
                            }`}
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedActor(item.id)}
                          >
                            <ActorPortrait actor={item} compact />
                            <span>
                              <b>{item.name}</b>
                              <small>{item.detail}</small>
                            </span>
                            <em>{delta}</em>
                          </button>
                        );
                      })}
                    </div>

                    <div className="selected-actor-card">
                      <ActorPortrait actor={actor} />
                      <span>
                        <small>AUSGEWÄHLT</small>
                        <b>{actor.name}</b>
                        <em>{actor.hp} TP</em>
                      </span>
                      <ChevronRight size={18} />
                    </div>

                    <button
                      className="primary-action"
                      type="button"
                      onClick={startReveal}
                      disabled={phase === "casting"}
                    >
                      <Sparkles size={18} />
                      <span>
                        {phase === "casting"
                          ? "Die Schwelle antwortet …"
                          : "Schwelle öffnen"}
                        <small>R drücken · Wirkung vorhersehbar</small>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="lens-title success">
                      <span className="threshold-glyph">
                        <Eye size={21} />
                      </span>
                      <div>
                        <small>OFFENBART · WURF 17</small>
                        <h1>Die Silberader</h1>
                      </div>
                    </div>
                    <p className="lens-lead">
                      Das Gestein gab nach. Im kalten Spalt liegt Silberstaub,
                      und darunter ein Wappen, das niemand hier tragen dürfte.
                    </p>

                    <div className="result-card">
                      <span className="result-orbit" aria-hidden="true" />
                      <ScrollText size={24} />
                      <div>
                        <small>NEUER CHRONIK-ABSATZ</small>
                        <blockquote>
                          „Olav nannte den alten Eid. Die Wand antwortete mit
                          einer silbernen Stimme.“
                        </blockquote>
                        <span>Quelle: Sitzung XV · Wurf 17 · 21:48</span>
                      </div>
                    </div>

                    <div className="impact-grid">
                      <div>
                        <strong>2</strong>
                        <span>Passagen</span>
                      </div>
                      <div>
                        <strong>3</strong>
                        <span>Namen</span>
                      </div>
                      <div>
                        <strong>1</strong>
                        <span>neuer Ort</span>
                      </div>
                    </div>

                    {phase === "revealed" ? (
                      <button
                        className="primary-action"
                        type="button"
                        onClick={() => setPhase("minted")}
                      >
                        <Gem size={18} />
                        <span>
                          In die Chronik prägen
                          <small>Ein Mensch bestätigt den Kanon</small>
                        </span>
                      </button>
                    ) : (
                      <motion.div
                        className="minted-state"
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <ShieldCheck size={20} />
                        <span>
                          <b>Geprägt und adressierbar</b>
                          <small>eron/silberader · Kaya · 21:48</small>
                        </span>
                      </motion.div>
                    )}

                    <button className="ghost-action" type="button" onClick={resetMoment}>
                      <RotateCcw size={15} />
                      Moment zurücksetzen
                    </button>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </aside>

          <section className="actor-dock glass-instrument" aria-label="Figuren">
            <div className="initiative-label">
              <Swords size={17} />
              <span>
                <small>INITIATIVE</small>
                <b>Runde 3</b>
              </span>
            </div>
            <div className="actor-list">
              {actors.map((item, index) => (
                <button
                  key={item.id}
                  className={`dock-actor${
                    selectedActor === item.id ? " is-selected" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedActor(item.id)}
                >
                  <span className="initiative-number">{17 - index * 2}</span>
                  <ActorPortrait actor={item} compact />
                  <span>
                    <b>{item.name}</b>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="dock-meta">
              <span>
                <i className="legend-dot is-known" />
                12 bekannt
              </span>
              <span>
                <i className="legend-dot is-hidden" />
                3 verborgen
              </span>
            </div>
          </section>

          <div className="mobile-action glass-instrument">
            <span>
              <small>{phase === "idle" ? "VERBORGENE SCHWELLE" : "OFFENBART"}</small>
              <b>{phase === "idle" ? "Die versiegelte Passage" : "Die Silberader"}</b>
            </span>
            <button
              type="button"
              onClick={phase === "idle" ? startReveal : resetMoment}
            >
              {phase === "idle" ? <Sparkles size={18} /> : <RotateCcw size={18} />}
            </button>
          </div>
        </main>
      </Tooltip.Provider>
    </MotionConfig>
  );
}

function SettingsDialog({
  artEnabled,
  setArtEnabled,
  reduceMotion,
  setReduceMotion,
  highContrast,
  setHighContrast,
}: {
  artEnabled: boolean;
  setArtEnabled: (value: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="icon-button" type="button" aria-label="Darstellung">
          <Settings2 size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="settings-dialog glass-instrument">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>Darstellung</Dialog.Title>
              <Dialog.Description>
                Material, Bewegung und Lesbarkeit sind unabhängige Achsen.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" type="button" aria-label="Schließen">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <label className="setting-row">
            <span>
              <Map size={18} />
              <span>
                <b>Kampagnenkunst</b>
                <small>Andaria-Karte und Porträts</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={artEnabled}
              onChange={(event) => setArtEnabled(event.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>
              <MoonStar size={18} />
              <span>
                <b>Ruhige Bewegung</b>
                <small>Zustandswechsel ohne Kamerafahrt</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>
              <ShieldCheck size={18} />
              <span>
                <b>Hoher Kontrast</b>
                <small>Opaque Instrumente und stärkere Kanten</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
            />
          </label>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default App;

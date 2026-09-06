import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Hash, Lock, Mic, MicOff } from "lucide-react";

import {
  EVERYONE,
  KAYA,
  NETZ,
  personById,
  type Person,
  type Role,
  type StageId,
} from "../fixture";

/** Im Lab ist die Spielerprojektion Timo, der Olav führt. */
const PLAYER_SELF = "olav";

interface AvatarProps {
  person: Person;
  speaking: boolean;
  muffled?: boolean;
  onClick?: () => void;
  title?: string;
}

function Avatar({ person, speaking, muffled, onClick, title }: AvatarProps) {
  return (
    <motion.button
      layoutId={`avatar-${person.id}`}
      layout
      type="button"
      className="avatar-wrap"
      data-speaking={speaking}
      data-muffled={muffled ?? false}
      onClick={onClick}
      title={title ?? `${person.name} · ${person.subtitle}`}
      aria-label={
        speaking ? `${person.name} spricht` : `${person.name}${muffled ? " · hört den Flüsterkanal nicht" : ""}`
      }
    >
      <span className="speak-ring" aria-hidden="true" />
      <span className="avatar">
        {person.portrait ? (
          <img src={person.portrait} alt="" />
        ) : (
          person.initials
        )}
      </span>
    </motion.button>
  );
}

interface Props {
  role: Role;
  stage: StageId;
  speaker: string | null;
  whisperTarget: string | null;
  onWhisper: (target: string | null) => void;
  voiceDown: boolean;
  goToKanal: () => void;
}

export function Band({
  role,
  stage,
  speaker,
  whisperTarget,
  onWhisper,
  voiceDown,
  goToKanal,
}: Props) {
  const [muted, setMuted] = useState(false);

  const whisperActive = whisperTarget !== null;
  const selfInWhisper =
    role === "gm" || (whisperActive && whisperTarget === PLAYER_SELF);
  const whisperPair = whisperActive
    ? [KAYA, personById(whisperTarget)]
    : [];
  const outside = whisperActive
    ? EVERYONE.filter((p) => p.id !== "kaya" && p.id !== whisperTarget)
    : EVERYONE;

  const speakingId = voiceDown ? null : speaker;

  const handleAvatarClick = (person: Person) => {
    if (role !== "gm" || person.kind === "gm") return;
    onWhisper(whisperTarget === person.id ? null : person.id);
  };

  return (
    <footer className="band">
      <LayoutGroup>
        <div className="band-avatars">
          <AnimatePresence>
            {whisperActive && selfInWhisper ? (
              <motion.div
                key="capsule"
                className="whisper-capsule"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
              >
                {whisperPair.map((person) => (
                  <Avatar
                    key={person.id}
                    person={person}
                    speaking={speakingId === person.id}
                    onClick={() => handleAvatarClick(person)}
                    title={
                      role === "gm"
                        ? `Flüsterkanal mit ${person.name} — Klick beendet ihn`
                        : undefined
                    }
                  />
                ))}
                <span className="label">
                  <Lock size={11} />
                  {role === "gm"
                    ? "Flüsterkanal"
                    : "Die Leitung nimmt dich beiseite"}
                </span>
              </motion.div>
            ) : null}
            {whisperActive && !selfInWhisper ? (
              <motion.div
                key="frosted"
                className="whisper-frosted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                title="Zwei sind beiseite — du hörst nichts davon. Chronicle flüstert nie heimlich."
              >
                {whisperPair.map((person) => (
                  <span key={person.id} className="avatar">
                    {person.portrait ? (
                      <img src={person.portrait} alt="" />
                    ) : (
                      person.initials
                    )}
                  </span>
                ))}
                <span>beiseite</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {outside.map((person) => (
            <Avatar
              key={person.id}
              person={person}
              speaking={speakingId === person.id}
              muffled={whisperActive && selfInWhisper}
              onClick={() => handleAvatarClick(person)}
              title={
                role === "gm" && person.kind === "pc"
                  ? `${person.name} · Klick öffnet den Flüsterkanal`
                  : undefined
              }
            />
          ))}
        </div>
      </LayoutGroup>

      <div className="band-tail">
        {stage === "kanal" ? (
          <span className="line">
            Nächste Sitzung <b>Samstag 20:00</b> · Vollmacht #7 eingelöst
          </span>
        ) : (
          <>
            <span className="line">
              <b>Song Kayn</b>: Ein Lied. Natürlich ein Lied. Ich hole die
              Blechorgel NICHT noch einmal aus dem Fluss.
            </span>
            <button type="button" className="chip" onClick={goToKanal}>
              <Hash size={11} />
              Kanal öffnen
            </button>
          </>
        )}
      </div>

      <div className="band-controls">
        {voiceDown ? (
          <span className="voice-down">
            Sprache liegt
            <span className="still">— der Tisch läuft</span>
          </span>
        ) : (
          <span className="voice-quality" title="Medienebene: LiveKit SFU">
            {NETZ.room.region} · {NETZ.room.rtt} ms
          </span>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-pressed={muted}
          aria-label={muted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
          onClick={() => setMuted(!muted)}
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>
    </footer>
  );
}

export { PLAYER_SELF };

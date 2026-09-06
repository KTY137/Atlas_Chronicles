import { Dice5, Hash, Lock, MessageSquare, ScrollText } from "lucide-react";
import { Fragment } from "react";

import {
  CHANNELS,
  MESSAGES,
  personById,
  type ChannelMessage,
  type Role,
} from "../fixture";
import type { LensSelection } from "../shell/Lens";

interface Props {
  role: Role;
  onSelect: (selection: LensSelection) => void;
}

/**
 * Der Bruch mit Discord und Roll20: Der Kanal ist ein Bühnenobjekt.
 * Zwischen den Abenden liest er sich in voller Breite wie ein Dokument;
 * Würfe, Vollmachten und geprägter Kanon sind Objekte im Strom.
 */
export function Kanal({ role, onSelect }: Props) {
  return (
    <div className="stage-scroll">
      <div className="channel-wrap">
        <header className="channel-head">
          <Hash size={18} style={{ color: "var(--text-faint)" }} />
          <h1 className="display">zwischen-den-abenden</h1>
          <nav className="others" aria-label="Weitere Kanäle">
            {CHANNELS.filter((channel) => channel.id !== "zwischen").map(
              (channel) => (
                <button key={channel.id} type="button">
                  #{channel.name}
                  {channel.unread > 0 ? (
                    <>
                      {" "}
                      <span className="unread">{channel.unread}</span>
                    </>
                  ) : null}
                </button>
              ),
            )}
          </nav>
        </header>

        <div className="feed">
          {MESSAGES.map((message) => (
            <Fragment key={message.id}>
              {renderMessage(message, role, onSelect)}
            </Fragment>
          ))}
        </div>

        <div className="composer">
          <div className="composer-box">
            <Dice5 size={16} />
            <span className="hint">
              Schreiben, würfeln oder @erwähnen — Enter sendet
            </span>
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--text-faint)",
              }}
            >
              /wurf 1W20+3
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

function Author({ id }: { id: string }) {
  const person = personById(id);
  return (
    <span className="avatar" style={{ width: 40, height: 40 }}>
      {person.portrait ? <img src={person.portrait} alt="" /> : person.initials}
    </span>
  );
}

function renderMessage(
  message: ChannelMessage,
  role: Role,
  onSelect: (selection: LensSelection) => void,
) {
  switch (message.kind) {
    case "divider":
      return <div className="day-divider">{message.label}</div>;

    case "text": {
      const person = personById(message.author);
      return (
        <div className="msg">
          <Author id={message.author} />
          <div>
            <div className="msg-head">
              <span className={`who${person.kind === "gm" ? " gm" : ""}`}>
                {person.short}
                {person.player ? ` · ${person.player}` : ""}
              </span>
              <span className="when">
                {message.day} {message.time}
              </span>
            </div>
            <div className="msg-body">{message.text}</div>
            {message.thread ? (
              <button type="button" className="msg-thread">
                <MessageSquare size={12} />
                {message.thread} Antworten im Faden
              </button>
            ) : null}
            {message.reactions ? (
              <div className="reactions">
                {message.reactions.map((reaction) => (
                  <span key={reaction.emoji} className="reaction">
                    {reaction.emoji} {reaction.count}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    case "vollmacht": {
      const to = personById(message.to);
      return (
        <div className="msg">
          <Author id={message.author} />
          <div>
            <div className="msg-head">
              <span className="who gm">Kaya · Spielleitung</span>
              <span className="when">
                {message.day} {message.time}
              </span>
            </div>
            <div className="stream-card vollmacht">
              <div className="sc-head">
                <Lock size={11} />
                Vollmacht #7 · an {to.short} · {message.state}
              </div>
              <div className="sc-body">
                <div className="sc-title">{message.title}</div>
                <div className="sc-terms">
                  <span>{message.scope}</span>
                  <span>{message.cap}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "roll": {
      const author = personById(message.author);
      return (
        <div className="msg">
          <Author id={message.author} />
          <div>
            <div className="msg-head">
              <span className="who">
                {author.short}
                {author.player ? ` · ${author.player}` : ""}
              </span>
              <span className="when">
                {message.day} {message.time} · löst Vollmacht #7 ein
              </span>
            </div>
            <div className="stream-card roll-card">
              <div className="sc-head">
                <Dice5 size={11} />
                {message.label}
              </div>
              <div className="sc-body sc-result">
                <span className="die">{message.die + message.mod}</span>
                <span className="calc">
                  {message.formula} → {message.die} + {message.mod} gegen SG{" "}
                  {message.vs}
                </span>
                <span className={`verdict${message.ok ? " ok" : ""}`}>
                  {message.ok ? "Erfolg" : "Fehlschlag"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "kanon":
      return (
        <div className="msg">
          <span
            className="avatar"
            style={{ width: 40, height: 40, color: "var(--accent)" }}
            aria-hidden="true"
          >
            <ScrollText size={17} />
          </span>
          <div>
            <div className="msg-head">
              <span className="who" style={{ color: "var(--accent)" }}>
                Kanon geprägt
              </span>
              <span className="when">
                {message.day} {message.time} · steht jetzt in der Enzyklopädie
              </span>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="stream-card kanon-card"
              style={{ cursor: "pointer" }}
              onClick={() => onSelect("passage")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect("passage");
                }
              }}
              title="Öffnet die Passage in der Linse"
            >
              <div className="sc-head">
                <ScrollText size={11} />
                Die versiegelte Passage · Dienstag
              </div>
              <div className="sc-body">
                <blockquote>„{message.text}"</blockquote>
                <div className="sc-source">{message.source}</div>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

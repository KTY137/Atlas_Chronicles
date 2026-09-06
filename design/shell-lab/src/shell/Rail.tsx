import {
  BookOpen,
  Hammer,
  Hash,
  Home,
  Map,
  Radio,
} from "lucide-react";
import type { ComponentType } from "react";

import type { Role, StageId } from "../fixture";

interface RailEntry {
  id: StageId;
  label: string;
  icon: ComponentType<{ size?: number | string }>;
  gmOnly?: boolean;
  sepBefore?: boolean;
}

const ENTRIES: readonly RailEntry[] = [
  { id: "heute", label: "Heute", icon: Home },
  { id: "welt", label: "Welt", icon: BookOpen, sepBefore: true },
  { id: "tisch", label: "Tisch", icon: Map },
  { id: "kanal", label: "Kanal", icon: Hash },
  { id: "schmiede", label: "Schmiede", icon: Hammer, gmOnly: true, sepBefore: true },
  { id: "netz", label: "Netz", icon: Radio, gmOnly: true },
];

interface Props {
  role: Role;
  stage: StageId;
  onStage: (stage: StageId) => void;
}

export function Rail({ role, stage, onStage }: Props) {
  return (
    <nav className="rail" aria-label="Workspace">
      {ENTRIES.filter((entry) => role === "gm" || !entry.gmOnly).map(
        (entry) => {
          const Icon = entry.icon;
          return (
            <div key={entry.id} style={{ display: "contents" }}>
              {entry.sepBefore ? <div className="rail-sep" /> : null}
              <button
                type="button"
                className="rail-item"
                aria-current={stage === entry.id}
                onClick={() => onStage(entry.id)}
              >
                <Icon size={19} />
                <span>{entry.label}</span>
              </button>
            </div>
          );
        },
      )}
      <div className="rail-spacer" />
    </nav>
  );
}

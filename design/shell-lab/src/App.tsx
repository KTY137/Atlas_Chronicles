import { useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";

import { PARTY, type LookId, type Role, type StageId } from "./fixture";
import { PLAYER_SELF } from "./shell/Band";
import { ContextBar } from "./shell/ContextBar";
import { Rail } from "./shell/Rail";
import { Band } from "./shell/Band";
import { Lens, type LensSelection } from "./shell/Lens";
import { Heute } from "./stages/Heute";
import { Welt } from "./stages/Welt";
import { Tisch } from "./stages/Tisch";
import { Kanal } from "./stages/Kanal";
import { Schmiede } from "./stages/Schmiede";
import { Netz } from "./stages/Netz";
import { Palette } from "./shell/Palette";
import { WeltImport } from "./stages/WeltImport";
import { Journal } from "./stages/Journal";
import { Sammlungen } from "./stages/Sammlungen";
import { InfoboxStudio } from "./stages/InfoboxStudio";
import { DEFAULT_ARTICLE } from "./wiki";
import { subscribe } from "./wikiStore";

const LOOKS: readonly LookId[] = ["obsidian", "vellum", "aurora"];
const STAGES: readonly StageId[] = [
  "heute",
  "welt",
  "tisch",
  "kanal",
  "schmiede",
  "netz",
];

function readParam<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = new URLSearchParams(window.location.search).get(key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function App() {
  const [look, setLook] = useState<LookId>(() =>
    readParam("look", LOOKS, "obsidian"),
  );
  const [role, setRole] = useState<Role>(() =>
    readParam("role", ["gm", "player"] as const, "gm"),
  );
  const [stage, setStage] = useState<StageId>(() =>
    readParam("stage", STAGES, "heute"),
  );
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      new URLSearchParams(window.location.search).get("motion") === "reduced",
  );
  const [selection, setSelection] = useState<LensSelection | null>(() => {
    const value = new URLSearchParams(window.location.search).get("lens");
    return value === "olav" || value === "passage" ? value : null;
  });
  const [whisperTarget, setWhisperTarget] = useState<string | null>(() => {
    const value = new URLSearchParams(window.location.search).get("whisper");
    return PARTY.some((p) => p.id === value) ? value : null;
  });
  /* Ein unbekannter Titel ist KEIN Fehler, sondern ein Keim — und muss
     deep-linkbar bleiben. Stiller Rückfall auf den Standardartikel wäre ein
     verstecktes Downgrade. */
  const [article, setArticle] = useState<string>(() => {
    const value = new URLSearchParams(window.location.search).get("artikel");
    return value?.trim() ? value : DEFAULT_ARTICLE;
  });
  const [articleHistory, setArticleHistory] = useState<string[]>([]);
  /* Welt traegt vier Zustaende: Artikel, Verzeichnis, Import, Journale,
     Sammlungen — alle ueber die Flaeche erreichbar, keiner im Rail (07 §12). */
  const [schmiedeSub, setSchmiedeSub] = useState<"paket" | "vorlagen">(
    () =>
      new URLSearchParams(window.location.search).get("schmiede") === "vorlagen"
        ? "vorlagen"
        : "paket",
  );
  const [weltSub, setWeltSub] = useState<"artikel" | "import" | "journal" | "sammlungen">(
    () => {
      const value = new URLSearchParams(window.location.search).get("welt");
      return value === "import" || value === "journal" || value === "sammlungen"
        ? value
        : "artikel";
    },
  );
  const [weltIndex, setWeltIndex] = useState(
    () => new URLSearchParams(window.location.search).get("welt") === "index",
  );
  /* Schreibvorgänge bauen den Korpus neu auf — die Bühne muss neu rendern. */
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribe(() => setRevision((n) => n + 1)), []);
  const [paletteOpen, setPaletteOpen] = useState(
    () => new URLSearchParams(window.location.search).get("palette") === "1",
  );
  const [voiceDown, setVoiceDown] = useState(
    () => new URLSearchParams(window.location.search).get("voice") === "down",
  );

  /* Spieler sehen Schmiede und Netz nicht — Rollenprojektion.
     Im Produkt filtert der Server; im Lab spiegelt der Client den Vertrag. */
  const effectiveStage: StageId =
    role === "player" && (stage === "schmiede" || stage === "netz")
      ? "heute"
      : stage;
  useEffect(() => {
    if (effectiveStage !== stage) setStage(effectiveStage);
  }, [effectiveStage, stage]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("look", look);
    params.set("role", role);
    params.set("stage", effectiveStage);
    if (reducedMotion) params.set("motion", "reduced");
    if (selection) params.set("lens", selection);
    if (whisperTarget) params.set("whisper", whisperTarget);
    if (voiceDown) params.set("voice", "down");
    if (effectiveStage === "schmiede" && schmiedeSub === "vorlagen") {
      params.set("schmiede", "vorlagen");
    }
    if (effectiveStage === "welt") {
      params.set("artikel", article);
      if (weltSub !== "artikel") params.set("welt", weltSub);
      else if (weltIndex) params.set("welt", "index");
    }
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [
    look,
    role,
    effectiveStage,
    reducedMotion,
    selection,
    whisperTarget,
    voiceDown,
    article,
    weltIndex,
    weltSub,
    schmiedeSub,
  ]);

  /* ⌘K / Strg+K öffnet die Omnibox — der Ersatz für eine Artikelspalte. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openArticle = (next: string) => {
    setArticleHistory((past) => (next === article ? past : [...past, article]));
    setArticle(next);
    setWeltIndex(false);
    setWeltSub("artikel");
    setStage("welt");
  };
  const backArticle = () => {
    setArticleHistory((past) => {
      if (!past.length) return past;
      setArticle(past[past.length - 1]);
      return past.slice(0, -1);
    });
  };

  /* Sprechsimulation: wer gerade spricht, wandert durch die Runde.
     Bei aktivem Flüsterkanal sprechen nur Leitung und Ziel. */
  const [speaker, setSpeaker] = useState<string | null>("kaya");
  const selfInWhisper =
    whisperTarget !== null && (role === "gm" || whisperTarget === PLAYER_SELF);
  useEffect(() => {
    setSpeaker(null);
    if (voiceDown) return;
    /* Wer nicht in der Kapsel ist, hört und sieht den laufenden Tisch. */
    const order: (string | null)[] = whisperTarget
      ? selfInWhisper
        ? ["kaya", whisperTarget, null]
        : [...PARTY.map((p) => p.id).filter((id) => id !== whisperTarget), null]
      : ["kaya", "olav", null, "song", "oggugat", null, "yalit"];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % order.length;
      setSpeaker(order[index] ?? null);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [whisperTarget, voiceDown, selfInWhisper]);

  /* Das Gate: 1 Rail · 1 Bühne · max. 1 Instrument · Band.
     Gezählt wird im DOM, nicht im Zustand — jedes Werkzeugpanel trägt
     data-instrument. Anzeigen (Szenentitel, Initiative) sind Bühneninhalt. */
  const [openInstruments, setOpenInstruments] = useState(0);
  useEffect(() => {
    const count = () =>
      setOpenInstruments(document.querySelectorAll("[data-instrument]").length);
    count();
    const observer = new MutationObserver(count);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const gateViolated = openInstruments > 1;

  const stageNode = useMemo(() => {
    const select = (next: LensSelection) => setSelection(next);
    switch (effectiveStage) {
      case "heute":
        return <Heute role={role} goTo={setStage} />;
      case "welt":
        if (weltSub === "import") {
          return (
            <WeltImport
              onClose={() => {
                setWeltSub("artikel");
                setWeltIndex(true);
              }}
              onOpenArticle={openArticle}
            />
          );
        }
        if (weltSub === "journal") {
          return <Journal role={role} onOpenArticle={openArticle} />;
        }
        if (weltSub === "sammlungen") {
          return <Sammlungen onOpenArticle={openArticle} />;
        }
        return (
          <Welt
            title={article}
            onOpen={openArticle}
            onSelect={select}
            canGoBack={articleHistory.length > 0}
            onBack={backArticle}
            showIndex={weltIndex}
            onShowIndex={setWeltIndex}
            onImport={() => setWeltSub("import")}
            onJournal={() => setWeltSub("journal")}
            onSammlungen={() => setWeltSub("sammlungen")}
          />
        );
      case "tisch":
        return <Tisch role={role} selection={selection} onSelect={select} />;
      case "kanal":
        return <Kanal role={role} onSelect={select} />;
      case "schmiede":
        return schmiedeSub === "vorlagen" ? (
          <InfoboxStudio role={role} />
        ) : (
          <Schmiede role={role} onVorlagen={() => setSchmiedeSub("vorlagen")} />
        );
      case "netz":
        return <Netz voiceDown={voiceDown} onToggleVoice={setVoiceDown} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // revision gehört in die Abhängigkeiten: Ein Schreibvorgang baut den
    // Korpus neu auf, und ohne ihn liefert der Memo die veraltete Bühne.
  }, [effectiveStage, role, selection, voiceDown, article, articleHistory, weltIndex, weltSub, schmiedeSub, revision]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <div
        className="app"
        data-look={look}
        data-motion={reducedMotion ? "reduced" : "full"}
      >
        <ContextBar
          look={look}
          onLook={setLook}
          role={role}
          onRole={setRole}
          reducedMotion={reducedMotion}
          onReducedMotion={setReducedMotion}
          onSearch={() => setPaletteOpen(true)}
        />
        <div className="main">
          <Rail role={role} stage={effectiveStage} onStage={setStage} />
          <main className="stage">
            {stageNode}
          </main>
          {selection ? (
            <Lens
              selection={selection}
              onClose={() => setSelection(null)}
              role={role}
            />
          ) : null}
        </div>
        <Band
          role={role}
          stage={effectiveStage}
          speaker={speaker}
          whisperTarget={whisperTarget}
          onWhisper={setWhisperTarget}
          voiceDown={voiceDown}
          goToKanal={() => setStage("kanal")}
        />
        {paletteOpen ? (
          <Palette onOpen={openArticle} onClose={() => setPaletteOpen(false)} />
        ) : null}
        <div
          className="gate"
          data-violated={gateViolated}
          title="Anti-Überladungs-Gate: höchstens ein Rail, eine Bühne, ein Instrument und das Band gleichzeitig."
        >
          {gateViolated
            ? "GATE VERLETZT"
            : `Gate ✓ 1 Rail · 1 Bühne · ${openInstruments} Instrument · Band`}
        </div>
      </div>
    </MotionConfig>
  );
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ArrowRight, BookOpen, CalendarDays, Compass, Dice6, Hammer, Image, Layers, Map, MessageSquare, Swords, User, UserPlus, Users } from "lucide-react";
import type { ActorCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign, type EntrySummary } from "../api";
import { useResource } from "../hooks";
import { t } from "../i18n";
import type { Stage, TableTab } from "../navigation";
import type { ForgeSection } from "./forge-navigation";
import { ErsteSchritte, useErsteSchritte } from "./ErsteSchritte";

/**
 * „Heute" — der Landeplatz einer Kampagne.
 *
 * Warum es das gibt. Eine Prüfung am 2026-09-06 kam zu dem Schluss, dass die Anwendung keinen
 * Anfang hat: Wer eine Kampagne öffnete, landete in einer alphabetischen Artikelliste, und
 * dahinter lagen 36 benannte Ziele über vier Ebenen, von denen keines durchsuchbar war. Der
 * Auftraggeber selbst fand den Kartengenerator und den Wiki-Import nicht, obwohl beide gebaut
 * sind und funktionieren. Wenn der Mensch, der das Produkt bestellt hat, seine eigenen
 * Funktionen nicht findet, findet sie niemand.
 *
 * Diese Fläche beantwortet zwei Fragen und sonst keine: **Wo mache ich weiter?** und **was kann
 * ich hier überhaupt tun?** Sie erfindet dafür keine Daten. Sie nennt jedes Ziel beim Namen,
 * sagt in einem Satz, wozu es da ist, und führt hin. Ein Verzeichnis, das seine eigenen Räume
 * erklärt, ist billiger als jede Suchleiste — und es hilft auch dem, der das Wort noch nicht
 * kennt, nach dem er suchen müsste.
 *
 * Bewusst nicht hier: eine erfundene Aktivitätsanzeige. Was diese Fläche zeigt, stammt aus
 * Aufrufen, die der Client ohnehin schon macht.
 */

export type { Stage } from "../navigation";

interface Ziel {
  readonly id: Stage;
  readonly titel: string;
  readonly zweck: string;
  readonly icon: typeof BookOpen;
  /** Nur der Spielleitung zeigen. */
  readonly nurLeitung?: boolean;
}

/** Beim Zeichnen gebaut, nicht beim Laden des Moduls: sonst hielte die Liste die Sprache fest,
 * die beim ersten Import galt. */
const ziele = (): readonly Ziel[] => [
  { id: "wiki", titel: t("Chronik"), zweck: t("Das Buch eurer Welt: Orte, Figuren, Ereignisse — und was jede Figur davon weiß."), icon: BookOpen },
  { id: "tisch", titel: t("Tisch"), zweck: t("Der Abend selbst: Szenenkarten erzeugen oder laden, würfeln, Ergebnisse bestätigen."), icon: Dice6 },
  { id: "atlas", titel: t("Atlas"), zweck: t("Die Weltkarte erkunden, Orte verbinden und ihre Unterkarten betreten."), icon: Compass },
  { id: "woche", titel: t("Woche"), zweck: t("Was zwischen zwei Abenden passiert: Briefe unterwegs, offene Vorhaben."), icon: CalendarDays },
  { id: "kanal", titel: t("Kanal"), zweck: t("Der Ort zum Reden zwischen den Abenden. Verfasstes bleibt, Tischgeplauder nicht."), icon: MessageSquare },
  { id: "runde", titel: t("Runde"), zweck: t("Wer mitspielt. Hier lädst du Leute ein und gibst Beitritte frei."), icon: Users },
  { id: "schmiede", titel: t("Schmiede"), zweck: t("Lootkarten, NPCs und Karten erstellen, Bilder hochladen und Regeln gestalten."), icon: Hammer, nurLeitung: true },
];

export function Heute({ campaign, displayName, anwesend, liveRevision, onNavigate, onOpenForge, onOpenTable, onOpenEntry }: {
  campaign: Campaign;
  displayName: string;
  /** Wer gerade verbunden ist. Kommt aus der bestehenden Live-Verbindung. */
  anwesend: readonly { userId: string; displayName: string }[];
  liveRevision: number;
  onNavigate: (stage: Stage) => void;
  onOpenForge: (section: ForgeSection) => void;
  onOpenTable: (tab: TableTab) => void;
  onOpenEntry: (entryId: string) => void;
}) {
  const leitung = campaign.role === "leitung";
  const entries = useResource<EntrySummary[]>(apiPath(campaign.id, "/entries"), liveRevision);
  const zuletzt = (entries.data ?? []).slice(0, 4);
  const andere = anwesend.filter((person) => person.displayName !== displayName);
  // Wer mitspielt, aber noch keine Figur führt, braucht als Erstes genau eine: der hervorgehobene
  // Schritt ist dann „Figur beantragen“, nicht der Spieltisch (Neulingsgang, 2026-09-26).
  const figuren = useResource<ActorCard[]>(campaign.role === "spieler" ? apiPath(campaign.id, "/actors") : null, liveRevision);
  const ohneFigur = campaign.role === "spieler" && !!figuren.data && !figuren.data.some((actor) => actor.canControl);
  // Die Spielleitung landet hier. Solange die Runde nicht startklar ist, steht die Checkliste oben und
  // ihr nächster offener Punkt ist der eine hervorgehobene Schritt; danach wieder der Spieltisch.
  const start = useErsteSchritte(leitung ? campaign.id : null, liveRevision);
  const startOffen = leitung && start.geladen && !start.fertig;

  return (
    <section className="page-content heute">
      <p className="eyebrow">{leitung ? t("Spielleitung") : t("Deine Runde")}</p>
      <h1>{campaign.name}</h1>
      <p className="muted">
        {leitung
          ? t("Bereite euer nächstes Abenteuer vor oder steig direkt in den Spielabend ein.")
          : t("Deine Figuren, eure Geschichte und der nächste gemeinsame Spielabend.")}
      </p>

      {startOffen ? <ErsteSchritte campaignId={campaign.id} revision={liveRevision} stand={start} onSectionChange={onOpenForge} onOpenRound={() => onNavigate("runde")} onOpenTable={() => onOpenTable("actors")} /> : null}
      {ohneFigur ? <p className="heute-erster-schritt">{t("Du hast in dieser Runde noch keine Figur. Beantrage eine — die Spielleitung gibt sie frei, danach findest du sie unter „Ich“.")}</p> : null}
      <div className="heute-play-actions">
        {ohneFigur ? <Button variant="primary" onClick={() => onNavigate("ich")}><UserPlus size={18} /> {t("Figur beantragen")}<ArrowRight size={16} /></Button> : null}
        <Button variant={ohneFigur || startOffen ? "default" : "primary"} onClick={() => onOpenTable("actions")}><Dice6 size={18} /> {t("Zum Spieltisch")}<ArrowRight size={16} /></Button>
        {ohneFigur ? null : <Button onClick={() => onNavigate("ich")}><User size={17} /> {t("Meine Figuren & Inventare")}</Button>}
        <Button onClick={() => onOpenTable("kampf")}><Swords size={17} /> {t("Kampf öffnen")}</Button>
      </div>

      {leitung ? <section className="heute-workshop" aria-labelledby="heute-create-heading">
        <div className="section-heading"><div><p className="eyebrow">{t("Vor dem Abenteuer")}</p><h2 id="heute-create-heading">{t("Was möchtest du erstellen?")}</h2></div><Button variant="quiet" onClick={() => onOpenForge("overview")}>{t("Zur Schmiede")}<ArrowRight size={16} /></Button></div>
        <div className="heute-create-grid">
          {([
            { section: "loot", label: t("Lootkarte erstellen"), text: t("Gegenstände gestalten und an die Gruppe verteilen."), icon: Layers },
            { section: "actors", label: t("NPC erstellen"), text: t("Figurvorlagen, Werte und mögliche Beute festlegen."), icon: Users },
            { section: "maps", label: t("Karte erstellen"), text: t("Grundrisse und Höhlen erzeugen oder Karten importieren."), icon: Map },
            { section: "media", label: t("Bild hochladen"), text: t("Illustrationen für Lootkarten und eure Chronik sammeln."), icon: Image },
          ] as const).map(({ section, label, text, icon: Icon }) => <button type="button" className="heute-create-card" key={section} aria-label={label} onClick={() => onOpenForge(section)}><Icon size={23} aria-hidden="true" /><strong>{label}</strong><span>{text}</span><ArrowRight className="heute-card-arrow" size={17} aria-hidden="true" /></button>)}
        </div>
      </section> : null}

      {andere.length > 0 ? (
        <p className="heute-anwesend">
          {t("Gerade auch da: {namen}.", { namen: andere.map((person) => person.displayName).join(", ") })}
        </p>
      ) : null}

      <h2 className="heute-abschnitt">{t("Aus eurer Chronik")}</h2>
      {entries.error && !entries.data ? (
        <Notice error>{entries.error}</Notice>
      ) : entries.loading && !entries.data ? (
        <Loading text={t("Deine Chronik wird gelesen …")} />
      ) : zuletzt.length > 0 ? (
        <ul className="heute-artikel">
          {zuletzt.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="heute-artikel-karte" onClick={() => onOpenEntry(entry.id)}>
                <strong>{entry.title}</strong>
                {entry.excerpt ? <small>{entry.excerpt}</small> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t("Eure Chronik ist noch leer.")}
          action={<Button onClick={() => onNavigate("wiki")}>{t("Zur Chronik")}</Button>}
        >
          {leitung
            ? t("Schreibt den ersten Artikel, oder holt ein bestehendes Wiki herein — beides beginnt in der Chronik.")
            : t("Sobald deine Spielleitung etwas für deine Figur freigibt, steht es hier.")}
        </EmptyState>
      )}

      <h2 className="heute-abschnitt">{t("Was du hier tun kannst")}</h2>
      <div className="heute-ziele">
        {ziele().filter((ziel) => !ziel.nurLeitung || leitung).map(({ id, titel, zweck, icon: Icon }) => (
          <button type="button" className="heute-ziel" key={id} onClick={() => onNavigate(id)}>
            <span className="heute-ziel-kopf">
              <Icon size={19} aria-hidden="true" />
              <strong>{titel}</strong>
            </span>
            <span>{zweck}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

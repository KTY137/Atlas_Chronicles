// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ArrowRight, BookOpen, CalendarDays, Compass, Dice6, Hammer, Image, Layers, Map, MessageSquare, Swords, User, Users } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign, type EntrySummary } from "../api";
import { useResource } from "../hooks";
import type { Stage, TableTab } from "../navigation";
import type { ForgeSection } from "./forge-navigation";

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

const ZIELE: readonly Ziel[] = [
  { id: "wiki", titel: "Chronik", zweck: "Das Buch eurer Welt: Orte, Figuren, Ereignisse — und was jede Figur davon weiß.", icon: BookOpen },
  { id: "tisch", titel: "Tisch", zweck: "Der Abend selbst: Szenenkarten erzeugen oder laden, würfeln, Ergebnisse bestätigen.", icon: Dice6 },
  { id: "atlas", titel: "Atlas", zweck: "Die Weltkarte erkunden, Orte verbinden und ihre Unterkarten betreten.", icon: Compass },
  { id: "woche", titel: "Woche", zweck: "Was zwischen zwei Abenden passiert: Briefe unterwegs, offene Vorhaben.", icon: CalendarDays },
  { id: "kanal", titel: "Kanal", zweck: "Der Ort zum Reden zwischen den Abenden. Verfasstes bleibt, Tischgeplauder nicht.", icon: MessageSquare },
  { id: "runde", titel: "Runde", zweck: "Wer mitspielt. Hier lädst du Leute ein und gibst Beitritte frei.", icon: Users },
  { id: "schmiede", titel: "Schmiede", zweck: "Lootkarten, NPCs und Karten erstellen, Bilder hochladen und Regeln gestalten.", icon: Hammer, nurLeitung: true },
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

  return (
    <section className="page-content heute">
      <p className="eyebrow">{leitung ? "Spielleitung" : "Deine Runde"}</p>
      <h1>{campaign.name}</h1>
      <p className="muted">
        {leitung
          ? "Bereite euer nächstes Abenteuer vor oder steig direkt in den Spielabend ein."
          : "Deine Figuren, eure Geschichte und der nächste gemeinsame Spielabend."}
      </p>

      <div className="heute-play-actions">
        <Button variant="primary" onClick={() => onOpenTable("actions")}><Dice6 size={18} /> Zum Spieltisch<ArrowRight size={16} /></Button>
        <Button onClick={() => onNavigate("ich")}><User size={17} /> Meine Figuren & Inventare</Button>
        <Button onClick={() => onOpenTable("kampf")}><Swords size={17} /> Kampf öffnen</Button>
      </div>

      {leitung ? <section className="heute-workshop" aria-labelledby="heute-create-heading">
        <div className="section-heading"><div><p className="eyebrow">Vor dem Abenteuer</p><h2 id="heute-create-heading">Was möchtest du erstellen?</h2></div><Button variant="quiet" onClick={() => onOpenForge("overview")}>Zur Schmiede<ArrowRight size={16} /></Button></div>
        <div className="heute-create-grid">
          {([
            { section: "loot", label: "Lootkarte erstellen", text: "Gegenstände gestalten und an die Gruppe verteilen.", icon: Layers },
            { section: "actors", label: "NPC erstellen", text: "Figurvorlagen, Werte und mögliche Beute festlegen.", icon: Users },
            { section: "maps", label: "Karte erstellen", text: "Grundrisse und Höhlen erzeugen oder Karten importieren.", icon: Map },
            { section: "media", label: "Bild hochladen", text: "Illustrationen für Lootkarten und eure Chronik sammeln.", icon: Image },
          ] as const).map(({ section, label, text, icon: Icon }) => <button type="button" className="heute-create-card" key={section} aria-label={label} onClick={() => onOpenForge(section)}><Icon size={23} aria-hidden="true" /><strong>{label}</strong><span>{text}</span><ArrowRight className="heute-card-arrow" size={17} aria-hidden="true" /></button>)}
        </div>
      </section> : null}

      {andere.length > 0 ? (
        <p className="heute-anwesend">
          Gerade auch da: {andere.map((person) => person.displayName).join(", ")}.
        </p>
      ) : null}

      <h2 className="heute-abschnitt">Aus eurer Chronik</h2>
      {entries.error && !entries.data ? (
        <Notice error>{entries.error}</Notice>
      ) : entries.loading && !entries.data ? (
        <Loading text="Deine Chronik wird gelesen …" />
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
          title="Eure Chronik ist noch leer."
          action={<Button variant="primary" onClick={() => onNavigate("wiki")}>Zur Chronik</Button>}
        >
          {leitung
            ? "Schreibt den ersten Artikel, oder holt ein bestehendes Wiki herein — beides beginnt in der Chronik."
            : "Sobald deine Spielleitung etwas für deine Figur freigibt, steht es hier."}
        </EmptyState>
      )}

      <h2 className="heute-abschnitt">Was du hier tun kannst</h2>
      <div className="heute-ziele">
        {ZIELE.filter((ziel) => !ziel.nurLeitung || leitung).map(({ id, titel, zweck, icon: Icon }) => (
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

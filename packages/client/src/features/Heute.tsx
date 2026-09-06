import { BookOpen, CalendarDays, Compass, Dice6, Hammer, MessageSquare, Users } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign, type EntrySummary } from "../api";
import { useResource } from "../hooks";

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

export type Stage = "wiki" | "atlas" | "tisch" | "kanal" | "woche" | "schmiede" | "runde";

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
  { id: "atlas", titel: "Atlas", zweck: "Die Weltkarte und ihre Orte. Karten entstehen anderswo und werden hier hereingeholt.", icon: Compass },
  { id: "woche", titel: "Woche", zweck: "Was zwischen zwei Abenden passiert: Briefe unterwegs, offene Vorhaben.", icon: CalendarDays },
  { id: "kanal", titel: "Kanal", zweck: "Der Ort zum Reden zwischen den Abenden. Verfasstes bleibt, Tischgeplauder nicht.", icon: MessageSquare },
  { id: "runde", titel: "Runde", zweck: "Wer mitspielt. Hier lädst du Leute ein und gibst Beitritte frei.", icon: Users },
  { id: "schmiede", titel: "Schmiede", zweck: "Regeln, Vorlagen und das Aussehen eurer Kampagne bauen.", icon: Hammer, nurLeitung: true },
];

export function Heute({ campaign, displayName, anwesend, liveRevision, onNavigate, onOpenEntry }: {
  campaign: Campaign;
  displayName: string;
  /** Wer gerade verbunden ist. Kommt aus der bestehenden Live-Verbindung. */
  anwesend: readonly { userId: string; displayName: string }[];
  liveRevision: number;
  onNavigate: (stage: Stage) => void;
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
          ? "Von hier führt jeder Weg weiter. Such dir aus, woran ihr heute arbeitet."
          : "Willkommen zurück. Von hier kommst du überall hin, wo deine Figur etwas zu tun hat."}
      </p>

      {andere.length > 0 ? (
        <p className="heute-anwesend">
          Gerade auch da: {andere.map((person) => person.displayName).join(", ")}.
        </p>
      ) : null}

      <h2 className="heute-abschnitt">Wo du weitermachst</h2>
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

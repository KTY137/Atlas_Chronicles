// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Die letzte Auffanglinie der Anwendung.
 *
 * Ohne sie beendet ein einziger Fehler beim Rendern die gesamte Oberfläche: React hängt den
 * Baum ab, zurück bleibt eine weiße Seite ohne Text, ohne Knopf und ohne Hinweis. Das ist der
 * schlechteste aller Zustände, weil er wie ein normal ausgeliefertes Programm aussieht statt
 * wie ein Fehler — und weil der Nutzer nicht einmal weiß, dass Neuladen helfen könnte.
 *
 * Der wahrscheinlichste Auslöser ist banal und tritt im Betrieb regelmäßig auf: Die Bühnen
 * werden nachgeladen (`lazy`), und nach einer neuen Auslieferung existiert das alte Teilstück
 * auf dem Server nicht mehr. Wer die Seite währenddessen offen hat, bekommt beim nächsten
 * Bühnenwechsel einen fehlgeschlagenen Download. Genau dieser Fall führt hier zu einem
 * benannten Zustand mit genau einem sinnvollen nächsten Schritt.
 */

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
  /** Nur für den technischen Aufklappbereich; niemals die Hauptaussage an den Nutzer. */
  readonly detail: string;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, detail: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, detail: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Landet in der Browserkonsole, damit ein Fehlerbericht etwas enthält, das weiterhilft.
    console.error("Die Oberfläche ist abgestürzt:", error, info.componentStack);
  }

  private readonly reload = (): void => { window.location.reload(); };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash-screen" role="alert">
        <h1>Die Anwendung ist stehen geblieben</h1>
        <p>
          Hier ist etwas schiefgegangen, das nicht an dir liegt. Deine gespeicherten Inhalte sind
          davon nicht betroffen — es ist nur diese Ansicht, die nicht mehr weiterkonnte.
        </p>
        <p>
          Am häufigsten passiert das, wenn die Anwendung erneuert wurde, während du sie offen
          hattest. Dann genügt ein Neuladen.
        </p>
        <button type="button" className="button button-primary" onClick={this.reload}>
          Seite neu laden
        </button>
        {this.state.detail ? (
          <details>
            <summary>Technische Einzelheiten</summary>
            <pre>{this.state.detail}</pre>
          </details>
        ) : null}
      </div>
    );
  }
}

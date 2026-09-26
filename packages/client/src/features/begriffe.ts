// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.

/**
 * Das Begriffsverzeichnis der Oberfläche — eine Quelle für jede Erklärung am Wort.
 *
 * Kaya, 2026-09-26: Wer das System nicht kennt, soll schnell wissen, wie es geht. Die Wörter hier
 * bleiben, weil es keine einfacheren gibt; dafür bekommt jedes einen Satz mit Beispiel. Die Tabellen
 * heißen `*_LABEL`, damit das Sprachgate ihre Werte als Katalogschlüssel erkennt.
 */
export const BEGRIFF_IDS = ["regelwerk", "version", "installieren", "aktivieren", "attribut", "berechneter-wert", "balken", "aktion", "faehigkeit", "zustand", "liste", "bogen", "figurvorlage", "figur", "antrag"] as const;
export type BegriffId = typeof BEGRIFF_IDS[number];

export const BEGRIFF_LABEL: Readonly<Record<BegriffId, string>> = Object.freeze({
  regelwerk: "Regelwerk", version: "Version", installieren: "Installieren", aktivieren: "Aktivieren", attribut: "Attribut",
  "berechneter-wert": "Berechneter Wert", balken: "Balken", aktion: "Aktion", faehigkeit: "Fähigkeit", zustand: "Zustand",
  liste: "Liste", bogen: "Bogen", figurvorlage: "Figurvorlage", figur: "Figur", antrag: "Antrag",
});

export const BEGRIFF_ERKLAERUNG_LABEL: Readonly<Record<BegriffId, string>> = Object.freeze({
  regelwerk: "Die Spielregeln eurer Runde: welche Werte eine Figur hat und wie gewürfelt wird. Chronicles Lite ist zum Beispiel ein fertiges Regelwerk.",
  version: "Ein festgehaltener Stand eines Regelwerks, zum Beispiel 1.0.0. Jede Änderung ergibt eine neue Version; bestehende Figuren behalten ihre, bis du umstellst.",
  installieren: "Legt eine Version in die Bibliothek deiner Runde, zum Beispiel Chronicles Lite 1.0.0. Sie gilt damit noch nicht, dafür musst du sie aktivieren.",
  aktivieren: "Macht eine installierte Version zum Regelwerk, nach dem ab jetzt gespielt wird, zum Beispiel beim Umstieg auf eine neue Version. Vorhandene Bögen werden übertragen.",
  attribut: "Ein Wert, den man auf dem Bogen einträgt, zum Beispiel Stärke 12 oder der Name der Figur.",
  "berechneter-wert": "Ein Wert, den das Regelwerk selbst ausrechnet, zum Beispiel Verteidigung = Geschick + 10. Man trägt ihn nicht ein.",
  balken: "Ein Vorrat, der im Spiel sinkt und steigt, zum Beispiel Leben 12 von 12. Er erscheint als farbiger Balken.",
  aktion: "Ein Wurf nach festen Regeln, zum Beispiel „Probe auf Stärke: 1W20 plus Stärke, ab 15 geschafft“.",
  faehigkeit: "Etwas Besonderes, das eine Figur lernen kann, zum Beispiel „Kraftschlag“. Fähigkeiten können Punkte kosten und Werte verändern.",
  zustand: "Etwas, das eine Figur gerade betrifft und wieder vergeht, zum Beispiel „Erschöpft: −2 auf alle Proben“.",
  liste: "Mehrere gleichartige Einträge auf dem Bogen, zum Beispiel die Ausrüstung mit Name und Gewicht je Gegenstand.",
  bogen: "Das Blatt einer Figur mit allen Werten, Balken und Fähigkeiten, zum Beispiel so, wie es am Tisch erscheint.",
  figurvorlage: "Ein Muster, aus dem du beliebig viele Figuren anlegst, zum Beispiel „Stadtwache“. Die Vorlage selbst spielt nicht mit.",
  figur: "Eine Person oder ein Wesen mit eigenem Bogen, zum Beispiel die Heldin einer Mitspielerin oder ein Wirt, den die Spielleitung führt.",
  antrag: "Der Wunsch von jemandem aus der Runde, eine Figur ins Spiel zu bringen, zum Beispiel mit Name und Werten. Die Spielleitung gibt ihn frei oder lehnt ab.",
});

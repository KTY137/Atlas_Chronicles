<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Hostfenster als Zentrale — Teil 1 von 3

Stand 2026-09-11, von Kaya freigegeben. Teil 2 (Heimnetz) und Teil 3 (Internet) folgen je eigen.

## Anlass

Kaya spielt „gemischt": am Host-Rechner, im Heimnetz, übers Internet. Heute verteilt sich eine Runde
über zwei Fenster: Welt und Spielleitung im Hostfenster, Runde nur im Spiel, Einladung an beiden
Stellen mit verschiedenen Fristen (7 Tage / 24 h), Freigabe nur im Spiel mit 30 Minuten Frist und
ohne Ablehnen. Dazu drei Bedienfehler: die Weltliste wird alle 1,5 s neu gebaut (Tippen verliert den
Fokus), das Neuladen der Runden nimmt die globale Sperre (Klicks kollidieren, v0.4.1), und Löschen
ist bei laufender Welt ohne Erklärung ausgegraut.

## Entscheidung: Variante C

Das Hostfenster führt durch alles; das Spielfenster behält seine Runden-Seite (für Browser und
Server, RB-11 B8). Beide rufen **dieselben Serverfunktionen**, damit nichts auseinanderläuft:

- Einladung: 7 Tage, überall.
- Beitrittsanfrage: 24 Stunden statt 30 Minuten.
- Ablehnen: neu, im Hostfenster und im Spiel.

## Aufbau des Hostfensters

1. **Weltleiste** — Welt, Zustand in Klartext, ein Hauptknopf je Zustand: „Welt starten",
   „Spiel öffnen", „Welt beenden".
2. **Erste Schritte** — nur solange offen, jeder Schritt direkt erledigbar: Spielleitung einrichten →
   erste Runde anlegen (Namensfeld hier) → Einladung erzeugen → erste Person freigegeben.
3. **Runde** (Auswahl):
   - *Einladen*: Link, Kopieren, Zeile „Wer kann beitreten: nur dieser Rechner" (Andockstelle
     für Teil 2/3).
   - *Vor der Tür*: Wartende mit Freigeben/Ablehnen. Wartet jemand und das Fenster ist nicht vorn:
     Taskleiste blinkt, Titel zeigt „(n)".
   - *Mitglieder*: Rolle, „kommt herein / kommt nicht herein", Zugangslink.
4. **Welten verwalten** (eingeklappt) — anlegen, löschen, Sicherung, Kampagne mitbringen, Server,
   Chronist-Schlüssel. Nicht laufende Welten sind auch löschbar, während eine andere läuft; ist
   Löschen gesperrt, steht der Grund dabei.

## Technik

- **Zeichnen:** Abschnitte werden nur neu gebaut, wenn sich ihre Daten ändern (Vergleich eines
  Schlüssels je Abschnitt). Eingaben, Fokus und Klicks überleben die Statusabfrage.
- **Sperre:** lesende Abfragen (`runden`, inklusive wartender Beitritte) laufen an der globalen
  Sperre vorbei.
- **Neue Host-Befehle:** `runde-anlegen {name}`, `freigeben {campaignId, requestId}`,
  `ablehnen {campaignId, requestId}`; `runden` liefert je Runde `wartend[]` mit.
  Ausgeführt als die Spielleitung der Welt bzw. der Runde — wie `hostEinladung` heute.
- **Server:** Ablehnen als Domänenfunktion und Route; Frist der Anfrage 24 h; Standardfrist der
  Einladung im Spiel 7 Tage. `Round.tsx` bekommt „Ablehnen".
- **Löschen:** `main.ts` prüft nur noch, ob *diese* Welt läuft.

## Nicht in Teil 1

- QR-Code — `localhost` erreicht kein Handy; gehört zu Teil 2.
- „Spielleitung mit einem Klick wieder anmelden" — berührt die Grenze, dass nur die Einrichtung eine
  Sitzung setzt (desktop-shell-20260906 L91-95). Offene Frage für später.

## Prüfung

- Servertests: Ablehnen (nur Spielleitung, Anfrage verfällt, Name wird frei), Fristen.
- Desktop-Smoke bedient die Oberfläche: Runde im Hostfenster anlegen, Einladung, zweite Person tritt
  bei, Freigeben und Ablehnen im Hostfenster, Tippen im Lösch-Feld über mehrere Statusabfragen ohne
  Fokusverlust, Klick während des Runden-Neuladens ohne Kollision, Löschen einer ruhenden Welt
  während eine andere läuft.

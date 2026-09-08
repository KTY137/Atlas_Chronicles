# Spielerbanner ohne Sprach- und Videochat — 08.09.2026

Owner-Anweisung: „entferne die sprach/videochat funktion das brauch niemand“;
Präzisierung: „wir brauchen nur das banner für Spieler anzeigen“.

Das Band zeigt die Namen der verbundenen Runde mit Online-/Abwesend-Status aus
`useCampaignLive`. Die Anzeige bleibt beim Bühnenwechsel erhalten und verwirft bei
Verbindungsabbruch oder Kampagnenwechsel den bisherigen Anwesenheitsstand. Auf schmalen
Bildschirmen erhält die Spielerliste eine eigene, bei Bedarf horizontal scrollbare Zeile.
Die bestehende Anzeige für ungespeicherte Entwürfe bleibt verfügbar.

Entfernt sind Sprach-/Videochat einschließlich Bildschirmfreigabe und Flüsterräumen,
MediaPanel, LiveKit-Client/Server, Medienrouten und laufende Mediennutzungszähler.
Desktop-Sitzungen verweigern Geräte- und Bildschirmaufnahme ohne Freigabedialog.
Self-Host benötigt App, PostgreSQL und optional TLS; LiveKit/coturn und zugehörige
Startskripte und Zugangskonfiguration sind entfernt.

Kampagnenbeiträge, Tischchat, WebSocket-Anwesenheit, Bilder und Kartenassets bleiben
erhalten. Bestehende Migrationen und historische Medientabellen werden nicht verändert
oder gelöscht. Alte Laufzeitdaten verursachen keine weitere Mediennutzungszählung.
Lokale ignorierte Konfigurationen und bestehende Desktop-Installationen werden nicht
überschrieben. Frühere Voice-/Video-Beschlüsse in Design 07/08/10 sind damit überholt;
Recherche und damalige Nachweise bleiben als Historie erhalten.

Die Abnahme prüft die entfernten HTTP-Routen, den weiterhin funktionierenden Textchat
und Online-/Abwesend-Präsenz, Desktop-Berechtigungsablehnung sowie das Banner in zwei
Browserkontexten, bei Offline/Reconnect und in der Mobilansicht. Endergebnisse stehen
im aktuellen Abschnitt von `STATUS.md`.

# Textchat und Anwesenheit

Stand: 8. September 2026. Der eingebaute Sprach- und Videochat wurde entfernt,
einschließlich Mikrofon, Kamera, Bildschirmfreigabe und privater Sprachräume.
Für Gespräche verwendet die Runde eine externe Anwendung.

Der Spielerbanner zeigt weiterhin die Mitglieder und ihre App-Anwesenheit.
Textnachrichten werden weiterhin über den Kanal gesendet und empfangen.
Beides läuft über den App-Server und benötigt keinen zusätzlichen Sprachdienst.

Die lokalen Sprachdienste und ihre Start- und Prüfskripte gehören nicht mehr zur
Auslieferung. Vorhandene ignorierte Konfigurationen bleiben erhalten; bereits
laufende alte Dienste werden durch diese Quellcodeänderung nicht automatisch beendet.
Gespeicherte Kampagnendaten, Bilder und Karten bleiben erhalten.

Aktuelle Start- und Betriebsschritte stehen im [Self-Hosting-Guide](SELFHOSTING.md).

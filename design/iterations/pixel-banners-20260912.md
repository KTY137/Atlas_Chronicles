# Animierte Pixelart-Banner — 2026-09-12

Owner-Auftrag: die freie Kopfzeile mit auswählbarer Pixelart beleben; 20 Motive,
insbesondere Fantasy, Steam-, Cyber- und Retropunk. Auswahl in „Deine Darstellung“.

Entscheidung: eingebettete, selbst gezeichnete Pixel-Szenen aus SVG mit CSS-Bewegung.
Das hält die Animation offline verfügbar, skalierbar und jederzeit anhaltbar.
GIFs/Videos würden zusätzliche Dateien und eine zweite Behandlung für Standbilder
verlangen. Jeder der 20 Einträge erhält eigene Landschaften/Gebäude und ein Motiv,
nicht lediglich eine neue Farbe. Kein externer Abruf und keine neue Abhängigkeit.

Die Szene liegt als flexibles Band zwischen Kampagnenwahl und Konto. Eigener
Clippingbereich, seitliche Ausblendung, keine Eingabeereignisse. Sie schrumpft vor
der Bedienung; auf kleinen Bildschirmen verschwindet das Band. Auf ausdrücklichen
Owner-Wunsch laufen auch alle 20 Vorschaukacheln gleichzeitig animiert, bevor ein
Motiv gewählt wird. Der Animationsschalter und reduzierte Bewegung gelten für alle.

Lokale Einstellungen werden explizit von V1/V2 nach V3 migriert: `banner` als
geschlossene Kennung oder `none`, `bannerAnimation` als Boolean. Bestehende Nutzer
behalten ihre Wahl und beginnen ohne Banner. Die Auswahl ist vom Farbschema getrennt.
Zurücksetzen, Speichern und Fenstersynchronisierung laufen über AppearanceProvider.
Weniger Bewegung pausiert, Zierbilder aus/hoher Kontrast/Sparmodus blenden den
Header-Schmuck aus. Eine Erklärung im Menü macht Vorrangregeln sichtbar.

Motive: Mondburg, Glühwald, Drachenberge, Himmelsinseln, Kristallhöhle;
Luftschiffhafen, Uhrwerkstadt, Stahlwerk, Wüstenexpress, Eiswacht;
Neonregen, Dachgärten, Biolabor, Datenstrom, Tiefseestation;
Sonnenraster, Pastellpalmen, Raketenhafen, Orbitalring, Geisterstadt.

Abnahme: Migration und striktes Lesen der Einstellungen; Auswahl aller 20 Motive,
Neuladen, Ausschalten, Bewegungsvorrang und Tastaturbedienung im Browser;
Header bei schmaler und breiter Ansicht; Typprüfung, Build und Projektgates.

Browserabnahme: Der Einstellungs-Zahnradknopf öffnet die Einstellungen, er ist
kein Schließen-Umschalter. Der Bedienbarkeitstest verlässt die Seite deshalb über
die vorhandene Kampagnenübersicht und öffnet sie erneut über das Zahnrad. Der
Galeriebeleg wird bei genügend Fensterhöhe aufgenommen, damit der vorhandene
scrollende Inhaltsbereich die Vorschaukacheln nicht im Screenshot abschneidet.

# Figuren, Vorlagen und Inventar

Unter **Tisch → Figuren & Inventar** verwaltet die Spielleitung Figuren und
Gegenstände. Alle Änderungen werden in der Kampagnendatenbank gespeichert.

## Eine Begleitung gemeinsam führen

1. In **Figurvorlagen** eine Vorlage mit Namen, Art und Anfangswerten speichern.
   Ihr Regelpaket muss beim Erschaffen einer Figur das aktive Kampagnenpaket sein.
2. Unter **Figuren & Besitz** aus dieser Vorlage eine Figur erschaffen und oben
   als handelnde Figur auswählen. Jede Instanz erhält einen eigenen Bogen.
3. Einen Änderungsgrund eintragen, ein Mitglied auswählen und **Kontrolle
   erlauben**. Mehrere Mitglieder können dieselbe Figur führen.
4. Unter **Gegenstandsvorlagen** einen Gegenstand beschreiben und anschließend
   aus der Vorlage zum Inventar der Figur oder zum Vorrat der Spielleitung hinzufügen.
5. Menge, Notizen und Ausrüstung bearbeiten. Die Spielleitung kann den
   gespeicherten Gegenstand mit Begründung einer anderen Figur zuordnen.

Revisionen einer Vorlage verändern vorhandene Instanzen nicht. Änderungen an
Figuren und Gegenständen verlangen den erwarteten Versionsstand; eine parallele
Änderung wird als Konflikt angezeigt. Aktuelle Daten können ausdrücklich
übernommen werden. Archivierte Figuren erhalten keine neuen Handlungen;
historische Würfe, Vorlagenrevisionen und Änderungsbelege bleiben erhalten.

## Handeln und Wissen

**Handelnde Figur** bestimmt den Bogen und die Handlungen am Tisch.
**Wissensblick** bestimmt das Figurenwissen in Chronik, Atlas und empfangenen
Briefen. Die Kontrolle über mehrere Figuren vereinigt ihr Wissen nicht.
Ein Kontrollgrant erlaubt ausdrücklich auch den Wissensblick und den Zugriff
auf bereits empfangene Briefe dieser Figur. Der Entzug entfernt diesen Zugriff
bei der nächsten serverseitigen Prüfung; ein offener Client erhält die Änderung
über seine Live-Verbindung.

Die Spielleitung kann Figuren am Tisch verwalten, benötigt zum Lesen ihrer
privaten Korrespondenz aber ebenfalls einen ausdrücklichen Kontrollgrant. Ihre
Chronik bleibt die Ansicht der Spielleitung; deshalb heißt ihre Auswahl
**Brieffigur**. Artikelverknüpfungen an Figuren und Gegenständen erscheinen einem
Spieler nur, wenn der Artikel in seinem aktuellen Wissensblick verfügbar ist.

Inventarwerte beschreiben Besitz und Zustand. Sie lösen keine automatischen
Regelmodifikatoren aus. Verschachtelte Behälter sind noch nicht implementiert.

## Speicherung und Nachweise

Migration010 ergänzt die veröffentlichten Kernverträge um Figurenprofile,
Kontrollgrants, Leserperspektiven, Vorlagenrevisionen, Gegenstände und dauerhafte
Änderungsbelege. Bestehende Spielerbindungen werden ausdrücklich übernommen;
spätere Autorisierung stützt sich auf aktive Mitgliedschaft und Grants.

Der native [Formatvertrag v2](CAMPAIGN_FORMAT_V2.md) nimmt diese Objekte vollständig
auf. V1 bleibt lesbar und unverändert; das [Restore-Werkzeug](CAMPAIGN_RESTORE.md)
verlangt für die Übernahme einer alten Datei `--upgrade-from-v1` und liefert
einen deterministischen Upgradebericht.

Die automatisierten Browserabläufe prüfen echte PostgreSQL-Daten mit drei
getrennten Lesern: Vorlage und Instanz, geteilte Kontrolle, getrennter
Wissensblick, Bogen und Inventar, Kontrollentzug und nativer Download. Drei
zusätzliche Browserregressionen prüfen Entwurfsschutz bei erneuter Auswahl,
neuem Inventar, verspäteten Speicherantworten, weiteren Kontrollgrants und
verzögert geladenem Wissensblick. Ein vierter Test schützt neue Vorlagenentwürfe
vor verspäteten Antworten eines bereits verlassenen Editors. Der aktuelle Gesamtprüfstand steht in
[STATUS.md](../STATUS.md).

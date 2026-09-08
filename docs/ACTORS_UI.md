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

## Vorlagen freigeben, Anträge entscheiden

Spieler legen ihre Figur selbst an — die Spielleitung entscheidet, aus welchem Material und ob
daraus eine Figur wird.

1. **Freigeben.** In **Figurvorlagen** (in der Schmiede, oder unter Tisch → Figurvorlagen, wo
   die Schmiede fehlt) trägt jede Vorlage den Schalter **Für Spieler freigeben** bzw.
   **Freigabe entziehen**. Erst eine freigegebene Vorlage taucht in der Auswahl eines Spielers
   auf; ohne sie beantwortet der Server einen Antrag darauf mit „nicht verfügbar". Die Freigabe
   ist widerrufbar und trägt ihre **eigene** Version, die mit jedem Umlegen steigt. Der Schalter
   liest sie aus dem Feld `freigabe` der Vorlagenkarte (`GET /actor-templates`) — geraten wird
   sie nicht, sonst wäre die Zahl nach dem ersten Entzug dauerhaft falsch.
2. **Entscheiden.** Der Reiter **Anträge** unter Tisch → Figuren & Inventar führt die offenen
   Anträge. Jede Karte nennt Name, Vorlage mit Revision und die **Abweichung** von den
   Vorlagenwerten — ohne sie bestätigte die Spielleitung einen Namen, aber nicht die Werte, die
   dabei entstehen. **Bestätigen** erschafft die Figur, **Ablehnen** verlangt einen Grund, den
   der Antragsteller zu sehen bekommt.
3. **Was bei der Bestätigung geschieht.** Die Figur entsteht über denselben
   `actor.instantiate`-Befehl wie jede andere: der Bogen kommt aus der beantragten
   Vorlagenrevision, darüber die bestätigten Abweichungen, und der Antragsteller erhält genau
   einen Kontrollgrant. Es gibt zu keinem Zeitpunkt eine unbestätigte Figur.

Anträge tragen wie alle anderen Änderungen einen erwarteten Versionsstand: entscheiden zwei
Spielleitungen gleichzeitig, gewinnt die erste, und die zweite bekommt den Hinweis, die Liste
neu zu laden. Ein Freigabeentzug zwischen Antrag und Entscheidung lässt den Antrag offen und
sichtbar — bestätigen lässt er sich erst wieder, wenn die Freigabe erneuert ist. Wechselt die
Kampagne zwischenzeitlich ihr Regelpaket, entsteht aus dem Antrag keine Figur.

Die Spielersicht dieser Fläche steht in [Ich — die eigene Figur](ICH.md).

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

Migration 028 ergänzt `figurvorlagen_freigaben`, `figurantraege` und den unveränderlichen
Beleg `figurantrag_events`; der [Formatvertrag v17](CAMPAIGN_FORMAT_V17.md) nimmt sie auf.
Keine eingefrorene Tabelle wird dafür angefasst, und `authorizeActor` bleibt unverändert.

Die automatisierten Browserabläufe prüfen echte PostgreSQL-Daten mit drei
getrennten Lesern: Vorlage und Instanz, geteilte Kontrolle, getrennter
Wissensblick, Bogen und Inventar, Kontrollentzug und nativer Download. Drei
zusätzliche Browserregressionen prüfen Entwurfsschutz bei erneuter Auswahl,
neuem Inventar, verspäteten Speicherantworten, weiteren Kontrollgrants und
verzögert geladenem Wissensblick. Ein vierter Test schützt neue Vorlagenentwürfe
vor verspäteten Antworten eines bereits verlassenen Editors. Der aktuelle Gesamtprüfstand steht in
[STATUS.md](../STATUS.md).

Ein zweiter Browserablauf in `e2e/actors.spec.ts` prüft den Figurantrag von der anderen Seite:
die Freigabe über den Schalter an der Vorlage, die Sichtbarkeit für einen Spieler erst danach,
die Abweichung auf der Antragskarte und die Bestätigung samt entstandenem Bogen.
`packages/server/test/figurantrag-http.test.ts` prüft dieselben Routen ohne Browser, samt der
Abbildung von Konflikt, Nichtverfügbarkeit und Eingabefehler.

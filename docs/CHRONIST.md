# Chronist: Quellen prüfen und Vorschläge übernehmen

Im Wiki öffnet **Chronist** die drei Aufgaben **Prosa prüfen**, **Sitzung auswerten**
und **Abriss erstellen**. Wähle die gespeicherten Passagen, dann **Umfang und Kosten
vorschauen**. Die Vorschau zeigt genau die Quellen des Laufs. Ein externer Anbieter
benötigt vor dem Start die ausdrückliche Freigabe dieser Quellen.

Unter **Läufe & Durchsicht** stehen Fortschritt, belegtes Budget, bekannte Ausgaben
und Vorschläge. Du kannst Vorschläge bearbeiten, verwerfen oder als Antrag in einen
neuen beziehungsweise vorhandenen Wiki-Artikel einreichen. Erst die getrennte
Ratifikation kann daraus Kanon machen. Wenn eine Quelle zwischenzeitlich geändert
wurde, ist eine neue Auswahl und Vorschau erforderlich.

Sitzungsnotizen verwenden den normalen Wiki-Editor. Szenenangaben und bestätigte
Würfe werden erst durch ausdrückliche Übernahme und Speichern zur Notiz. Tischchat
wird nicht mitgeschrieben. Ohne Modell laufen weiterhin die vorhandenen Regelprüfungen;
Modellarbeit pausiert mit einem sichtbaren Hinweis.

## Lokales Modell

Der Host liest beim Start die installierten Modellnamen eines laufenden Ollama unter
`http://127.0.0.1:11434/api/tags`. Er lädt keine Modelle herunter und sendet dabei keine
Quellen. Nach Einrichtung beziehungsweise Modellwechsel den lokalen Atlas-Host
beenden und neu starten. Dann im Chronisten die Verfügbarkeit neu prüfen.

Für einen anderen lokalen Endpunkt oder feste erlaubte Modelle verwende eine
Betreiberdatei. Beispiel `C:\Atlas\chronist.json`:

```json
{
  "schemaVersion": 1,
  "globalConcurrency": 2,
  "providers": [
    {
      "id": "ollama",
      "label": "Ollama auf diesem Rechner",
      "profileId": "ollama-chat-1",
      "location": "lokal",
      "baseUrl": "http://127.0.0.1:11434",
      "models": ["DEIN_INSTALLIERTES_MODELL"]
    }
  ]
}
```

`models` enthält die tatsächlichen Modellnamen des eingerichteten Servers. Die
Umgebungsvariable `CHRONICLE_CHRONIST_CONFIG` benennt den vollständigen Dateipfad
beim Start von Atlas. Dieselbe Datei funktioniert im Selbstbetrieb und im Desktop.
Änderungen werden nach Neustart des Hosts wirksam. Relative Pfade werden abgewiesen.

Ohne Betreiberdatei fragt der Host beim Start `http://127.0.0.1:11434/api/tags` ab und
übernimmt die gefundenen Modellnamen. Mit Betreiberdatei gilt dasselbe für den dortigen
Ollama-Eintrag, solange er noch den Platzhalter „Kein lokales Modell eingerichtet" trägt:
dann fragt der Host die `baseUrl` genau dieses Eintrags ab und trägt die installierten
Modelle ein. Ein Eintrag mit konkreten Modellnamen bleibt unangetastet; für ihn wird nichts
abgefragt. Es gibt kein fest eingebautes lokales Standardmodell. Ist kein Ollama erreichbar,
bleibt der Eintrag mit dem Platzhalter sichtbar nicht verfügbar. Abgefragt werden nur
Loopback- oder ausdrücklich private Adressen; Weiterleitungen werden nicht verfolgt.

Der Platzhalter ist dabei das Signal, nicht das Feld `available`: Werden für einen Eintrag mit
Platzhalter Modelle gefunden, wird er verfügbar, auch wenn in der Datei `"available": false`
steht. Willst du einen lokalen Anbieter dauerhaft stilllegen, trage statt des Platzhalters
deinen Modellnamen ein und setze `"available": false`, oder entferne den Eintrag; für einen
Eintrag mit konkretem Modell wird weder abgefragt noch etwas überschrieben. Die Betreiberdatei
selbst wird nie geschrieben.

Eine HausKI kann `openai-chat-1` verwenden. Bei privatem Betrieb ist `location` gleich
`lokal`; als Adresse sind ausdrücklich konfigurierte private numerische IPv4-Adressen
oder IPv6-ULA sowie Loopback zulässig. Ein DNS-Name allein belegt keine lokale Grenze.
Für öffentliche Ziele sind HTTPS und `location: "fremd"` erforderlich.

## Externer Anbieter

Diese HTTP-Profile sind implementiert. Konfiguriere ausschließlich Modellnamen, die
dein Anbieter für das gewählte strukturierte Antwortformat bereitstellt.

| Profil | Basisadresse | Antwortformat |
|---|---|---|
| `openai-responses-1` | `https://api.openai.com/v1` | Responses, JSON-Schema, Speicherung abgeschaltet |
| `anthropic-messages-1` | `https://api.anthropic.com/v1` | Messages, JSON-Schema |
| `anthropic-messages-2` | `https://api.anthropic.com/v1` | Messages, JSON-Schema, `thinking` ausgeschaltet |
| `google-generate-1` | `https://generativelanguage.googleapis.com/v1beta` | GenerateContent, JSON-Schema |
| `openai-chat-1` | Vom Betreiber eingerichtet, einschließlich API-Basispfad | OpenAI-kompatibles Chat-JSON-Schema |

Beispiel für einen zusätzlichen Eintrag in `providers`:

```json
{
  "id": "mein-openai",
  "label": "OpenAI",
  "profileId": "openai-responses-1",
  "location": "fremd",
  "baseUrl": "https://api.openai.com/v1",
  "models": ["DEIN_FREIGEGEBENES_MODELL"],
  "apiKeyEnv": "CHRONICLE_CHRONIST_KEY_OPENAI"
}
```

Für Anthropic ist `anthropic-messages-2` das empfohlene Profil: identisch zu
`anthropic-messages-1`, zusätzlich mit ausgeschaltetem `thinking`. `anthropic-messages-1`
bleibt unverändert erhalten, damit ältere Läufe byteweise nachvollziehbar bleiben. Standard
ist `claude-sonnet-5`, als Sparmodus `claude-haiku-4-5`; beide ohne Datumssuffix.

```json
{
  "id": "anthropic",
  "label": "Anthropic",
  "profileId": "anthropic-messages-2",
  "location": "fremd",
  "baseUrl": "https://api.anthropic.com/v1",
  "models": ["claude-sonnet-5", "claude-haiku-4-5"],
  "apiKeyEnv": "CHRONICLE_CHRONIST_KEY_ANTHROPIC",
  "pricing": {
    "currency": "USD",
    "asOf": "2026-09-08",
    "inputMicrosPerMillion": 2000000,
    "outputMicrosPerMillion": 10000000
  }
}
```

Die Tarife sind USD-Micros je Million Tokens, Stand 2026-09-08: `claude-sonnet-5` 2 000 000
Eingabe und 10 000 000 Ausgabe, `claude-haiku-4-5` 1 000 000 Eingabe und 5 000 000 Ausgabe.
Ein Tarif gilt je Anbietereintrag; für getrennte Tarife lege zwei Einträge mit eigenen IDs an.
Der Desktop legt genau das an: `anthropic` mit `claude-sonnet-5` und `anthropic-haiku` mit
`claude-haiku-4-5`, beide mit demselben Schlüsselnamen. Ein gespeicherter Schlüssel macht damit
beide verfügbar; ohne Schlüssel bleiben beide sichtbar nicht verfügbar.

Setze den Schlüssel im Betriebssystem unter dem ausdrücklich genannten Variablennamen,
bevor Atlas startet. Der Desktop gibt ausschließlich eigene Schlüsselvariablen mit
Präfix `CHRONICLE_CHRONIST_KEY_` an seinen privaten Host weiter. Allgemeine Account-,
Tracing-, Node- oder Datenbankvariablen werden nicht übernommen. Im Selbstbetrieb
wird ebenfalls nur der in der Datei ausdrücklich benannte Schlüssel gelesen.
Alternativ ist `apiKey` direkt in der lokalen Betreiberdatei möglich; verwende genau
eine der beiden Varianten und halte diese Datei außerhalb von Git und Kampagnenexports.

Ein eingerichteter Schlüssel erlaubt noch keinen Quellenversand: Die Freigabe erfolgt
für jeden Lauf und jede externe Fortsetzung in der Chronist-Oberfläche. Providerlisten
und Fehler enthalten keine Schlüssel. Es gibt keine automatische Anbieterumschaltung,
keine Werkzeuge und keine Modellanfragen zur Schlüsselprüfung.

Tarife sind optional. Ohne eingetragenen Tarif werden Kosten als unbekannt angezeigt.
`pricing` enthält `currency` (z. B. `EUR`), `asOf` (`YYYY-MM-DD`) sowie
`inputMicrosPerMillion` und `outputMicrosPerMillion`. Eine Mikroeinheit entspricht
einem Millionstel der angegebenen Währung. Preise werden nur anhand gemeldeter Tokens
geschätzt; fehlende oder unvollständige Verbrauchsdaten bleiben als solche erkennbar.
Die Konfiguration enthält keine automatisch gepflegte Preisliste.

## Desktop

Im Verwaltungsfenster des Desktops trägst du unter **Chronist-Schlüssel** je Welt einen
Anthropic-Schlüssel ein. Er wird mit dem Windows-Geheimnisspeicher verschlüsselt als
`chronist-key.dpapi` im Profil dieser Welt abgelegt, nie im Klartext. **Speichern** ersetzt
einen vorhandenen Schlüssel, **Entfernen** löscht die Datei. Das Feld ist maskiert und wird
vor dem Absenden geleert; der gespeicherte Wert wird nie zurückgegeben. Das Verwaltungsfenster
zeigt ausschließlich, ob ein Schlüssel gesetzt ist.

Beim ersten Start der Welt nach dem Speichern legt der Desktop im Profil einmalig die
Betreiberdatei `chronist-providers.json` an: den lokalen Ollama-Endpunkt sowie zwei Anthropic-
Einträge im Profil `anthropic-messages-2`, beide mit `apiKeyEnv: "CHRONICLE_CHRONIST_KEY_ANTHROPIC"`
— `anthropic` mit `claude-sonnet-5` (2 000 000 / 10 000 000) und `anthropic-haiku` mit
`claude-haiku-4-5` (1 000 000 / 5 000 000), Tarife in USD-Micros je Million. Diese Werte sind
dieselben, die der Host als Vorgabe kennt; die Datei ist keine zweite, getrennt gepflegte Liste.
Die Datei enthält keinen Schlüssel und wird nie überschrieben; deine Änderungen bleiben also
erhalten. Beim Start entschlüsselt der Desktop den Schlüssel und reicht ihn als
`CHRONICLE_CHRONIST_KEY_ANTHROPIC` zusammen mit dem absoluten Pfad dieser Datei in
`CHRONICLE_CHRONIST_CONFIG` allein an den privaten lokalen Host weiter; eine geerbte Variable
gleichen Namens wird ersetzt. Ein selbst gesetztes `CHRONICLE_CHRONIST_CONFIG` hat Vorrang.

Solange kein Schlüssel gespeichert ist, entsteht keine Datei und der Host erkennt lokale
Ollama-Modelle selbst. Mit Datei bleibt diese Erkennung erhalten, solange der Ollama-Eintrag
den Platzhalter „Kein lokales Modell eingerichtet" trägt: der Host fragt dann die `baseUrl`
dieses Eintrags ab und trägt die installierten Modelle ein, ohne die Datei zu ändern. Trägst
du dort selbst Modellnamen ein, gelten genau diese und es wird nichts abgefragt. Ein Anbieter-,
Schlüssel- oder
Dateiwechsel verlangt einen Neustart der Welt: Ein laufender Host behält die Umgebung, mit
der er gestartet wurde. Ohne verfügbaren Windows-Geheimnisspeicher wird nichts gespeichert;
die Meldung ist dieselbe wie bei der Ersteinrichtung. Der Schlüssel erscheint nicht in
Statusmeldungen, Fehlertexten, Logs, Deskriptoren, Kampagnenexports oder der Spieloberfläche.

## Unterbrechung und Sicherung

Abbrechen stoppt neue Anfragen und verbucht bereits bekannte Ergebnisse. Bei einem
ungewissen Ausgang kann der Anbieter die Anfrage bereits ausgeführt haben. Die
gebuchte Reserve bleibt sichtbar; Fortsetzen verlangt eine neue bewusste Entscheidung.
Es gibt keinen automatischen Neuversand nach Timeout oder Hostneustart.

Native V16 sichert Quellen, Vorschläge, menschliche Entscheidungen, Verbrauch und
Graphzustand. Wiederherstellung startet keinen Lauf. Laufzeitbesitz wird ungültig
gemacht, während ursprüngliche Requests, Quittungen und Callhistorien erhalten bleiben.
Providerdatei und Schlüssel gehören zur Hosteinrichtung und sind kein Kampagneninhalt.

Die HTTP-Adapter sind mit aufgezeichneten Antworten und lokalen Streaming-Servern
geprüft; dies behauptet keine Live-Abnahme jedes konkreten Anbietermodells.
CLI-Anbieter werden erst nach gesondertem Nachweis ihrer Werkzeug-, Kontext-,
Abbruch- und Verbrauchsgrenzen freigegeben; deren vollständige Abnahme läuft noch.
Codex- und Gemini-CLI bleiben deshalb `capability-unverified` und damit nicht verfügbar.

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

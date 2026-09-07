# Der Chronist: ein Agent, der Anträge stellt und niemals Kanon schreibt

Stand 2026-09-07. Entwurf. Die offenen Entscheidungen hat Kaya an den Verfasser delegiert mit der
Vorgabe, jeweils die allgemeinste tragfähige Variante zu nehmen.

## Ausgangslage

Zwei Befunde bestimmen den Zuschnitt, und beide verschieben die ursprüngliche Frage.

**Der Zeitstrahl wird bereits gebaut, und zwar ohne Modell.** `packages/server/src/domain/zeitleiste.ts`
errechnet Ereignisse aus zwei Beständen, die es ohnehin gibt: den Datumsfeldern der Passagen und den
bestätigten Prägungen (`confirmed_mints`). Der Kommentar dort ist ausdrücklich: *„Keine neue Tabelle,
kein von Hand gepflegter Strang."* Ein Agent, der „den Zeitstrahl erstellt", würde eine nachvollziehbare
Rechnung durch eine unzuverlässige Vermutung ersetzen. Der Agent ergänzt sie, er ersetzt sie nicht.

**Das Projekt verbietet automatischen Kanon.** `packages/chronik/src/model.ts` modelliert `Quelle` als
geschlossene Menge mit der Begründung *„Nichts wird automatisch Kanon"*, und `Geltung` kennt die Stufen
`notiz | antrag | kanon`. Ein Agent, der Kanon erzeugt, wäre kein Feature, sondern ein Bruch der
Grundarchitektur. Ein Agent, der **Anträge** stellt, benutzt einen Weg, den das Modell bereits kennt.

## Ziel

Ein Agent, der aus Wiki und Spielrunde Vorschläge für die Chronik erarbeitet, jeden Vorschlag mit der
Textstelle belegt, aus der er stammt, und die Entscheidung darüber einem Menschen überlässt. Die
Zeitleiste ist die erste Art von Vorschlag, nicht die einzige mögliche — der Kanal ist allgemein.

## Was ohne Modell geht, geht ohne Modell

Von den vier gewünschten Aufgaben brauchen zwei gar kein Sprachmodell, und es sind die, die am
schnellsten Wert liefern:

| Aufgabe | Weg | Begründung |
|---|---|---|
| Widersprüche und Lücken | **nur Regelwerk** | Tod vor Geburt, zwei Jahre für dieselbe Gründung, ein Jahrhundert ohne Ereignis — Vergleiche über strukturierte Daten. Ein Modell wäre hier schlechter: nicht reproduzierbar, kostenpflichtig, und es kann einen Widerspruch erfinden. Bei einem Prüfwerkzeug ist ein Fehlalarm teurer als ein übersehener Fall. |
| Daten aus Prosa | **Regelwerk zuerst, Modell für den Rest** | „im Jahr 812" ist ein Muster; die vorhandenen `DATUMSFELDER` sind bereits Regex. Was Muster nicht können, ist der zweite Schritt bei „drei Jahre nach dem Fall von Mowach": das genannte Ereignis auflösen und rechnen. |
| Mitschreiben aus der Sitzung | **Modell** | Aus Tischchat, Szenen und Würfen ein Ereignis verdichten ist Verstehen, nicht Erkennen. |
| Erzählerischer Abriss | **Modell** | Vorlagen lesen sich wie Vorlagen. |

Daraus folgt die wichtigste Eigenschaft des Entwurfs: **das Regelwerk läuft immer zuerst und ist der
Prüfstein für das Modell.** Wo eine Regel ein Datum sicher erkennt und das Modell etwas anderes
behauptet, wird der Fund verworfen und die Abweichung gezählt. Das ergibt eine laufende
Vertrauensmessung ohne einen einzigen von Hand geschriebenen Testfall.

## Zuschnitt: ein angestoßener Lauf

Der Agent läuft, wenn ein Mensch ihn anstößt — „Chronik durchsehen" oder „Sitzung auswerten" —, nicht
fortlaufend bei jedem Speichern. Drei Gründe:

1. Egress geschieht dann, wenn jemand ihn auslöst, mit sichtbarer Kostenschätzung davor. Das ist die
   Bedingung, unter der fremde Modelle überhaupt erlaubt sind.
2. Der Speicherpfad bleibt deterministisch und schnell. Ein Modellaufruf darin wäre ein Rückschritt.
3. Ein Dauerstrom von Anträgen wird nicht durchgesehen. Ein Stapel nach der Sitzung schon.

## Architektur

### Ein eigenes Paket

`packages/chronist/` — der Graph und die Anbietergrenze. Kein Datenbankzugriff, keine Fastify-Route:
das Paket bekommt Passagen herein und gibt Vorschläge heraus. Damit ist es ohne Datenbank und ohne
Netz testbar, und die Grenzregeln aus `tools/gate-boundaries.mjs` bleiben scharf.

Der Server hält die Effekte: `packages/server/src/domain/chronist.ts` (Lauf anlegen, Wissensgrenze,
Persistenz) und `packages/server/src/http/chronist.ts` (Routen).

### Der Graph

`@langchain/langgraph` in TypeScript, gepinnt auf `>=1.4,<2` (gemessen 2026-09-07: 1.4.14) — dieselbe
1.x-Linie wie der Python-Pin der globalen Regel. Der StateGraph läuft im Server-Prozess: kein zweiter
Laufzeit-Stack, den die Electron-Auslieferung (`packages/desktop`) mitschleppen müsste.

Knoten:

```
sammeln → regelwerk → ┬→ prosa    ─┐
                      ├→ sitzung  ─┼→ verifizieren → antrag
                      └→ abriss   ─┘
```

- **sammeln** — die Passagen des Laufs, bereits durch die Wissensgrenze gefiltert.
- **regelwerk** — deterministisch: Datumsfelder, Widersprüche, Lücken. Erzeugt schon hier Vorschläge
  und legt die Prüfwerte für den nächsten Schritt an.
- **prosa / sitzung / abriss** — Fan-out über die Einheiten, je ein Modellaufruf, parallel begrenzt.
- **verifizieren** — jeder Fund gegen das Regelwerk: Widerspricht er einem sicher erkannten Datum?
  Nennt er eine Passage, die es im Lauf gibt? Liegt das Jahr im Bereich der Welt? Was durchfällt,
  wird verworfen und gezählt, nicht abgeschwächt.
- **antrag** — die überlebenden Funde werden Vorschläge in der Datenbank.

Ein Checkpointer sichert den Lauf: ein Abbruch über hundert Artikel beginnt nicht von vorn. LangSmith
bleibt aus (`LANGSMITH_TRACING` / `LANGCHAIN_TRACING_V2` nie auf `true`) — kein stilles Egress.

### Die Anbietergrenze

Eine Schnittstelle, mehrere Implementierungen. Sie unterscheidet zwei Achsen, und nur eine davon
interessiert die Richtlinie:

- **Ort** — `lokal` oder `fremd`. Das ist die Richtliniengrenze.
- **Transport** — HTTP oder Unterprozess. Das ist Implementierungsdetail.

| Implementierung | Ort | Transport | Verfügbar |
|---|---|---|---|
| `ollama` | lokal | HTTP an `localhost` | überall |
| `hauski` | lokal | HTTP an eine konfigurierte Adresse | sobald es sie gibt — nur eine Adresse plus Schlüssel, kein neuer Code |
| `cli` (`codex`, `claude`, `gemini`) | fremd | Unterprozess | **nur Desktop und Selbstbetrieb** |
| `api` (Anthropic, OpenAI, Google) | fremd | HTTPS | überall, wo ein Schlüssel hinterlegt ist |

Die CLI-Variante ist bewusst nicht der Hauptweg: der gehostete Serverbetrieb hat diese Programme nicht
installiert, keine angemeldete Sitzung und darf keine beliebigen Unterprozesse starten. Auf deiner
Maschine ist sie bequem und wird unterstützt; das Produkt darf nicht von ihr abhängen.

Die HausKI ist damit **kein späterer Umbau**, sondern ein Eintrag in einer Tabelle.

## Egress und Freigabe

Voreinstellung ist `lokal`. Ein Lauf gegen einen fremden Anbieter verlangt eine ausdrückliche Freigabe
der Spielleitung je Lauf, und die Freigabemaske zeigt vorher **was genau hinausgeht**: die Zahl der
Passagen, die Zahl der Zeichen und die Titel der betroffenen Artikel. Nicht „ein Modell wird befragt",
sondern die Liste.

Der Lauf schreibt mit, was er getan hat: Anbieter, Ort, Zeichen hinaus, Zeichen herein, Dauer, Kosten.
Diese Zeilen sind der Beleg dafür, dass die Zusage der Anwendung eingehalten wurde, und sie überleben
den Lauf.

## Datenmodell

Zwei neue Tabellen, bewusst als Zwischenlager statt als Eingriff ins Wiki:

- **`chronist_laeufe`** — ein Lauf: Kampagne, Auslöser, Anlass (`wiki` | `sitzung`), Anbieter, Ort,
  Freigabe, Zeitpunkte, Verbrauch, Zustand.
- **`chronist_vorschlaege`** — ein Vorschlag: Lauf, Art (`ereignis` | `widerspruch` | `luecke` | `abriss`),
  die **Quellpassage**, der vorgeschlagene Inhalt, der Prüfbefund des Regelwerks, das Modell, und der
  Ausgang (`offen` | `angenommen` | `verworfen`) samt entscheidender Person.

Das Wiki bleibt unberührt, bis ein Mensch einen Vorschlag annimmt. Erst dann läuft die Änderung über
den **vorhandenen** Speicherpfad — als Bearbeitung dieses Menschen, mit dessen Urheberschaft. Der Agent
erhält keinen eigenen Weg an `confirmed_mints` und keine neue `kind`-Ausprägung; die geschlossene Menge
dort bleibt unangetastet.

**Die Wissensgrenze erbt sich.** Ein Vorschlag ist genau für die Person sichtbar, die seine Quellpassage
hält. Damit gilt für den Chronisten dieselbe Regel wie für alles andere, ohne eine zweite Durchsetzung.

### Die fünf Stellen

Eine neue Tabelle verlangt in diesem Repo fünf Eintragungen, sonst bricht still der Export, der
Restore oder das Löschen:

1. Migration (die nächste freie Nummer; zum Zeitpunkt dieses Entwurfs wäre das 021 — vor der Umsetzung
   prüfen, der parallel arbeitende Zweig vergibt ebenfalls Nummern).
2. Eine neue Bundle-Generation `packages/io/src/native-v11/`, additiv auf v10. Niemals ins eingefrorene
   v1-Profil schreiben.
3. Verdrahtung in `packages/io/src/index.ts` und `server/src/domain/bundles.ts` (`formatVersion`).
4. `restoreOrder` — Wächter: `test/restore-order.test.ts`.
5. `deletion.ts` — Wächter: `test/deletion.test.ts`.

Offene Vorschläge sind Arbeitsstand, kein Weltinhalt. Sie wandern trotzdem ins Paket: ein Backup, das
den halb durchgesehenen Stapel verliert, verliert Arbeit.

## Kosten

Vor dem Lauf eine Schätzung aus Zeichenzahl und Anbieter-Tarif, nach dem Lauf der Istwert im
Laufprotokoll. Ein Lauf hat eine harte Obergrenze (Zahl der Aufrufe und Zeichen); wird sie erreicht,
endet der Lauf geordnet mit dem, was er hat, statt weiterzulaufen. `metering.ts` bleibt unberührt — es
misst Raumstunden und ist ausdrücklich kein Ledger; die Chronistenkosten stehen am Lauf.

## Fehlerfälle

- **Modell nicht erreichbar** (Ollama aus, CLI fehlt, Schlüssel ungültig) → der Lauf endet mit dem
  Ergebnis des Regelwerks. Widersprüche und Lücken kommen auch ohne Modell, und das ist der Grund,
  warum das Regelwerk zuerst läuft.
- **Modell antwortet unbrauchbar** (kein gültiges Schema) → einmal wiederholen, dann diese Einheit
  überspringen und im Protokoll zählen. Kein Erraten.
- **Fund widerspricht dem Regelwerk** → verworfen, gezählt. Nicht als „unsicher" durchgereicht.
- **Fund nennt keine Passage des Laufs** → verworfen. Ein Vorschlag ohne Beleg ist in dieser Anwendung
  nicht prüfbar.
- **Lauf abgebrochen** → der Checkpointer trägt den Wiederaufnahmepunkt; ein zweiter Anstoß setzt fort.
- **Zwei Läufe gleichzeitig** → je Kampagne läuft einer. Der zweite wird abgewiesen, nicht eingereiht.

## Tests

- **Regelwerk vollständig testgetrieben**, ohne Modell: Widersprüche, Lücken, Prosa-Datumsmuster.
- **Kein Test ruft ein Modell.** Die Anbietergrenze wird gegen aufgezeichnete Antworten geprüft; der
  Aufzeichner ist ein eigenes Werkzeug, kein Testlauf.
- **Der Prüfstein als Test:** Regelwerk und aufgezeichnete Modellantworten laufen über denselben
  Korpus; die Abweichungsquote wird **festgehalten**, nicht auf null behauptet. Steigt sie, fällt es auf.
- **Ein Egress-Test**, der belegt, dass bei Anbieter `lokal` keine Verbindung nach außen aufgebaut wird.
- **Ein Wissensgrenzen-Test** in der Bauart von `wiki-uebersicht.test.ts`: ein Vorschlag aus einer
  Passage, die die Spielerin nicht hält, erscheint in ihrer Antwort nicht — belegt am Antwortkörper.
- **e2e:** Lauf anstoßen, Freigabemaske mit der Liste, Stapel durchsehen, einen Vorschlag annehmen,
  die Änderung im Artikel wiederfinden.

## Ausbaustufen

1. **Regelwerk und Kanal** — Tabellen, Widersprüche, Lücken, Prosa-Datumsmuster, Durchsicht-Oberfläche.
   Nach dieser Stufe hat der Chronist Wert, ohne dass je ein Modell befragt wurde.
2. **Der Graph und der lokale Anbieter** — LangGraph, Ollama, Prosa-Auflösung und Sitzungsmitschrift.
3. **Fremde Anbieter** — Freigabemaske, Schlüsselverwaltung, Kostenanzeige, CLI-Variante für Desktop
   und Selbstbetrieb.
4. **Der Abriss** — erzählerische Zusammenfassung als eigene Vorschlagsart.

Die Stufen sind Reihenfolge, nicht Umfang: der Entwurf ist einer, gebaut wird in dieser Folge, weil
jede Stufe für sich benutzbar ist.

## Nicht im Umfang

Ein Agent, der selbständig schreibt; fortlaufende Analyse im Speicherpfad; Feinabstimmung eigener
Modelle; Vorschläge über die Kampagnengrenze hinweg; Sprachein- und -ausgabe am Tisch.

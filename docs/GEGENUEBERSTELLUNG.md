# Die Gegenüberstellung

Derselbe Artikel nebeneinander für zwei Figuren, Abweichungen markiert. Die Fläche gehört der
Spielleitung; sie ist das billigste Prüfwerkzeug für die Frage, die kein Rivale beantwortet:
*Wer weiß hier eigentlich was?*

Register-Zeile: `Die Gegenüberstellung` (Kategorie `wissen`, Status `unser-champion`,
`design/feature-register.json`).

## Was sie zeigt

Zwei Spalten, eine Kopfzeile, kein weiteres Chrom. Jede Passage trägt ihre Seite:

| Marke | Bedeutung |
|---|---|
| `beide` | Beide Figuren halten diese Passage |
| `nur-links` | Nur die linke Figur hält sie |
| `nur-rechts` | Nur die rechte Figur hält sie |

Was **keine** der beiden Figuren hält, erscheint in keiner Spalte und in keiner Zeile — kein
Platzhalter, kein Zähler, keine benannte Lücke. Das ist dieselbe Existenzgrenze wie im
Einzelbuch (`Kein Nenner`), und der Servertest prüft sie ausdrücklich.

## Warum es ein Serverroundtrip ist

**Grenze B9 — der Projektor ist der Server.** Die Route ruft `projiziereEntry` zweimal, je
einmal mit dem hergeleiteten Wissen einer Figur, und liefert genau diese zwei fertigen
Projektionen. Der Client bekommt keine dritte Sicht und keine Sichtbarkeits-Metadaten, aus
denen er eine rekonstruieren könnte. Ein clientseitiger Filter hätte den Client in den Besitz
zweier Projektionen gebracht, ohne dass der Server beide verantwortet — genau der Bruch, den
B9 verbietet.

## Die Route

```
GET /api/campaigns/:campaignId/entries/:id/gegenueberstellung?links=<actorId>&rechts=<actorId>
```

Antwort: `{ entryId, slug, titel, links: { actorId, name, passagen }, rechts: { … }, zeilen }`.

`zeilen` ordnet nach dem `ord` der **Quelle**, nicht nach dem projizierten `ord`: letzterer wird
pro Spalte neu gezählt, damit keine Leserin Lücken zählen kann. Die Quellordnung ist hier
zulässig, weil die Route der Spielleitung gehört, die das ganze Buch ohnehin hält.

**Es gibt keinen 403.** Falsche Rolle, fremde Figur, fehlender Parameter und nicht vorhandener
Eintrag enden alle in derselben 404-Antwort — byte-identisch. Ein 403 hätte einem Spieler die
Existenz der Route und damit der Fläche bestätigt.

## Der Erfahrungsgrad fehlt, und warum

Die Register-Zeile nennt als dritte Abweichung *„was beide mit verschiedenem Erfahrungsgrad
halten"*. Das ist hier **nicht** geliefert, und der Grund ist keine Auslassung aus Bequemlichkeit:
`revelations` speichert `granted_at`, `granted_by` und `vollmacht_id`, aber **keine `quelle`**
(`packages/server/src/db/migrations/001_initial.sql`). `Erfahrungsgrad` wird laut Modell aus
`Quelle` abgeleitet (`packages/chronik/src/model.ts`) — solange die Quelle nicht persistiert
ist, gibt es nichts abzuleiten. Das ist die eigene Register-Zeile `Die Quelle und der
Erfahrungsgrad` und eine eigene Migration; sie wird hier nicht stillschweigend miterfunden.

## Wo sie in der GUI sitzt

Chronik → Artikel wählen → Werkzeugleiste der Spielleitung → **Gegenüberstellung**. Der Knopf
steht additiv neben `Historie` und `Bearbeiten`; keiner der bestehenden Knöpfe wurde ersetzt
oder verschoben.

## Nachweise

- `packages/server/test/gegenueberstellung.test.ts` — vier Fälle: die zwei Sichten samt Marken,
  die nicht genannte Passage, der byte-identische 404 für Spieler, die fremde Figur.
- `e2e/gegenueberstellung.spec.ts` — der echte Browserpfad: GM legt vier Passagen an, gibt zwei
  Figuren je eine frei, öffnet die Gegenüberstellung, liest beide Spalten und schließt sie
  wieder. Prüft in demselben Lauf, dass `Historie` und `Bearbeiten` weiterhin sichtbar sind.

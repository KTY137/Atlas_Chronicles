# 10 — Hosted-Betrieb und Auslieferung: Befunde und Entwurf

Status: **Befundaufnahme abgeschlossen, Entscheidungen offen**, 2026-09-07.

Dieses Dokument hat zwei Hälften. Die erste ist eine Bestandsaufnahme: was der Server heute
tatsächlich trägt, gegen Fundstellen geprüft. Die zweite ist ein Entwurf für den bezahlten
gehosteten Betrieb und für die Auslieferung — abgeleitet aus dem, was die erste Hälfte
ergeben hat.

Es trifft **keine** der Entscheidungen, die laut
[`iterations/OPEN-DECISIONS.md`](iterations/OPEN-DECISIONS.md) Kaya gehören. Die betroffenen
Punkte stehen gesammelt in §7.

**Methode.** Zehn parallele Leseläufe über den Arbeitsbaum, jeder mit dem Auftrag, jede
Behauptung mit `datei:zeile` zu belegen und Unbelegbares als UNVERIFIED zu markieren. Kein
Lauf durfte schreiben. Die schwerwiegendsten Befunde sind anschließend einzeln
gegengeprüft; wo Gegenprüfung und Bericht auseinandergingen, steht hier das Ergebnis der
Gegenprüfung. Zwei Berichtsaussagen wurden dabei korrigiert (§1.4, §1.3).

**Bewegliches Ziel.** Der Arbeitsbaum enthielt während der Aufnahme unversionierte Arbeit
anderer Sessions; `015_wiki_assets.sql` entstand währenddessen. Angaben zu 014 und 015
beschreiben Arbeitsstände, keine Historie.

---

## 1. Befunde, nach Schwere

### 1.1 Eine Kampagne ist technisch nicht löschbar — doppelt verriegelt

Der schwerwiegendste Befund, und er ist zweifach belegt.

Es existiert **keine Löschfunktion**: kein HTTP-Endpunkt, keine Domänenfunktion, kein CLI.
`campaigns.ts` und `bundles.ts` kennen nur weichen Widerruf über `revoked_at`.

Und roher SQL-Zugriff hilft nicht: über ein Dutzend Historientabellen (`revisions`,
`lineage_events`, `audit`, `confirmed_mints`, `tactical_*`, `betreten_karten` und weitere)
tragen einen bedingungslosen `deny_history_mutation()`-Trigger, der **jedes** DELETE mit
einer Exception abbricht. Der Trigger ist Absicht — er schützt die Unveränderlichkeit der
Chronik. Er macht aber auch die Löschung unmöglich, für die ein bezahlter Dienst haften muss.

Dazu kommt die Gegenrichtung: `events`, `commands` und `audit` wachsen nachweislich
unbegrenzt, ohne jede Aufräumroutine im Code. Für `events`/`event_cursors` gibt es keine
Retention; der Resume-Puffer ist zeitlich unbegrenzt und nur pro Anfrage auf 256 Zeilen
gedeckelt (`communication.ts:105`).

Und der Export deckt die Lücke nicht: `CAMPAIGN_EXCLUDED_TABLES`
(`packages/io/src/campaign-schema.ts:78`) schließt `credentials`, `auth_challenges`, die drei
Beitrittstabellen, den Befehlsbus und die Medienebene aus. Der Kampagnen-Export ist ein Export
der Kampagne, kein Auskunftsersatz für eine Einzelperson.

> **Korrektur 2026-09-07.** Eine frühere Fassung dieses Absatzes zählte `access_incidents` zu
> den ausgeschlossenen Tabellen. Das ist falsch: Sie steht in `CAMPAIGN_TABLES` im Modul
> `evidence` (`campaign-schema.ts:70`) und wird exportiert. Der Irrtum stammt aus einem
> Prüfbericht und wurde ungeprüft übernommen. Er ist folgenreich — siehe §7.1: Weil die
> Tabelle im Format steht, ist jede Änderung ihrer Spalten ein Formatversionssprung.

**Warum das zusammen zählt:** S4 verspricht bezahlte Räume. Ein bezahlter Dienst in
Deutschland braucht eine Löschzusage, die technisch einlösbar ist, und einen Speicher, der
nicht monoton wächst. Beides fehlt heute. Das ist kein Feinschliff, sondern eine
Betriebsvoraussetzung.

### 1.2 Der Zugangsvorfall existiert nur als Schema

`design/08-backend-architektur.md` §3 führt den Zugangsvorfall als getragene Invariante:
Ein Zugriff auf eine offene Tür ohne Credential wird protokolliert, **bevor** die 404 fällt —
damit Aussperrung und Desinteresse trennbar bleiben (W1-Gate).

Die Tabelle existiert (`001_initial.sql:150-154`). Ein Schreibpfad im Produktionscode
existiert **nicht**. Der einzige `INSERT` im gesamten Repo steht in
`packages/server/test/bundles.test.ts:86` und prüft nur den Export/Import-Roundtrip, nicht
die Entstehung. Der Produktionscode berührt die Tabelle ausschließlich beim Export
(`bundles.ts:29`) und beim Sequenz-Reset nach Restore (`bundles.ts:229`).

Die Invariante steht also in der Doku und im Schema, aber nicht im Code.

### 1.3 Grenze B9: der Zwillingsbeweis fehlt, und der §3-Wortlaut gilt nicht mehr überall

Zwei getrennte Feststellungen, beide zur zentralen Sicherheitsaussage des Projekts.

**Der Zwillingsbeweis existiert nicht.** `design/08` §3 nennt ihn als Beleg für B9.
`packages/projection/src/entry.ts:19` sagt im Kommentar wörtlich, „der Zwillingsbeweis testet
genau das über `entryBytes`". Die Funktion ist definiert (`entry.ts:237`) und exportiert
(`index.ts:10`) — und wird nirgends aufgerufen. `packages/projection` enthält **null**
Testdateien. S-P1 (`packages/server/test/http.test.ts:44-69`) existiert und hält für die
Dokument-Projektion; der zweite genannte Beleg tut es nicht.

**Der §3-Wortlaut gilt außerhalb der Dokument-/Tür-Fläche nicht mehr.** §3 sagt absolut:
„Kein Spieler-Payload trägt Rechtefelder oder Sichtbarkeits-Metadaten." Die Tactical-Route
legt jedoch `gm: boolean` in jeden Spieler-Payload und pro Token `canMove` sowie
`version: canMove ? token.version : null` (`domain/tactical.ts:291-292, 304, 307-308`,
so getestet in `tactical.test.ts:106`). Dasselbe Muster besteht in `actors.ts:77-78`.

**Korrektur gegenüber dem Prüfbericht:** Das ist kein Leck. Die Projektion filtert für
Nicht-Spielleitung vorher (`if (!gm && ...) continue;`) und lässt `map`, `document`, `walls`
und `portals` für Spieler vollständig weg. `canMove` beschreibt, was du mit dem tun darfst,
was du ohnehin siehst; `version` wird für nicht bewegbare Token auf `null` gesetzt, also
zurückgehalten. Die *Sicherheitseigenschaft* — aus der Antwort lässt sich Verborgenes nicht
erschließen — ist intakt. Verletzt ist der absolute **Wortlaut**.

Das ist trotzdem ein Problem, nur ein anderes als gedacht: Eine Sicherheitsinvariante, die
als überprüfbare Absolutregel formuliert ist, aber in der Praxis Ausnahmen hat, taugt nicht
mehr als Prüfmaßstab. Wer sie künftig gegen neuen Code hält, bekommt entweder falschen Alarm
oder gewöhnt sich das Prüfen ab. Der Wortlaut muss der Wirklichkeit nachgeführt werden — mit
einer benannten, begründeten Ausnahmefläche.

Sauber sind laut Prüfung: Authoring, Wiki, Grundriss, Bundles, Atlas (GM-only oder reine
Existenzgrenze).

### 1.4 Migrationsdisziplin: verengende Änderungen schließen Rolling Update aus

`deploy/README.md` sagt, Migrationen seien „additiv und idempotent". Das stimmt nicht
durchgängig, und die nützliche Unterscheidung ist eine andere:

| Migration | Anweisung | Richtung | Bricht alten Code |
|---|---|---|---|
| `002_documents.sql:15` | `DROP CONSTRAINT passages_entry_id_ord_key` | erweiternd | nein |
| `014_nested_maps.sql:19` | `ALTER COLUMN parent_map_id SET NOT NULL` | verengend | **ja** |
| `014_nested_maps.sql:23-25` | `DROP CONSTRAINT ..._pkey`, neuer 4-spaltiger PK | verengend | **ja** |

Erweiternde Änderungen sind rolling-update-fähig: alter Code läuft weiter und verliert
höchstens eine Garantie. Verengende sind es nicht. 014 (noch unversioniert) ist sorgfältig
gebaut — es prüft vorher mit `RAISE EXCEPTION`, ob Altdaten eindeutig auflösbar sind — aber
ab seinem Einzug können alte und neue Codeversion nicht mehr gleichzeitig gegen dasselbe
Schema laufen. Ein Zurückrollen der Anwendungsversion ist dann kein Zurückrollen des Schemas.

Zwei weitere Betriebseigenschaften des Migrators:

- **Gut:** `pg_advisory_xact_lock(7342619)` (`db/index.ts:181`) serialisiert gleichzeitig
  startende Container korrekt, und jede bereits angewandte Datei wird bei jedem Start über
  SHA-256 gegengeprüft — serverseitig, nicht nur im Desktop.
- **Riskant:** alle an einem Lauf ausstehenden Migrationen laufen in **einer gemeinsamen**
  Transaktion. Scheitert die fünfzehnte, rollt auch die in diesem Lauf erfolgreiche erste
  zurück. Bei einem großen Sprung nach langer Pause ist das ein langer Lock und ein
  Alles-oder-nichts.

### 1.5 Das Preismodell nimmt eine Infrastruktur an, die es nicht gibt

[`iterations/CHAMPION.md`](iterations/CHAMPION.md) §14.1 rechnet die Raumuhr ausdrücklich auf
Scale-to-Zero: *„the world runs scale-to-zero, woken by a request"*, sechs Weck-Ereignisse je
Kampagnenwoche, ≤90 s Compute je Weckung, daraus „unter €0,05 pro Sitzungsstunde" bei ~30 €
einmalig, 300 Raumstunden/Jahr, 5 GB, Spieler immer kostenlos.

Der gebaute Verbund kennt kein Scale-to-Zero: `restart: unless-stopped`, ein Dauerprozess.

**Das macht die Kalkulation nicht falsch, sondern unvalidiert.** Eine Installation bedient
alle Kampagnen aus einem Prozess und einer Datenbank; eine ruhende Welt ist dort kein
schlafender Container, sondern ein paar Zeilen. Bei ausreichender Dichte ist das
wahrscheinlich billiger als das Weck-Modell. Nur weiß das niemand: Die maßgebliche Zahl ist
**Kampagnen pro Instanz**, und sie ist nie gemessen worden. OPEN-DECISIONS notiert bei S3/S4
„Reversal cost: high once pricing is public" — diese Messung gehört also vor die
Preisveröffentlichung, nicht danach.

### 1.6 Die Degradationsleiter existiert nur in der Doku

`deploy/README.md` beschreibt sie als sichtbar benannt und nie still: SFU → TURN-Relay →
P2P (≤4) → „Sprache liegt — der Tisch läuft". Der Client verbindet ausschließlich über
LiveKits `Room.connect()`; es gibt keinen P2P-Code und keine Umschaltanzeige.
`docs/MEDIA_UI.md:75` sagt es selbst: „Ein P2P-Fallback ist noch nicht implementiert."
`deploy/README.md` hat die dreistufige Leiter aus `07-shell-redesign.md` übernommen, ohne
diese Lücke zu nennen.

Die *Trennung* der Ebenen ist dagegen echt und nicht nur Absicht: `http/realtime.ts`
importiert `domain/media.ts` nirgends, `MediaUnavailable` wird zu HTTP 503, und fehlende
`LIVEKIT_*`-Variablen sind ein regulärer Zustand. Was fehlt, ist der Laufzeit-Ausfalltest.

### 1.7 Die Nebenläufigkeitstests laufen im Standard-Gate nicht

Alle zehn `*.pg.test.ts` in `packages/server/test/` hängen an
`describe.skipIf(!connection)` gegen `TEST_DATABASE_URL` und laufen bei `npm run gate`
standardmäßig **nicht**. Genau die Eigenschaften, die im Mehrinstanzbetrieb tragen müssen —
Pool-Fehlerverhalten, Advisory-Locks, echte Nebenläufigkeit — sind im Alltagsgate stumm.

Das ist konsistent mit dem README, das den `TEST_DATABASE_URL`-Umweg beschreibt. Es heißt
aber: Die grünen Zahlen in `STATUS.md` sagen nur dann etwas über Nebenläufigkeit aus, wenn
jemand den Umweg gegangen ist.

### 1.8 `design/08` ist in seinem eigenen Ausschlussabschnitt überholt

§5 listet als „bewusst NICHT in diesem Slice": Brief/Umbruch/Lesestand, Export/Import, und
`Sicht` als volle Komposition. Alle drei existieren: `domain/week.ts`, `domain/bundles.ts`
plus `bundle-cli.ts`, `domain/public-projection.ts` plus `http/publication.ts`.

§2 kennt zwei Pakete; es sind vierzehn. `domain/` ist von sechs Themen auf 21 Dateien
gewachsen, `createGameplay()` bündelt in 443 Zeilen vier trennbare Zuständigkeiten
(Regelpakete, Szenen, Würfe, Vollmachten). Die verlässliche Quelle für die tatsächlich
erzwungenen Schichtgrenzen ist `tools/gate-boundaries.mjs`, nicht `design/08` §2.

### 1.9 Kleinere, aber benannte Punkte

- **Keine Mandantengrenze außer der WHERE-Klausel.** Ein Schema, `campaign_id` als
  gewöhnliche Textspalte auf ~15 Tabellen, keine Row-Level-Security, ein Pool gegen eine
  Datenbank. Isolation entsteht allein aus `requireMember()` im Anwendungscode
  (`domain/campaigns.ts:11-25`). Wichtig: **B9 schützt hier nicht mit.** Ein vergessenes
  `WHERE campaign_id = $1` bliebe B9-konform — die Antwort trüge keine Rechtefelder, nur
  fremde Daten. S-P1 prüft innerhalb einer Kampagne, nicht zwischen fremden.
- **`lineage_events` hat keinen Index**, trotz fünf Lesestellen und eines Triggers, der bei
  jedem `game_sessions`-Insert darüber scannt (`006_week.sql:61`).
- **Import-Routen sind schwächer gedrosselt als der Export.** `/api/campaigns/:id/export`
  läuft auf 4/Min (`http/bundles.ts:10`), die Import-Routen mit bis zu 96 MiB Body unter dem
  generischen 240/Min. Der eigentliche Schutz sitzt tiefer in `tactical-raster.ts` als ein
  **globaler** `concurrent:1`-Slot — das ist zugleich ein Engpass zwischen gleichzeitig
  aktiven Tischen, nicht nur ein DoS-Schutz.
- **`/api/remember`** — der explizite Wiederkehr-Schritt für Nicht-Passkey-Topologien — hat
  keinen einzigen Test. Die Passkey-Wiederkehr dagegen ist per echtem WebAuthn-E2E-Test
  inklusive Widerrufskaskade belegt.
- **Kein globaler `unhandledRejection`-Handler** als Netz.
- **Keine Produktversion.** Wurzel-`package.json` steht auf `0.0.0`, Desktop auf `0.1.0`.

---

### 1.10 Das Speicherversprechen ist größer als das, was der Export tragen kann

Nachgetragen am 2026-09-07, und es gehört der Sache nach vor die Dichtemessung.

`CHAMPION.md:811` verkauft **5 GB** je Kampagne (neben ~30 € einmalig und 300 Raumstunden im
Jahr). Die Obergrenze eines `.chronicle`-Pakets ist aufgelöst **256 MiB**
(`CAMPAIGN_BUNDLE_V3_LIMITS`, durch v4–v8 unverändert durchgereicht); ein einzelnes Bild darf
höchstens 85 MiB base64 tragen, also rund 64 MiB binär. Und seit v7 liegen die Wiki-Bilder als
base64 **im Paket** (`native-v7/schema.ts:36`) — mit dem üblichen Drittel Aufschlag.

Damit gilt: Eine Kampagne, die auch nur ein Zwanzigstel ihres verkauften Speichers nutzt,
lässt sich **nicht mehr exportieren**. Der Export bricht mit „maximum campaign bundle size
exceeded" ab.

**Warum das schwerer wiegt als eine Zahl:** S3 sagt wörtlich, dass eine ausbleibende
Hostingzahlung die eigene Arbeit nie „unreadable, **unexportable** or uneditable" machen darf
(`04-die-eine-plattform.md:1378`). Genau darauf ruht die Zusage, mit der Self-Hosting optional
sein kann: Wer gehen will, nimmt seine Welt mit. Ein Speicherversprechen, das zwanzigmal
größer ist als das, was der Ausgang trägt, hebt diese Zusage für jede Kampagne auf, die ihr
Kontingent tatsächlich nutzt — und Bilder füllen es schnell.

Drei Wege, und die Wahl ist eine Produktentscheidung:

1. **Das Speicherversprechen auf das senken, was der Export trägt.** Ehrlich, sofort machbar,
   und es macht ein verkauftes Merkmal kleiner.
2. **Den Export in Teile zerlegen** — ein Paket mit Manifest plus Anhängen statt einer Datei.
   Das ist eine neue Formatgeneration und berührt die Wiederherstellung.
3. **Bilder aus dem Paket herausnehmen** und getrennt ausliefern. Genau das hat v7 bewusst
   verworfen: „Ein Dateipfad neben dem Paket wäre die Stelle, an der ein Paket beim Umzug
   unvollständig wird."

Ich empfehle 1 als Sofortmaßnahme und 2 als Ziel: Erst darf der Verkauf nichts versprechen,
was der Ausgang nicht trägt; dann wächst der Ausgang.

---

## 2. Was trägt

Der Rest dieses Dokuments wäre irreführend ohne diesen Abschnitt. Vieles ist besser gebaut,
als eine reine Mängelliste vermuten ließe.

- **Die autoritative Reihenfolge hängt nicht am Ein-Prozess-Design.** Sie wird über
  Postgres-Zeilensperren erzwungen (`FOR UPDATE OF c FOR SHARE OF m`, `domain/gameplay.ts:41-48`,
  `communication.ts:90-91`), plus dem partiellen Unique-Index `one_pending_roll` und der
  Idempotenztabelle `commands`. Diese Garantie überlebt N Instanzen unverändert. Auch
  Reconnect mit `seq` und Resume nach Neustart brechen nicht, weil `sync()`/`resume()`
  ausschließlich aus Postgres lesen. **Das verkleinert die Skalierungsfrage drastisch.**
- **Prozesslokal ist genau eine Sache:** das `connections`-Set (`http/realtime.ts:17-19`).
  Daran hängen Präsenz, der Sofort-Push nach Mutationen und der Verbindungsdeckel.
- **Der Migrator ist solide:** Advisory-Lock gegen Parallelstarts, SHA-256-Prüfsummen aller
  angewandten Dateien bei jedem Start.
- **Die Abrechnungseinheit existiert bereits.** `game_sessions` trägt `started_at`/`ended_at`
  (`004_gameplay.sql:33-39`), und der partielle Unique-Index `one_active_game_session`
  erzwingt höchstens eine offene Sitzung je Kampagne — Raumstunden sind eindeutig
  aufsummierbar, ohne Doppelzählung. Die Tabelle steht nicht auf der Ausschlussliste des
  Exports, der Nutzer bekommt seine Verbrauchsquittung also mit.
- **Der Desktop ist passkey-fähig.** `reachability()` (`identity/index.ts:17-23`) meldet
  `passkeyEligible` bei `https:` beliebig und bei `http:` für `localhost`/`*.localhost`,
  nie für IP-Hostnamen. Der Desktop-Host meldet sich als `http://localhost:<port>`
  (`packages/desktop/src/profiles.ts:12`) — der Küchentisch-Fall funktioniert dort heute
  vollständig. Die beiden Loopback-Sperren (`host.ts:20`, `host.ts:42`) sind Assertions,
  keine Defaults.
- **P11 ist keine offene technische Frage mehr.** Die Messung (spike-B N1–N6) ist
  abgeschlossen und eindeutig: gehosteter Raum, Domain+TLS und `localhost` bestehen; LAN-IP
  und mDNS scheitern strukturell. Offen ist die Entscheidung, nicht das Wissen.
- **Der Desktop-Update-Entwurf existiert vollständig**
  ([`iterations/desktop-shell-20260906.md`](iterations/desktop-shell-20260906.md), Korrekturen
  F1–F8 im zugehörigen Review): `electron-winstaller@5.4.4`, `@electron/fuses@2.1.3`, eigener
  Download in privaten Staging-Bereich statt direkt in Squirrels aktiven Paketordner, Übergabe
  erst nach bestätigter Recovery, Rollback immer über ein neues Profil. Es fehlt die
  Implementierung, nicht der Entwurf.
- **Vier Invarianten sind belastbar belegt:** Vollmacht-Caps (echter Nebenläufigkeitstest mit
  `Promise.allSettled`), Wurf (zweiphasig, idempotent, seeded, `Nachrechnen` byte-stabil —
  ungewöhnlich gründlich), Namenswache (inklusive DB-Unique gegen Races), und ein Fehlertyp
  im Antwortkörper (zentraler Handler `app.ts:56-68`, kein Bypass gefunden; Zeitkanäle
  bleiben UNVERIFIED, weil dafür Laufzeitmessung nötig wäre).

---

## 3. Entwurf: gehosteter Betrieb

### 3.1 Isolation

**Vorschlag: Row-Level-Security auf den bestehenden Tabellen als erste Stufe.** Sie passt an
die vorhandene Struktur — fast überall existiert `campaign_id`, und es gibt einen zentralen
`Db.transaction`-Wrapper, an dem sich der Sitzungskontext setzen lässt. Sie schließt die
konkrete Lücke, dass eine vergessene WHERE-Klausel der einzige Schutzwall ist, ohne die
Deploy-Form anzutasten.

„Datenbank pro Mandant" ist sauberer und löst zusätzlich den Blast Radius, kostet aber
Betriebsautomation, die es im Repo nicht gibt — und widerspricht dem Grundsatz „ein Verbund,
kein zweiter Codepfad" stärker.

Der Blast Radius bleibt in Stufe 1 bestehen: `DB_POOL_MAX` (Vorgabe 10) wird von allen
Kampagnen geteilt, und `statement_timeout` begrenzt einzelne Anweisungen, nicht die Anzahl
Verbindungen, die eine überlastende Kampagne belegen darf. Das ist bewusst zurückgestellt,
nicht übersehen.

### 3.2 Befehlsbus über N Instanzen

Weil die Reihenfolge in Postgres liegt (§2), ist nur der `connections`-Zustand zu lösen.
Drei Brüche, präzise benennbar: Präsenzlisten werden **strukturell unvollständig** statt nur
veraltet; der Sofort-Push degradiert für Peers auf anderen Instanzen zum Poll mit bis zu
5 s Verzug (der Fallback-Timer greift, weil er dieselbe Datenbank liest); der
Verbindungsdeckel von 8 pro Nutzer wird auf 8×N durchlässig.

**Vorschlag: Sticky Sessions je Kampagne zuerst.** Behebt exakt diesen einen Zustand, ohne
Anwendungscode anzufassen. Kosten: eine kampagnenbewusste Routing-Schicht, die es nicht gibt
— `deploy/Caddyfile` kennt genau einen Upstream. Das ist echter Neubau, aber an einer Stelle
statt an dreien.

Postgres `LISTEN/NOTIFY` ist der nächste Schritt, sobald Sticky Sessions an Lastgrenzen
stoßen; es liefert Präsenz allerdings nicht mit und braucht dafür eine eigene Lösung. Redis
wäre funktional am vollständigsten, führt aber eine dritte zustandsbehaftete Komponente ein
und widerspricht dem Ein-Verbund-Grundsatz am stärksten.

### 3.3 Medien

Kapazität ist **portlimitiert, nicht bandbreiten- oder CPU-limitiert**: 101 SFU-UDP-Ports und
41 TURN-Ports je Knoten (`docker-compose.selfhost.yml:103-104, 138-139`). Bei angenommener
Tischgröße 5 träfe die Portgrenze bei grob 20 gleichzeitigen Tischen, lange vor Bandbreite
oder CPU. Diese Zahlen wirken wie ein Entwicklungswert, nicht wie eine Produktionsgrenze.

Vor jeder Kapazitäts- oder Preiszusage: Portbereiche an der erwarteten Tischzahl neu
bemessen, und eine reale TURN/NAT-Messung nachholen — die Ebene ist gegen echtes NAT
weiterhin UNVERIFIED.

Die Degradationsleiter ist zu bauen oder aus der Doku zu streichen. Beides ist vertretbar;
der jetzige Zustand — versprochen und nicht vorhanden — ist es nicht.

### 3.4 Metering und Abrechnung

**Einheit: Raumstunde = Summe der offenen `game_session`-Intervalle.** Nicht Compute-Wecken.
Die Datenlage existiert (§2), ist nachrechenbar und für einen Tisch verständlich.

Medienminuten getrennt messen (über die vorhandene `media_presence`), aber in dieselbe
Budgetzeile buchen — so steht es in S4.

**Der Ledger gehört ins `evidence`-Modul, wie `audit`.** Dann trägt der `.chronicle`-Export
die eigene Verbrauchsquittung, und der Nutzer kann seine Rechnung nachrechnen. Das ist
dieselbe Belegkultur, die das Projekt an jeder anderen Stelle pflegt.

**Leiter bei Zahlungsausfall**, hergeleitet aus S3 („no lapse in a hosting charge may ever
make your own content unreadable, unexportable or uneditable", `04-die-eine-plattform.md:1378`):

1. Warnung.
2. **Lesemodus** — Export bleibt voll funktionsfähig, nur neue Live-Sitzungen werden gestoppt.
3. Export aktiv erzwingen, mit protokolliertem Beleg.
4. **Ruhezustand** — Compute und Medien abgebaut, Daten bleiben.
5. Löschung erst nach dokumentiertem Export oder wiederholt dokumentierter Aufforderung plus
   langer Frist.

Die Leiter trennt bewusst, was laufend Geld kostet (Compute, Medien), von dem, was dem
Nutzer gehört (seine Zeilen). Genau diese Trennung ist S3.

Die Fristen sind eine Geldentscheidung und stehen in §7.

### 3.5 Betrieb

- **Migrationsdisziplin als Regel, nicht als Gewohnheit:** expand/contract, nie `NOT NULL`
  ohne Default in einem Schritt, nie Primärschlüsselwechsel ohne Zwischenversion. Ohne diese
  Regel ist „Rolling Update" ein Etikett.
- **Migration je Datei in eigener Transaktion**, damit ein später Fehler nicht die früheren
  Erfolge desselben Laufs zurücknimmt.
- **Retention und Löschpfad** für `events`, `commands`, `audit` — und ein bewusster
  Mechanismus, der `deny_history_mutation()` für eine autorisierte Kampagnenlöschung
  kontrolliert aussetzt, statt ihn zu schwächen.
- **Import-Routen bekommen ein eigenes Rate-Limit**, analog zum Export.
- **`TacticalRasterStats` tatsächlich ausgeben.** Das Signal existiert im Code und wird
  nirgends exponiert — die billigste Beobachtbarkeitsverbesserung im ganzen Repo.
- **Die `*.pg.test.ts` gehören in ein Gate, das regelmäßig läuft.** Sonst sind die
  Nebenläufigkeitsgarantien unbelegt, gerade wenn sie durch Mehrinstanzbetrieb wichtig werden.
- **Globaler `unhandledRejection`-Handler** als Netz.

---

## 4. Entwurf: Auslieferung

### 4.1 Weg B — veröffentlichtes Image

Der Klon-Zwang hat eine Lösung, die ein vorhandenes Muster verlängert statt eines neuen:
**`configure-selfhost.mjs` als `configure`-Subcommand ins Image ziehen.** Dann erzeugt

```
docker run ghcr.io/<org>/chronicle:<tag> configure <domain> > .env
```

die Geheimnisse ohne Klon und ohne Node auf dem Host. `packages/server/src/main.ts:21-30`
zeigt dasselbe Zufallsgeheimnis-Muster bereits für den Dev-Checkout.

Compose-Datei und `Caddyfile` werden Release-Assets. Die Compose-Datei stellt auf `image:`
um, mit `build:` in einer Override-Datei — so bleibt der eine Codepfad erhalten, und
Entwickler bauen weiterhin aus der Quelle.

Multi-Arch (amd64 **und** arm64) ist für günstige VPS und Raspberry Pi relevant und sollte
von Anfang an mit, weil ein nachträglicher Wechsel Tags bricht.

### 4.2 Weg A — Desktop

Die Größe ist gemessen, nicht geschätzt: von 564 MB sind 367,6 MiB Electron und 134,5 MiB
PostgreSQL (exakt die 1.565 Dateien aus `docs/DESKTOP.md`). `sharp` trägt 3,9 MiB bei. Der
einzige risikofreie Hebel sind Electrons 55 Sprachpakete mit 48,3 MiB — realistisch ~510 MB
statt 564 MB. **Eine Halbierung gibt es ohne Architekturwechsel nicht**, und das ist in
Ordnung: eine halbe Gigabyte-Anwendung ist für ein Spiel normal.

Der Update-Entwurf ist vorhanden (§2) und umzusetzen, bevor Signierung überhaupt relevant
wird. Seine Kernbedingung — Recovery bestätigt, **dann** erst Apply — ist genau die, die
verhindert, dass ein fehlgeschlagenes Update eine Welt verliert.

### 4.3 Erreichbarkeit

**Empfohlene Reihenfolge:**

1. **Cookie-Fallback ratifizieren, P11 schließen.** Kostet nichts: gebaut, gemessen,
   getestet. Es fehlt nur die Entscheidung. (Vorher `/api/remember` mit Tests versehen —
   §1.9.)
2. **LAN-Origin-Disziplin von Weg B auf den Desktop portieren** (`host.ts` erweitern), für
   den Küchentisch.
3. **Fernspiel über einen dokumentierten Tunneldienst** statt Eigenbau-Relay.
4. **Betreiber-Relay nur bei nachgewiesener Nachfrage** — und dann mit ehrlicher
   Sprachregelung. Ein Relay über unsere Infrastruktur ist faktisch keine
   Self-Hosting-Unabhängigkeit mehr; das gehört gesagt, nicht vermarktet.
5. **mDNS mit lokaler CA: nie.** Das eigene N1–N6 hat es bereits als `insecure-context`
   gemessen, dazu käme die Zertifikatsverteilung.

---

## 5. Reihenfolge

Nach Verhältnis von Risiko zu Aufwand, nicht nach Bequemlichkeit.
Stand 2026-09-07: **erledigt ✓, offen ✗**.

**Vor jeder Preisveröffentlichung** (Reversal cost ist hoch, sobald der Preis öffentlich ist):

0. ✗ **Das Speicherversprechen mit dem Export in Einklang bringen** (§1.10). Verkauft sind
   5 GB, exportierbar sind 256 MiB. Das steht hier an nullter Stelle, weil es das einzige
   Versprechen ist, das bereits formuliert wurde und das der Code heute nicht halten kann —
   und weil es S3 betrifft, also die Zusage, auf der Self-Hosting als Option ruht.
1. ✗ **Kampagnen pro Instanz messen** (§1.5) — die Zahl, auf der die ganze Kalkulation ruht.
   Sie ist jetzt *abfragbar*: `GET /api/operator/usage` liefert Raumzeit je Kampagne. Gemessen
   ist sie damit nicht — dafür braucht es echten Betrieb über einen echten Zeitraum.
2. ✓/✗ **Löschpfad und Retention** (§1.1). Der Löschpfad steht (`c52f3d4`, Migration 017).
   **Retention fehlt weiter:** `events`, `commands`, `audit`, `lineage_events` und
   `revisions` räumt niemand; das einzige `purge()` im Repo betrifft flüchtigen Tischchat
   (`communication.ts:55`). Automatisches Löschen von Daten, um die niemand gebeten hat,
   braucht zuerst eine Frist — und die entscheidet, wie lange ein abwesender Spieler noch
   lückenlos fortsetzen kann.
3. ✓ **Raumuhr** (§3.4) — als Bericht, nicht als Ledger (`a086d04`). Begründung dort: Die Zahlen
   sind aus `game_sessions` ableitbar, ein Ledger friert nur eine Abrechnungsperiode ein, und
   eine Abrechnung gibt es ohne §7.2 nicht. Nicht ableitbar und benannt: Teilnehmerminuten,
   weil `media_presence` nur den Ist-Zustand führt.

**Vor dem Mehrinstanzbetrieb:**

4. ✓ **Migrationsdisziplin** (§3.5) — Transaktion je Datei (`d22eceb`), gemessen schneller als
   die gemeinsame. Expand/contract bleibt als Regel in §1.4 und in den Global Constraints des
   Plans; erzwungen wird sie von keinem Gate.
5. ✓ **`*.pg.test.ts` in ein regelmäßig laufendes Gate** (§1.7) — `.github/workflows/gate.yml`.
   Es gab bis dahin **kein** `.github`: Jede Prüfung lief nur von Hand, auf einer Maschine,
   „das Gate ist grün" war also nie eine Aussage über den Branch. Die Entscheidung, die hier
   offen stand, löst sich damit von selbst — ein Postgres-Dienst in der CI verlangt niemandem
   lokal eines ab. Ein eigener Schritt zählt die tatsächlich gelaufenen pg-Fälle und schlägt
   fehl, wenn es null sind: Sonst wäre das Gate grün und sagte über Nebenläufigkeit nichts.
   Belegt: die zehn Dateien gegen ein echtes Postgres 17 im Container; die fünf ohne
   Formatbezug liefen 13/13 grün.
6. ✗ **Sticky-Session-Routing** (§3.2) — der einzige echte Blocker für N Instanzen.

**Unabhängig davon, billig und wertvoll — alle erledigt:**

7. ✓ Zugangsvorfall als native v8 (`4621231`).
8. ✓ `design/08` §3 und §5 nachgeführt, B9-Ausnahmefläche benannt.
9. ✓ Zwillingsbeweis (`a71aa85`).
10. ✓ Import-Rate-Limit (`65df4f9`), `lineage_events`-Index (`099c1f3`), `TacticalRasterStats`
    hinter der Betreiberrolle (`d110050`).
11. ✓ Produktversion und Gate gegen Drift (`ae6283f`).

**Dazugekommen beim Bauen:** `health.test.ts` hatte als letzte von 41 Dateien mit
`createTestDb` keine ausdrückliche Frist — behoben in `d22eceb`. Und jede Formatgeneration
hasht die gesamte Tabellenmenge neu; mit v8 sind es fünf Ebenen. Heute Millisekunden, aber es
wächst mit jeder Version.

---

## 6. Was nicht geprüft ist

- **Laufzeitverhalten.** Kein Lauf durfte eine Datenbank oder einen Server starten. Alle
  Aussagen über Last, Zeitkanäle und reale Nebenläufigkeit sind aus Code abgeleitet.
- **Die TLS-Kante gegen eine echte Domain** und **LiveKit/coturn hinter echtem NAT** — beides
  war schon vorher UNVERIFIED und ist es geblieben.
- **Backup-Frequenz, Aufbewahrung, PITR** sind Entwurf; der Betrieb liegt außerhalb des Repos.
- **LiveKits genaues Port-pro-Teilnehmer-Modell** in v1.13.6 (kein Netzzugriff).
- **Die 5-GB- gegen 128-MB-Diskrepanz** bei den Exportgrenzen (`campaign-schema.ts:79`) ist
  ungeklärt.
- **Ob eine CI außerhalb des Repos existiert** — es wurde kein `.github/` gefunden.

---

## 7. Entscheidungen

### 7.1 Auf Weisung getroffen, 2026-09-07

Kaya hat die drei Mechanismusfragen, die dieses Dokument offen gelassen hatte, ausdrücklich
delegiert („entscheide du alles, nimm die most general advanced option"). Gewählt ist jeweils
die Variante, die sich sauber verallgemeinert — nicht die größte.

**Löschriegel: kampagnengebundener Sitzungsschlüssel, transaktionslokal.**
`deny_history_mutation()` weist UPDATE weiterhin ausnahmslos ab. DELETE wird abgewiesen,
außer `current_setting('chronicle.deleting_campaign', true)` trägt genau die Kampagne der
betroffenen Zeile. Der Schlüssel wird nur per `SET LOCAL` innerhalb der Löschtransaktion
gesetzt und endet mit ihr.

*Warum diese und nicht die anderen:* `ALTER TABLE … DISABLE TRIGGER` wirkt global und
träfe gleichzeitige Sitzungen anderer Kampagnen — in einem Mehrinstanzbetrieb ist das
disqualifizierend. Eine `SECURITY DEFINER`-Kapsel wäre gleichwertig sicher, aber sie
verlagert die Bedingung in eine zweite Rechteebene, die dieses Repo sonst nirgends führt.
Der bloße Ja/Nein-Schalter, den ich in §5 als „am leichtesten zu missbrauchen" notiert
hatte, ist hier gerade **nicht** gewählt: Die Bindung an die konkrete `campaign_id` macht
das Löschen einer einzelnen Zeile weiterhin unmöglich. Man kann nur eine ganze Kampagne
löschen, und nur die, für die der Schlüssel gesetzt ist. Das ist die Verallgemeinerung, die
zählt. 22 der 24 Tabellen tragen `campaign_id` direkt; `lineage_events` und `revisions`
erreichen sie über `entry_id → entries` und bekommen dieselbe Bedingung mit einem Umweg.

**Zugangsvorfall: beide Türarten, Integrität erhalten.**
`access_incidents.vollmacht_id` wird nullbar, eine nullbare `action_vollmacht_id` kommt
hinzu, beide mit echtem Fremdschlüssel (beide Zieltabellen führen `UNIQUE(id, campaign_id)`),
dazu ein CHECK, dass genau eine der beiden gesetzt ist. Die Alternative — Fremdschlüssel
fallen lassen und einen Textdiskriminator führen — wäre einfacher und gäbe die
referenzielle Integrität auf; das widerspricht der Belegkultur des Projekts.

Alle vier Schritte sind erweiternd: `DROP NOT NULL` und `ADD COLUMN` nullbar sind es
ohnehin, und der CHECK ist von jedem Schreibvorgang alter Codeversionen erfüllt. Die
Migration bleibt damit rolling-update-fähig (§1.4).

*Ort des Schreibpfads:* nicht am Dokumentzugriff, sondern am Authentifizierungsfehler.
`CHAMPION.md:372-376` ist wörtlich: *„the server logs an event whenever a device presents
no/expired credential against a character holding an open Vollmacht."* Der Vorfall ist das
Aussperrungssignal, nicht ein Türklinkenversuch. Konkret gehört er an
`identity/index.ts:57` — dort ist der MAC bereits geprüft, das Cookie stammt also nachweislich
von uns und nur das Credential ist tot.

> **Nicht umgesetzt — blockiert, mit Nachweis.** Zwei Funde beim Bauen halten dieses Paket auf,
> und keiner davon ist Zaghaftigkeit:
>
> 1. **Der Fremdschlüssel zeigt auf eine Tabelle, die die Produktion nie füllt.**
>    `INSERT INTO vollmachten` kommt im gesamten Repo genau einmal vor, in einem
>    Legacy-Fixture (`packages/server/test/bundles.test.ts:84`). Echte Türen entstehen
>    ausschließlich in `action_vollmachten` (`domain/gameplay.ts:394`); `documents.ts:67-73`
>    vereinigt beide nur beim Lesen. Ein Schreibpfad, der das heutige Schema respektiert,
>    könnte im Betrieb **nie feuern**. Ihn so zu bauen wäre schlimmer als ihn nicht zu bauen:
>    Die Invariante sähe erfüllt aus und wäre es nicht.
> 2. **Die Erweiterung ist ein Formatversionssprung.** `access_incidents` steht in
>    `CAMPAIGN_TABLES` (`campaign-schema.ts:70`) mit `vollmacht_id` als **nicht** nullbarer
>    Spalte. Sie nullbar zu machen und eine zweite Türspalte zu ergänzen, ändert den
>    Formatvertrag — und `packages/io/src/native-v6/` ist gerade in Arbeit.
>
> Das Paket gehört deshalb in die laufende v6-Arbeit, nicht daneben. Es ist eine
> Abstimmungsfrage geworden, keine Mechanismusfrage mehr.

**`TacticalRasterStats`: Betreiberfläche, nicht offene Route.**
Die Zahlen gehen in den strukturierten Log und an einen Endpunkt, der dieselbe Berechtigung
verlangt wie andere Betreiberauskünfte. Queue-Tiefe und Cache-Zustand auf einer offenen
Route wären ein Aufklärungssignal für gezielte Überlastung; das ist der einzige Grund,
warum dieser Punkt überhaupt offen war.

### 7.2 Weiterhin Kayas

Diese bleiben ausdrücklich offen — sie sind Geld-, Produkt- oder Rechtsentscheidungen, keine
Mechanismusfragen:

- **Isolationsstufe:** RLS zuerst (Empfehlung) gegen Datenbank-pro-Mandant sofort.
  Kostenunterschied ist Betriebsautomation.
- **Bus-Skalierung:** Sticky Sessions (Empfehlung) gegen LISTEN/NOTIFY gegen Broker.
- **P11 / Cookie-Fallback ratifizieren.** Technisch entschieden, formal offen. Blockiert die
  ehrliche Bewerbung der LAN-Topologie.
- **Betreiber-Relay ja/nein** — und wenn ja, wie es genannt wird.
- **Fristen der Zahlungsausfall-Leiter** (§3.4).
- **Preisveröffentlichung erst nach der Dichtemessung** — Empfehlung, aber Geldentscheidung.
- **S6 (Rechtsform, Impressum, Steuer)** ist Voraussetzung für echten Geldeinzug und braucht
  einen Steuerberater, keinen Agenten.
- **Ob `design/08` fortgeschrieben oder durch dieses Dokument abgelöst wird.**

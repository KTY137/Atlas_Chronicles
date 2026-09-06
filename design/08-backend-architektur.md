# 08 — Backend-Architektur: Ein Server, zwei Betriebsarten

Status: **beschlossen und im Bau**, 2026-09-06.

**Implementierungsstand (2026-09-06, 14:35):** `packages/server/` trägt Identität (echte
WebAuthn-Zeremonien, Cookie-Wiederkehr, Kopplung, Ausweis), Kampagne/Einladung/Gast-Join/GM-Freigabe,
Dokumente mit Revisionen und projizierter Leseroute, Gameplay, Woche, Medien (LiveKit-Token) und den
WebSocket-Befehlsbus. Belegt: Boundary-Gate grün, Typecheck grün, vitest 188/188, Browser-E2E 2/2
(`e2e/`, inkl. echtem Server-Neustart) — **S-P1** läuft als `http.test.ts` gegen den realen Server.
Deployment liegt unter [`deploy/`](../deploy/README.md): ein Image, ein Compose-Verbund, Profile `tls`
und `media`; lokal verifiziert bis `/api/health` im Container. Offen bleiben P11 (Self-Host-Join im
LAN) und die Abnahmen mit echter Domain/NAT (M5).

Auftrag (Kaya, 2026-09-06): *„ja oke bau dafür die architektur/das backend"* — für Hosting und
Session-Einladungen. Gleiche Session ratifizierte **S4 = Ja** (minimale hosted Rooms in v1;
Kayas Worte: *„das kostet para aber ja ist besser"*).

Dieses Dokument pinnt den Backend-Stack und die Modulgrenzen. Es erfindet keine Semantik:
die Verträge kommen aus [`iterations/CHAMPION.md`](iterations/CHAMPION.md) (Slice 1, Gates),
[`06-giga-product-architecture.md`](06-giga-product-architecture.md) §11/§16 (Join-Flows,
Zustandsklassen, Command-Envelope) und [`07-shell-redesign.md`](07-shell-redesign.md) §5
(Netzebenen, Topologie). Der Identitätskern ist die 1:1-Portierung des ratifizierten Spikes
[`spikes/spike-B-wiederkehr/wiederkehr.mjs`](spikes/spike-B-wiederkehr/wiederkehr.mjs).

## 1. Entscheidungen (mit Alternativen, kurz)

| Entscheidung | Gewählt | Verworfen | Grund |
|---|---|---|---|
| Laufzeit | **Node 22 + TypeScript (ESM, strict)** | Go/Rust-Server | S-P1 nennt einen Node-Projektor; eine Sprache über Client/Server/Electron; der Server muss im Electron-Self-Host mitfahren |
| HTTP | **Fastify 5** + `@fastify/websocket` | Express, nacktes `node:http` | Schema-Validierung am Rand (TypeBox→AJV), Hooks, Reife; nacktes http hieße Validierung selbst bauen |
| Schemas/Typen | **TypeBox** | Zod | ein Artefakt ist zugleich TS-Typ und JSON-Schema für Fastify — kein Doppelpfad |
| Datenbank | **Postgres 17** (`pg`), Migrationen als SQL-Dateien | SQLite | 07 §5 pinnt Postgres im Compose-Verbund; RB-21-Spikes messen gegen Postgres; Kein zweiter Codepfad hosted/self-host |
| Test-DB | **PGlite** (echtes Postgres als WASM, gleiche Migrationen) | Mock-Store | dieselben SQL-Dateien laufen in Test und Produktion — der Test testet das echte Schema |
| Befehlsbus | **WebSocket, `seq`/resume, Command-Envelope** (06 §16.2) | State-Patches, CRDT | autoritative Reihenfolge ist Klasse-1-Pflicht (06 §16.1); Commands sind die geschlossene Liste |
| Medienebene | **LiveKit + coturn als eigene Container** (07 §5) | im App-Server | Ein Voice-Ausfall hält den Tisch nie an; in diesem Slice nur als Compose-Eintrag, Token-Minting folgt |
| Identität | **Passkey + Cookie-Fallback aus dem Spike** | Passwort-Konten | ratifizierte Lineage; Spieler-Join bleibt kontenlos (Namenswache) |

## 2. Paketlayout

```text
packages/
  protocol/   Commands, Events, Join-API — TypeBox-Schemas, keine Laufzeit-Deps außer TypeBox.
              Wird später vom Client konsumiert; die K-G8-Denkschule: Grenzen zuerst.
  server/     der App-Server
    src/db/          Db-Interface, pg-Adapter, Migrator, migrations/*.sql
    src/identity/    WebAuthn, Cookie-Credential, Kopplungscode, Ausweis, Zugangsvorfall
    src/domain/      Kampagne, Einladung, Namenswache, Vollmacht, Wurf, Projektion
    src/http/        REST-Routen (Join/Auth/Verwaltung), WS-Befehlsbus (seq/resume, Präsenz)
deploy/
  docker-compose.selfhost.yml   App + Postgres + LiveKit + coturn — derselbe Verbund gehostet,
                                nur mit Regionen. Kein zweiter Codepfad.
```

## 3. Die Invarianten, die der Code trägt (nicht die Doku)

- **Grenze B9:** der Projektor ist der Server. Kein Spieler-Payload trägt Rechtefelder oder
  Sichtbarkeits-Metadaten — Nicht-Halter einer Tür bekommen **byte-identische** Antworten zu
  einem Leser ohne Kampagne. Getestet als **S-P1** (drei Bücher, ein Server: Sera/Brannt/Vesper,
  drei byteverschiedene Payloads, keins mit Rechtefeldern) und **Zwillingsbeweis** (zwei Welten,
  identische gehaltene Hälfte, byte-identische Ausgabe für Nicht-Halter).
- **Ein Fehlertyp nach außen:** jede Autorisierungs-/Existenz-Verweigerung ist dieselbe
  404-Antwort. `revoked`, `expired`, `never existed`, `not yours` sind nicht unterscheidbar.
- **Namenswache** beim kontenlosen Join: NFKC, ≤40 Grapheme, keine Steuerzeichen/Bidi-Overrides,
  Homoglyphen-Skelett gegen anwesende Namen. (Skelett: dokumentierte Teilmenge von UTS-39,
  kein vollständiges Confusables-Datenfile — Grenze im Code benannt.)
- **Vollmacht-Caps serverseitig:** ≤1 je Spieler je rollierender Woche + 2 freischwebende je
  Kampagne und Woche; `freigabe_pid` muss existieren (die Nachlese); Widerruf schließt das
  CAS-Fenster (Spike-Semantik unverändert).
- **Wurf:** zweiphasig, idempotent, seeded, `Nachrechnen` byte-stabil.
- **Kein heimliches Dauerkonto:** Gast-Credential ist kurzlebig; Wiederkehr (Passkey oder
  Cookie) ist ein expliziter Schritt und im Ausweis widerrufbar.
- **Zugangsvorfall:** ein Zugriff auf eine offene Tür ohne Credential wird protokolliert,
  bevor die 404 fällt — Lockout und Desinteresse bleiben trennbar (W1-Gate).

## 4. Join-Pfade (06 §11.1, umgesetzt in `packages/server/src/app.ts`)

1. **Gastabend:** `POST /join/:code` mit Anzeigename → Namenswache → Eintrag `pending` →
   GM-Freigabe → kurzlebiges Gast-Cookie, Figurzuweisung optional.
2. **Wiederkehr:** auf Passkey-fähiger Topologie (`passkeyEligible`, Messung N1–N6) die
   WebAuthn-Zeremonie; sonst der Cookie-Fallback (HttpOnly/Secure/SameSite=Strict, MAC-geprüft,
   widerrufbar). `GET /api/reachability` sagt dem Client, welche Zeremonie angeboten wird.
3. **Kopplungscode:** GM-Geste „Zugang erneuern" bindet ein Ersatzgerät an dieselbe `UserId`.
4. **Self-Host:** identischer Code; der Join-/Credential-Transport bleibt **OPEN P11** —
   bis zur Ratifizierung verspricht keine Copy den unveränderten Hosted-Join auf LAN.

## 5. Bewusst NICHT in diesem Slice

LiveKit-Token-Minting (Ebene existiert nur als Compose-Eintrag) · Raumuhr-Metering/Billing ·
Brief/Umbruch/Lesestand · Export/Import · `Sicht` als volle Komposition (die Projektion hier
deckt Passagen/Türen, nicht `haelt_etikett`) · jede UI. Jeder dieser Punkte hat einen Platz in
der Lineage und wird nicht nebenbei miterfunden.

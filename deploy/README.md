# Deployment — ein Verbund, zwei Betriebsarten

Grundlage: [`design/08-backend-architektur.md`](../design/08-backend-architektur.md) (Stack, S4 = Ja),
[`design/07-shell-redesign.md`](../design/07-shell-redesign.md) §5 (drei Netzebenen),
`OPEN-DECISIONS.md` S3/S4/P11. Hosted Rooms und Self-Host laufen aus **demselben Image** und
**derselben Compose-Datei**; der gehostete Betrieb setzt nur Regionen und Skalierung davor.

## Die drei Topologien — und was auf jeder tatsächlich funktioniert

| Topologie | Profil | Einladungslink | Passkey-Wiederkehr | Cookie-Wiederkehr | Stand |
|---|---|---|---|---|---|
| **Hosted Room** (unser Betrieb) | wie Self-Host mit Domain | ja | ja | ja | belegt durch `e2e/` gegen `https`-fähige Origin-Prüfung |
| **Self-Host mit eigener Domain + TLS** | `tls` | ja | **ja** — die einzige Self-Host-Topologie, die spike-B N1–N6 besteht | ja | Compose validiert; TLS-Kante hier **UNVERIFIED** (keine öffentliche Domain im Test) |
| **Self-Host im LAN, `http://<IP>:3000`** | keins, `CHRONICLE_BIND=0.0.0.0` | ja | **nein** (insecure context / rpId darf keine IP sein) | eingeschränkt — **OPEN P11** | bewusst nicht beworben, bis P11 ratifiziert ist |

`GET /api/reachability` sagt dem Client pro Origin, welche Zeremonie angeboten wird. Kein stilles
Downgrade: fehlt eine Ebene, benennt die App den Zustand.

## Schnellstart (Self-Host)

```bash
node deploy/configure-selfhost.mjs chronik.example.org      # schreibt deploy/.env mit frischen Geheimnissen
# DNS: chronik.example.org und livekit.chronik.example.org → dieser Host. PUBLIC_IP in deploy/.env eintragen.
docker compose --env-file deploy/.env -f deploy/docker-compose.selfhost.yml --profile tls up -d --build
# optional Voice/Video:
docker compose --env-file deploy/.env -f deploy/docker-compose.selfhost.yml --profile tls --profile media up -d
```

Erste Einrichtung: Die App fragt beim ersten Öffnen nach Name und **Einrichtungsschlüssel** — das ist
`BOOTSTRAP_TOKEN` aus `deploy/.env`. Danach ist der Schlüssel wertlos (`/api/setup` meldet
`required: false`).

Ohne TLS-Profil (LAN): `CHRONICLE_ORIGIN=http://192.168.1.5:3000` und `CHRONICLE_BIND=0.0.0.0` in
`deploy/.env`; Spieler öffnen die IP. Der Server prüft `Origin` gegen `CHRONICLE_ORIGIN` — beides muss
exakt übereinstimmen.

## Die drei Ebenen (07 §5)

| Ebene | Container | Regel |
|---|---|---|
| Befehlsbus | `app` (WebSocket `/api/campaigns/:id/live`, `seq`/resume) | hält, wenn alles andere fällt |
| Medienebene | `livekit` + `coturn` | Zugangstoken pro Mitgliedschaft aus der App; Räume ↔ Session |
| Präsenz | Piggyback auf dem Befehlsbus | läuft nie über die Medienebene |

Degradationsleiter, sichtbar und benannt, nie still: **SFU → TURN-Relay → P2P (≤4) → „Sprache liegt
— der Tisch läuft"**. Das Abschalten von `livekit` darf keinen Tischbefehl anhalten.

## Betrieb

- **Backup:** `docker compose … exec postgres pg_dump -U chronicle -Fc chronicle > chronicle-$(date +%F).dump`.
  Restore mit `pg_restore -U chronicle -d chronicle --clean`. Der Export der Kampagne (`.chronicle`-Bundle)
  ist davon unabhängig und gehört dem Nutzer — das Ende einer Hostingzahlung sperrt ihn nie aus (S3).
- **Update:** `docker compose … up -d --build`; Migrationen (`packages/server/src/db/migrations/*.sql`)
  laufen beim Start, sind additiv und idempotent.
- **Health:** `GET /api/health` (DB-Roundtrip) ist der Container-Healthcheck.
- **Geheimnisse** liegen nur in `deploy/.env` (git-ignored, Modus 600). Nie in Logs, nie in Tickets.
- **Ports nach außen:** `tls`: 80/443. `media`: 7881/tcp, 50000–50100/udp (SFU), 3478 tcp+udp und
  49160–49200/udp (TURN). Ohne Profile lauscht nur `127.0.0.1:3000`.

## Was hier verifiziert wurde — und was nicht

- ✅ `docker compose config` löst beide Profile und alle Variablen auf (2026-09-06, lokal).
- ✅ Das Image baut aus `deploy/Dockerfile` (siehe Ledger in `STATUS.md`, Datum des Laufs).
- ⏳ App + Postgres aus diesem Compose lokal hochgefahren und `/api/health`/`/api/setup` geprüft — Stand in `STATUS.md`.
- ❌ **UNVERIFIED:** Caddy-TLS gegen eine echte Domain; LiveKit/coturn mit `PUBLIC_IP` hinter NAT
  (die lokale Loopback-Variante liegt unter `deploy/media/`). Beides braucht einen erreichbaren Host und
  ist die Abnahme von Meilenstein M5, nicht dieser Datei.

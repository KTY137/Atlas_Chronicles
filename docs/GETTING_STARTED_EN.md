# Atlas Chronicles — Setup Guide

This guide has two audiences.

- **Game Master.** You run the server and invite the party. Read everything.
- **Player.** You open a link and play. Read [For players](#for-players) only.

The rest of the documentation is in German. This file is the English entry point.

---

## What a Game Master needs

- **Node.js 22.12 or newer**, and npm.
- **Docker Desktop**, running. PostgreSQL lives in a container; there is no file-based save.
- **This repository, cloned.** There is no published image yet, so the container is built
  from source. You need the clone, not just a compose file.

Your campaign data lives in the Docker volume, not in a folder you can copy. The portable
form of a campaign is the `.chronicle` export, which you create from inside the app.

> Every command below runs **inside** the cloned repository directory. Running them one
> level up is the single most common mistake.

---

## Choose how you run it

| Way | Good for | Players can join |
|---|---|---|
| [On your own computer](#way-1--on-your-own-computer) | trying it out, preparing maps alone | no |
| [On your network](#way-2--on-your-network-lan) | a session at the same table or in the same flat | yes |
| [On a server with a domain](#way-3--on-a-server-with-a-domain) | a party that plays from different places | yes |
| Desktop app (`npm run desktop`) | one machine, no terminal afterwards | no |

---

## Way 1 — On your own computer

```powershell
npm ci
npm run configure
npm run db:up
npm run build
npm start
```

Open <http://localhost:3000>.

For development with automatic reloading, use `npm run dev` after `npm run db:up` and open
<http://localhost:5173> instead.

Your **setup key** is the `bootstrapToken` value in `.local/config.json`. You need it once,
on the first screen. That file is created for you and is excluded from Git.

---

## Way 2 — On your network (LAN)

This is the way to test with your party in the same building. There are two versions of it,
and the difference matters.

Desktop builds containing the 2026-09-12 LAN change offer **Wer kann beitreten?**
(who can join) in the host window. Stop the world, select the private IPv4 address
of your Wi-Fi or Ethernet adapter, and start it again. Create an invitation in
the host window, send its complete link to your players, and approve their join
requests there. The host and players use the same address. After switching between
localhost and a LAN address, use **Mitglieder → Zugangslink** to sign back in with
an existing identity if needed. The default remains local access only.
See [LAN setup and verification](LAN.md) for the detailed checklist and evidence.

### 2a — Plain HTTP, quick, with real limits

Find your computer's address on the network (`ipconfig` on Windows, `ip addr` on Linux).
Then, in `deploy/.env`:

```bash
CHRONICLE_ORIGIN=http://192.168.1.5:3000
CHRONICLE_BIND=192.168.1.5
CHRONICLE_INSECURE_LAN=1
```

Start without the TLS profile:

```bash
docker compose --env-file deploy/.env \
  -f deploy/docker-compose.selfhost.yml up -d --build
```

Players open `http://192.168.1.5:3000` directly.

**What this costs you, plainly:**

- **Passkeys do not work.** A browser only offers them in a secure context, and an IP
  address may not be a passkey domain. That is a browser rule, not a fault in the app. The
  app says so itself rather than failing quietly: the sign-in screen greys the passkey
  button out and points to invitation and pairing codes instead.
- **The connection is unencrypted.** Enabling `CHRONICLE_INSECURE_LAN=1` explicitly
  allows HTTP cookies for the configured private IPv4 origin. Cookies remain
  `HttpOnly` and `SameSite=Strict`; guest sessions last eight hours, or 30 days
  after choosing to remember the browser. Expired or cleared cookies require a
  pairing link. Without the explicit setting, cookies remain `Secure`.

Use HTTP only on a trusted home network. Use HTTPS for encrypted transport.

### 2b — HTTPS on the LAN, recommended

Everything above works properly as soon as the address is `https://` with a real hostname:
passkeys return, and sessions persist.

Two ways to get there without exposing anything to the internet:

- **A hostname on your own network plus a certificate your devices trust.** Caddy can issue
  those itself from a local certificate authority; every device that will connect has to
  trust that authority once. `deploy/Caddyfile` currently expects a public domain, so this
  needs a small edit to that file. *I have not run this variant myself — treat it as the
  documented Caddy feature it is, not as a tested recipe.*
- **A real domain that points at the machine**, exactly as in [Way 3](#way-3--on-a-server-with-a-domain).
  This is the tested path.

### The one setting that breaks everything if it is wrong

`CHRONICLE_ORIGIN` must match **character for character** what your players have in their
address bar. The server compares every write request against it. An `https` where you wrote
`http`, a missing port, one slash too many — and every save, every map edit, every message
is refused.

---

## Way 3 — On a server with a domain

```bash
git clone https://github.com/KTY137/Atlas_Chronicles.git
cd Atlas_Chronicles
node deploy/configure-selfhost.mjs chronicle.example.org
docker compose --env-file deploy/.env \
  -f deploy/docker-compose.selfhost.yml \
  --profile tls up -d --build
```

The configure script writes `deploy/.env` with a fresh database password, cookie secret and
setup key. It never prints those values and never overwrites an existing file.

Caddy fetches a certificate on first start. That needs the domain's A record to point at
this host already, with ports 80 and 443 reachable.

Your **setup key** is the `BOOTSTRAP_TOKEN` line in `deploy/.env`:

```bash
grep BOOTSTRAP_TOKEN deploy/.env
```

The full German operating guide, including backups and recovery, is in
[`docs/SELFHOSTING.md`](SELFHOSTING.md).

---

## First run in the browser (Game Master)

1. **Open your address.** The app asks for your name and the **setup key**. Enter the value
   you looked up above. After this the key is spent; `/api/setup` then reports that no setup
   is required. Nobody joins with the setup key again — from here on it is invitations.
2. **Create a campaign.**
3. **Create an invitation.** Use *Create invitation* and copy the **invitation link**. You
   can issue several and revoke any of them later under *Manage issued invitations*.
   Revoking kills the link and any join requests still open through it; members who already
   joined stay in the party.
4. **Approve the players.** When someone uses your link, their request appears under
   **Join requests** — automatically, no reload needed. Press **Approve** and they are at
   the table.

---

## For players

You need nothing installed. You need the link your Game Master sent you.

1. **Open the invitation link.**
2. **Enter your name** and send the request. Your Game Master sees it appear and approves it.
3. **You are at the table.**

**Coming back later.** How you sign in again depends on how your Game Master runs the game:

- **On `https://` or on your own computer:** use your **passkey** — your fingerprint, face
  or device PIN. Nothing to remember.
- **On a plain `http://` address in your network:** passkeys are not offered there. Ask your
  Game Master for a **one-time pairing code** and enter it on the sign-in screen. You may
  also have to do this after reloading the page, because the session cannot always be kept
  on such an address.

The sign-in screen always tells you which of the two applies. It never silently downgrades.

---

## When something does not work

| What you see | What it means |
|---|---|
| Every save or edit is refused | `CHRONICLE_ORIGIN` does not match the address in the browser, exactly. Scheme, host, port. |
| The passkey button is greyed out | Not a secure context: a plain `http://` address that is not localhost. Use a pairing code, or move to HTTPS. |
| Players are signed out after a reload | Check that HTTP LAN mode is explicitly enabled with `CHRONICLE_INSECURE_LAN=1`, and that cookies have not expired or been cleared. See [Way 2a](#2a--plain-http-quick-with-real-limits). |
| Players cannot reach the address at all | Check the selected adapter address, `CHRONICLE_BIND`, local firewall rules and guest-network isolation. |
| The invitation link says it expired | The invitation was revoked, or the request behind it lapsed with it. Ask for a fresh link. |

Voice and video chat are **not** part of the app. Text chat, player banners and presence
run on the app server and need nothing extra; for talking, the party uses a separate
application.

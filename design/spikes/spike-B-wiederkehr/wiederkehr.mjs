// die Wiederkehr — the returning player's identity subsystem, built for real.
// Round 5, candidate B. Node built-ins only (node:crypto). No framework, no DB.
// Scope: WebAuthn-shaped registration + assertion verification, der Kopplungscode
// (GM-minted recovery), the cookie fallback, der Zugangsvorfall, and
// der ausstehende Wurf (idempotent two-phase roll state machine).
import crypto from "node:crypto";

const now = () => Date.now();
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) => Buffer.from(s, "base64url");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest();

// ---------------------------------------------------------------- errors
// One error type. The HTTP layer maps EVERY failure below to 404 with an
// identical body, so "revoked", "expired", "never existed" and "not yours"
// are indistinguishable to a caller. 403 is never emitted for a scoped object.
export class Gone extends Error {
  constructor(reason) { super("gone"); this.reason = reason; }
}

// ---------------------------------------------------------------- store
export function createStore(cfg = {}) {
  return {
    cfg: {
      rpId: cfg.rpId ?? "tafel.example",
      origin: cfg.origin ?? "https://tafel.example",
      challengeTtlMs: cfg.challengeTtlMs ?? 120_000,
      kopplungTtlMs: cfg.kopplungTtlMs ?? 600_000,
      pendingWurfTtlMs: cfg.pendingWurfTtlMs ?? 1_800_000,
      cookieSecret: cfg.cookieSecret ?? crypto.randomBytes(32),
    },
    users: new Map(),        // user_id -> {user_id, platform_role, display}
    creds: new Map(),        // cred_id -> {cred_id,user_id,kind,label,spki,signCount,registered_at,last_used_at,revoked_at}
    challenges: new Map(),   // challenge_b64 -> {purpose, user_id, created_at, used}
    kopplung: new Map(),     // code -> {code_hash,user_id,campaign_id,expires_at,used_at,revoked_at,minted_by}
    chars: new Map(),        // character_id -> {character_id, user_id, campaign_id}
    vollmachten: new Map(),  // id -> Vollmacht
    wuerfe: new Map(),       // id -> Wurf
    pendingByKey: new Map(), // `${vollmacht_id}` -> wurf_id   (idempotency index)
    incidents: [],           // Zugangsvorfall
    audit: [],               // append-only
    passages: new Map(),     // pid -> {pid, text, campaign_id}
    revelations: new Set(),  // `${character_id}:${pid}`
  };
}

const audit = (S, kind, data) => S.audit.push({ at: now(), kind, ...data });

// ---------------------------------------------------------------- challenges
function mintChallenge(S, purpose, user_id = null) {
  const c = b64u(crypto.randomBytes(32));
  S.challenges.set(c, { purpose, user_id, created_at: now(), used: false });
  return c;
}
// Single-use AND time-bounded. Consumed before any signature work is done.
function consumeChallenge(S, c, purpose) {
  const rec = S.challenges.get(c);
  if (!rec) throw new Gone("challenge-unknown");
  if (rec.used) throw new Gone("challenge-replayed");
  if (now() - rec.created_at > S.cfg.challengeTtlMs) throw new Gone("challenge-expired");
  if (rec.purpose !== purpose) throw new Gone("challenge-wrong-purpose");
  rec.used = true;
  return rec;
}

// ---------------------------------------------------------------- authData
// Layout per WebAuthn: rpIdHash(32) || flags(1) || signCount(4 BE) || [attested…]
export function packAuthData({ rpId, up = true, uv = true, signCount = 0 }) {
  const h = sha256(Buffer.from(rpId, "utf8"));
  const flags = Buffer.from([(up ? 0x01 : 0) | (uv ? 0x04 : 0)]);
  const sc = Buffer.alloc(4); sc.writeUInt32BE(signCount);
  return Buffer.concat([h, flags, sc]);
}
function parseAuthData(buf) {
  if (buf.length < 37) throw new Gone("authdata-short");
  return {
    rpIdHash: buf.subarray(0, 32),
    up: (buf[32] & 0x01) !== 0,
    uv: (buf[32] & 0x04) !== 0,
    signCount: buf.readUInt32BE(33),
  };
}
function checkClientData(S, clientDataJSON, expectedType, expectedChallenge) {
  let cd;
  try { cd = JSON.parse(Buffer.from(clientDataJSON).toString("utf8")); }
  catch { throw new Gone("clientdata-unparseable"); }
  if (cd.type !== expectedType) throw new Gone("clientdata-type");
  // Constant-time compare so a challenge cannot be discovered by timing.
  const a = Buffer.from(String(cd.challenge)), b = Buffer.from(String(expectedChallenge));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Gone("clientdata-challenge");
  if (cd.origin !== S.cfg.origin) throw new Gone("clientdata-origin");
  if (cd.crossOrigin === true) throw new Gone("clientdata-crossorigin");
  return cd;
}

// ---------------------------------------------------------------- registration
export function beginRegistration(S, { user_id, display }) {
  if (!S.users.has(user_id)) S.users.set(user_id, { user_id, platform_role: "gast", display });
  return { challenge: mintChallenge(S, "webauthn.create", user_id), rpId: S.cfg.rpId };
}
export function finishRegistration(S, { user_id, challenge, clientDataJSON, authenticatorData, spki, cred_id, label }) {
  consumeChallenge(S, challenge, "webauthn.create");
  checkClientData(S, clientDataJSON, "webauthn.create", challenge);
  const ad = parseAuthData(authenticatorData);
  if (!ad.rpIdHash.equals(sha256(Buffer.from(S.cfg.rpId, "utf8")))) throw new Gone("rpid-mismatch");
  if (!ad.up) throw new Gone("no-user-presence");
  if (S.creds.has(cred_id)) throw new Gone("cred-exists");
  S.creds.set(cred_id, {
    cred_id, user_id, kind: "passkey", label: label ?? "Gerät",
    spki: Buffer.from(spki), signCount: ad.signCount,
    registered_at: now(), last_used_at: null, revoked_at: null,
  });
  audit(S, "credential.registered", { user_id, cred_id, label });
  return { cred_id, user_id };
}

// ---------------------------------------------------------------- assertion
export function beginAuth(S) { return { challenge: mintChallenge(S, "webauthn.get"), rpId: S.cfg.rpId }; }
export function finishAuth(S, { cred_id, challenge, clientDataJSON, authenticatorData, signature }) {
  consumeChallenge(S, challenge, "webauthn.get");
  const cred = S.creds.get(cred_id);
  if (!cred || cred.revoked_at) throw new Gone("credential-unknown-or-revoked");
  checkClientData(S, clientDataJSON, "webauthn.get", challenge);
  const ad = parseAuthData(authenticatorData);
  if (!ad.rpIdHash.equals(sha256(Buffer.from(S.cfg.rpId, "utf8")))) throw new Gone("rpid-mismatch");
  if (!ad.up) throw new Gone("no-user-presence");
  const signed = Buffer.concat([Buffer.from(authenticatorData), sha256(Buffer.from(clientDataJSON))]);
  const key = crypto.createPublicKey({ key: cred.spki, format: "der", type: "spki" });
  if (!crypto.verify("sha256", signed, { key, dsaEncoding: "der" }, Buffer.from(signature)))
    throw new Gone("bad-signature");
  // Clone detection: a counter that does not advance is either a clone or a
  // authenticator that does not count. We reject a ROLLBACK, tolerate 0/0.
  if (!(ad.signCount === 0 && cred.signCount === 0) && ad.signCount <= cred.signCount)
    throw new Gone("signcount-rollback");
  cred.signCount = ad.signCount;
  cred.last_used_at = now();
  audit(S, "credential.used", { user_id: cred.user_id, cred_id });
  return { user_id: cred.user_id, cred_id };
}

// ---------------------------------------------------------------- Kopplungscode
// GM roster gesture „Zugang erneuern". Vollmacht-shaped: scoped, single-use,
// expiring, revocable, audited. Registers a NEW credential against the SAME user_id.
export function mintKopplungscode(S, { gm_user_id, campaign_id, user_id }) {
  const code = b64u(crypto.randomBytes(9)).slice(0, 12).toUpperCase();
  S.kopplung.set(code, {
    code_hash: sha256(Buffer.from(code)), user_id, campaign_id,
    minted_by: gm_user_id, minted_at: now(),
    expires_at: now() + S.cfg.kopplungTtlMs, used_at: null, revoked_at: null,
  });
  audit(S, "kopplung.minted", { gm_user_id, user_id, campaign_id });
  return code;
}
export function revokeKopplungscode(S, code) {
  const k = S.kopplung.get(code); if (!k) throw new Gone("kopplung-unknown");
  k.revoked_at = now(); audit(S, "kopplung.revoked", { user_id: k.user_id });
}
export function redeemKopplungscode(S, { code, campaign_id }) {
  const k = S.kopplung.get(code);
  if (!k) throw new Gone("kopplung-unknown");
  if (k.used_at) throw new Gone("kopplung-used");
  if (k.revoked_at) throw new Gone("kopplung-revoked");
  if (now() > k.expires_at) throw new Gone("kopplung-expired");
  if (k.campaign_id !== campaign_id) throw new Gone("kopplung-wrong-scope");
  k.used_at = now();
  audit(S, "kopplung.redeemed", { user_id: k.user_id });
  // Returns a registration ceremony bound to the EXISTING user_id — never a new identity.
  return { ...beginRegistration(S, { user_id: k.user_id }), user_id: k.user_id };
}

// ---------------------------------------------------------------- cookie fallback
// For authenticator-less browsers. HttpOnly/Secure/SameSite=Strict; the token
// value is NEVER placed in a URL, a query string or a fragment.
export function issueCookie(S, { user_id, label = "Browser ohne Passkey" }) {
  const cred_id = "ck_" + b64u(crypto.randomBytes(9));
  S.creds.set(cred_id, {
    cred_id, user_id, kind: "cookie", label, spki: null, signCount: 0,
    registered_at: now(), last_used_at: null, revoked_at: null,
  });
  const body = `${cred_id}.${now()}`;
  const mac = crypto.createHmac("sha256", S.cfg.cookieSecret).update(body).digest("base64url");
  audit(S, "credential.registered", { user_id, cred_id, label });
  return { setCookie: `wk=${body}.${mac}; HttpOnly; Secure; SameSite=Strict; Path=/`, value: `${body}.${mac}` };
}
export function verifyCookie(S, value) {
  const i = value.lastIndexOf(".");
  if (i < 0) throw new Gone("cookie-malformed");
  const body = value.slice(0, i), mac = value.slice(i + 1);
  const want = crypto.createHmac("sha256", S.cfg.cookieSecret).update(body).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Gone("cookie-bad-mac");
  const cred = S.creds.get(body.split(".")[0]);
  if (!cred || cred.revoked_at) throw new Gone("credential-unknown-or-revoked");
  cred.last_used_at = now();
  return { user_id: cred.user_id, cred_id: cred.cred_id };
}

// ---------------------------------------------------------------- der Ausweis
export function ausweis(S, user_id) {
  return [...S.creds.values()].filter((c) => c.user_id === user_id && !c.revoked_at)
    .map(({ cred_id, kind, label, registered_at, last_used_at }) =>
      ({ cred_id, kind, label, registered_at, last_used_at }));
}
export function revokeCredential(S, { user_id, cred_id }) {
  const c = S.creds.get(cred_id);
  if (!c || c.user_id !== user_id) throw new Gone("credential-unknown-or-revoked");
  c.revoked_at = now(); audit(S, "credential.revoked", { user_id, cred_id });
}

// ---------------------------------------------------------------- Vollmacht
export function issueVollmacht(S, v) {
  const id = "v_" + b64u(crypto.randomBytes(6));
  // die Nachlese: freigabe MUST name a passage that already exists. There is no
  // text field on this path — a Vollmacht cannot carry prose written at issuance.
  if (!S.passages.has(v.freigabe_pid)) throw new Gone("freigabe-must-preexist");
  S.vollmachten.set(id, {
    id, status: "offen", eingeloest_durch_wurf_id: null, ausgestellt_at: now(), ...v,
  });
  audit(S, "vollmacht.issued", { id, inhaber: v.inhaber_character_id });
  return id;
}
export function revokeVollmacht(S, id) {
  const v = S.vollmachten.get(id); if (!v) throw new Gone("vollmacht-unknown");
  if (v.status === "offen") { v.status = "widerrufen"; audit(S, "vollmacht.revoked", { id }); }
}

// A door is visible only to its holder. Everyone else sees a red link — the SAME
// bytes a reader with no campaign at all sees.
export function projectLink(S, { link_id, viewer_character_id }) {
  for (const v of S.vollmachten.values()) {
    if (v.anker?.kind === "RoterLink" && v.anker.link_id === link_id &&
        v.status === "offen" && v.inhaber_character_id === viewer_character_id &&
        now() < v.verfall_at) {
      return { kind: "tuer", vollmacht_id: v.id, verfall_at: v.verfall_at };
    }
  }
  return { kind: "roter-link" };
}

// ---------------------------------------------------------------- der ausstehende Wurf
// Two phases, one durable object. Phase 1 rolls and persists `ausstehend`.
// Phase 2 confirms, exactly once, under compare-and-set on the Vollmacht.
function seededRoll(seed, sides) {
  const h = crypto.createHash("sha256").update(seed).digest();
  return (h.readUInt32BE(0) % sides) + 1;
}
export function openDoor(S, { vollmacht_id, actor_user_id, credential }) {
  const v = S.vollmachten.get(vollmacht_id);
  // Access-incident logging BEFORE the 404, so a lockout is attributable.
  if (!credential) {
    if (v && v.status === "offen")
      S.incidents.push({ campaign_id: v.campaign_id, user_id: actor_user_id, vollmacht_id, at: now() });
    throw new Gone("no-credential");
  }
  if (!v) throw new Gone("vollmacht-unknown");
  const char = S.chars.get(v.inhaber_character_id);
  if (!char || char.user_id !== actor_user_id) throw new Gone("not-holder");
  if (v.status !== "offen") throw new Gone("vollmacht-not-open");
  if (now() >= v.verfall_at) { v.status = "verfallen"; throw new Gone("vollmacht-expired"); }
  // Idempotent: reopening returns the SAME roll, never a new one.
  const existing = S.pendingByKey.get(vollmacht_id);
  if (existing) {
    const w = S.wuerfe.get(existing);
    if (w.status === "ausstehend" && now() - w.rolled_at < S.cfg.pendingWurfTtlMs) return w;
    if (w.status === "bestaetigt") return w;
  }
  const id = "w_" + b64u(crypto.randomBytes(6));
  const seed = b64u(crypto.randomBytes(16));
  const w = {
    id, vollmacht_id, seed, ausdruck: "1d20", ergebnis: seededRoll(seed, 20),
    schwelle: v.schwelle, status: "ausstehend", rolled_at: now(), paket_pin: v.paket_pin ?? "kern@1.0.0",
  };
  S.wuerfe.set(id, w);
  S.pendingByKey.set(vollmacht_id, id);
  audit(S, "wurf.pending", { id, vollmacht_id });
  return w;
}
// Idempotent confirm. Repeated calls return the identical result object;
// exactly one Revelation is ever created.
export function confirmMint(S, { wurf_id, actor_user_id }) {
  const w = S.wuerfe.get(wurf_id);
  if (!w) throw new Gone("wurf-unknown");
  if (w.status === "bestaetigt") return { minted: false, already: true, revelation: w.revelation };
  if (w.status === "verworfen") throw new Gone("wurf-discarded");
  if (now() - w.rolled_at >= S.cfg.pendingWurfTtlMs) {
    w.status = "verworfen";
    const vv = S.vollmachten.get(w.vollmacht_id);
    if (vv && vv.status === "offen") S.pendingByKey.delete(w.vollmacht_id); // Vollmacht stays OFFEN, unspent
    throw new Gone("wurf-window-lapsed");
  }
  const v = S.vollmachten.get(w.vollmacht_id);
  if (!v) throw new Gone("vollmacht-unknown");
  const char = S.chars.get(v.inhaber_character_id);
  if (!char || char.user_id !== actor_user_id) throw new Gone("not-holder");
  // --- the compare-and-set. This is the revocation race, closed.
  if (v.status !== "offen" || v.eingeloest_durch_wurf_id !== null) throw new Gone("vollmacht-not-open");
  if (now() >= v.verfall_at) { v.status = "verfallen"; throw new Gone("vollmacht-expired"); }
  if (w.ergebnis < w.schwelle) {
    w.status = "bestaetigt"; w.revelation = null;
    if (!v.wiederholbar) { v.status = "eingeloest"; v.eingeloest_durch_wurf_id = w.id; }
    audit(S, "wurf.failed", { id: w.id });
    return { minted: false, already: false, revelation: null };
  }
  v.status = "eingeloest"; v.eingeloest_durch_wurf_id = w.id;
  w.status = "bestaetigt";
  const key = `${v.inhaber_character_id}:${v.freigabe_pid}`;
  S.revelations.add(key);
  w.revelation = { character_id: v.inhaber_character_id, pid: v.freigabe_pid, granted_via: "vollmacht", at: now() };
  audit(S, "praegung.beleg", { wurf_id: w.id, vollmacht_id: v.id, via: "vollmacht" });
  return { minted: true, already: false, revelation: w.revelation };
}

// ---------------------------------------------------------------- Nachrechnen
export function nachrechnen(S, wurf_id) {
  const w = S.wuerfe.get(wurf_id); if (!w) throw new Gone("wurf-unknown");
  return { ok: seededRoll(w.seed, 20) === w.ergebnis, paket_pin: w.paket_pin };
}

// ---------------------------------------------------------------- reachability
// Structural, not a policy: WebAuthn binds a credential to an RP ID, and an RP ID
// must be a registrable domain. A bare IPv4/IPv6 literal cannot be one, and a
// non-secure context has no WebAuthn at all.
export function passkeyEligible(originUrl) {
  let u; try { u = new URL(originUrl); } catch { return { ok: false, reason: "unparseable" }; }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIPv6 = host.includes(":");
  const isLocalhost = host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1";
  const secure = u.protocol === "https:" || isLocalhost;
  if (!secure) return { ok: false, reason: "insecure-context" };
  if (isIPv4 || isIPv6) return { ok: false, reason: "rp-id-cannot-be-an-ip" };
  if (!host.includes(".") && !isLocalhost) return { ok: false, reason: "rp-id-not-registrable" };
  return { ok: true };
}

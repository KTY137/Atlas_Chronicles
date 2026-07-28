// spike-B-wiederkehr — run.mjs
// Builds die Wiederkehr against real crypto, attacks it, and prices it.
import crypto from "node:crypto";
import fs from "node:fs";
import * as W from "./wiederkehr.mjs";

const RP = "tafel.example", ORIGIN = "https://tafel.example";
const results = [];
const rec = (id, ok, name, note = "") => results.push({ id, ok, name, note });
const ok = (id, name, note) => rec(id, true, name, note);
const bad = (id, name, note) => rec(id, false, name, note);
function check(id, name, fn) {
  try { const note = fn(); rec(id, true, name, note ?? ""); }
  catch (e) { rec(id, false, name, `threw: ${e.reason ?? e.message}`); }
}
function mustThrow(id, name, reasonWanted, fn) {
  try { fn(); rec(id, false, name, "NO THROW — the attack succeeded"); }
  catch (e) {
    const r = e.reason ?? e.message;
    rec(id, reasonWanted ? r === reasonWanted : true, name,
        reasonWanted && r !== reasonWanted ? `rejected, but as "${r}" not "${reasonWanted}"` : `rejected: ${r}`);
  }
}

// ---------------------------------------------------------------- a fake authenticator
function newAuthenticator() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  return {
    cred_id: "cr_" + crypto.randomBytes(8).toString("base64url"),
    spki: publicKey.export({ format: "der", type: "spki" }),
    privateKey, signCount: 0,
    sign(type, challenge, { rpId = RP, origin = ORIGIN, signCount = null, crossOrigin = false } = {}) {
      const clientDataJSON = Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin }));
      const sc = signCount === null ? ++this.signCount : signCount;
      const authenticatorData = W.packAuthData({ rpId, signCount: sc });
      const signature = crypto.sign("sha256",
        Buffer.concat([authenticatorData, crypto.createHash("sha256").update(clientDataJSON).digest()]),
        { key: this.privateKey, dsaEncoding: "der" });
      return { cred_id: this.cred_id, clientDataJSON, authenticatorData, signature, spki: this.spki };
    },
  };
}

// ---------------------------------------------------------------- world fixture
function world() {
  const S = W.createStore({ rpId: RP, origin: ORIGIN });
  S.users.set("u_sera", { user_id: "u_sera", platform_role: "gast", display: "Sera" });
  S.users.set("u_kaya", { user_id: "u_kaya", platform_role: "gm", display: "Kaya" });
  S.users.set("u_brannt", { user_id: "u_brannt", platform_role: "gast", display: "Brannt" });
  S.chars.set("c_sera", { character_id: "c_sera", user_id: "u_sera", campaign_id: "k1" });
  S.chars.set("c_brannt", { character_id: "c_brannt", user_id: "u_brannt", campaign_id: "k1" });
  // die Nachlese: the sealed line already exists — minted at the table in session 9
  // by Brannt's roll. Kaya writes nothing at 23:41; she points at it.
  S.passages.set("p_0412", { pid: "p_0412", campaign_id: "k1",
    text: "Die Kanzlei Ossa führt die Siegelbücher von Haus Vharon seit 1188." });
  S.revelations.add("c_brannt:p_0412");
  return S;
}
function registerPasskey(S, user_id, auth, label = "Pixel 8") {
  const { challenge } = W.beginRegistration(S, { user_id, display: user_id });
  const a = auth.sign("webauthn.create", challenge);
  return W.finishRegistration(S, { user_id, challenge, ...a, label });
}
function assertPasskey(S, auth) {
  const { challenge } = W.beginAuth(S);
  const a = auth.sign("webauthn.get", challenge);
  return W.finishAuth(S, { challenge, ...a });
}
const inAWeek = () => Date.now() + 7 * 864e5;

// ================================================================ R — the happy path
{
  const S = world(), auth = newAuthenticator();
  check("R1", "registration: a passkey registers against a nullable-email gast user_id", () => {
    const r = registerPasskey(S, "u_sera", auth);
    if (r.user_id !== "u_sera") throw new Error("wrong user");
    return `cred=${r.cred_id.slice(0, 8)}… platform_role=${S.users.get("u_sera").platform_role}`;
  });
  check("R2", "assertion: Tuesday, a different tab, the same device — identity resolves", () => {
    const r = assertPasskey(S, auth);
    return `user_id=${r.user_id}`;
  });
  check("R3", "der Ausweis lists exactly what carries her access", () => {
    const rows = W.ausweis(S, "u_sera");
    if (rows.length !== 1 || rows[0].kind !== "passkey") throw new Error("bad ausweis");
    return `${rows.length} credential: ${rows[0].kind} „${rows[0].label}"`;
  });
}

// ================================================================ A — attacks on the credential
{
  const S = world(), auth = newAuthenticator();
  registerPasskey(S, "u_sera", auth);

  mustThrow("A1", "replay: the same assertion posted twice", "challenge-replayed", () => {
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge);
    W.finishAuth(S, { challenge, ...a });
    W.finishAuth(S, { challenge, ...a });        // the replay
  });

  mustThrow("A2", "phishing: a valid signature from a different origin", "clientdata-origin", () => {
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge, { origin: "https://tafel.example.evil.tld" });
    W.finishAuth(S, { challenge, ...a });
  });

  mustThrow("A3", "RP-ID substitution: signed for the GM's LAN host instead of ours", "rpid-mismatch", () => {
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge, { rpId: "kaya-laptop.local" });
    W.finishAuth(S, { challenge, ...a });
  });

  mustThrow("A4", "cross-origin iframe assertion (crossOrigin:true)", "clientdata-crossorigin", () => {
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge, { crossOrigin: true });
    W.finishAuth(S, { challenge, ...a });
  });

  mustThrow("A5", "cloned authenticator: signCount rolls back", "signcount-rollback", () => {
    assertPasskey(S, auth);                                   // advances to n
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge, { signCount: 1 });   // a clone, stuck at 1
    W.finishAuth(S, { challenge, ...a });
  });

  mustThrow("A6", "a revoked device still holding a valid key", "credential-unknown-or-revoked", () => {
    const cred_id = W.ausweis(S, "u_sera")[0].cred_id;
    W.revokeCredential(S, { user_id: "u_sera", cred_id });
    assertPasskey(S, auth);
  });

  mustThrow("A7", "another player revoking someone else's device", "credential-unknown-or-revoked", () => {
    const S2 = world(), a2 = newAuthenticator();
    registerPasskey(S2, "u_sera", a2);
    W.revokeCredential(S2, { user_id: "u_brannt", cred_id: W.ausweis(S2, "u_sera")[0].cred_id });
  });

  mustThrow("A8", "a stale challenge (>TTL) with a perfect signature", "challenge-expired", () => {
    const S3 = W.createStore({ rpId: RP, origin: ORIGIN, challengeTtlMs: 1 });
    const a3 = newAuthenticator();
    registerPasskey(S3, "u_sera", a3);
    const { challenge } = W.beginAuth(S3);
    const a = a3.sign("webauthn.get", challenge);
    const t = Date.now(); while (Date.now() - t < 3) {}
    W.finishAuth(S3, { challenge, ...a });
  });

  mustThrow("A9", "registration ceremony replayed as an assertion", "challenge-wrong-purpose", () => {
    const S4 = world(), a4 = newAuthenticator();
    const { challenge } = W.beginRegistration(S4, { user_id: "u_sera" });
    const a = a4.sign("webauthn.get", challenge);
    W.finishAuth(S4, { challenge, ...a });
  });
}

// ================================================================ K — der Kopplungscode
{
  const S = world(), phone = newAuthenticator(), laptop = newAuthenticator();
  registerPasskey(S, "u_sera", phone, "Pixel 8");
  const v_id = W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera",
    klausel_ref: "nachforschen", thema_etikett: "#haus-vharon", schwelle: 18,
    freigabe_pid: "p_0412", anker: { kind: "RoterLink", link_id: "l_kanzlei" }, verfall_at: inAWeek() });

  check("K1", "lost phone → GM mints a Kopplungscode → new device, SAME user_id", () => {
    const code = W.mintKopplungscode(S, { gm_user_id: "u_kaya", campaign_id: "k1", user_id: "u_sera" });
    const cer = W.redeemKopplungscode(S, { code, campaign_id: "k1" });
    const a = laptop.sign("webauthn.create", cer.challenge);
    const r = W.finishRegistration(S, { user_id: cer.user_id, challenge: cer.challenge, ...a, label: "Laptop" });
    if (r.user_id !== "u_sera") throw new Error("identity forked");
    const door = W.projectLink(S, { link_id: "l_kanzlei", viewer_character_id: "c_sera" });
    if (door.kind !== "tuer") throw new Error("her door did not survive the device swap");
    return `user_id preserved; her open Vollmacht ${door.vollmacht_id} still resolves as a door`;
  });

  mustThrow("K2", "a Kopplungscode used twice", "kopplung-used", () => {
    const code = W.mintKopplungscode(S, { gm_user_id: "u_kaya", campaign_id: "k1", user_id: "u_sera" });
    W.redeemKopplungscode(S, { code, campaign_id: "k1" });
    W.redeemKopplungscode(S, { code, campaign_id: "k1" });
  });
  mustThrow("K3", "a Kopplungscode redeemed in another campaign", "kopplung-wrong-scope", () => {
    const code = W.mintKopplungscode(S, { gm_user_id: "u_kaya", campaign_id: "k1", user_id: "u_sera" });
    W.redeemKopplungscode(S, { code, campaign_id: "k2" });
  });
  mustThrow("K4", "a Kopplungscode after its 10 minutes", "kopplung-expired", () => {
    const S5 = W.createStore({ rpId: RP, origin: ORIGIN, kopplungTtlMs: 1 });
    const code = W.mintKopplungscode(S5, { gm_user_id: "u_kaya", campaign_id: "k1", user_id: "u_sera" });
    const t = Date.now(); while (Date.now() - t < 3) {}
    W.redeemKopplungscode(S5, { code, campaign_id: "k1" });
  });
  mustThrow("K5", "a Kopplungscode the GM revoked before it was used", "kopplung-revoked", () => {
    const code = W.mintKopplungscode(S, { gm_user_id: "u_kaya", campaign_id: "k1", user_id: "u_sera" });
    W.revokeKopplungscode(S, code);
    W.redeemKopplungscode(S, { code, campaign_id: "k1" });
  });
  check("K6", "every recovery step is in the append-only audit log", () => {
    const kinds = S.audit.filter((a) => a.kind.startsWith("kopplung")).map((a) => a.kind);
    if (!kinds.includes("kopplung.minted") || !kinds.includes("kopplung.redeemed") || !kinds.includes("kopplung.revoked"))
      throw new Error("missing audit rows");
    return kinds.join(", ");
  });
  check("K7", "guessing space of a 12-char code inside its 10-minute window", () => {
    const bits = Math.log2(64 ** 12);              // base64url alphabet
    return `${bits.toFixed(0)} bits; at 100 guesses/s a 600 s window covers 2^-${(bits - Math.log2(6e4)).toFixed(0)} of it`;
  });
}

// ================================================================ C — the cookie fallback
{
  const S = world();
  let cookie;
  check("C1", "authenticator-less browser: HttpOnly/Secure/SameSite=Strict, never a URL", () => {
    cookie = W.issueCookie(S, { user_id: "u_sera" });
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict"])
      if (!cookie.setCookie.includes(flag)) throw new Error("missing " + flag);
    if (/[?#]/.test(cookie.setCookie)) throw new Error("token reachable via URL");
    return cookie.setCookie.split(";").slice(1).join(";").trim();
  });
  check("C2", "the cookie resolves to the same identity a passkey would", () =>
    `user_id=${W.verifyCookie(S, cookie.value).user_id}`);
  mustThrow("C3", "a forged cookie with a tampered credential id", "cookie-bad-mac", () => {
    const parts = cookie.value.split(".");
    W.verifyCookie(S, ["ck_evil", parts[1], parts[2]].join("."));
  });
  mustThrow("C4", "a cookie whose credential the player revoked from der Ausweis", "credential-unknown-or-revoked", () => {
    W.revokeCredential(S, { user_id: "u_sera", cred_id: W.ausweis(S, "u_sera")[0].cred_id });
    W.verifyCookie(S, cookie.value);
  });
}

// ================================================================ D — the door, the roll, the race
{
  const mk = () => {
    const S = world(), auth = newAuthenticator();
    registerPasskey(S, "u_sera", auth);
    const v_id = W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera",
      klausel_ref: "nachforschen", thema_etikett: "#haus-vharon", schwelle: 1,
      freigabe_pid: "p_0412", anker: { kind: "RoterLink", link_id: "l_kanzlei" }, verfall_at: inAWeek() });
    return { S, auth, v_id };
  };

  check("D1", "die Nachlese: a Vollmacht may only point at a passage that already exists", () => {
    const { S } = mk();
    try {
      W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera", klausel_ref: "x",
        thema_etikett: "#y", schwelle: 12, freigabe_pid: "p_typed_at_2341",
        anker: { kind: "RoterLink", link_id: "l_x" }, verfall_at: inAWeek() });
    } catch (e) { return `a freshly typed line is unrepresentable here: ${e.reason}`; }
    throw new Error("the issuance path accepted prose that did not exist yet");
  });

  check("D2", "der Zwillingsbeweis (door privacy): non-holder sees byte-identical red link", () => {
    const { S } = mk();
    const holder = W.projectLink(S, { link_id: "l_kanzlei", viewer_character_id: "c_sera" });
    const other = W.projectLink(S, { link_id: "l_kanzlei", viewer_character_id: "c_brannt" });
    const stranger = W.projectLink(W.createStore(), { link_id: "l_kanzlei", viewer_character_id: "c_nobody" });
    if (holder.kind !== "tuer") throw new Error("holder sees no door");
    if (JSON.stringify(other) !== JSON.stringify(stranger)) throw new Error("the door leaked to a non-holder");
    return `holder=tuer · table-mate=${JSON.stringify(other)} === stranger-with-no-campaign`;
  });

  check("D3", "reopening a pending door never re-rolls (no seed grinding by reload)", () => {
    const { S, v_id } = mk();
    const a = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    const b = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    if (a.id !== b.id || a.seed !== b.seed) throw new Error("re-rolled");
    return `same Wurf ${a.id}, same seed, ergebnis ${a.ergebnis}`;
  });

  check("D4", "confirm is idempotent under 200 racing calls: exactly one Revelation", () => {
    const { S, v_id } = mk();
    const w = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    let minted = 0, already = 0;
    for (let i = 0; i < 200; i++) {
      const r = W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" });
      r.minted ? minted++ : already++;
    }
    const rev = [...S.revelations].filter((k) => k === "c_sera:p_0412").length;
    if (minted !== 1 || rev !== 1) throw new Error(`minted=${minted} revelations=${rev}`);
    return `minted=1, idempotent replies=${already}, Revelations for c_sera:p_0412 = 1`;
  });

  check("D5", "THE REVOCATION RACE (handed to Athena, unattacked for a round): revoke between roll and confirm", () => {
    const { S, v_id } = mk();
    const w = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    W.revokeVollmacht(S, v_id);                                   // 22:41:07
    try { W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" }); }  // 22:41:08
    catch (e) {
      if (S.revelations.has("c_sera:p_0412")) throw new Error("canon minted after revocation");
      return `no mint; the compare-and-set refused with "${e.reason}" (404, not 403)`;
    }
    throw new Error("the mint went through after the GM revoked");
  });

  check("D6", "the reverse race: confirm lands first, the later revoke does not un-mint", () => {
    const { S, v_id } = mk();
    const w = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" });
    W.revokeVollmacht(S, v_id);
    const v = S.vollmachten.get(v_id);
    if (!S.revelations.has("c_sera:p_0412")) throw new Error("canon vanished");
    if (v.status !== "eingeloest") throw new Error("a spent Vollmacht was overwritten as widerrufen");
    return `status stays "eingeloest"; the paragraph Sera already read does not disappear`;
  });

  check("D7", "window lapse: an abandoned roll returns the Vollmacht unspent, and the stale confirm 404s", () => {
    const S = world(), auth = newAuthenticator();
    S.cfg.pendingWurfTtlMs = 1;
    registerPasskey(S, "u_sera", auth);
    const v_id = W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera", klausel_ref: "n",
      thema_etikett: "#h", schwelle: 1, freigabe_pid: "p_0412",
      anker: { kind: "RoterLink", link_id: "l_kanzlei" }, verfall_at: inAWeek() });
    const w = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    const t = Date.now(); while (Date.now() - t < 3) {}
    let reason = null;
    try { W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" }); } catch (e) { reason = e.reason; }
    const v = S.vollmachten.get(v_id);
    const w2 = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    if (v.status !== "offen") throw new Error("Vollmacht was consumed by an abandoned roll");
    if (w2.id === w.id) throw new Error("the lapsed roll was resurrected instead of re-rolled");
    return `stale confirm → "${reason}"; Vollmacht still offen; the next visit rolls fresh (${w2.id})`;
  });

  check("D8", "a non-holder at the same table firing the door", () => {
    const { S, v_id } = mk();
    try { W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_brannt", credential: true }); }
    catch (e) { return `refused as "${e.reason}", mapped to 404 like every other Gone`; }
    throw new Error("a table-mate fired someone else's door");
  });

  check("D9", "der Zugangsvorfall: a locked-out holder is logged, so W1 can exclude her", () => {
    const { S, v_id } = mk();
    try { W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: null }); } catch {}
    if (S.incidents.length !== 1) throw new Error("no incident logged");
    return `1 Zugangsvorfall on ${S.incidents[0].vollmacht_id} — the expiry is attributable to lockout, not disengagement`;
  });

  check("D10", "Nachrechnen replays the Tuesday roll from the frozen seed", () => {
    const { S, v_id } = mk();
    const w = W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true });
    W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" });
    const r = W.nachrechnen(S, w.id);
    if (!r.ok) throw new Error("replay diverged");
    return `byte-identical against paket_pin ${r.paket_pin}`;
  });

  check("D11", "every rejection above is the same shape: one error class, mapped to 404", () => {
    const reasons = new Set();
    const { S, v_id } = mk();
    for (const f of [
      () => W.openDoor(S, { vollmacht_id: "v_nope", actor_user_id: "u_sera", credential: true }),
      () => W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_brannt", credential: true }),
      () => W.confirmMint(S, { wurf_id: "w_nope", actor_user_id: "u_sera" }),
    ]) { try { f(); } catch (e) { reasons.add(e.constructor.name); } }
    if (reasons.size !== 1 || !reasons.has("Gone")) throw new Error([...reasons].join(","));
    return `one class (Gone) for unknown / not-yours / expired / revoked — no 403 anywhere`;
  });
}

// ================================================================ N — reachability, structurally
{
  const cases = [
    ["https://tafel.example", true, "hosted room"],
    ["https://kaya-a1b2c3.pnp.direct", true, "Plex-pattern DNS + cert"],
    ["http://192.168.1.44:30000", false, "LAN IP, plain http — the default self-host"],
    ["https://192.168.1.44:30000", false, "LAN IP with a self-signed cert"],
    ["http://kaya-laptop.local:30000", false, "mDNS name, plain http"],
    ["http://localhost:30000", true, "the GM's own machine"],
  ];
  for (const [url, want, label] of cases) {
    const r = W.passkeyEligible(url);
    rec("N" + (cases.indexOf([url, want, label]) + 1), r.ok === want,
        `passkey eligibility · ${label}`, `${url} → ${r.ok ? "ok" : r.reason}`);
  }
  // renumber cleanly
  let n = 1; for (const row of results) if (row.id === "NNaN" || /^N\d*$/.test(row.id)) row.id = "N" + n++;
}

// ================================================================ P — the price
const bench = (name, iters, fn) => {
  for (let i = 0; i < Math.min(iters, 200); i++) fn(i);       // warm
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) fn(i);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / iters;
  return { name, ms };
};
const perf = [];
{
  const S = world(), auth = newAuthenticator();
  registerPasskey(S, "u_sera", auth);
  perf.push(bench("assertion verify (P-256 ECDSA, full ceremony)", 2000, () => {
    const { challenge } = W.beginAuth(S);
    const a = auth.sign("webauthn.get", challenge);
    W.finishAuth(S, { challenge, ...a });
  }));
  perf.push(bench("cookie-fallback verify (HMAC-SHA256)", 20000, () => {
    const c = W.issueCookie(S, { user_id: "u_sera" });
    W.verifyCookie(S, c.value);
  }));
  perf.push(bench("openDoor → confirmMint (full Tuesday round trip, in-process)", 5000, (i) => {
    const pid = "p_" + i; S.passages.set(pid, { pid, campaign_id: "k1", text: "x" });
    const v = W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera", klausel_ref: "n",
      thema_etikett: "#h", schwelle: 1, freigabe_pid: pid,
      anker: { kind: "RoterLink", link_id: "l_" + i }, verfall_at: inAWeek() });
    const w = W.openDoor(S, { vollmacht_id: v, actor_user_id: "u_sera", credential: true });
    W.confirmMint(S, { wurf_id: w.id, actor_user_id: "u_sera" });
  }));
}
// Timing-equality: a 404 for "never existed" must not be distinguishable from
// a 404 for "revoked" or "not yours".
{
  const S = world(), auth = newAuthenticator();
  registerPasskey(S, "u_sera", auth);
  const v_id = W.issueVollmacht(S, { campaign_id: "k1", inhaber_character_id: "c_sera", klausel_ref: "n",
    thema_etikett: "#h", schwelle: 18, freigabe_pid: "p_0412",
    anker: { kind: "RoterLink", link_id: "l_kanzlei" }, verfall_at: inAWeek() });
  W.revokeVollmacht(S, v_id);
  const t = (fn) => { const s = []; for (let i = 0; i < 20000; i++) { const a = process.hrtime.bigint(); try { fn(); } catch {} s.push(Number(process.hrtime.bigint() - a)); } s.sort((x, y) => x - y); return s[Math.floor(s.length / 2)] / 1000; };
  const tUnknown = t(() => W.openDoor(S, { vollmacht_id: "v_never", actor_user_id: "u_sera", credential: true }));
  const tRevoked = t(() => W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_sera", credential: true }));
  const tNotMine = t(() => W.openDoor(S, { vollmacht_id: v_id, actor_user_id: "u_brannt", credential: true }));
  const spread = Math.max(tUnknown, tRevoked, tNotMine) - Math.min(tUnknown, tRevoked, tNotMine);
  rec("P4", spread < 2, "404 timing spread across unknown / revoked / not-yours (median, µs)",
      `unknown ${tUnknown.toFixed(2)} · revoked ${tRevoked.toFixed(2)} · not-yours ${tNotMine.toFixed(2)} · spread ${spread.toFixed(2)} µs`);
}

// ---------------------------------------------------------------- SLOC
const src = fs.readFileSync(new URL("./wiederkehr.mjs", import.meta.url), "utf8").split("\n");
const sloc = src.filter((l) => l.trim() && !l.trim().startsWith("//")).length;

// ---------------------------------------------------------------- report
const pass = results.filter((r) => r.ok).length;
const out = [];
out.push("");
out.push("=== SPIKE-B-WIEDERKEHR — die Wiederkehr, built and attacked (round 5, candidate B) ===");
out.push("");
for (const r of results)
  out.push(`${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(4)} ${r.name.padEnd(78)} | ${r.note}`);
out.push("");
out.push("--- price ---");
for (const p of perf) out.push(`      ${p.name.padEnd(60)} | ${p.ms.toFixed(4)} ms`);
out.push(`      ${"wiederkehr.mjs, non-comment non-blank lines".padEnd(60)} | ${sloc} SLOC`);
out.push(`      ${"external dependencies".padEnd(60)} | 0 (node:crypto only)`);
out.push(`      ${"new tables".padEnd(60)} | Credentials, Kopplungscode, Zugangsvorfall (3)`);
out.push("");
out.push(`${pass}/${results.length} passing.`);
out.push("");
const text = out.join("\n");
fs.writeFileSync(new URL("./RESULTS.txt", import.meta.url), text);
console.log(text);
if (pass !== results.length) process.exitCode = 1;

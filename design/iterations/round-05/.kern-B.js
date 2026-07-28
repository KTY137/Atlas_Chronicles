"use strict";
/* ============================================================================
   KERN-B · Round 5, Candidate B — „Die Woche, wirklich gehärtet"

   Pure functions, no DOM, no framework. This file is the single source of
   truth for four things this lineage has priced for four rounds and never run:

     1 · Die Sicht        — server-side per-character projection (S-P1)
     2 · Der Zwillingsbeweis — byte equality across an unheld half
     3 · Die Wiederkehr   — the passkey/recovery subsystem, as a state machine
     4 · Der ausstehende Wurf — idempotent two-phase mint under partition

   plus two things this candidate invents:

     5 · Die Nachlese     — sealed lines gleaned from the session buffer
     6 · Die Wochenprobe  — gate W1 as arithmetic, with attributed exclusions

   spike-B1-tafel.html inlines these same functions verbatim. There is no
   second implementation. That is the point.
   ========================================================================= */

/* ---------------------------------------------------------------- 0 · Würfel
   Integer-only, seed-bound, locale-free. Carried from CHAMPION §4.11 so
   Nachrechnen has exactly one code path.                                    */

function fnv1a(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seedInt) {
  let s = seedInt >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

function wuerfel(seed, sides) {
  const rnd = mulberry32(fnv1a(seed));
  return (rnd() % sides) + 1;
}

/* ============================================================================
   1 · DIE SICHT — the projector.
   Four rounds of this lineage have said "the server projects". Nobody wrote
   the projector. This is it: 41 statements. It takes a world and a reader and
   returns a payload. Unheld things are ABSENT, not flagged. There is no
   `visible: false` anywhere in the output, by construction — the projector
   never constructs the node at all.
   ========================================================================= */

const LEITUNG = Symbol("NurLeitung"); // GM-only. No encoder in the player codec.

function nurLeitung(value) {
  return { [LEITUNG]: true, value };
}

/** haelt(world, actorId, pid) — does this actor hold this passage? */
function haelt(world, actorId, pid) {
  const key = actorId + " " + pid;
  return world.revelationen.has(key);
}

/** quelle(world, actorId, pid) — HOW does she hold it? Erfahren schlägt Gehört. */
function quelle(world, actorId, pid) {
  const key = actorId + " " + pid;
  const r = world.revelationen.get(key);
  return r ? r.quelle : null; // "wurf" | "gesprochen" | "gehoert" | "passage"
}

/**
 * projiziere(world, leser) → the ENTIRE payload a given reader may receive.
 * `leser` is a character_id, or "SL" for the GM, or null for a stranger.
 * This is the only place in the product where visibility is decided.
 */
function projiziere(world, leser) {
  const istSL = leser === "SL";
  const out = { regionen: [], figuren: [], initiative: [], tueren: [] };

  // --- Regions. A region is present iff the reader holds its anchor passage.
  for (const reg of world.regionen) {
    if (!istSL && !haelt(world, leser, reg.pid)) continue; // ABSENT, not hidden
    out.regionen.push({
      id: reg.id,
      titel: reg.titel,
      zellen: reg.zellen,
      hoehe: reg.hoehe,
      pid: reg.pid,
      // erfahrungsgrad travels with the region so the client never derives it
      grad: istSL ? "leitung" : quelle(world, leser, reg.pid)
    });
  }
  const sichtbareRegionen = new Set(out.regionen.map(r => r.id));

  // --- Tokens. A token is present iff it stands in a region the reader holds,
  //     or it is the reader's own actor (which she always sees).
  for (const f of world.figuren) {
    const eigen = !istSL && f.actor === leser;
    if (!istSL && !eigen && !sichtbareRegionen.has(f.region)) continue;
    out.figuren.push({
      id: f.id, name: f.name, x: f.x, y: f.y, z: f.z,
      region: f.region, seite: f.seite, zustand: f.zustand,
      // HP numbers are GM-only for NPCs — a second projection axis, same choke point
      tp: istSL || f.seite === "gruppe" ? f.tp : null
    });
  }
  const sichtbareFiguren = new Set(out.figuren.map(f => f.id));

  // --- Initiative. Only entries whose token is present. No gaps, no "???"
  //     placeholder: a placeholder is a leak with a polite face.
  for (const e of world.initiative) {
    if (!sichtbareFiguren.has(e.figur)) continue;
    out.initiative.push({ figur: e.figur, wert: e.wert, dran: e.dran });
  }

  // --- Doors. A Vollmacht is visible ONLY to its holder. To everyone else the
  //     anchor renders as an ordinary red link — the same bytes as for a reader
  //     with no campaign at all.
  for (const v of world.vollmachten) {
    if (v.status !== "offen") continue;
    if (istSL) { out.tueren.push({ id: v.id, anker: v.anker, inhaber: v.inhaber, verfall: v.verfall }); continue; }
    if (v.inhaber !== leser) continue;
    out.tueren.push({ id: v.id, anker: v.anker, inhaber: v.inhaber, verfall: v.verfall });
  }

  // --- The GM's set difference. NurLeitung — no encoder in the player codec,
  //     so it cannot be serialised into a player payload even by mistake.
  if (istSL) out.woche = nurLeitung(wochenDifferenz(world));

  return out;
}

/** Serialise a payload for the wire. Throws if anything NurLeitung is present. */
function kodiere(payload) {
  return JSON.stringify(payload, function (k, v) {
    if (v && typeof v === "object" && v[LEITUNG]) {
      throw new Error("B9-Verletzung: NurLeitung im Spielerpaket bei ." + k);
    }
    return v;
  });
}

/* ============================================================================
   2 · DER ZWILLINGSBEWEIS — same held half ⇒ same bytes.
   Build two worlds that agree on everything the reader holds and disagree
   wildly on everything she does not. If one byte differs, the projector leaks.
   ========================================================================= */

function zwillingsbeweis(weltA, weltB, leser) {
  const a = kodiere(projiziere(weltA, leser));
  const b = kodiere(projiziere(weltB, leser));
  return { gleich: a === b, bytesA: a.length, bytesB: b.length, a, b };
}

/* ============================================================================
   3 · DIE WIEDERKEHR — the passkey/recovery subsystem, actually written.
   CHAMPION §15.15: "Round 5 owes a real cost estimate for this subsystem,
   checked against something." This is the something.
   ========================================================================= */

const JETZT = { t: 0 }; // injectable clock; no Date.now() in the state machine

function neueIdentitaet(userId) {
  return { userId, credentials: [], vorfaelle: [], kopplung: null };
}

/** Silent passkey registration at join. */
function registriere(id, label, kind) {
  const c = { credId: "c" + (id.credentials.length + 1), label, kind,
              registriert: JETZT.t, zuletzt: JETZT.t, widerrufen: null };
  id.credentials.push(c);
  return c;
}

/** Present a credential. Returns a session or an attributed refusal. */
function praesentiere(id, credId, vollmachtOffen) {
  const c = id.credentials.find(x => x.credId === credId && !x.widerrufen);
  if (!c) {
    // Der Zugangsvorfall: log WHY a door went unfired, so W1 can subtract it.
    id.vorfaelle.push({ at: JETZT.t, grund: "kein_credential", vollmachtOffen });
    return { ok: false, grund: "kein_credential" };
  }
  c.zuletzt = JETZT.t;
  return { ok: true, userId: id.userId, credId };
}

/** GM gesture „Zugang erneuern" → a Kopplungscode, Vollmacht-shaped. */
function mintKopplung(id, sl) {
  if (sl !== "SL") return { ok: false, grund: "nur_leitung" };
  id.kopplung = { code: "K-" + fnv1a(id.userId + ":" + JETZT.t).toString(36),
                  aus: JETZT.t, verfall: JETZT.t + 600, benutzt: false };
  return { ok: true, code: id.kopplung.code };
}

/** Redeem it. Single use, 10 minutes, same user_id, never a new identity. */
function loeseKopplung(id, code, label) {
  const k = id.kopplung;
  if (!k || k.code !== code) return { ok: false, grund: "unbekannt" };
  if (k.benutzt) return { ok: false, grund: "verbraucht" };
  if (JETZT.t > k.verfall) return { ok: false, grund: "verfallen" };
  k.benutzt = true;
  const c = registriere(id, label, "passkey");
  return { ok: true, credId: c.credId, userId: id.userId }; // SAME user_id
}

function widerrufe(id, credId) {
  const c = id.credentials.find(x => x.credId === credId);
  if (!c) return false;
  c.widerrufen = JETZT.t;
  return true;
}

/* ============================================================================
   4 · DER AUSSTEHENDE WURF — two-phase mint, idempotent under partition.
   The seam the brief asks every candidate to stress: a network partition
   between the two keypresses.
   ========================================================================= */

function neueWurfhalde() { return new Map(); }

/**
 * wuerfeln — phase 1. Idempotent on (vollmacht_id): re-entering an open door
 * with a pending Wurf returns the SAME roll. It never re-rolls.
 */
function wuerfeln(halde, vollmacht, welt, jetzt) {
  const bestehend = [...halde.values()].find(
    w => w.vollmacht === vollmacht.id && w.status === "ausstehend" && jetzt < w.fenster);
  if (bestehend) return { ...bestehend, wiederholt: true };
  const seed = vollmacht.id + ":" + vollmacht.inhaber + ":" + vollmacht.klausel;
  const roh = wuerfel(seed, 20);
  const bonus = welt.bonusFuer(vollmacht.inhaber, vollmacht.etikett);
  const w = { id: "w" + (halde.size + 1), vollmacht: vollmacht.id, seed,
              roh, bonus, ergebnis: roh + bonus, status: "ausstehend",
              fenster: jetzt + 1800, wiederholt: false };
  halde.set(w.id, w);
  return w;
}

/** bestaetigen — phase 2. Idempotent. Mints at most once, ever. */
function bestaetigen(halde, wurfId, vollmacht, jetzt) {
  const w = halde.get(wurfId);
  if (!w) return { ok: false, grund: "unbekannt" };
  if (w.status === "bestaetigt") return { ok: true, gepraegt: false, doppelt: true, passage: w.passage };
  if (jetzt >= w.fenster) { w.status = "verworfen"; vollmacht.status = "offen"; return { ok: false, grund: "fenster_zu" }; }
  if (vollmacht.status !== "offen") return { ok: false, grund: "nicht_offen" };
  if (w.ergebnis < vollmacht.schwelle) {
    vollmacht.status = "eingeloest"; w.status = "bestaetigt"; w.passage = null;
    return { ok: true, gepraegt: false, misserfolg: true };
  }
  vollmacht.status = "eingeloest";
  w.status = "bestaetigt";
  w.passage = vollmacht.freigabe;
  return { ok: true, gepraegt: true, passage: w.passage };
}

/* ============================================================================
   5 · DIE NACHLESE — the authoring-cost mechanism (§15.14's answer).
   The session buffer already holds everything the GM said and did not mint.
   Die Nachlese ranks those unminted fragments as candidate sealed lines and
   offers the three best at die Fällung. The GM types nothing. She chooses.
   ========================================================================= */

/**
 * Rank unminted buffer fragments as door candidates.
 * Score is deterministic, integer, explainable — every term is printed to the
 * GM, because invariant 6 (calculation transparency) applies to this too.
 */
function nachlese(puffer, welt, k) {
  const kandidaten = puffer
    .filter(f => !f.gepraegt && f.text.length >= 24)
    .map(f => {
      const terme = [];
      // + it names a thing the wiki already knows about
      const anker = welt.ankerFuer(f.etikett);
      if (anker) terme.push(["nennt einen Eintrag", 3]);
      // + it was said under a clause that can carry a threshold
      if (f.klausel) terme.push(["hat eine Klausel", 2]);
      // + somebody asked about it and nobody answered
      if (f.offeneFrage) terme.push(["unbeantwortete Frage", 4]);
      // + a player leaned on it more than once
      if (f.erwaehnungen > 1) terme.push(["mehrfach erwähnt ×" + f.erwaehnungen, f.erwaehnungen]);
      // − it is already canon somewhere else
      if (f.dupliziert) terme.push(["schon im Kanon", -5]);
      // − it is a rules aside, not a world fact
      if (f.regelkram) terme.push(["Regelrede", -3]);
      const punkte = terme.reduce((s, t) => s + t[1], 0);
      return { ...f, terme, punkte, anker };
    })
    .filter(c => c.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte || (a.id < b.id ? -1 : 1));
  return kandidaten.slice(0, k);
}

/**
 * Issue a Vollmacht from a gleaned candidate. Returns the object AND the exact
 * number of characters the GM had to type to produce it. That number is the
 * whole argument of §15.14 and it must be countable, not estimated.
 */
function ausNachlese(kandidat, inhaber, schwelle, sitzung) {
  return {
    vollmacht: {
      id: "v_" + kandidat.id, inhaber, klausel: kandidat.klausel,
      etikett: kandidat.etikett, schwelle,
      freigabe: kandidat.text,               // the sealed line, already written
      anker: kandidat.anker || { keim: kandidat.etikett },
      verfall: "NaechsteSitzung", status: "offen",
      herkunft: "nachlese", sitzung
    },
    getippteZeichen: 0,                       // she typed nothing
    tastendruecke: 2                          // V, then a threshold digit
  };
}

function kaltGetippt(text, schwelle) {
  return { getippteZeichen: text.length, tastendruecke: text.length + 3 };
}

/* ============================================================================
   6 · DIE WOCHENPROBE — gate W1 as arithmetic with attributed exclusions.
   A gate that is a paragraph cannot go red. A gate that is a function can.
   ========================================================================= */

function wochenprobe(kampagnen) {
  let ausgestellt = 0, gefeuert = 0, verfallen = 0;
  let ausgeschlossenW0 = 0, ausgeschlossenZugang = 0;
  const gruende = [];

  for (const k of kampagnen) {
    // W0 · die Ankerprobe: a GM who never issues at all is a wiki-depth
    // problem, not a refuted thesis. Excluded WITH A NAMED REASON.
    if (k.ausgestellt === 0) {
      ausgeschlossenW0++;
      gruende.push({ kampagne: k.id, grund: "W0: keine Vollmacht ausgestellt (Ankerprobe rot)" });
      continue;
    }
    ausgestellt += k.ausgestellt;
    gefeuert += k.gefeuert;
    // Der Zugangsvorfall: a door that expired because its holder could not get
    // in is a lockout, not a disengagement. It leaves BOTH sides of the ratio.
    const lockouts = Math.min(k.verfallen, k.zugangsvorfaelle);
    ausgeschlossenZugang += lockouts;
    verfallen += k.verfallen - lockouts;
    ausgestellt -= lockouts;
    if (lockouts) gruende.push({ kampagne: k.id, grund: `Zugangsvorfall: ${lockouts} Tür(en) als Aussperrung ausgebucht` });
  }

  const naiv = kampagnen.reduce((s, k) => s + k.gefeuert, 0) /
               Math.max(1, kampagnen.reduce((s, k) => s + k.ausgestellt, 0));
  const quote = gefeuert / Math.max(1, ausgestellt);
  return {
    nenner: ausgestellt, zaehler: gefeuert, verfallen,
    quote, naiv,
    ausgeschlossenW0, ausgeschlossenZugang, gruende,
    gruen: quote >= 0.5 && ausgestellt >= 20,
    urteil: ausgestellt < 20
      ? "unentschieden — zu wenig Datenpunkte, die Probe läuft weiter"
      : quote >= 0.5 ? "grün — die Woche trägt" : "ROT — die These ist widerlegt"
  };
}

module.exports = {
  fnv1a, mulberry32, wuerfel,
  LEITUNG, nurLeitung, haelt, quelle, projiziere, kodiere, zwillingsbeweis,
  JETZT, neueIdentitaet, registriere, praesentiere, mintKopplung, loeseKopplung, widerrufe,
  neueWurfhalde, wuerfeln, bestaetigen,
  nachlese, ausNachlese, kaltGetippt,
  wochenprobe
};

/* wochenDifferenz is defined last because only the GM branch of the projector
   ever reaches it; hoisting keeps §1 readable. */
function wochenDifferenz(world) {
  return {
    offen: world.vollmachten.filter(v => v.status === "offen").length,
    eingeloest: world.vollmachten.filter(v => v.status === "eingeloest").length,
    verfallen: world.vollmachten.filter(v => v.status === "verfallen").length
  };
}

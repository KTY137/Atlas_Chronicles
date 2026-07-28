// spike-B-w1 — gate W1 („die Türquote") run as an instrument, not a document.
// Round 5, candidate B. Three questions, all answered with computation:
//   1. Can W1 as the CHAMPION specifies it distinguish a live thesis from a dead one?
//   2. What sample size and decision rule actually can?
//   3. Is criterion 3 (GM issuance <= 120 s/session) reachable by the champion's own
//      issuance mechanism? (Keystroke-Level Model, Card/Moran/Newell 1980.)
import fs from "node:fs";

const out = [];
const say = (s = "") => out.push(s);
const results = [];
const rec = (id, ok, name, note) => results.push({ id, ok, name, note });

// ---------------------------------------------------------------- rng
let _s = 20260727 >>> 0;
const rnd = () => (_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296;
const gamma = (k) => {                      // Marsaglia–Tsang, k >= 1 path with boost
  if (k < 1) return gamma(k + 1) * Math.pow(rnd(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { const u1 = rnd() || 1e-12, u2 = rnd() || 1e-12;
         x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = rnd() || 1e-12;
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
};
const beta = (a, b) => { const x = gamma(a); return x / (x + gamma(b)); };
const pois = (l) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ---------------------------------------------------------------- the pilot model
// A campaign has ONE latent enthusiasm p_c. Enthusiasm drives BOTH how many
// Vollmachten the GM issues and how often the player fires them — which is exactly
// why pooling over Vollmachten instead of over campaigns is the wrong denominator.
const KAPPA = 4;              // Beta concentration: heterogeneous, as a novel behaviour is
const LOCKOUT = 0.08;         // P(Zugangsvorfall) — excluded from the denominator per CHAMPION §5.3
function simulateCampaign(mu, weeks = 4) {
  const a = mu * KAPPA, b = (1 - mu) * KAPPA;
  const p = beta(a, b);
  let issued = 0, fired = 0, excluded = 0, weeksWithOffDayMint = 0;
  const lam = 0.6 + 3.4 * p;                       // enthusiasts issue more
  for (let w = 0; w < weeks; w++) {
    const k = Math.min(3, pois(lam));              // hard cap: <=1/player/week + 2 free (CHAMPION §11)
    let offDay = false;
    for (let i = 0; i < k; i++) {
      issued++;
      if (rnd() < LOCKOUT) { excluded++; continue; }
      if (rnd() < p) { fired++; offDay = true; }
    }
    if (offDay) weeksWithOffDayMint++;
  }
  const denom = issued - excluded;
  return { p, issued, fired, excluded, denom, rate: denom ? fired / denom : null, weeksWithOffDayMint, weeks };
}

// ---------------------------------------------------------------- decision rules
const RULES = {
  "champion, as written (pooled over Vollmachten, >=50%)": (cs) => {
    const f = cs.reduce((s, c) => s + c.fired, 0), d = cs.reduce((s, c) => s + c.denom, 0);
    return d > 0 && f / d >= 0.5;
  },
  "campaign-level median rate >= 50%": (cs) => {
    const rs = cs.map((c) => c.rate).filter((r) => r !== null);
    return rs.length > 0 && median(rs) >= 0.5;
  },
  "campaign vote: >=60% of campaigns individually >=50%": (cs) => {
    const rs = cs.map((c) => c.rate).filter((r) => r !== null);
    return rs.length > 0 && rs.filter((r) => r >= 0.5).length / rs.length >= 0.6;
  },
  "champion conjunction (rate AND >=3/4 off-day weeks AND issuance-time)": (cs) => {
    const f = cs.reduce((s, c) => s + c.fired, 0), d = cs.reduce((s, c) => s + c.denom, 0);
    const rateOk = d > 0 && f / d >= 0.5;
    const offOk = cs.filter((c) => c.weeksWithOffDayMint >= 3).length / cs.length >= 0.5;
    return rateOk && offOk;                        // issuance-time handled separately, below
  },
};

function greenRate(rule, mu, N, trials = 4000) {
  let g = 0;
  for (let t = 0; t < trials; t++) {
    const cs = []; for (let i = 0; i < N; i++) cs.push(simulateCampaign(mu));
    if (rule(cs)) g++;
  }
  return g / trials;
}

const H1 = 0.60;   // the thesis is alive: a typical GM's doors fire 60% of the time
const H0 = 0.30;   // the thesis is dead: doors are a novelty that decays

say("");
say("=== SPIKE-B-W1 — gate „die Tuerquote“ run as an instrument (round 5, candidate B) ===");
say("");
say(`Model: N campaigns x 4 weeks. Per campaign one latent enthusiasm p ~ Beta(mu*${KAPPA}, (1-mu)*${KAPPA});`);
say(`issuance rate rises with p (lambda = 0.6 + 3.4p, capped at 3/week per CHAMPION §11);`);
say(`P(Zugangsvorfall) = ${LOCKOUT} and those attempts leave the denominator (CHAMPION §5.3).`);
say(`H1 (thesis alive) mu=${H1}   H0 (thesis dead) mu=${H0}   4000 trials per cell.`);
say("");
say("--- 1. Can the gate tell a live thesis from a dead one? ---");
say("");
const Ns = [3, 5, 8, 12, 20, 40];
say("rule".padEnd(58) + Ns.map((n) => `N=${n}`.padStart(11)).join(""));
const table = {};
for (const [name, rule] of Object.entries(RULES)) {
  const row = [];
  for (const N of Ns) {
    const power = greenRate(rule, H1, N);
    const falseGreen = greenRate(rule, H0, N);
    row.push({ N, power, falseGreen });
  }
  table[name] = row;
  say(name.padEnd(58) + row.map((r) => `${(r.power * 100).toFixed(0)}/${(r.falseGreen * 100).toFixed(0)}`.padStart(11)).join(""));
}
say("");
say("read as  power% / false-green%  — power = P(green | thesis alive), false-green = P(green | thesis dead).");
say("");

// findings
{
  const champ = table["champion, as written (pooled over Vollmachten, >=50%)"];
  const at8 = champ.find((r) => r.N === 8);
  rec("W1-a", at8.falseGreen <= 0.10,
      "champion's pooled rule at a recruitable N=8: does a DEAD thesis stay red?",
      `false-green ${(at8.falseGreen * 100).toFixed(1)}% at N=8 (target <=10%)`);
  rec("W1-b", at8.power >= 0.80,
      "champion's pooled rule at N=8: does a LIVE thesis go green?",
      `power ${(at8.power * 100).toFixed(1)}% at N=8 (target >=80%)`);
  const med = table["campaign-level median rate >= 50%"];
  const best = med.find((r) => r.power >= 0.8 && r.falseGreen <= 0.1);
  rec("W1-c", !!best, "is there ANY N at which the campaign-median rule is a real instrument?",
      best ? `yes: N=${best.N} gives power ${(best.power * 100).toFixed(0)}%, false-green ${(best.falseGreen * 100).toFixed(0)}%`
           : `no N up to ${Ns.at(-1)} reaches power>=80% with false-green<=10%`);
  const conj = table["champion conjunction (rate AND >=3/4 off-day weeks AND issuance-time)"];
  const c8 = conj.find((r) => r.N === 8);
  rec("W1-d", c8.power >= 0.80,
      "the champion ANDs several criteria: what does the conjunction do to power?",
      `conjunction power ${(c8.power * 100).toFixed(1)}% vs pooled-rate-alone ${(at8.power * 100).toFixed(1)}% at N=8`);
}

// ---------------------------------------------------------------- 2. criterion 3
say("--- 2. Criterion 3 (GM issuance <= 120 s/session): is it reachable at all? ---");
say("");
// Keystroke-Level Model operators (Card, Moran & Newell 1980), seconds:
const K = 0.28,   // keystroke, average non-secretarial typist
      P = 1.10,   // point with a mouse
      H = 0.40,   // home hands between device
      M = 1.35;   // mental preparation
// Path A — the CHAMPION's issuance: write a sealed line, in prose, at 23:41.
// KLM does not model composition; the champion's own §15.14 prices this at ~90 s.
const CHAMP_PER_VOLLMACHT = 90;
// Path B — die Nachlese: no text field exists. Pick from the Lücke candidate list,
// pick a threshold from a five-value ring, confirm.
const NACHLESE_OPS = [
  ["M", M, "decide which gap to open"],
  ["K", K, "V — open der Vollmachtszettel"],
  ["M", M, "scan the Lücke candidate list"],
  ["K", K * 2, "arrow to the candidate (mean 2 presses over a 5-row list)"],
  ["M", M, "choose a threshold"],
  ["K", K, "threshold ring, one press"],
  ["K", K, "Enter — seal"],
];
const NACHLESE_PER = NACHLESE_OPS.reduce((s, [, t]) => s + t, 0);
say("Path A — CHAMPION §15.14, a sealed line written in prose at 23:41:");
say(`         ${CHAMP_PER_VOLLMACHT.toFixed(1)} s per Vollmacht (the champion's own estimate; KLM cannot price composition)`);
say("Path B — die Nachlese, this candidate: the issuance surface has NO text field.");
for (const [op, t, why] of NACHLESE_OPS) say(`         ${op}  ${t.toFixed(2)} s   ${why}`);
say(`         ${NACHLESE_PER.toFixed(2)} s per Vollmacht (KLM, Card/Moran/Newell 1980)`);
say("");
say("n Vollmachten".padEnd(16) + "champion (s)".padStart(14) + "Nachlese (s)".padStart(14) + "   budget 120 s");
for (const n of [1, 2, 3, 4, 5]) {
  const a = n * CHAMP_PER_VOLLMACHT, b = n * NACHLESE_PER;
  say(String(n).padEnd(16) + a.toFixed(0).padStart(14) + b.toFixed(0).padStart(14) +
      `   champion ${a <= 120 ? "GREEN" : "RED  "} · Nachlese ${b <= 120 ? "GREEN" : "RED"}`);
}
say("");
const champMax = Math.floor(120 / CHAMP_PER_VOLLMACHT), nachMax = Math.floor(120 / NACHLESE_PER);
rec("W1-e", champMax >= 3,
    "champion issuance vs. its own criterion 3: can a GM issue 3 doors inside 120 s?",
    `champion tops out at ${champMax} Vollmacht/session inside the budget (3x90 s = 270 s = RED)`);
rec("W1-f", nachMax >= 3,
    "die Nachlese vs. criterion 3: can a GM issue 3 doors inside 120 s?",
    `Nachlese tops out at ${nachMax} Vollmachten/session inside the budget (3 x ${NACHLESE_PER.toFixed(1)} s = ${(3 * NACHLESE_PER).toFixed(0)} s)`);
rec("W1-g", true, "the arithmetic that makes criterion 3 decidable rather than rhetorical",
    `budget 120 s / champion 90 s = ${(120 / CHAMP_PER_VOLLMACHT).toFixed(2)} doors; / Nachlese ${NACHLESE_PER.toFixed(2)} s = ${(120 / NACHLESE_PER).toFixed(1)} doors`);

// ---------------------------------------------------------------- 3. what the pilot costs
say("--- 3. What running W1 actually costs, criterion by criterion ---");
say("");
const CRIT = [
  ["fire rate: issued vs. fired before expiry", "a shared sheet: one row per door, GM ticks fired/expired", true],
  ["GM issuance time per session", "a stopwatch on the GM's phone, one number per session", true],
  [">=1 Vorhaben per player per week", "the same sheet, one row per player-week", true],
  [">=3 of 4 weeks with an off-session-day mint", "the date column of the same sheet", true],
  ["der Zugangsvorfall exclusion", "one extra column: 'could you get in?' asked once", true],
];
say("criterion".padEnd(48) + "instrument".padEnd(58) + "needs slice 1?");
for (const [c, i, paper] of CRIT) say(c.padEnd(48) + i.padEnd(58) + (paper ? "no" : "YES"));
say("");
const paperCount = CRIT.filter((c) => c[2]).length;
rec("W1-h", paperCount === CRIT.length,
    "die Papiertür: can W1 be run with no product at all?",
    `${paperCount}/${CRIT.length} criteria are measurable by a GM with a spreadsheet, a stopwatch and a group chat`);

// engineering days bought by running the pilot before the code
const SLICE1_DAYS = 105;                       // CHAMPION §9.3
const WEEK_DELTA_DAYS = 38;                    // CHAMPION §9.3, die Woche's own delta
rec("W1-i", true, "the days a red W1 would save if the pilot runs BEFORE the build",
    `${WEEK_DELTA_DAYS} of ${SLICE1_DAYS} slice-1 days (${(100 * WEEK_DELTA_DAYS / SLICE1_DAYS).toFixed(0)}%) are die Woche's delta and would not be spent`);

// ---------------------------------------------------------------- report
say("--- verdict rows ---");
say("");
for (const r of results) say(`${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(6)} ${r.name.padEnd(76)} | ${r.note}`);
say("");
say("FAIL here does not mean the code is broken. It means the GATE, as the champion writes it,");
say("cannot do the job the champion assigns it. That is the finding.");
say("");
const text = out.join("\n");
fs.writeFileSync(new URL("./RESULTS.txt", import.meta.url), text);
console.log(text);

"use strict";
/* ============================================================================
   PROBE-B · Round 5, Candidate B — the harness that makes the claims countable.
   Run: node .probe-B.js
   Every number printed here is quoted in product-B.md. Nothing in product-B.md
   is a number this file did not print.
   ========================================================================= */

const K = require("./.kern-B.js");
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
const zeilen = [];
function ok(name, cond, detail) {
  (cond ? pass++ : fail++);
  const line = `${cond ? "  OK  " : " FAIL "} ${name}${detail ? "  ·  " + detail : ""}`;
  zeilen.push(line); console.log(line);
}
function info(s) { zeilen.push("       " + s); console.log("       " + s); }
function head(s) { const l = "\n=== " + s; zeilen.push(l); console.log(l); }

/* ---------------------------------------------------------------- fixtures */

function welt(variante) {
  const rev = new Map();
  const setz = (a, p, q) => rev.set(a + " " + p, { quelle: q });
  // Sera has been in three rooms; Brannt in two, one of them only by hearsay.
  setz("sera", "p_hof", "wurf");
  setz("sera", "p_saal", "gesprochen");
  setz("sera", "p_kanzlei", "wurf");
  setz("brannt", "p_hof", "wurf");
  setz("brannt", "p_saal", "gehoert");   // Hörensagen — same room, different grade
  const regionen = [
    { id: "r_hof", titel: "Der Hof", pid: "p_hof", hoehe: 0, zellen: [[2,2],[3,2],[4,2],[2,3],[3,3],[4,3]] },
    { id: "r_saal", titel: "Der Saal", pid: "p_saal", hoehe: 0, zellen: [[6,2],[7,2],[8,2],[6,3],[7,3],[8,3]] },
    { id: "r_kanzlei", titel: "Die Kanzlei", pid: "p_kanzlei", hoehe: 2, zellen: [[6,6],[7,6],[8,6]] },
    { id: "r_keller", titel: "Der Keller", pid: "p_keller", hoehe: -3, zellen: [[2,6],[3,6],[4,6]] }
  ];
  const figuren = [
    { id: "f_sera", name: "Sera", actor: "sera", region: "r_hof", x: 3, y: 2, z: 0, seite: "gruppe", tp: 22, zustand: [] },
    { id: "f_brannt", name: "Brannt", actor: "brannt", region: "r_hof", x: 2, y: 3, z: 0, seite: "gruppe", tp: 17, zustand: [] },
    { id: "f_wache1", name: "Wache", actor: null, region: "r_saal", x: 7, y: 2, z: 0, seite: "gegner", tp: 9, zustand: [] },
    { id: "f_schreiber", name: "Schreiber", actor: null, region: "r_kanzlei", x: 7, y: 6, z: 2, seite: "gegner", tp: 5, zustand: ["gebunden"] }
  ];
  const initiative = [
    { figur: "f_sera", wert: 18, dran: true }, { figur: "f_wache1", wert: 14, dran: false },
    { figur: "f_brannt", wert: 11, dran: false }, { figur: "f_schreiber", wert: 6, dran: false }
  ];
  const vollmachten = [
    { id: "v_031", inhaber: "sera", anker: { link: "l_ossa" }, verfall: "S15", status: "offen",
      klausel: "k_vharon", etikett: "haus-vharon", schwelle: 18, freigabe: "Die Kanzlei Ossa führt Bücher, die niemand sehen soll." }
  ];
  if (variante === "B") {
    // The UNHELD half differs wildly: extra rooms, extra tokens, extra doors.
    regionen.push({ id: "r_gruft", titel: "Die Gruft", pid: "p_gruft", hoehe: -6, zellen: [[10,6],[11,6]] });
    figuren.push({ id: "f_ding", name: "Etwas", actor: null, region: "r_gruft", x: 10, y: 6, z: -6, seite: "gegner", tp: 40, zustand: [] });
    figuren.push({ id: "f_wache2", name: "Zweite Wache", actor: null, region: "r_keller", x: 3, y: 6, z: -3, seite: "gegner", tp: 9, zustand: [] });
    initiative.push({ figur: "f_ding", wert: 21, dran: false });
    initiative.push({ figur: "f_wache2", wert: 9, dran: false });
    vollmachten.push({ id: "v_032", inhaber: "brannt", anker: { link: "l_gruft" }, verfall: "S15", status: "offen",
      klausel: "k_gruft", etikett: "gruft", schwelle: 15, freigabe: "Unter dem Haus liegt älteres Haus." });
    vollmachten.push({ id: "v_033", inhaber: "brannt", anker: { keim: "Ossa" }, verfall: "S16", status: "offen",
      klausel: "k_vharon", etikett: "haus-vharon", schwelle: 12, freigabe: "Ossa war einmal ein Name, kein Ort." });
  }
  return {
    regionen, figuren, initiative, vollmachten, revelationen: rev,
    bonusFuer(actor, etikett) {
      let n = 0;
      for (const [k2, v] of rev) if (k2.startsWith(actor + " ")) n += v.quelle === "gehoert" ? 0 : 1;
      return etikett === "haus-vharon" ? (n >= 3 ? 2 : 0) : 0;
    },
    ankerFuer(et) { return ({ "haus-vharon": { link: "l_vharon" }, "ossa": { link: "l_ossa" } })[et] || null; }
  };
}

/* ============================================================ 1 · DIE SICHT */
head("1 · Die Sicht — der Projektor, zum ersten Mal in fünf Runden ausgeführt (S-P1)");

const W = welt("A");
const pSL = K.projiziere(W, "SL");
const pSera = K.projiziere(W, "sera");
const pBrannt = K.projiziere(W, "brannt");
const pFremd = K.projiziere(W, null);

ok("SL sieht alle 4 Regionen", pSL.regionen.length === 4, `${pSL.regionen.length}`);
ok("Sera sieht 3 Regionen (Hof, Saal, Kanzlei)", pSera.regionen.length === 3,
   pSera.regionen.map(r => r.titel).join(", "));
ok("Brannt sieht 2 Regionen (Hof, Saal)", pBrannt.regionen.length === 2,
   pBrannt.regionen.map(r => r.titel).join(", "));
ok("Ein Fremder sieht 0 Regionen", pFremd.regionen.length === 0);

// The break attack-B found in round 4: the second branch never evaluated.
// Here BOTH branches are evaluated and they DISAGREE, which is the whole point.
const seraGrad = pSera.regionen.find(r => r.id === "r_saal").grad;
const branntGrad = pBrannt.regionen.find(r => r.id === "r_saal").grad;
ok("Erfahren schlägt Gehört: beide Zweige gerechnet und verschieden",
   seraGrad === "gesprochen" && branntGrad === "gehoert", `Sera=${seraGrad} · Brannt=${branntGrad}`);
ok("und der Bonus fällt daraus, nicht aus einer Tabelle",
   W.bonusFuer("sera", "haus-vharon") === 2 && W.bonusFuer("brannt", "haus-vharon") === 0,
   `Sera +${W.bonusFuer("sera","haus-vharon")} · Brannt +${W.bonusFuer("brannt","haus-vharon")}`);

// Absence, not hiding.
const seraJson = K.kodiere(pSera);
ok("Der Keller kommt in Seras Bytes NICHT vor", !seraJson.includes("Keller"));
ok("Der Schreiber kommt in Brannts Bytes NICHT vor", !K.kodiere(pBrannt).includes("Schreiber"));
ok("Kein `visible`/`hidden`-Feld existiert überhaupt",
   !/visible|hidden|sichtbar/.test(seraJson));
ok("Initiative hat keine Lücken und keine Platzhalter",
   pBrannt.initiative.length === 2 && !seraJson.includes("???"),
   `Brannt sieht ${pBrannt.initiative.length} von 4 Initiativplätzen`);
ok("NPC-Trefferpunkte sind für Spieler null, für die Leitung Zahlen",
   pSera.figuren.find(f => f.id === "f_wache1").tp === null &&
   pSL.figuren.find(f => f.id === "f_wache1").tp === 9);

// B9: NurLeitung cannot be encoded into a player payload, even by mistake.
let b9 = false;
try { K.kodiere({ ...pSera, woche: K.nurLeitung({ offen: 3 }) }); } catch (e) { b9 = /B9/.test(e.message); }
ok("B9: NurLeitung im Spielerpaket wirft beim Kodieren", b9);
ok("Das SL-Paket trägt die Wochendifferenz", !!pSL.woche);

const projLoc = fs.readFileSync(path.join(__dirname, ".kern-B.js"), "utf8")
  .split("\n").slice(0).join("\n");
const projBody = projLoc.slice(projLoc.indexOf("function projiziere"), projLoc.indexOf("/** Serialise"));
const projSloc = projBody.split("\n").filter(l => l.trim() && !l.trim().startsWith("//")).length;
info(`Der Projektor ist ${projSloc} Zeilen. Vier Runden haben ihn ~120 Tage lang beschrieben.`);

// Timing at scale.
const gross = welt("A");
for (let i = 0; i < 300; i++) {
  gross.regionen.push({ id: "rx" + i, titel: "Raum " + i, pid: "px" + i, hoehe: 0, zellen: [[i % 40, (i / 40) | 0]] });
  gross.figuren.push({ id: "fx" + i, name: "T" + i, actor: null, region: "rx" + i, x: i % 40, y: (i / 40) | 0, z: 0, seite: "gegner", tp: 5, zustand: [] });
  if (i % 3 === 0) gross.revelationen.set("sera px" + i, { quelle: "wurf" });
}
const t0 = process.hrtime.bigint();
for (let i = 0; i < 200; i++) K.kodiere(K.projiziere(gross, "sera"));
const t1 = process.hrtime.bigint();
const msProj = Number(t1 - t0) / 1e6 / 200;
ok("Projektion bei 304 Regionen / 304 Figuren unter 5 ms", msProj < 5, `${msProj.toFixed(3)} ms je Projektion`);

/* ================================================== 2 · DER ZWILLINGSBEWEIS */
head("2 · Der Zwillingsbeweis — auf der Tafel, nicht nur auf der Seite");

const A = welt("A"), B = welt("B");
for (const leser of ["sera", "brannt"]) {
  const z = K.zwillingsbeweis(A, B, leser);
  const erwartet = leser === "brannt" ? false : true; // Brannt HOLDS two of B's extra doors
  ok(`Welt A ≡ Welt B für ${leser}: ${erwartet ? "byte-identisch" : "verschieden (er hält die Türen)"}`,
     z.gleich === erwartet, `${z.bytesA} vs ${z.bytesB} Bytes`);
}
const zf = K.zwillingsbeweis(A, B, null);
ok("Und für einen Fremden sind beide Welten byte-identisch leer", zf.gleich, `${zf.bytesA} Bytes`);
// The sharp one: Sera holds NONE of B's extra doors, and B has 2 extra rooms,
// 2 extra tokens, 2 extra initiative entries and 2 extra Vollmachten.
info("Welt B trägt 2 Regionen, 2 Figuren, 2 Initiativplätze und 2 Vollmachten mehr —");
info("und Seras Paket ist trotzdem Byte für Byte dasselbe.");

/* ==================================================== 3 · DIE WIEDERKEHR */
head("3 · Die Wiederkehr — das Identitätssubsystem, gebaut statt geschätzt (§15.15)");

K.JETZT.t = 1000;
const sera = K.neueIdentitaet("u_sera");
K.registriere(sera, "Pixel 7 · Sera", "passkey");
ok("Beitritt registriert still einen Passkey", sera.credentials.length === 1);
ok("Dienstagmorgen: das Gerät weist sich aus", K.praesentiere(sera, "c1", true).ok);

// Lost phone. This is attack-A Break 1, the fatal one, in eight lines.
K.JETZT.t = 1200;
const aus = K.praesentiere(sera, "c9", true);
ok("Neues Gerät ohne Credential wird abgewiesen", !aus.ok && aus.grund === "kein_credential");
ok("…und schreibt einen Zugangsvorfall mit offener Tür", sera.vorfaelle.length === 1 && sera.vorfaelle[0].vollmachtOffen);

ok("Ein Spieler kann sich selbst keinen Kopplungscode ausstellen", !K.mintKopplung(sera, "sera").ok);
const kc = K.mintKopplung(sera, "SL");
ok("Die Leitung stellt einen Kopplungscode aus", kc.ok, kc.code);
K.JETZT.t = 1400;
const r1 = K.loeseKopplung(sera, kc.code, "iPhone 15 · Sera");
ok("Eingelöst: neues Credential, GLEICHE user_id", r1.ok && r1.userId === "u_sera" && r1.credId === "c2");
ok("Zweite Einlösung schlägt fehl (einmalig)", !K.loeseKopplung(sera, kc.code, "Angreifer").ok);
K.JETZT.t = 2100;
const kc2 = K.mintKopplung(sera, "SL"); K.JETZT.t = 2800;
ok("Nach 10 Minuten verfällt der Code", !K.loeseKopplung(sera, kc2.code, "spät").ok);
ok("Widerruf eines verlorenen Geräts wirkt sofort",
   K.widerrufe(sera, "c1") && !K.praesentiere(sera, "c1", false).ok);
ok("Das erneuerte Gerät funktioniert weiter", K.praesentiere(sera, "c2", true).ok);

const kernSrc = fs.readFileSync(path.join(__dirname, ".kern-B.js"), "utf8");
const wSect = kernSrc.slice(kernSrc.indexOf("const JETZT"), kernSrc.indexOf("/* ====", kernSrc.indexOf("const JETZT")));
const wSloc = wSect.split("\n").filter(l => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("/*") && !l.trim().startsWith("*")).length;
info(`Die Wiederkehr ist ${wSloc} Zeilen Zustandsmaschine. Runde 4 hat sie mit 5 Tagen und Risiko „hoch" bepreist.`);
info(`Was die ${wSloc} Zeilen NICHT enthalten: WebAuthn-Attestation, Ratenbegrenzung, das Gerätepanel.`);

/* ============================================= 4 · DER AUSSTEHENDE WURF */
head("4 · Der ausstehende Wurf — Idempotenz unter Netztrennung, gefuzzt");

let doppelpraegungen = 0, rerolls = 0, laeufe = 0;
for (let s = 0; s < 2000; s++) {
  const halde = K.neueWurfhalde();
  const v = { id: "v_031", inhaber: "sera", klausel: "k_vharon", etikett: "haus-vharon",
              schwelle: 12, status: "offen", freigabe: "Die Kanzlei führt Bücher." };
  const w0 = K.wuerfeln(halde, v, W, 0);
  let gepraegt = 0; const ergebnisse = new Set([w0.ergebnis]);
  // A hostile sequence of retries, reloads and confirms, seeded per run.
  const rnd = K.mulberry32(K.fnv1a("seq" + s));
  for (let i = 0; i < 8; i++) {
    const op = rnd() % 3;
    if (op === 0) { const w = K.wuerfeln(halde, v, W, 10); ergebnisse.add(w.ergebnis); }
    else { const r = K.bestaetigen(halde, w0.id, v, 10); if (r.ok && r.gepraegt) gepraegt++; }
  }
  laeufe++;
  if (gepraegt > 1) doppelpraegungen++;
  if (ergebnisse.size > 1) rerolls++;
}
ok(`${laeufe} feindliche Wiederhol-Sequenzen: keine Doppelprägung`, doppelpraegungen === 0);
ok("…und kein einziger Neuwurf beim erneuten Öffnen der Tür", rerolls === 0);
const halde2 = K.neueWurfhalde();
const v2 = { id: "v_9", inhaber: "sera", klausel: "k", etikett: "x", schwelle: 12, status: "offen", freigabe: "…" };
const wA = K.wuerfeln(halde2, v2, W, 0);
const spaet = K.bestaetigen(halde2, wA.id, v2, 99999);
ok("Nach 30 Minuten verfällt der Wurf und die Vollmacht ist wieder offen",
   !spaet.ok && spaet.grund === "fenster_zu" && v2.status === "offen");

/* ==================================================== 5 · DIE NACHLESE */
head("5 · Die Nachlese — die Autorenkosten, gezählt statt geschätzt (§15.14)");

const puffer = [
  { id: "b01", text: "Die Kanzlei Ossa führt Bücher, die niemand sehen soll.", etikett: "ossa", klausel: "k_vharon", erwaehnungen: 3, offeneFrage: true, gepraegt: false, dupliziert: false, regelkram: false },
  { id: "b02", text: "Vharons Wappen hat einen zweiten Falken, den keiner erwähnt.", etikett: "haus-vharon", klausel: "k_vharon", erwaehnungen: 2, offeneFrage: false, gepraegt: false, dupliziert: false, regelkram: false },
  { id: "b03", text: "Der Schreiber hat gezittert, als der Name Ossa fiel.", etikett: "ossa", klausel: "k_menschenkenntnis", erwaehnungen: 1, offeneFrage: true, gepraegt: false, dupliziert: false, regelkram: false },
  { id: "b04", text: "Vorteil heißt zwei Würfel, den höheren nehmen, ja.", etikett: "regeln", klausel: null, erwaehnungen: 1, offeneFrage: false, gepraegt: false, dupliziert: false, regelkram: true },
  { id: "b05", text: "Der Hof ist gepflastert.", etikett: "haus-vharon", klausel: null, erwaehnungen: 1, offeneFrage: false, gepraegt: false, dupliziert: false, regelkram: false },
  { id: "b06", text: "Brannt kennt den Saal nur vom Hörensagen, das ist wichtig.", etikett: "haus-vharon", klausel: "k_vharon", erwaehnungen: 1, offeneFrage: false, gepraegt: true, dupliziert: false, regelkram: false },
  { id: "b07", text: "Die Gruft unter dem Haus ist älter als das Haus.", etikett: "gruft", klausel: "k_vharon", erwaehnungen: 2, offeneFrage: true, gepraegt: false, dupliziert: false, regelkram: false }
];
const drei = K.nachlese(puffer, W, 3);
ok("Die Nachlese schlägt genau drei Zeilen vor", drei.length === 3);
ok("Regelrede fällt raus", !drei.some(d => d.id === "b04"));
ok("Schon Geprägtes fällt raus", !drei.some(d => d.id === "b06"));
drei.forEach(d => info(`  ${d.punkte} P · ${d.id} · „${d.text.slice(0, 46)}…"  [${d.terme.map(t => t[0] + " " + (t[1] > 0 ? "+" : "") + t[1]).join(" · ")}]`));

const ausN = drei.map((d, i) => K.ausNachlese(d, ["sera", "brannt", "sera"][i], 18, "s14"));
const zeichenNachlese = ausN.reduce((s, a) => s + a.getippteZeichen, 0);
const tastenNachlese = ausN.reduce((s, a) => s + a.tastendruecke, 0);
const kalt = drei.map(d => K.kaltGetippt(d.text, 18));
const zeichenKalt = kalt.reduce((s, a) => s + a.getippteZeichen, 0);
ok("Drei Türen aus der Nachlese: 0 getippte Zeichen", zeichenNachlese === 0, `${tastenNachlese} Tastendrücke gesamt`);
info(`Dieselben drei Türen kalt getippt: ${zeichenKalt} Zeichen.`);
info(`Bei 180 Zeichen/min für eine müde Spielleitung um 23:41 → ${(zeichenKalt / 180 * 60).toFixed(0)} s getippt gegen ~${(tastenNachlese * 1.2).toFixed(0)} s gedrückt.`);
info(`Die 180 Zeichen/min sind ein Modell, keine Messung. Die ${zeichenKalt} und die 0 sind Messungen.`);
ok("Prägerate-Budget (240 s Tippen je Sitzung) wird von der Nachlese nicht angetastet",
   zeichenNachlese === 0);
info(`Kalt getippt verbraucht die Türausstellung allein ${(zeichenKalt / 180 * 60 / 240 * 100).toFixed(0)} % des Sitzungsbudgets.`);
ok("Jede Vollmacht trägt ihre Herkunft", ausN.every(a => a.vollmacht.herkunft === "nachlese"));
ok("Eine Zeile ohne Wiki-Anker bekommt trotzdem einen Keim (W0)",
   !!ausN.find(a => a.vollmacht.anker.keim));

/* =================================================== 6 · DIE WOCHENPROBE */
head("6 · Die Wochenprobe — Gate W1 als Rechnung, die rot werden kann");

const pilot = [
  { id: "k01", ausgestellt: 11, gefeuert: 8, verfallen: 3, zugangsvorfaelle: 0 },
  { id: "k02", ausgestellt: 8, gefeuert: 3, verfallen: 5, zugangsvorfaelle: 2 },
  { id: "k03", ausgestellt: 0, gefeuert: 0, verfallen: 0, zugangsvorfaelle: 0 },
  { id: "k04", ausgestellt: 12, gefeuert: 7, verfallen: 5, zugangsvorfaelle: 1 },
  { id: "k05", ausgestellt: 6, gefeuert: 1, verfallen: 5, zugangsvorfaelle: 0 },
  { id: "k06", ausgestellt: 9, gefeuert: 6, verfallen: 3, zugangsvorfaelle: 0 },
  { id: "k07", ausgestellt: 0, gefeuert: 0, verfallen: 0, zugangsvorfaelle: 0 },
  { id: "k08", ausgestellt: 14, gefeuert: 9, verfallen: 5, zugangsvorfaelle: 3 }
];
const wp = K.wochenprobe(pilot);
info(`naive Quote  ${(wp.naiv * 100).toFixed(1)} %   ·   zugerechnete Quote  ${(wp.quote * 100).toFixed(1)} %`);
info(`Nenner ${wp.nenner} · Zähler ${wp.zaehler} · W0-Ausschlüsse ${wp.ausgeschlossenW0} Kampagnen · Aussperrungen ${wp.ausgeschlossenZugang} Türen`);
wp.gruende.forEach(g => info(`  ${g.kampagne}: ${g.grund}`));
info(`Urteil: ${wp.urteil}`);
ok("Die Probe kann rot werden — sie tut es hier fast", typeof wp.gruen === "boolean");
ok("Zwei Kampagnen sind mit Grund ausgeschlossen, nicht weggemittelt", wp.ausgeschlossenW0 === 2);
ok("Die Zurechnung verschiebt die Quote messbar", Math.abs(wp.quote - wp.naiv) > 0.01,
   `${((wp.quote - wp.naiv) * 100).toFixed(1)} Prozentpunkte`);
// And the falsifying case: it must be able to say ROT.
const schlecht = pilot.map(k => ({ ...k, gefeuert: Math.floor(k.gefeuert / 3) }));
const wp2 = K.wochenprobe(schlecht);
ok("Bei schlechten Daten sagt sie ROT und nicht „vielversprechend\"",
   /ROT/.test(wp2.urteil), `${(wp2.quote * 100).toFixed(1)} %`);

/* ============================================================== summary */
head("Summe");
console.log(`  ${pass} grün · ${fail} rot`);
fs.writeFileSync(path.join(__dirname, ".probe-B.out.txt"),
  zeilen.join("\n") + `\n\n  ${pass} grün · ${fail} rot\n`, "utf8");
process.exit(fail ? 1 : 0);

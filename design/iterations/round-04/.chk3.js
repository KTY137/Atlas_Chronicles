
"use strict";
/* ============================================================================
   7 · Der eigene Wurf und die Prägung — dieselbe Maschine, andere Herkunft
   ========================================================================= */

const rollBtn = $("#rollBtn");
const mintBtn = $("#mintBtn");
const undoBtn = $("#undoBtn");
const rollcard = $("#rollcard");

const EIGEN_AST = [
  { t: "dice", n: 1, faces: 20 },
  { t: "const", v: 4, label: "Weisheit" },
  { t: "clause", id: "k_vharon_kenntnis", actor: "sera" },
  { t: "const", v: 2, label: "Bruder Alders Hinweis (Sitzung 2)" }
];
const EIGEN_SG = 15;

let letzterWurf = null;
let gepraegtesAtom = null;

function zeitStempel(d) {
  const p = (n) => String(n).padStart(2, "0");
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function neuerSeed() {
  const teil = (n) => n.toString(16).padStart(8, "0").slice(-8);
  return teil(Date.now() >>> 0) + teil((Math.floor(performance.now() * 1000) ^ 0x5bf03635) >>> 0);
}

rollBtn.addEventListener("click", () => {
  const seed = neuerSeed();
  const erg = auswerten(EIGEN_AST, seed, PAKETE["2.3"], null);
  const wuerfel = erg.zeilen.find(z => z.art === "die");
  const klausel = erg.zeilen.find(z => z.art === "clause");
  const jetzt = new Date();
  const erfolg = erg.summe >= EIGEN_SG;

  letzterWurf = {
    id: "w_051", nr: 4, probe: "Menschenkenntnis", actor: "sera", wer: "Sera Valdris",
    sitzung: 5, datum: "heute", zeit: zeitStempel(jetzt), sg: EIGEN_SG,
    seed: seed, seedKurz: seed.slice(0, 4) + "…" + seed.slice(-2), imprint: erg.summe,
    herkunft: "am-tisch", tisch: "an diesem Tisch, von dir",
    board: "archivwinkel", paket: "2.3",
    eingefroren: { k_vharon_kenntnis: klausel.eingefroren },
    ast: EIGEN_AST, erfolg: erfolg
  };

  rollcard.hidden = false;
  $("#rcTotal").textContent = erg.summe;
  $("#rcExpr").innerHTML =
    "1d20 = " + wuerfel.wert + " &nbsp;+4 Weisheit<br>" +
    "<b>+" + klausel.wert + " · du hältst " + klausel.eingefroren + " Passagen über Haus Vharon</b>" +
    " &nbsp;+2 Alder";
  const out = $("#rcOutcome");
  out.textContent = erfolg ? "Erfolg gegen 15" : "Misserfolg gegen 15";
  out.dataset.ok = erfolg ? "1" : "0";

  mintBtn.disabled = false;
  meldung("Gewürfelt. Der <b>+" + klausel.wert + "</b> kommt aus " + klausel.eingefroren +
    " Passagen, die ein Fremder an seinem Tisch geschrieben hat.");
});

/* „Welche vier?" — das Prädikat zeigt auf die Sätze, aus denen es rechnet. */
$("#whichFour").addEventListener("click", () => {
  const treffer = $$('.atom[data-etikett~="haus-vharon"][data-haelt~="sera"]');
  treffer.forEach(a => a.classList.add("is-spot"));
  treffer[0].scrollIntoView({ behavior: reduziert() ? "auto" : "smooth", block: "center" });
  meldung("<b>" + treffer.length + " Passagen</b> mit Etikett „haus-vharon“ in Seras Buch — " +
    "die Eingabe der Klausel k_vharon_kenntnis.");
  window.setTimeout(() => treffer.forEach(a => a.classList.remove("is-spot")), 2600);
});

/* ---- Prägen: der einzige Weg zu „am Tisch" ------------------------------- */
function praegen() {
  if (mintBtn.disabled || !letzterWurf) return;
  const w = letzterWurf;
  BELEGE.w_051 = w;

  const text = w.erfolg
    ? 'Sera sieht es sofort: die dritte Wachsschicht ist zu sauber gegossen. Das Siegel an der Kammertür ist eine Fälschung — wer sie gesetzt hat, kannte die Kerbe, aber nicht <a href="#weller">Wellers</a> Hand.'
    : 'Sera dreht das Wachs ins Licht und bleibt unsicher. Die Kerbe sitzt links, die drei Schichten liegen sauber — und genau diese Sauberkeit ist es, die sie nicht einordnen kann.';

  const atom = document.createElement("div");
  atom.className = "atom is-new";
  atom.dataset.atom = "passage";
  atom.dataset.herkunft = "am-tisch";
  atom.dataset.kind = "wurf";
  atom.dataset.grad = "erlebt";
  atom.dataset.meta = w.zeit + " · Sitzung 5 · Menschenkenntnis · Sera · " + w.imprint +
    " gegen " + w.sg + " · an diesem Tisch";
  atom.dataset.beleg = "w_051";
  atom.dataset.etikett = "haus-vharon";
  atom.dataset.haelt = "sera";
  atom.innerHTML = '<div class="atom__gutter"></div><div class="atom__body"><p>' + text +
    '<button class="fn" type="button" data-beleg="w_051" aria-expanded="false" aria-controls="lensPanels">' +
    '<span class="sr">Beleg </span>4<span class="sr"> öffnen</span></button></p></div>';

  const anker = $('.atom[data-beleg="w_003"]');
  anker.parentNode.insertBefore(atom, anker.nextSibling);
  $(".atom__gutter", atom).appendChild(baueChip(atom, 0));
  fnVerdrahten($(".fn", atom));

  gepraegtesAtom = atom;
  bilanzRechnen();
  mintBtn.disabled = true;
  undoBtn.disabled = false;

  const chip = $(".chip", atom);
  fliegen(rollcard, chip);
  atom.scrollIntoView({ behavior: reduziert() ? "auto" : "smooth", block: "center" });
  meldung("Geprägt. <b>1 Absatz an diesem Tisch</b> — " +
    "<code>herkunft_anlass_id = NULL</code>. Kein Importpfad kann diesen Wert schreiben.");
}

mintBtn.addEventListener("click", praegen);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); praegen(); }
});

undoBtn.addEventListener("click", () => {
  if (!gepraegtesAtom) return;
  gepraegtesAtom.remove();
  gepraegtesAtom = null;
  delete BELEGE.w_051;
  bilanzRechnen();
  undoBtn.disabled = true;
  mintBtn.disabled = !letzterWurf;
  if (offenerBeleg === "w_051") {
    offenerBeleg = null;
    $("#belegHost").innerHTML = '<p class="empty">Der Beleg wurde mit dem Absatz zurückgenommen.</p>';
  }
  meldung("Zurückgenommen. Der Kanon steht wieder bei <b>0 an diesem Tisch</b>.");
});

/* ---- Die Wurfkarte reist (Champion §13, Regel 4) ------------------------- */
function fliegen(vonEl, nachEl) {
  if (reduziert() || !vonEl || !nachEl) return;
  const a = vonEl.getBoundingClientRect();
  const b = nachEl.getBoundingClientRect();
  const g = document.createElement("div");
  g.className = "flyer";
  g.textContent = (letzterWurf ? letzterWurf.imprint : "") + " gegen " + EIGEN_SG;
  g.style.left = a.left + "px";
  g.style.top = a.top + "px";
  document.body.appendChild(g);
  const anim = g.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: "translate(" + (b.left - a.left) * 0.6 + "px," + (b.top - a.top) * 0.5 + "px) scale(0.8)", opacity: 1, offset: 0.6 },
      { transform: "translate(" + (b.left - a.left) + "px," + (b.top - a.top) + "px) scale(0.45)", opacity: 0 }
    ],
    { duration: 760, easing: "cubic-bezier(0.22,0.61,0.36,1)" }
  );
  anim.onfinish = () => g.remove();
}

/* ============================================================================
   8 · Fußnoten, Suche, Haut, Bewegung, Meldungen
   ========================================================================= */
function fnVerdrahten(el) {
  el.addEventListener("click", () => {
    const id = el.dataset.beleg;
    if (offenerBeleg === id) {
      offenerBeleg = null;
      el.setAttribute("aria-expanded", "false");
      markiereZitiert(null);
      $("#belegHost").innerHTML = '<p class="empty">Kein Beleg geöffnet.</p>';
      return;
    }
    belegOeffnen(id);
  });
}
$$(".fn").forEach(fnVerdrahten);

const q = $("#q");
q.addEventListener("input", () => {
  const s = q.value.trim().toLowerCase();
  let eintraege = 0;
  $$("#entries .entry").forEach(e => {
    const treffer = !s || e.dataset.name.toLowerCase().indexOf(s) >= 0;
    e.hidden = !treffer;
    if (treffer) eintraege++;
  });
  let absaetze = 0;
  if (s) {
    $$(".atom").forEach(a => {
      if (a.textContent.toLowerCase().indexOf(s) >= 0) absaetze++;
    });
  }
  $("#qCount").textContent = s
    ? eintraege + " Einträge · " + absaetze + " Absätze"
    : eintraege + " Einträge";
});

$$("#entries .entry").forEach(e => {
  e.addEventListener("click", () => {
    $$("#entries .entry").forEach(x => x.removeAttribute("aria-current"));
    e.setAttribute("aria-current", "true");
    if (e.dataset.void === "1") {
      meldung("<b>Kanzlei Ossa</b> hat keinen Eintrag. Der rote Link bleibt rot, " +
        "bis jemand an einem Tisch etwas darüber prägt.");
    } else if (e.dataset.name !== "Haus Vharon") {
      meldung("Dieser Prototyp zeigt nur <b>Haus Vharon</b> vollständig — " +
        "die Schiene steht für die Struktur, nicht für ein zweites geschriebenes Kapitel.");
    }
  });
});

const drawerBtn = $("#drawerBtn");
drawerBtn.addEventListener("click", () => {
  const rail = $("#railCollection");
  const auf = rail.dataset.open === "1";
  rail.dataset.open = auf ? "0" : "1";
  drawerBtn.setAttribute("aria-expanded", String(!auf));
});

const themeBtn = $("#themeBtn");
function effektivDunkel() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function themeBeschriften() {
  const dunkel = effektivDunkel();
  $("#themeLabel").textContent = dunkel ? "Dunkel" : "Hell";
  themeBtn.setAttribute("aria-label", "Farbmodus wechseln — derzeit " + (dunkel ? "dunkel" : "hell"));
}
themeBtn.addEventListener("click", () => {
  document.documentElement.setAttribute("data-theme", effektivDunkel() ? "light" : "dark");
  themeBeschriften();
});

const motionBtn = $("#motionBtn");
motionBtn.addEventListener("click", () => {
  const red = motionBtn.getAttribute("aria-pressed") === "true";
  document.documentElement.setAttribute("data-motion", red ? "full" : "reduced");
  motionBtn.setAttribute("aria-pressed", String(!red));
  $("#motionLabel").textContent = red ? "Bewegung: voll" : "Bewegung: reduziert";
});

let meldungTimer = null;
function meldung(html) {
  const alt = $(".toast");
  if (alt) alt.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.innerHTML = html;
  document.body.appendChild(t);
  window.clearTimeout(meldungTimer);
  meldungTimer = window.setTimeout(() => t.remove(), 5200);
}

/* ============================================================================
   9 · Start
   ========================================================================= */
Object.keys(BELEGE).forEach(k => { BELEGE[k].id = k; });

$$("[data-board]").forEach(el => { el.innerHTML = zeichneBrett(el.dataset.board); });

const hp=document.getElementById("hpBar");
if (hp) hp.style.width = hp.dataset.pct + "%";

chipsAufbauen();
bilanzRechnen();
themeBeschriften();

/* Die Herkunftsschicht ist an; die Rinne ist immer reserviert. Wir messen das
   einmal beim Start — echte Messung, kein behaupteter Wert.                  */
document.documentElement.classList.add("strip-on");
stripBtn.setAttribute("aria-pressed", "true");
window.requestAnimationFrame(() => {
  const mitSchicht = article.scrollHeight;
  document.documentElement.classList.remove("strip-on");
  const ohneSchicht = article.scrollHeight;
  document.documentElement.classList.add("strip-on");
  const delta = ohneSchicht === 0 ? 0 : ((mitSchicht - ohneSchicht) / ohneSchicht) * 100;
  streifenVal.textContent = (delta >= 0 ? "+" : "−") +
    Math.abs(delta).toFixed(1).replace(".", ",") + " %";
  $("#streifen").dataset.state = Math.abs(delta) > 4 ? "over" : "ok";
});

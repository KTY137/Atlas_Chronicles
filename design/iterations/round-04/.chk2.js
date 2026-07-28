
"use strict";
/* ============================================================================
   4 · Die Herkunftsschicht — vier Kanäle, davon drei ohne Farbe
      Form  = Art der Passage      (Absatz · Wurf · Zitat · Regel · Bild)
      Füllung = Herkunftsklasse    (hohl = mitgebracht · voll = am Tisch)
      Strich = Erfahrungsgrad      (durchgezogen = erlebt · gestrichelt = gehört)
      Sättigung = Farbe            (der einzige Kanal, der in Graustufen fällt)
   ========================================================================= */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

const FORMEN = {
  passage: '<rect x="1.6" y="1.6" width="8.8" height="8.8" rx="1"/><path d="M3.6 4.4h4.8M3.6 6.4h4.8M3.6 8.4h2.8" stroke-width="0.9" fill="none"/>',
  wurf: '<path d="M6 1.4 10.2 3.8v4.6L6 10.8 1.8 8.4V3.8z"/><circle cx="6" cy="6.1" r="1.05" fill="currentColor" stroke="none"/>',
  zitat: '<path d="M2 3.2h3.2v3.4c0 1.6-1 2.6-2.4 3M6.8 3.2H10v3.4c0 1.6-1 2.6-2.4 3"/>',
  regel: '<path d="M6 1.4 10.3 3v3.4c0 2.4-1.9 4-4.3 4.8C3.6 10.4 1.7 8.8 1.7 6.4V3z"/>',
  bild: '<rect x="1.6" y="2.2" width="8.8" height="7.6" rx="1"/><circle cx="4.2" cy="4.8" r="0.9" fill="currentColor" stroke="none"/><path d="M2 8.6 4.9 6l2 1.6L8.3 6l1.8 1.9" stroke-width="0.9" fill="none"/>'
};

function glyphSvg(kind, solid, grad) {
  const d = FORMEN[kind] || FORMEN.passage;
  return '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" ' +
    'fill="' + (solid ? "currentColor" : "none") + '" stroke="currentColor" ' +
    'stroke-width="' + (grad === "gehoert" ? 1 : 1.4) + '" ' +
    (grad === "gehoert" ? 'stroke-dasharray="2.2 1.6" ' : "") +
    'fill-opacity="' + (solid ? 0.85 : 0) + '">' + d + "</svg>";
}

function baueChip(atom, index) {
  const kind = atom.dataset.kind || "passage";
  const herkunft = atom.dataset.herkunft;
  const grad = atom.dataset.grad || "erlebt";
  const solid = herkunft === "am-tisch";
  const klasse = solid ? "am Tisch" : "mitgebracht";
  const meta = atom.dataset.meta || "";
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.dataset.herkunft = herkunft;
  b.style.setProperty("--i", index);
  b.setAttribute("aria-pressed", "false");
  /* Erstes Token des barrierefreien Namens ist immer die Herkunftsklasse. */
  b.setAttribute("aria-label", klasse + " · " + meta + (atom.dataset.beleg ? " · Beleg öffnen" : " · Herkunft zeigen"));
  b.innerHTML =
    '<span class="chip__glyph">' + glyphSvg(kind, solid, grad) + "</span>" +
    '<span class="chip__klasse">' + klasse + "</span>" +
    '<span class="chip__meta">' + meta + "</span>";
  b.addEventListener("click", () => chipGeklickt(atom, b));
  return b;
}

function chipsAufbauen() {
  $$(".atom").forEach((atom, i) => {
    const g = $(".atom__gutter", atom);
    if (!g) return;
    g.innerHTML = "";
    g.appendChild(baueChip(atom, i));
  });
}

/* ---- Saatbilanz: gezählt, nicht getippt --------------------------------- */
function bilanzRechnen() {
  const alle = $$("[data-atom]");
  const amTisch = alle.filter(a => a.dataset.herkunft === "am-tisch").length;
  const mit = alle.length - amTisch;
  $("#cAll").textContent = alle.length;
  $("#cMit").textContent = mit;
  const t = $("#cTisch");
  t.dataset.n = String(amTisch);
  t.textContent = amTisch + (amTisch === 1 ? " an diesem Tisch" : " an diesem Tisch");
  $("#entryCount").textContent = $$("#entries .entry").length;
}

/* ---- Tor „Der Streifen": die Rinne ist immer reserviert ------------------ */
const stripBtn = $("#stripBtn");
const streifenVal = $("#streifenVal");
const article = $("#article");

stripBtn.addEventListener("click", () => {
  const an = stripBtn.getAttribute("aria-pressed") === "true";
  const vorher = article.scrollHeight;
  document.documentElement.classList.toggle("strip-on", !an);
  stripBtn.setAttribute("aria-pressed", String(!an));
  /* Erzwungener Reflow, dann messen — echte Messung, keine Behauptung. */
  const nachher = article.scrollHeight;
  const delta = vorher === 0 ? 0 : ((nachher - vorher) / vorher) * 100;
  streifenVal.textContent = (delta >= 0 ? "+" : "−") +
    Math.abs(delta).toFixed(1).replace(".", ",") + " %";
  $("#streifen").dataset.state = Math.abs(delta) > 4 ? "over" : "ok";
  if (!an) meldung("Herkunftsschicht an. <b>" + $$("[data-atom]").length +
    "</b> Atome, jedes mit Herkunft. Die Dokumenthöhe hat sich um " +
    streifenVal.textContent + " geändert.");
});

/* ============================================================================
   5 · Linse: Reiter
   ========================================================================= */
const tabs = [$("#tabBeleg"), $("#tabAugenblick"), $("#tabAnlass")];
const panels = [$("#panelBeleg"), $("#panelAugenblick"), $("#panelAnlass")];

function zeigeReiter(i, fokus) {
  tabs.forEach((t, k) => {
    t.setAttribute("aria-selected", String(k === i));
    t.tabIndex = k === i ? 0 : -1;
    panels[k].hidden = k !== i;
  });
  if (fokus) tabs[i].focus();
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => zeigeReiter(i));
  t.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); zeigeReiter((i + 1) % 3, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); zeigeReiter((i + 2) % 3, true); }
  });
});

/* ============================================================================
   6 · Die Belegkarte und „Nachrechnen"
   ========================================================================= */
let offenerBeleg = null;
let driftPaket = "2.3";

function markiereZitiert(atom) {
  $$(".atom.is-cited").forEach(a => a.classList.remove("is-cited"));
  if (atom) atom.classList.add("is-cited");
}

function chipGeklickt(atom, chip) {
  $$(".chip[aria-pressed='true']").forEach(c => c.setAttribute("aria-pressed", "false"));
  chip.setAttribute("aria-pressed", "true");
  if (atom.dataset.beleg) {
    belegOeffnen(atom.dataset.beleg, atom);
  } else {
    herkunftOeffnen(atom);
    markiereZitiert(atom);
    zeigeReiter(0);
  }
}

function herkunftOeffnen(atom) {
  offenerBeleg = null;
  const solid = atom.dataset.herkunft === "am-tisch";
  $("#belegHost").innerHTML =
    '<div class="beleg"><div class="beleg__head">' +
    '<div class="who">' + (solid ? "Am Tisch geprägt" : "Mitgebracht") + "</div>" +
    '<div class="when">' + atom.dataset.meta + "</div></div>" +
    '<div class="beleg__pin">' +
    (solid
      ? '<span class="tag">herkunft_anlass_id</span> NULL — dieser Satz ist an diesem Tisch entstanden. Kein Importpfad kann NULL schreiben.'
      : '<span class="tag">herkunft_anlass_id</span> anl_aldenfall_1.2.0 — mitgebracht. Kein Wurf hängt an diesem Atom, deshalb gibt es hier nichts nachzurechnen.') +
    "</div></div>";
}

function nummer(n) { return String(n); }

function belegOeffnen(id, atomOpt) {
  const B = BELEGE[id];
  if (!B) return;
  offenerBeleg = id;
  driftPaket = B.paket;
  const atom = atomOpt || $('.atom[data-beleg="' + id + '"]');
  markiereZitiert(atom);
  $$(".fn").forEach(f => f.setAttribute("aria-expanded", String(f.dataset.beleg === id)));
  zeigeReiter(0);
  belegZeichnen(B, null);
  $("#augenblickHost").innerHTML =
    '<p class="empty">Beleg <b>' + id + "</b> geöffnet.<br>„Der Augenblick“ auf der Belegkarte öffnet das Brett dieser Sekunde.</p>";
}

function belegZeichnen(B, ergebnis) {
  const paket = PAKETE[B.paket];
  const gefroren = auswerten(B.ast, B.seed, paket, B.eingefroren);
  const erfolg = B.imprint >= B.sg;
  let rows = "";
  gefroren.zeilen.forEach((z) => {
    rows += '<tr class="' + (z.art === "die" ? "die" : "") + '">' +
      '<td class="val">' + (z.art === "die" ? "" : (z.wert >= 0 ? "+ " : "− ")) +
      (z.art === "die" ? z.wert : Math.abs(z.wert)) + "</td>" +
      '<td class="lbl">' + (z.art === "die" ? "<b>" + z.label + "</b>" : z.label) +
      (z.sub ? "<small>" + z.sub + "</small>" : "") + "</td></tr>";
  });
  rows += '<tr class="sum"><td class="val">' + B.imprint + '</td>' +
    '<td class="lbl">gegen SG <span class="num">' + B.sg + "</span> · " +
    (erfolg ? '<span class="verdict-ok">Erfolg</span>' : '<span class="verdict-no">Misserfolg</span>') +
    "</td></tr>";

  $("#belegHost").innerHTML =
    '<div class="beleg">' +
      '<div class="beleg__head">' +
        '<div class="who">' + B.probe + " · " + B.wer + "</div>" +
        '<div class="when">Sitzung ' + B.sitzung + " · " + B.datum + " · " + B.zeit + "</div>" +
      "</div>" +
      '<div class="beleg__derivation"><table class="deriv"><caption class="sr">Herleitung des Wurfs ' +
        B.probe + "</caption><tbody>" + rows + "</tbody></table></div>" +
      '<div class="beleg__pin">' +
        '<span class="tag">Paket</span>' + paket.id + " " + paket.version +
        ' · <span class="tag">Klausel</span>k_vharon_kenntnis@' +
        (paket.klauseln.k_vharon_kenntnis.rev) +
        ' · <span class="tag">Wurf</span>' + (B.id || "") +
        ' · <span class="tag">Seed</span>' + B.seedKurz +
        ' · <span class="tag">' + (B.herkunft === "am-tisch" ? "am Tisch" : "mitgebracht") + "</span>" +
      "</div>" +
      '<div class="beleg__actions">' +
        '<button class="btn btn--primary" type="button" id="nachrechnenBtn">Nachrechnen</button>' +
        '<button class="btn" type="button" id="augenblickBtn">Der Augenblick</button>' +
      "</div>" +
      '<div class="beleg__derivation" id="replayHost" aria-live="polite"></div>' +
    "</div>";

  $("#nachrechnenBtn").addEventListener("click", () => nachrechnen(B, B.paket));
  $("#augenblickBtn").addEventListener("click", () => augenblickOeffnen(B));
  if (ergebnis) nachrechnen(B, ergebnis, true);
}

function reduziert() {
  return getComputedStyle(document.documentElement).getPropertyValue("--t-state").trim() === "1ms";
}

function nachrechnen(B, paketKey) {
  const paket = PAKETE[paketKey];
  const erg = auswerten(B.ast, B.seed, paket, B.eingefroren);
  const wuerfel = erg.zeilen.find(z => z.art === "die");
  const klausel = erg.zeilen.find(z => z.art === "clause");
  const passt = erg.summe === B.imprint && paketKey === B.paket;
  const host = $("#replayHost");

  const schritte = [
    ["Seed gelesen", "<b>" + B.seed + "</b>", false],
    ["Ausdruck geladen", "AST, " + B.ast.length + " Knoten, unverändert", false],
    ["Paket geprüft", paket.id + " <b>" + paket.version + "</b> · sha256 " + paket.sha,
      paketKey !== B.paket],
    klausel
      ? ["Klausel aufgelöst", "k_vharon_kenntnis@<b>" + klausel.rev + "</b> · " +
         "Prädikateingabe eingefroren auf " + klausel.eingefroren +
         (klausel.heute !== klausel.eingefroren ? " (heute: " + klausel.heute + ")" : "") +
         " → +" + klausel.wert, paketKey !== B.paket]
      : ["Klausel", "keine Klausel in diesem Ausdruck", false],
    ["Neu gewürfelt", "1d20 = <b>" + wuerfel.wert + "</b>", false],
    ["Verglichen", erg.summe + (passt ? " = " : " ≠ ") + B.imprint +
      (passt ? " · byteidentisch" : " · Abweichung"), !passt]
  ];

  host.innerHTML = '<div class="replay"><ol id="replayList"></ol></div>';
  const ol = $("#replayList");
  const takt = reduziert() ? 0 : 120;

  schritte.forEach((s, i) => {
    window.setTimeout(() => {
      const li = document.createElement("li");
      if (s[2]) li.dataset.bad = "1";
      li.style.animationDelay = "0ms";
      li.innerHTML = '<span class="mark">' + (s[2] ? "✕" : "✓") + "</span><span>" +
        s[0] + " · " + s[1] + "</span>";
      ol.appendChild(li);
      if (i === schritte.length - 1) siegelSetzen(B, paketKey, erg, passt);
    }, takt * i);
  });
}

function siegelSetzen(B, paketKey, erg, passt) {
  const host = $("#replayHost");
  const paket = PAKETE[paketKey];
  const wuerfel = erg.zeilen.find(z => z.art === "die");
  const siegel = document.createElement("div");
  siegel.className = "seal";
  siegel.dataset.kind = passt ? "ok" : "bad";
  siegel.setAttribute("role", "status");

  if (passt) {
    siegel.innerHTML =
      '<div class="seal__mark"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
      '<circle cx="15" cy="15" r="12"/><circle cx="15" cy="15" r="9" stroke-dasharray="2 2.6"/>' +
      '<path d="M10 15.4 13.6 19 20.4 11.6" stroke-width="2.2"/></svg></div>' +
      '<div><div class="seal__title">Nachgerechnet</div>' +
      "<p>Seed <span class=\"mono\">" + B.seedKurz + "</span>, Ausdruck unverändert, Paket " +
      paket.id + " " + paket.version + " installiert und gehasht, Klausel k_vharon_kenntnis@" +
      paket.klauseln.k_vharon_kenntnis.rev + ". 1d20 = " + wuerfel.wert + ". Ergebnis " + erg.summe +
      ". Übereinstimmung: <b>byteidentisch</b>.</p>" +
      '<span class="whose">Dieser Wurf wurde am ' + B.datum + " um " + B.zeit +
      " geworfen — <b>" + B.tisch + ".</b></span></div>";
  } else {
    siegel.innerHTML =
      '<div class="seal__mark"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
      '<circle cx="15" cy="15" r="12"/><path d="M11 11l8 8M19 11l-8 8" stroke-width="2.2"/></svg></div>' +
      '<div><div class="seal__title">Abweichung</div>' +
      "<p>Unter Paket " + paket.version + " ergäbe derselbe eingefrorene Wurf <b>" + erg.summe +
      "</b> statt " + B.imprint + ": die Klausel ist von r7 auf " +
      paket.klauseln.k_vharon_kenntnis.rev + " gewandert.</p>" +
      "<p><b>Genau deshalb heftet ein Anlass seine Paketversionen an.</b> Der Beleg zeigt weiterhin " +
      B.imprint + ", weil er gegen 2.3 geprüft wird — nicht gegen das, was heute installiert ist.</p></div>";
  }

  const claim = document.createElement("details");
  claim.className = "claim";
  claim.innerHTML =
    "<summary>Was prüft „Nachrechnen“ — und was nicht?</summary>" +
    '<div class="claim__body">' +
    '<p><span class="yes">Es prüft:</span> dass die gedruckte Zahl aus dem eingefrorenen Seed, dem eingefrorenen Ausdruck, der angehefteten Paketversion und der genannten Klauselrevision folgt — und dass seit der Prägung nichts davon gewandert ist.</p>' +
    '<p><span class="no">Es prüft nicht:</span> dass ein Mensch dabei war. Nicht, dass der Seed nicht so lange gemahlen wurde, bis eine 13 fiel — <b>5 % aller Seeds geben auf 1d20 eine 13</b>. Und nicht, dass der Zeitstempel stimmt.</p>' +
    "<p>Der Zweck ist <b>Haltbarkeit</b>, nicht Fälschungssicherheit: Ein Paket-Update im Jahr 2029 darf nicht ändern, was ein Wurf im Jahr 2026 bedeutet hat. Teuer zu fälschen ist nicht der Wurf, sondern die Verflechtung — vier Abende, drei Bücher, ein widerspruchsfreier Wissensstand.</p>" +
    "</div>";

  const zeile = document.createElement("div");
  zeile.className = "beleg__actions";
  const driftBtn = document.createElement("button");
  driftBtn.type = "button";
  driftBtn.className = "btn";
  driftBtn.textContent = paketKey === B.paket ? "Paketdrift auf 2.4 simulieren" : "Zurück auf Paket 2.3";
  driftBtn.addEventListener("click", () => nachrechnen(B, paketKey === B.paket ? "2.4" : B.paket));
  zeile.appendChild(driftBtn);

  host.appendChild(siegel);
  host.appendChild(claim);
  host.appendChild(zeile);
}

/* ---- Der Augenblick ------------------------------------------------------ */
let gliederungAn = false;

function augenblickOeffnen(B) {
  const b = BRETTER[B.board];
  gliederungAn = false;
  augenblickZeichnen(B, b);
  zeigeReiter(1);
}

function augenblickZeichnen(B, b) {
  const host = $("#augenblickHost");
  let init = "";
  if (b.initiative.length) {
    init = '<div class="initiative" role="list" aria-label="Initiative">';
    b.initiative.forEach(z => {
      init += '<div class="init-cell" role="listitem" data-active="' + (z.aktiv ? 1 : 0) + '">' +
        "<b>" + z.name + '</b><span class="n">' + z.n + "</span></div>";
    });
    init += "</div>";
  }
  host.innerHTML =
    "<h3>" + b.titel + "</h3>" +
    '<p class="lede">Das Brett, wie es in der Sekunde des Wurfs stand — Nebel wie ' + B.wer +
    " ihn sah, Marken auf ihren Feldern. Aus Zahlen gezeichnet, nicht fotografiert.</p>" +
    '<div class="board-wrap mt-3"><div class="board-stamp">' +
    b.datum + " · " + b.zeit + '</div><div id="boardHost">' + zeichneBrett(B.board) + "</div></div>" +
    init +
    '<div class="beleg__actions bare">' +
    '<button class="btn" type="button" id="outlineBtn" aria-pressed="false">Als Gliederung lesen</button>' +
    '<button class="btn btn--ghost" type="button" id="backBelegBtn">Zurück zum Beleg</button></div>';

  $("#outlineBtn").addEventListener("click", () => {
    gliederungAn = !gliederungAn;
    $("#outlineBtn").setAttribute("aria-pressed", String(gliederungAn));
    $("#boardHost").innerHTML = gliederungAn ? brettGliederung(B.board) : zeichneBrett(B.board);
    $("#boardHost").parentElement.style.background = gliederungAn ? "var(--c-stage)" : "#0f0d0b";
    $("#boardHost").style.padding = gliederungAn ? "var(--sp-3)" : "0";
  });
  $("#backBelegBtn").addEventListener("click", () => zeigeReiter(0));
}

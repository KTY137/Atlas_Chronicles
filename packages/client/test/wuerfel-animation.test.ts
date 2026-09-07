import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, defaultActorFields, evaluateAction, parseRulePackage } from "@chronicle/rules";
import { RollCard } from "../src/features/RollCard";
import { frischeAuswahl } from "../src/hooks";
import type { ActionCard } from "../src/features/game-api";

// Die Wuerfel sollen fallen, wenn ein Wurf EINTRIFFT — und nur dann. Diese Datei haelt beide
// Haelften fest: wann etwas als frisch gilt, und dass die Bewegung nie der Traeger des Werts ist.

function karte(expression: string, seed: string): ActionCard {
  const pkg = parseRulePackage({ ...DEMO_RULE_PACKAGE, actions: [{ ...DEMO_RULE_PACKAGE.actions[0]!, expression }] });
  const receipt = evaluateAction(pkg, "investigate", { seed, actor: defaultActorFields(pkg), input: {}, knowledge: { actorId: "actor", passages: [] } });
  return { id: "roll", actorId: "actor", status: "ausstehend", receipt, receiptHash: "a".repeat(64),
    preparedAt: Date.UTC(2026, 8, 7, 12), fictionDate: "Tag 1", vollmachtId: null, confirmation: null };
}
const markup = (card: ActionCard, frisch?: boolean) =>
  renderToStaticMarkup(createElement(RollCard, { card, campaignId: "campaign", actorName: "Sera", onChanged: () => {}, ...(frisch === undefined ? {} : { frisch }) }));

describe("Was als frisch gilt", () => {
  it("zählt den ersten Datenstand vollständig als Bestand", () => {
    // Wer den Reiter öffnet, sieht die alten Würfe liegen. Fiele hier alles, wäre jede Abfrage
    // ein Erdbeben — und die Bewegung sagte nichts mehr über das Eintreffen aus.
    const erst = frischeAuswahl(null, ["a", "b", "c"]);
    expect(erst.frisch).toEqual([]);
    expect([...erst.bekannt].sort()).toEqual(["a", "b", "c"]);
  });

  it("nennt nur, was seit dem letzten Stand dazugekommen ist", () => {
    const stand = frischeAuswahl(new Set(["a", "b"]), ["c", "a", "b"]);
    expect(stand.frisch).toEqual(["c"]);
    const unveraendert = frischeAuswahl(stand.bekannt, ["c", "a", "b"]);
    expect(unveraendert.frisch).toEqual([]);
  });

  it("lässt eine verschwundene und wiederkehrende Karte nicht erneut fallen", () => {
    // Eine Karte, die aus der Liste fällt und wiederkommt, ist kein neues Ereignis.
    const nach = frischeAuswahl(new Set(["a", "b"]), ["a"]);
    expect(nach.frisch).toEqual([]);
    expect(frischeAuswahl(nach.bekannt, ["a", "b"]).frisch).toEqual([]);
  });
});

describe("Die Bewegung trägt den Wert nicht", () => {
  const eins = karte("1d12", "1234567890abcdef01234567fedcba98");

  it("bewegt nichts, solange niemand die Karte als frisch ausweist", () => {
    // Die Voreinstellung ist Ruhe. Eine Karte aus der Historie darf nicht fallen, nur weil sie
    // neu gerendert wird — und wer RollCard ohne diese Angabe benutzt, bekommt keine Bewegung.
    expect(markup(eins)).toContain('class="dice-results"');
    expect(markup(eins)).not.toContain("faellt");
    expect(markup(eins, false)).not.toContain("faellt");
  });

  it("lässt eine frisch eingetroffene Karte fallen", () => {
    expect(markup(eins, true)).toContain('class="dice-results faellt"');
  });

  it("zeigt denselben Wert mit und ohne Bewegung", () => {
    // Der Kern der Sache: die Animation ist Schmuck. Fiele sie aus — durch reduzierte Bewegung,
    // ein altes Gerät, eine blockierte Stilvorlage — stünde der Wert trotzdem da.
    const ohne = markup(eins).replace(/<[^>]+>/g, ""), mit = markup(eins, true).replace(/<[^>]+>/g, "");
    expect(ohne).toBe(mit);
    expect(mit).toContain("10W12");
  });

  it("gibt jedem gewerteten Würfel seine eigene laufende Nummer für die Staffelung", () => {
    // Gestaffelt wird über die DAUER, nicht über eine Verzögerung: die globale
    // Reduced-Motion-Regel kürzt nur Dauern und ließe eine Verzögerung stehen.
    const viele = markup(karte("4d6kh2!2", "deadbeefc0ffee00123456789abcdef0"), true);
    expect(viele).toContain("--wuerfel-nr:0");
    expect(viele).toContain("--wuerfel-nr:1");
    expect(viele).not.toContain("--wuerfel-nr:2");
  });
});

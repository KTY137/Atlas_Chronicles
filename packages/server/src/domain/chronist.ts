import { pruefeChronik, type Befund } from "@chronicle/chronist";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { createZeitleiste } from "./zeitleiste.ts";

/**
 * Der Chronist — vorgeschlagene Änderungen an der Chronik.
 *
 * **Er leitet keine Sichtbarkeit her.** Die Zeitleiste tut das bereits: sie filtert die Passagen
 * durch dieselbe Wissensgrenze wie der Artikel. Eine zweite, schnellere Ableitung hier wäre der
 * Ort, an dem der Chronist eines Tages mehr zeigt als die Chronik — still, und zugunsten des
 * Lecks. Dieselbe Entscheidung wie beim Wiki-Export.
 *
 * **Er schreibt nichts.** Was er findet, ist ein Vorschlag; entschieden wird am Tisch. Das ist
 * keine Zurückhaltung aus Vorsicht, sondern die Grundarchitektur: `Geltung` kennt
 * `notiz | antrag | kanon`, und nichts wird automatisch Kanon.
 *
 * **Und er benutzt kein Sprachmodell.** Der Entwurf
 * (`docs/superpowers/specs/2026-09-07-chronist-agent-design.md`) begründet es: für das Aufspüren
 * von Widersprüchen wäre ein Modell schlechter — nicht reproduzierbar, kostenpflichtig, und es
 * kann einen Widerspruch erfinden. Die Modellknoten des Entwurfs verlangen ausdrückliche
 * Egress-Freigabe je Lauf und sind hier bewusst nicht gebaut.
 */
export function createChronist(db: Db, config: DomainConfig = {}) {
  const zeitleiste = createZeitleiste(db, config);

  async function vorschlaege(userId: string, campaignId: string): Promise<readonly Befund[]> {
    const stand = await zeitleiste.zeitleiste(userId, campaignId);
    return pruefeChronik(stand.ereignisse, stand.ohneJahr);
  }

  return { vorschlaege };
}

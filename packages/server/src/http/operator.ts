/**
 * Betreiberauskünfte — Zahlen über die Maschine, nicht über eine Kampagne.
 *
 * Getrennt von `/api/live` und `/api/ready` (http/health.ts), weil die eine andere Frage
 * beantworten: Jene sagen, ob der Prozess läuft und ob Verkehr fließen darf, und sind
 * deshalb bewusst unauthentifiziert und vom Rate-Limit ausgenommen. Was hier steht, ist
 * Betriebswissen — es verlangt dieselbe Plattformrolle wie die Ersteinrichtung.
 *
 * Warum nicht offen: Warteschlangentiefe und Cache-Zustand des Rasterdienstes sagen einem
 * Angreifer, wie nah die Maschine an ihrer Grenze läuft, und wann ein weiterer 96-MiB-Import
 * am meisten weh tut (design/10-hosted-betrieb-und-auslieferung.md §3.5, §7.1).
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { rasterStats } from "../domain/tactical-raster.ts";
import { Gone } from "../domain/errors.ts";

export function registerOperator(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config);
  app.get("/api/operator/raster", async (request) => {
    const context = await identity.authenticate(request.headers.cookie);
    // Dieselbe 404 wie jede andere Verweigerung: wer nicht Betreiber ist, erfährt nicht
    // einmal, dass es diese Route gibt.
    if (context.platformRole !== "leitung") throw new Gone("operator");
    return rasterStats();
  });
}

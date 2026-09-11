// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import type { Static } from "@sinclair/typebox";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import * as P from "@chronicle/protocol";
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import type { Db } from "./db/index.ts";
import { createIdentity, reachability, type IdentityConfig } from "./identity/index.ts";
import { createCampaigns } from "./domain/campaigns.ts";
import { createDocuments, type DocumentInput } from "./domain/documents.ts";
import { Gone, Conflict } from "./domain/errors.ts";
import { ImportValidationError } from "@chronicle/io";
import { AzgaarImportError } from "@chronicle/forge";
import { registerImports } from "./http/imports.ts";
import { registerGameplay } from "./http/gameplay.ts";
import { RuleValidationError } from "@chronicle/rules";
import { registerRealtime } from "./http/realtime.ts";
import { registerWeek } from "./http/week.ts";
import { registerHealth } from "./http/health.ts";
import { registerHttpLifecycle } from "./http/lifecycle.ts";
import { registerWikiNavigation } from "./http/wiki-navigation.ts";
import { registerGegenueberstellung } from "./http/gegenueberstellung.ts";
import { registerGefuege } from "./http/gefuege.ts";
import { registerKampfbuehne } from "./http/kampfbuehne.ts";
import { registerErleichterungen } from "./http/erleichterungen.ts";
import { registerGeld } from "./http/geld.ts";
import { registerZeitleiste } from "./http/zeitleiste.ts";
import { registerChronist } from "./http/chronist.ts";
import type { ChronistRuntimeConfig } from "./domain/chronist/runtime.ts";
import { createChronistRuntime } from "./chronist-providers/registry.ts";
import { disableChronistTracing } from "./chronist-providers/tracing.ts";
import { registerWikiMedien } from "./http/wiki-medien.ts";
import { registerBundles } from "./http/bundles.ts";
import { registerActors } from "./http/actors.ts";
import { registerTactical } from "./http/tactical.ts";
import { registerGrundriss } from "./http/grundriss.ts";
import { registerPacks } from "./http/packs.ts";
import { registerBetreten } from "./http/betreten.ts";
import { registerAuthoring } from "./http/authoring.ts";
import { registerPublication } from "./http/publication.ts";
import { registerOperator } from "./http/operator.ts";
import { registerMetering } from "./http/metering.ts";
import { AuthoringValidationError } from "./domain/authoring.ts";

export interface AppConfig extends IdentityConfig { bootstrapToken: string; logger?: boolean; staticRoot?: string; publicDeliveryEnabled?: boolean; chronist?: ChronistRuntimeConfig }
const chronistDrains = new WeakMap<FastifyInstance, () => Promise<void>>();
/** Explicit shutdown boundary; unlike Fastify close hooks it is checked on every retry. */
export async function drainAppChronist(app: FastifyInstance): Promise<void> {
  const drain = chronistDrains.get(app);
  if (!drain) throw new Error("Application drain boundary missing.");
  await drain();
}
export async function buildApp(db: Db, config: AppConfig) {
  disableChronistTracing();
  config = { ...config, chronist: config.chronist ?? createChronistRuntime() };
  const app = Fastify({ logger: config.logger ?? false, bodyLimit: 2 * 1024 * 1024,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } });
  registerHttpLifecycle(app);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db, config), docs = createDocuments(db, config);
  const auth = (req: FastifyRequest) => identity.authenticate(req.headers.cookie);
  const origin = new URL(config.origin).origin;
  const secretEqual = (a: string, b: string) => { const aa=Buffer.from(a), bb=Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa,bb); };
  await app.register(rateLimit, { max: 240, timeWindow: "1 minute", keyGenerator: async request => {
    // A household/table shares an IP, not a request budget. Only an authenticated
    // identity gets its own bucket; forged cookies and caller headers never do.
    try { return `user:${(await auth(request)).userId}`; }
    catch (error) { if (error instanceof Gone) return `ip:${request.ip}`; throw error; }
  } });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").header("Referrer-Policy", "no-referrer");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin !== origin) throw new Gone("origin");
  });
  app.setErrorHandler((error, _req, reply) => {
    const fault = error as { validation?: unknown; statusCode?: number };
    if (error instanceof Gone) return reply.code(404).send({ error: "Nicht verfügbar" });
    if (error instanceof Conflict) return reply.code(409).send({ error: error.hinweis ?? "Konflikt: Bitte den aktuellen Stand laden." });
    if (error instanceof ImportValidationError || error instanceof AzgaarImportError || error instanceof RuleValidationError || error instanceof AuthoringValidationError) return reply.code(400).send({error:error.message});
    if (fault.validation || fault.statusCode === 400) return reply.code(400).send({ error: "Bitte Eingaben prüfen." });
    if (fault.statusCode === 429) return reply.code(429).send({ error: "Zu viele Anfragen. Bitte kurz warten." });
    if (fault.statusCode === 413) return reply.code(413).send({ error: "Die Datei ist zu groß." });
    // Raster capacity/timeout errors already carry 503 at the route boundary. Preserve that
    // retryable status without exposing worker details or misreporting a failed write.
    if (fault.statusCode === 503) return reply.code(503).header("Retry-After", "1").send({ error: "Der Dienst ist vorübergehend ausgelastet. Bitte kurz warten und erneut versuchen." });
    reqLog(error);
    return reply.code(500).send({ error: "Speichern fehlgeschlagen. Bitte erneut versuchen." });
  });
  function reqLog(error: unknown) { app.log.error(error); }
  /**
   * Der Rückfall der Einzelseiten-Anwendung — und die Stelle, an der er NICHT greifen darf.
   *
   * Ein unbekannter Pfad ist eine Route der Oberfläche und bekommt `index.html`. Ein
   * unbekannter Pfad **mit Dateiendung** ist dagegen eine fehlende Datei, und darauf mit HTML
   * zu antworten ist der stille Ausfall, den `static-assets.test.ts` festhält: der Browser
   * verweigert das Modul wegen des MIME-Typs und zeigt eine weiße Seite, ohne Fehlerstatus
   * und ohne Logzeile.
   *
   * Geprüft wird nur der **Pfad**, nie die Query: `/?campaign=haus.vharon` ist die Startseite.
   */
  const dateiartig = /\.[a-z0-9]{1,8}$/i;
  const fremdePraefixe = ["/api/", "/join/", "/public/", "/w/", "/wiki/"];
  app.setNotFoundHandler((req, reply) => {
    const pfad = req.url.split("?")[0] ?? "/";
    const lesend = req.method === "GET" || req.method === "HEAD";
    if (config.staticRoot && lesend && !dateiartig.test(pfad) && !fremdePraefixe.some(prefix => pfad.startsWith(prefix)))
      return reply.sendFile("index.html");
    return reply.code(404).send({ error: "Nicht verfügbar" });
  });

  app.get("/api/health", async () => { await db.query("SELECT 1"); return { ok: true }; });
  app.get("/api/reachability", async () => reachability(origin));
  app.get("/api/setup", async () => ({ required: !(await db.query("SELECT id FROM users WHERE platform_role='leitung'")).rowCount }));
  app.post<{ Body: P.NameBodyType }>("/api/setup", { schema: { body: P.NameBody }, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    if (config.bootstrapToken.length < 32 || !secretEqual(req.headers.authorization ?? "", `Bearer ${config.bootstrapToken}`)) throw new Gone();
    const session = await identity.bootstrap(req.body.displayName);
    reply.header("Set-Cookie", session.setCookie);
    return { ok: true };
  });
  app.get("/api/me", async (req) => {
    const ctx = await auth(req);
    return { userId: ctx.userId, displayName: ctx.displayName, canCreateCampaign: ctx.platformRole === "leitung", credentialId: ctx.credentialId };
  });
  app.post("/api/logout", async (req, reply) => { const ctx = await auth(req); await identity.revoke(ctx.userId, ctx.credentialId); reply.header("Set-Cookie", identity.clearCookie()); return { ok: true }; });
  app.post("/api/remember", async (req, reply) => {
    const ctx = await auth(req);
    const next = await db.transaction(async (tx) => { const i = createIdentity(tx, config); const session = await i.issueSession(ctx.userId, "cookie"); await i.revoke(ctx.userId, ctx.credentialId); return session; });
    reply.header("Set-Cookie", next.setCookie); return { ok: true };
  });
  app.get("/api/credentials", async (req) => identity.credentials((await auth(req)).userId));
  app.delete<{ Params: { id: string } }>("/api/credentials/:id", async (req) => { await identity.revoke((await auth(req)).userId, req.params.id); return { ok: true }; });
  app.post("/api/passkeys/register/options", async (req) => identity.beginRegistration((await auth(req)).userId));
  app.post<{ Body: Static<typeof P.WebAuthnFinish> }>("/api/passkeys/register", { schema: { body: P.WebAuthnFinish } }, async (req) =>
    identity.finishRegistration((await auth(req)).userId, req.body.challengeId, req.body.response as unknown as RegistrationResponseJSON, req.body.label ?? "Passkey"));
  app.post("/api/passkeys/login/options", async () => identity.beginAuthentication());
  app.post<{ Body: Static<typeof P.WebAuthnFinish> }>("/api/passkeys/login", { schema: { body: P.WebAuthnFinish } }, async (req, reply) => {
    const session = await identity.finishAuthentication(req.body.challengeId, req.body.response as unknown as AuthenticationResponseJSON);
    reply.header("Set-Cookie", session.setCookie); return { ok: true };
  });
  app.post<{ Body: Static<typeof P.PairRedeem> }>("/api/pairing/redeem", { schema: { body: P.PairRedeem } }, async (req, reply) => {
    const session = await identity.redeemPairing(req.body.code); reply.header("Set-Cookie", session.setCookie); return { ok: true };
  });

  app.get("/api/campaigns", async (req) => campaigns.listCampaigns((await auth(req)).userId));
  app.post<{ Body: P.CreateCampaignBody }>("/api/campaigns", { schema: { body: P.CreateCampaign } }, async (req) => campaigns.createCampaign((await auth(req)).userId, req.body));
  type CampaignParams = { campaignId: string };
  app.get<{ Params: CampaignParams }>("/api/campaigns/:campaignId/roster", async (req) => campaigns.roster((await auth(req)).userId, req.params.campaignId));
  app.get<{ Params: CampaignParams }>("/api/campaigns/:campaignId/invitations", async (req) => campaigns.listInvitations((await auth(req)).userId,req.params.campaignId));
  app.post<{ Params: CampaignParams; Body: Static<typeof P.InviteBody> }>("/api/campaigns/:campaignId/invitations", { schema: { body: P.InviteBody } }, async (req) => campaigns.issueInvitation((await auth(req)).userId, req.params.campaignId, req.body.ttlMs));
  app.delete<{ Params: CampaignParams & { id: string } }>("/api/campaigns/:campaignId/invitations/:id", async (req) => { await campaigns.revokeInvitation((await auth(req)).userId, req.params.campaignId, req.params.id); return { ok: true }; });
  app.post<{ Params: { code: string }; Body: P.NameBodyType }>("/join/:code", { schema: { body: P.NameBody } }, async (req) => campaigns.requestJoin(req.params.code, req.body));
  app.post<{ Params: { id: string }; Body: Static<typeof P.ClaimJoin> }>("/api/joins/:id/status", { schema: { body: P.ClaimJoin } }, async (req) => campaigns.joinStatus(req.params.id, req.body.pollToken));
  app.post<{ Params: { id: string }; Body: Static<typeof P.ClaimJoin> }>("/api/joins/:id/claim", { schema: { body: P.ClaimJoin } }, async (req, reply) => {
    const result = await db.transaction(async (tx) => {
      const joined = await createCampaigns(tx, config).claimJoin(req.params.id, req.body.pollToken);
      return { ...joined, session: await createIdentity(tx, config).issueSession(joined.userId) };
    });
    reply.header("Set-Cookie", result.session.setCookie);
    return { campaignId: result.campaignId };
  });
  app.get<{ Params: CampaignParams }>("/api/campaigns/:campaignId/joins", async (req) => campaigns.listPendingJoins((await auth(req)).userId, req.params.campaignId));
  app.post<{ Params: CampaignParams & { id: string } }>("/api/campaigns/:campaignId/joins/:id/approve", async (req) => campaigns.approveJoin((await auth(req)).userId, req.params.campaignId, req.params.id));
  app.post<{ Params: CampaignParams & { id: string } }>("/api/campaigns/:campaignId/joins/:id/reject", async (req) => campaigns.rejectJoin((await auth(req)).userId, req.params.campaignId, req.params.id));
  app.post<{ Params: CampaignParams; Body: Static<typeof P.PairBody> }>("/api/campaigns/:campaignId/pairing", { schema: { body: P.PairBody } }, async (req) => identity.mintPairing((await auth(req)).userId, req.params.campaignId, req.body.userId));

  app.get<{ Params: CampaignParams; Querystring: { q?: string } }>("/api/campaigns/:campaignId/entries", async (req) => docs.listEntries((await auth(req)).userId, req.params.campaignId, req.query.q ?? ""));
  app.get<{ Params: CampaignParams & { id: string } }>("/api/campaigns/:campaignId/entries/:id", async (req, reply) => {
    const projected = await docs.getEntry((await auth(req)).userId, req.params.campaignId, req.params.id);
    return reply.type("application/json").send(canonicalJson(projected as unknown as CanonicalValue));
  });
  // Der Wiki-Export ist eine Geste am Ende eines Abends, kein Renderpfad: er liest jeden
  // sichtbaren Artikel einzeln und ist deshalb bewusst begrenzt, wie der Kampagnenexport auch.
  app.get<{ Params: CampaignParams }>("/api/campaigns/:campaignId/wiki-export", { config: { rateLimit: { max: 4, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { dateiname, markdown } = await docs.exportWiki((await auth(req)).userId, req.params.campaignId);
    // Der Kampagnenname steht im Dateinamen. `slugify` laesst Buchstaben aller Schriften stehen,
    // deshalb der ASCII-Rueckfall NEBEN der kodierten Fassung (RFC 5987) — und niemals roh:
    // ein Name mit Anfuehrungszeichen oder Zeilenumbruch waere sonst eine Kopfzeilen-Injektion.
    const ascii = dateiname.replace(/[^ -~]/g, "_").replaceAll('"', "");
    return reply.type("text/markdown; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(dateiname)}`)
      .send(markdown);
  });
  const documentInput = (body: P.SaveDocumentBody): DocumentInput => ({ ...body, passages: body.passages.map((p) => ({ ...p, inhalt: p.inhalt as Blockinhalt })) });
  app.post<{ Params: CampaignParams; Body: P.SaveDocumentBody }>("/api/campaigns/:campaignId/entries", { schema: { body: P.SaveDocument } }, async (req) => docs.saveEntry((await auth(req)).userId, req.params.campaignId, documentInput(req.body)));
  app.put<{ Params: CampaignParams & { id: string }; Body: P.SaveDocumentBody }>("/api/campaigns/:campaignId/entries/:id", { schema: { body: P.SaveDocument } }, async (req) => docs.saveEntry((await auth(req)).userId, req.params.campaignId, documentInput(req.body), req.params.id));
  app.get<{ Params: CampaignParams & { id: string } }>("/api/campaigns/:campaignId/entries/:id/history", async (req) => docs.history((await auth(req)).userId, req.params.campaignId, req.params.id));
  app.post<{ Params: CampaignParams; Body: P.RevealBody }>("/api/campaigns/:campaignId/reveal", { schema: { body: P.Reveal } }, async (req) => {
    await docs.revealPassage((await auth(req)).userId, req.params.campaignId, req.body.passageId, req.body.actorId); return { ok: true };
  });
  registerImports(app,db,config);
  registerGameplay(app,db,config);
  registerWeek(app,db,config);
  registerHealth(app,db);
  registerWikiNavigation(app, db, config);
  registerGegenueberstellung(app, db, config);
  registerGefuege(app, db, config);
  registerKampfbuehne(app, db, config);
  registerErleichterungen(app, db, config);
  registerGeld(app, db, config);
  registerZeitleiste(app, db, config);
  const chronistService = registerChronist(app, db, config);
  let runtimeCleanup: Promise<void> | undefined;
  const drainChronist = async () => {
    // A CLI activation owns local helpers. Release them only after its graph calls drain,
    // and retry a failed drain explicitly: Fastify does not replay failed close hooks.
    await chronistService.close();
    runtimeCleanup ??= Promise.resolve().then(() => config.chronist?.close?.()).catch(error => {
      runtimeCleanup = undefined; throw error;
    });
    await runtimeCleanup;
  };
  app.addHook("onClose", drainChronist);
  chronistDrains.set(app, drainChronist);
  registerWikiMedien(app, db, config);
  registerBundles(app, db, config);
  registerActors(app, db, config);
  registerTactical(app, db, config);
  registerGrundriss(app, db, config);
  registerPacks(app, db, config);
  registerBetreten(app, db, config);
  registerAuthoring(app, db, config);
  registerPublication(app, db, config);
  registerOperator(app, db, config);
  registerMetering(app, db, config);
  await registerRealtime(app,db,config);
  if (config.staticRoot) {
    // `wildcard: false` hat die Routentabelle EINMAL beim Start aus einem Glob gebaut
    // (@fastify/static index.js, else-Zweig). Jeder danach gebaute Client-Chunk hatte damit
    // keine Route mehr und fiel auf `index.html` zurück — siehe `static-assets.test.ts`.
    // Der Wildcard löst pro Anfrage auf und überlebt einen Neubau ohne Serverneustart.
    await app.register(staticFiles, { root: config.staticRoot, setHeaders(reply) {
      // Hashed build resources may be reused; index.html and application routes stay no-store.
      reply.header("Cache-Control", reply.request.routeOptions.url === "/assets/*" ? "public, max-age=31536000, immutable" : "no-store");
    } });
    // Loading a renderer can fetch dozens of modules. Static bytes never consume the user's
    // API action budget. sendFile retains @fastify/static's path and file boundary, rooted in
    // this public build directory; the general static/HTML route keeps its existing limit.
    const assetRoot = join(config.staticRoot, "assets");
    app.get<{ Params: { "*": string } }>("/assets/*", { config: { rateLimit: false } },
      (req, reply) => reply.sendFile(req.params["*"], assetRoot));
  }
  await app.ready();
  return app;
}

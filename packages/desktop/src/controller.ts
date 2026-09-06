import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { utilityProcess, type UtilityProcess } from "electron";
import { DesktopError, fail, safeEnvironment, type HostState } from "./policy.ts";
import { databaseUrlOf, originOf, ProfileStore, type OwnedProfile, type SetupReceipt } from "./profiles.ts";
import { ManagedPostgres } from "./postgres.ts";

export interface Ready { origin: string; nodeVersion: string; decoder: string; setupRequired: boolean }
export interface MigrationGuard { beforeSchema(owned: OwnedProfile, postgres: ManagedPostgres): Promise<void> }
export class HostController {
  state: HostState = "stopped";
  owned: OwnedProfile | undefined;
  ready: Ready | undefined;
  failure: string | undefined;
  private worker: UtilityProcess | undefined;
  private postgres: ManagedPostgres | undefined;
  private unlock: (() => Promise<void>) | undefined;
  private startId = "";
  private stopping = false;
  private pending = new Map<string, { kind: string; owned: OwnedProfile; expired: boolean; receipt?: SetupReceipt; resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }>();
  private responses: Promise<void> = Promise.resolve();
  constructor(readonly store: ProfileStore, readonly assets: string, readonly runtime: string, readonly changed: () => void, readonly migrations: MigrationGuard) {}
  private transition(state: HostState) { this.state = state; this.changed(); }
  private rejectPending(message: string) {
    for (const [id, pending] of this.pending) { clearTimeout(pending.timeout); pending.reject(new DesktopError("host-lost", message)); if (!pending.receipt) this.pending.delete(id); }
  }
  private uncertain(message: string) {
    this.ready = undefined; this.failure = message; this.transition("failed");
  }
  private async persistReceipts() {
    for (const [id, pending] of this.pending) {
      if (!pending.receipt) continue;
      await this.store.saveSetupReceipt(pending.owned, pending.receipt);
      this.pending.delete(id);
    }
  }
  request<T>(kind: string, payload: Record<string, unknown> = {}): Promise<T> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new DesktopError("host-unavailable", "Lokaler Host ist nicht erreichbar."));
    if (kind === "start" ? this.state !== "starting-app" : kind === "stop" ? this.state !== "draining" : this.state !== "ready")
      return Promise.reject(new DesktopError("host-uncertain", "Host ist nicht bereit. Bitte den Abschluss ausdrücklich erneut prüfen."));
    const id = randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = this.pending.get(id); if (pending) pending.expired = true;
        this.uncertain("Host-Aktion dauert zu lange; Abschluss ist nicht bestätigt.");
        reject(new DesktopError("host-timeout", this.failure!));
      }, 90_000);
      this.pending.set(id, { kind, owned: this.owned!, expired: false, resolve: value => resolve(value as T), reject, timeout });
      try { worker.postMessage({ id, startId: this.startId, kind, ...payload }); }
      catch { clearTimeout(timeout); this.pending.delete(id); this.uncertain("Host-Anfrage konnte nicht bestätigt werden."); reject(new DesktopError("host-lost", this.failure!)); }
    });
  }
  async start(id: string): Promise<Ready> {
    if (this.state !== "stopped") return fail("host-busy", "Bitte den laufenden Host zuerst beenden.");
    this.failure = undefined;
    this.owned = await this.store.open(id);
    this.unlock = await this.store.lock(this.owned);
    this.startId = randomUUID();
    this.transition("starting-db");
    try {
      this.postgres = new ManagedPostgres(this.runtime, this.owned);
      await this.postgres.start();
      this.transition("checking-schema");
      await this.migrations.beforeSchema(this.owned, this.postgres);
      const worker = utilityProcess.fork(join(this.assets, "worker.cjs"), [], { env: safeEnvironment(process.env), execArgv: [], stdio: "ignore", cwd: this.owned.directory, serviceName: "Atlas Chronicles Local Host" });
      this.worker = worker;
      worker.on("message", (message: unknown) => {
        if (!message || typeof message !== "object") return;
        const reply = message as { id?: string; startId?: string; ok?: boolean; value?: unknown };
        if (reply.startId !== this.startId || !reply.id) return;
        const pending = this.pending.get(reply.id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        const id = reply.id;
        // Preserve private reply order: a late committed setup must be durable
        // before a following stop receipt can release the profile or quit Main.
        this.responses = this.responses.then(async () => {
          if (reply.ok === true && pending.kind === "setup") {
            pending.receipt = reply.value as SetupReceipt;
            await this.store.saveSetupReceipt(pending.owned, pending.receipt);
          }
          if (pending.kind === "stop") await this.persistReceipts();
          this.pending.delete(id);
          if (reply.ok === true) pending.resolve(reply.value);
          else pending.reject(new DesktopError("host-operation", "Host-Aktion fehlgeschlagen. Zustand und Eingaben prüfen."));
        }).catch(() => { this.uncertain("Ersteinrichtungsbeleg konnte noch nicht dauerhaft gesichert werden. Bitte den Abschluss erneut versuchen."); pending.reject(new DesktopError("setup-receipt", this.failure!)); });
      });
      worker.on("exit", () => {
        if (this.worker !== worker) return;
        this.worker = undefined;
        void this.responses.then(() => this.rejectPending("Der lokale Host wurde beendet. Nicht bestätigte Änderungen sind nicht als gespeichert bestätigt."));
        if (!this.stopping) { this.ready = undefined; this.failure = "Lokaler Host ist ausgefallen. Bitte beenden und neu starten."; this.transition("failed"); }
      });
      this.transition("starting-app");
      const ready = await this.request<Ready>("start", { config: { databaseUrl: databaseUrlOf(this.owned), origin: originOf(this.owned.profile), cookieSecret: this.owned.secrets.cookieSecret, staticRoot: join(this.assets, "client") } });
      if (ready.origin !== originOf(this.owned.profile) || !ready.nodeVersion.startsWith("24.") || !ready.decoder) fail("host-proof", "Host-Startbeleg stimmt nicht mit dem Profil überein.");
      this.ready = ready; this.transition("ready");
      return ready;
    } catch (error) {
      this.failure = error instanceof DesktopError ? error.message : "Lokaler Host konnte nicht gestartet werden.";
      // Once a worker exists, startup may still be migrating. Keep its process,
      // PG and lock until an explicit stop confirms the drain.
      if (!this.worker) {
        try { await this.postgres?.stop(); await this.unlock?.(); this.unlock = undefined; }
        catch { this.failure += " Geordnetes Aufräumen nicht bestätigt; Profil bleibt gesperrt."; }
      }
      this.ready = undefined;
      this.transition("failed"); throw new DesktopError("host-start", this.failure);
    }
  }
  async stop(beforeDatabaseStop?: (owned: OwnedProfile, postgres: ManagedPostgres) => Promise<void>): Promise<void> {
    if (this.state === "stopped") return;
    this.stopping = true; this.ready = undefined; this.transition("draining");
    try {
      await this.responses; await this.persistReceipts();
      if (this.worker) await this.request("stop");
      if (beforeDatabaseStop && this.owned && this.postgres) await beforeDatabaseStop(this.owned, this.postgres);
      await this.postgres?.stop();
      await this.unlock?.(); this.unlock = undefined;
      this.worker = undefined; this.postgres = undefined; this.ready = undefined; this.owned = undefined; this.failure = undefined;
      this.transition("stopped");
    } catch (error) {
      this.ready = undefined;
      this.failure = error instanceof DesktopError ? error.message : "Host-Abschluss nicht bestätigt. Anwendung bleibt geöffnet.";
      this.transition("failed"); throw error;
    } finally { this.stopping = false; }
  }
}

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, win32 } from "node:path";

export const SHELL_URL = "chronicle-shell://app/index.html";
export const PROFILE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const STATES = ["stopped", "starting-db", "checking-schema", "starting-app", "ready", "draining", "failed"] as const;
export type HostState = typeof STATES[number];
export class DesktopError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "DesktopError"; }
}
export const fail = (code: string, message: string): never => { throw new DesktopError(code, message); };
export function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key)))
    return fail("invalid-request", "Ungültige Verwaltungsanfrage.");
  return value as Record<string, unknown>;
}
export function label(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > 80 || /[\x00-\x1f\x7f]/.test(value))
    return fail("invalid-name", "Bitte einen Namen mit 1 bis 80 Zeichen eingeben.");
  return value.trim();
}
export function profileId(value: unknown): string {
  if (typeof value !== "string" || !PROFILE_ID.test(value)) return fail("invalid-profile", "Ungültiges Profil.");
  return value;
}
export function contained(root: string, ...parts: string[]): string {
  const path = resolve(root, ...parts), rel = relative(resolve(root), path);
  if (!rel || rel === ".." || rel.startsWith(`..\\`) || rel.startsWith("../") || isAbsolute(rel))
    return fail("invalid-path", "Pfad liegt außerhalb des eigenen Profils.");
  return path;
}
export function remoteOrigin(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048 || /[\x00-\x20\\]/.test(value)) return fail("invalid-origin", "Bitte einen HTTPS-Server angeben.");
  let url: URL;
  try { url = new URL(value); } catch { return fail("invalid-origin", "Bitte einen HTTPS-Server angeben."); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    return fail("invalid-origin", "Nur eine HTTPS-Serveradresse ohne Pfad oder Zugangsdaten ist erlaubt.");
  return url.origin;
}
export function partitionFor(origin: string): string { return `persist:chronicle-${createHash("sha256").update(origin).digest("hex")}`; }
export function safeEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of ["SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "COMSPEC", "LANG"])
    if (source[key]) result[key] = source[key];
  return result;
}
/** A Chronist key never reaches a log, an error text, a descriptor or the renderer. */
export function chronistKey(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : value;
  if (typeof key !== "string" || key.length < 1 || key.length > 8192 || /[\x00-\x20\x7f]/.test(key))
    return fail("chronist-key", "Der Chronist-Schlüssel ist leer, zu lang oder enthält unzulässige Zeichen.");
  return key;
}
/** Dedicated operator settings cross only to the private application worker, never PostgreSQL.
 *  An inherited operator file wins over the profile's own; only the operator's own file also
 *  forwards operating-system key variables. The profile's decrypted key is authoritative and
 *  replaces an inherited variable of that name. */
export function hostEnvironment(source: NodeJS.ProcessEnv, chronist: { key?: string; configPath?: string } = {}): NodeJS.ProcessEnv {
  const result = safeEnvironment(source), operator = source["CHRONICLE_CHRONIST_CONFIG"];
  const configPath = operator || chronist.configPath;
  if (configPath) {
    if (!isAbsolute(configPath) || configPath.length > 4096 || /[\x00-\x1f\x7f]/.test(configPath))
      fail("chronist-config", "Für den Chronisten ist ein vollständiger Konfigurationspfad erforderlich.");
    result["CHRONICLE_CHRONIST_CONFIG"] = configPath;
    if (operator) for (const key of Object.keys(source)) if (/^CHRONICLE_CHRONIST_KEY_[A-Z0-9_]{1,96}$/.test(key)) {
      const value = source[key];
      if (value && value.length <= 8192 && !/[\x00-\x1f\x7f]/.test(value)) result[key] = value;
    }
  }
  if (chronist.key !== undefined) result["CHRONICLE_CHRONIST_KEY_ANTHROPIC"] = chronistKey(chronist.key);
  return result;
}
export function postgresCommandOwnsDirectory(commandLine: string, directory: string): boolean {
  const match = /(?:^|\s)-D\s+"([^"]+)"(?:\s|$)/.exec(commandLine);
  // The inspected command is from Windows, even when this pure parser is tested on Linux.
  return !!match?.[1] && win32.resolve(match[1]).toLowerCase() === win32.resolve(directory).toLowerCase();
}
export type Command =
  | { kind: "status" | "stop" | "open" | "backup" }
  | { kind: "create"; name: string }
  | { kind: "start"; profileId: string }
  | { kind: "setup"; name: string }
  | { kind: "remote"; origin: string }
  | { kind: "restore-select"; name: string }
  | { kind: "restore-confirm"; ticket: string }
  | { kind: "recovery-restore"; recoveryId: string; name: string }
  | { kind: "enroll"; campaignId: string; userId: string }
  // Eine lokale Welt löschen. Der Name ist die Bestätigung und wird gegen die Welt selbst
  // geprüft, nicht gegen die Anzeige — siehe `ProfileStore.remove`.
  | { kind: "loeschen"; profileId: string; name: string }
  // Zugangsverwaltung des Hostfensters: liest Runden, erzeugt Einladungs- und Kopplungscodes,
  // setzt die Rolle innerhalb einer Runde. Keines davon stellt eine Sitzung aus.
  | { kind: "runden" }
  | { kind: "einladung"; campaignId: string }
  | { kind: "kopplung"; campaignId: string; userId: string }
  | { kind: "rolle"; campaignId: string; userId: string; role: "leitung" | "spieler" }
  // Die Zentrale: eine Runde anlegen und die Tuer bedienen — als Spielleitung der Welt bzw. Runde.
  | { kind: "runde-anlegen"; name: string }
  | { kind: "freigeben" | "ablehnen"; campaignId: string; requestId: string }
  | { kind: "chronist-key"; profileId: string; action: "set"; value: string }
  | { kind: "chronist-key"; profileId: string; action: "clear" };
export function command(value: unknown): Command {
  const v = object(value, ["kind", "name", "profileId", "origin", "ticket", "campaignId", "userId", "recoveryId", "action", "value", "role", "requestId"]);
  const exact = (keys: string[]) => object(value, ["kind", ...keys]);
  switch (v["kind"]) {
    case "status": case "stop": case "open": case "backup": exact([]); return { kind: v["kind"] };
    case "create": case "setup": case "restore-select": exact(["name"]); return { kind: v["kind"], name: label(v["name"]) };
    case "start": exact(["profileId"]); return { kind: "start", profileId: profileId(v["profileId"]) };
    case "remote": exact(["origin"]); return { kind: "remote", origin: remoteOrigin(v["origin"]) };
    case "restore-confirm": exact(["ticket"]); return { kind: "restore-confirm", ticket: profileId(v["ticket"]) };
    case "recovery-restore": exact(["recoveryId", "name"]); return { kind: "recovery-restore", recoveryId: profileId(v["recoveryId"]), name: label(v["name"]) };
    case "enroll": exact(["campaignId", "userId"]); return { kind: "enroll", campaignId: profileId(v["campaignId"]), userId: profileId(v["userId"]) };
    case "loeschen": exact(["profileId", "name"]); return { kind: "loeschen", profileId: profileId(v["profileId"]), name: label(v["name"]) };
    // Die Zugangsverwaltung. `runden` liest nur; die drei anderen erzeugen einen Code oder
    // aendern eine Rolle innerhalb einer Runde. Keines stellt eine Sitzung aus.
    case "runden": exact([]); return { kind: "runden" };
    case "einladung": exact(["campaignId"]); return { kind: "einladung", campaignId: profileId(v["campaignId"]) };
    case "kopplung": exact(["campaignId", "userId"]); return { kind: "kopplung", campaignId: profileId(v["campaignId"]), userId: profileId(v["userId"]) };
    case "runde-anlegen": exact(["name"]); return { kind: "runde-anlegen", name: label(v["name"]) };
    case "freigeben": case "ablehnen": exact(["campaignId", "requestId"]); return { kind: v["kind"], campaignId: profileId(v["campaignId"]), requestId: profileId(v["requestId"]) };
    case "rolle": {
      exact(["campaignId", "userId", "role"]);
      const rolle = v["role"];
      // `return fail(...)` statt `fail(...)`: bei einer Pfeilfunktion verengt TypeScript den Typ
      // sonst nicht — dieselbe Schreibweise benutzt der Fall „chronist-key" darunter.
      if (rolle !== "leitung" && rolle !== "spieler") return fail("invalid-request", "Es gibt nur Spielleitung oder Spieler.");
      return { kind: "rolle", campaignId: profileId(v["campaignId"]), userId: profileId(v["userId"]), role: rolle };
    }
    case "chronist-key": {
      // The key only ever travels inward. Removal carries no value at all.
      exact(["profileId", "action", "value"]);
      const id = profileId(v["profileId"]);
      if (v["action"] === "clear") {
        if ("value" in v) fail("chronist-key", "Zum Entfernen wird kein Schlüssel übergeben.");
        return { kind: "chronist-key", profileId: id, action: "clear" };
      }
      if (v["action"] !== "set") return fail("invalid-request", "Unbekannte Verwaltungsaktion.");
      return { kind: "chronist-key", profileId: id, action: "set", value: chronistKey(v["value"]) };
    }
    default: return fail("invalid-request", "Unbekannte Verwaltungsaktion.");
  }
}

/** Every awaited native operation retains this lease, never just an origin string. */
export class Authority {
  private generation = 0;
  private activeProfile: string | undefined;
  navigate() { this.generation++; }
  select(profile: string | undefined) { this.activeProfile = profile; this.generation++; }
  lease() {
    const generation = this.generation, profile = this.activeProfile;
    return () => { if (this.generation !== generation || this.activeProfile !== profile) fail("stale-operation", "Die Ansicht hat gewechselt. Bitte erneut versuchen."); };
  }
}

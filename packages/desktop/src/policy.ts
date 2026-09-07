// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";

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
export function postgresCommandOwnsDirectory(commandLine: string, directory: string): boolean {
  const match = /(?:^|\s)-D\s+"([^"]+)"(?:\s|$)/.exec(commandLine);
  return !!match?.[1] && resolve(match[1]).toLowerCase() === resolve(directory).toLowerCase();
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
  | { kind: "enroll"; campaignId: string; userId: string };
export function command(value: unknown): Command {
  const v = object(value, ["kind", "name", "profileId", "origin", "ticket", "campaignId", "userId", "recoveryId"]);
  const exact = (keys: string[]) => object(value, ["kind", ...keys]);
  switch (v["kind"]) {
    case "status": case "stop": case "open": case "backup": exact([]); return { kind: v["kind"] };
    case "create": case "setup": case "restore-select": exact(["name"]); return { kind: v["kind"], name: label(v["name"]) };
    case "start": exact(["profileId"]); return { kind: "start", profileId: profileId(v["profileId"]) };
    case "remote": exact(["origin"]); return { kind: "remote", origin: remoteOrigin(v["origin"]) };
    case "restore-confirm": exact(["ticket"]); return { kind: "restore-confirm", ticket: profileId(v["ticket"]) };
    case "recovery-restore": exact(["recoveryId", "name"]); return { kind: "recovery-restore", recoveryId: profileId(v["recoveryId"]), name: label(v["name"]) };
    case "enroll": exact(["campaignId", "userId"]); return { kind: "enroll", campaignId: profileId(v["campaignId"]), userId: profileId(v["userId"]) };
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

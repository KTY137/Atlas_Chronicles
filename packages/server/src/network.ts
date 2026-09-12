// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { isIPv4 } from "node:net";
import { networkInterfaces } from "node:os";

/** HTTP transport is an explicit home-network choice, never an arbitrary insecure origin. */
export function isPrivateLanAddress(address: string): boolean {
  if (!isIPv4(address)) return false;
  const [first, second] = address.split(".").map(Number);
  return first === 10 || (first === 172 && second! >= 16 && second! <= 31) || (first === 192 && second === 168);
}

export function isPrivateLanOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === value && url.protocol === "http:" && !url.username && !url.password && isPrivateLanAddress(url.hostname);
  } catch { return false; }
}

/** A listener may bind only a selected address that still belongs to this machine. */
export function localLanAddresses(interfaces = networkInterfaces()): { address: string; name: string }[] {
  const addresses = new Map<string, string>();
  for (const [name, entries] of Object.entries(interfaces)) for (const entry of entries ?? []) {
    if (entry.family === "IPv4" && !entry.internal && isPrivateLanAddress(entry.address)) addresses.set(entry.address, name);
  }
  return [...addresses].sort(([a], [b]) => a.localeCompare(b, "en")).map(([address, name]) => ({ address, name }));
}

/** Preserve Secure everywhere unless the operator selected this exact private HTTP origin. */
export function sessionCookieSecure(origin: string, allowInsecureLan = false): boolean {
  if (allowInsecureLan && !isPrivateLanOrigin(origin)) throw new Error("HTTP LAN cookies require an explicit canonical private IPv4 origin.");
  return !allowInsecureLan;
}

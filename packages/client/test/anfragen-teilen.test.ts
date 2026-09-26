// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, markiereAenderung } from "../src/api";
import { gemeinsamLaden } from "../src/hooks";

// 2026-09-26: Nach jeder Änderung luden viele Bausteine dieselben Listen gleichzeitig neu, bis der
// Server die Spielleitung bremste. Gleichzeitige Abfragen derselben Adresse laufen jetzt einmal —
// aber nie über eine Änderung hinweg.
function fetchStub() {
  const calls: { path: string; method: string; signal?: AbortSignal; resolve(body: unknown): void }[] = [];
  vi.stubGlobal("fetch", (path: string, init: { method: string; signal?: AbortSignal }) => new Promise((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("abgebrochen", "AbortError")));
    calls.push({ path, method: init.method, ...(init.signal ? { signal: init.signal } : {}), resolve: body => resolve({ ok: true, status: 200, json: async () => body }) });
  }));
  return calls;
}
afterEach(() => { vi.unstubAllGlobals(); });

describe("gleichzeitige Abfragen teilen", () => {
  it("fragt dieselbe Adresse im selben Augenblick nur einmal ab", async () => {
    const calls = fetchStub();
    const a = gemeinsamLaden<string[]>("/api/x", new AbortController().signal), b = gemeinsamLaden<string[]>("/api/x", new AbortController().signal);
    expect(calls).toHaveLength(1);
    calls[0]!.resolve(["eins"]);
    expect(await a).toEqual(["eins"]); expect(await b).toEqual(["eins"]);
  });

  it("teilt nie über eine Änderung hinweg", async () => {
    const calls = fetchStub();
    const vorher = gemeinsamLaden("/api/liste", new AbortController().signal);
    markiereAenderung();
    const nachher = gemeinsamLaden("/api/liste", new AbortController().signal);
    expect(calls).toHaveLength(2);
    calls[0]!.resolve("alt"); calls[1]!.resolve("neu");
    expect(await vorher).toBe("alt"); expect(await nachher).toBe("neu");
  });

  it("zählt jeden schreibenden Aufruf als Änderung", async () => {
    const calls = fetchStub();
    const lesen = gemeinsamLaden("/api/figuren", new AbortController().signal);
    const schreiben = api("/api/figuren", { method: "POST", body: {} });
    calls[1]!.resolve({}); await schreiben;
    const danach = gemeinsamLaden("/api/figuren", new AbortController().signal);
    expect(calls.filter(call => call.method === "GET")).toHaveLength(2);
    calls[0]!.resolve("vorher"); calls[2]!.resolve("nachher");
    expect(await lesen).toBe("vorher"); expect(await danach).toBe("nachher");
  });

  it("bricht erst ab, wenn alle Wartenden abgebrochen haben", async () => {
    const calls = fetchStub();
    const erster = new AbortController(), zweiter = new AbortController();
    void gemeinsamLaden("/api/y", erster.signal).catch(() => undefined);
    const bleibt = gemeinsamLaden("/api/y", zweiter.signal);
    erster.abort();
    expect(calls[0]!.signal!.aborted).toBe(false);
    calls[0]!.resolve("da"); expect(await bleibt).toBe("da");
    const dritter = new AbortController(), weg = gemeinsamLaden("/api/z", dritter.signal);
    dritter.abort();
    expect(calls[1]!.signal!.aborted).toBe(true);
    await expect(weg).rejects.toThrow();
  });
});

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Suche nach einem lokal laufenden Modelldienst.
 *
 * Der Anlass ist ein Bericht aus dem Betrieb: „auf meinem PC findet der Ollama nicht." Die alte
 * Suche fragte genau eine Adresse mit einer Sekunde Geduld und verschluckte jeden Fehlschlag.
 * Diese Reihe haelt fest, was sie stattdessen tun muss — und vor allem, dass sie SAGT, was sie
 * vorgefunden hat.
 */
import { describe, expect, it, vi } from "vitest";
import {
  CHRONIST_DEFAULT_LOCAL_URLS, chronistHostUrl, chronistScanCandidates, probeChronistLocal, scanChronistLocal,
} from "../src/chronist-providers/discovery.ts";
import { createChronistRuntime, loadChronistRuntime, CHRONIST_UNCONFIGURED_MODEL } from "../src/chronist-providers/registry.ts";

const antwort = (models: readonly string[]) => new Response(JSON.stringify({ models: models.map(name => ({ name })) }), { status: 200 });

describe("OLLAMA_HOST verstehen", () => {
  it("nimmt alle drei Schreibweisen, die in freier Wildbahn vorkommen", () => {
    expect(chronistHostUrl("11434")).toBe("http://127.0.0.1:11434");
    expect(chronistHostUrl("127.0.0.1:11500")).toBe("http://127.0.0.1:11500");
    expect(chronistHostUrl("http://192.168.1.9:11434")).toBe("http://192.168.1.9:11434");
    // Ohne Port gilt der uebliche.
    expect(chronistHostUrl("myserver")).toBe("http://myserver:11434");
  });

  it("übersetzt „lausche überall“ in eine Adresse, zu der man sich verbinden kann", () => {
    // 0.0.0.0 ist eine Lausch-, keine Zieladresse. Wer das setzt, meint diesen Rechner.
    expect(chronistHostUrl("0.0.0.0:11434")).toBe("http://127.0.0.1:11434");
    expect(chronistHostUrl("http://0.0.0.0:11500")).toBe("http://127.0.0.1:11500");
  });

  it("weist Unbrauchbares zurück, statt es zu raten", () => {
    for (const wert of [undefined, "", "   ", "file:///etc/passwd", "ftp://x", "a b", "x".repeat(3000)]) {
      expect(chronistHostUrl(wert), String(wert)).toBeNull();
    }
  });
});

describe("Welche Adressen geprüft werden", () => {
  it("stellt die Umgebung nach vorn und lässt keine Adresse doppelt", () => {
    const kandidaten = chronistScanCandidates({ OLLAMA_HOST: "11500" });
    expect(kandidaten[0]).toBe("http://127.0.0.1:11500");
    expect(kandidaten).toEqual([...new Set(kandidaten)]);
    expect(kandidaten).toEqual(expect.arrayContaining([...CHRONIST_DEFAULT_LOCAL_URLS]));
  });

  it("prüft beide Schreibweisen von „dieser Rechner“ — und localhost nicht doppelt", () => {
    // Auf Windows loest `localhost` je nach Lage auf 127.0.0.1 ODER ::1 auf. Ein Dienst, der
    // nur auf einer davon lauscht, war ueber die andere unerreichbar — genau der Fehlerfall.
    expect(chronistScanCandidates({})).toEqual([...CHRONIST_DEFAULT_LOCAL_URLS]);
    expect(CHRONIST_DEFAULT_LOCAL_URLS).toEqual(["http://127.0.0.1:11434", "http://[::1]:11434"]);
    // `localhost` IST 127.0.0.1, sobald angefragt wird — als eigener Kandidat waere es dieselbe
    // Pruefung ein zweites Mal.
    expect(chronistHostUrl("localhost:11434")).toBe("http://127.0.0.1:11434");
    expect(chronistScanCandidates({ OLLAMA_HOST: "localhost:11434" })).toEqual([...CHRONIST_DEFAULT_LOCAL_URLS]);
  });
});

describe("Eine Adresse prüfen", () => {
  it("meldet Modelle, wenn der Dienst antwortet", async () => {
    const eintrag = await probeChronistLocal(vi.fn(async () => antwort(["llama3.2", "qwen2.5"])), "http://127.0.0.1:11434");
    expect(eintrag.code).toBe("gefunden");
    expect(eintrag.models).toEqual(["llama3.2", "qwen2.5"]);
    expect(eintrag.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("unterscheidet einen leeren Dienst von gar keinem Dienst", async () => {
    // Der Unterschied ist die Handlungsanweisung: dort hilft `ollama pull`, hier hilft nur,
    // den Dienst ueberhaupt zu starten.
    expect((await probeChronistLocal(vi.fn(async () => antwort([])), "http://127.0.0.1:11434")).code).toBe("leer");
    const abgelehnt = vi.fn(async () => { throw Object.assign(new Error("ECONNREFUSED"), { name: "TypeError" }); });
    expect((await probeChronistLocal(abgelehnt, "http://127.0.0.1:11434")).code).toBe("keine-antwort");
  });

  it("meldet eine Zeitüberschreitung als solche", async () => {
    const langsam = vi.fn(async () => { throw Object.assign(new Error("timed out"), { name: "TimeoutError" }); });
    expect((await probeChronistLocal(langsam, "http://127.0.0.1:11434")).code).toBe("zeitueberschreitung");
  });

  it("meldet eine Antwort, die keine Modellliste ist", async () => {
    expect((await probeChronistLocal(vi.fn(async () => new Response("<html>", { status: 200 })), "http://127.0.0.1:11434")).code).toBe("unlesbar");
    expect((await probeChronistLocal(vi.fn(async () => new Response("", { status: 404 })), "http://127.0.0.1:11434")).code).toBe("unlesbar");
  });

  it("wirft nie — der Grund ist das Ergebnis", async () => {
    const kaputt = vi.fn(async () => { throw new Error("irgendwas"); });
    await expect(probeChronistLocal(kaputt, "http://127.0.0.1:11434")).resolves.toMatchObject({ code: "keine-antwort" });
  });
});

describe("Der Suchlauf", () => {
  it("geht weiter, wenn die erste Adresse schweigt, und hält beim ersten Treffer an", async () => {
    const invokeFetch = vi.fn(async (input: Request | URL | string) => {
      if (String(input).includes("11500")) throw Object.assign(new Error("nein"), { name: "TypeError" });
      if (String(input).includes("127.0.0.1")) return antwort(["llama3.2"]);
      throw new Error("die dritte Adresse hätte nicht mehr geprüft werden dürfen");
    });
    const bericht = await scanChronistLocal({ fetch: invokeFetch as unknown as typeof fetch, environment: { OLLAMA_HOST: "11500" } });
    expect(bericht.found?.models).toEqual(["llama3.2"]);
    expect(bericht.entries).toHaveLength(2);
    expect(bericht.entries[0]!.baseUrl).toBe("http://127.0.0.1:11500");
    expect(bericht.entries[0]!.code).toBe("keine-antwort");
    expect(invokeFetch).toHaveBeenCalledTimes(2);
  });

  it("liefert bei nichts Gefundenem trotzdem einen Bericht über jede geprüfte Adresse", async () => {
    const invokeFetch = vi.fn(async () => { throw Object.assign(new Error("nein"), { name: "TypeError" }); });
    const bericht = await scanChronistLocal({ fetch: invokeFetch as unknown as typeof fetch, environment: {} });
    expect(bericht.found).toBeNull();
    expect(bericht.entries.map(eintrag => eintrag.baseUrl)).toEqual([...CHRONIST_DEFAULT_LOCAL_URLS]);
    expect(bericht.entries.every(eintrag => eintrag.code === "keine-antwort")).toBe(true);
  });
});

describe("Die Laufzeit übernimmt das Ergebnis", () => {
  it("findet beim Start ein Modell auf einer anderen als der üblichen Adresse", async () => {
    const invokeFetch = vi.fn(async (input: Request | URL | string) =>
      String(input).includes(":11500") ? antwort(["mistral"]) : Promise.reject(Object.assign(new Error("nein"), { name: "TypeError" })));
    const runtime = await loadChronistRuntime({ fetch: invokeFetch as unknown as typeof fetch, environment: { OLLAMA_HOST: "11500" } });
    expect(runtime.providers).toHaveLength(1);
    expect(runtime.providers[0]!.models).toEqual(["mistral"]);
    expect(runtime.providers[0]!.available).toBe(true);
    await runtime.close?.();
  });

  it("behält den Platzhalter, wenn nichts läuft — und findet ihn beim Suchen später doch", async () => {
    let laeuft = false;
    const invokeFetch = vi.fn(async () => laeuft ? antwort(["llama3.2"]) : Promise.reject(Object.assign(new Error("nein"), { name: "TypeError" })));
    const runtime = await loadChronistRuntime({ fetch: invokeFetch as unknown as typeof fetch, environment: {} });
    expect(runtime.providers[0]!.available).toBe(false);
    expect(runtime.providers[0]!.models).toEqual([CHRONIST_UNCONFIGURED_MODEL]);

    // Genau der Fall aus dem Betrieb: der Dienst wird NACH der App gestartet.
    laeuft = true;
    const bericht = await runtime.rescanLocal!();
    expect(bericht.found?.models).toEqual(["llama3.2"]);
    expect(runtime.providers[0]!.models).toEqual(["llama3.2"]);
    expect(runtime.providers[0]!.available).toBe(true);
    // Und die Bindung greift auf das neue Modell zu, ohne dass jemand die Laufzeit neu bekam.
    expect(runtime.resolveProvider("ollama", "llama3.2")).toBeTruthy();
    await runtime.close?.();
  });

  it("bietet keine Suche an, wo der Host keine stellt", () => {
    // Ein Prüftisch mit fester Laufzeit: die Oberfläche soll dann keinen Knopf zeigen, der
    // nichts tut — `canScanLocal` haengt genau an dieser Abwesenheit.
    expect(createChronistRuntime().rescanLocal).toBeUndefined();
  });
});

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { ApiError } from "../src/api";
import { chronistCost, clearChronistDrafts, createChronistCommand, readChronistDraft } from "../src/features/chronist-model";

describe("Chronist commands across uncertain acknowledgements", () => {
  it("reuses the exact command after a lost ACK and refuses retargeting", async () => {
    const received: { commandId: string; scope: string; sources: string[] }[] = [];
    let count = 0;
    const command = createChronistCommand<{ scope: string; sources: string[] }, string>(async body => {
      received.push(body); if (++count === 1) throw new TypeError("Connection closed after write"); return "started";
    }, () => `command-${count}`);
    const input = { scope: "scope-a", sources: ["saved-note"] };
    await expect(command.send(input)).rejects.toThrow("Connection closed");
    input.sources.push("another-note");
    await expect(command.send(input)).rejects.toThrow("ungeklärt");
    await expect(command.send({ scope: "scope-a", sources: ["saved-note"] })).resolves.toBe("started");
    expect(received[0]).toEqual(received[1]);
    expect(received[0]?.sources).toEqual(["saved-note"]);
    expect(command.pending).toBeNull();
  });
  it("deduplicates a second click while the first is running", async () => {
    let finish!: (value: string) => void, sent = 0;
    const command = createChronistCommand<{ scope: string }, string>(() => { sent++; return new Promise(resolve => { finish = resolve; }); });
    const first = command.send({ scope: "one" }), second = command.send({ scope: "one" });
    await Promise.resolve(); expect(sent).toBe(1); finish("ok");
    expect(await first).toBe("ok"); expect(await second).toBe("ok");
  });
  it("allows correction after a definite CAS rejection but retains an uncertain server failure", async () => {
    let status = 409;
    const command = createChronistCommand<{ version: number }, never>(async () => { throw new ApiError(status, "failed"); });
    await expect(command.send({ version: 1 })).rejects.toThrow("failed"); expect(command.pending).toBeNull();
    status = 500; await expect(command.send({ version: 2 })).rejects.toThrow("failed");
    expect(command.pending?.version).toBe(2);
    await expect(command.send({ version: 3 })).rejects.toThrow("ungeklärt");
  });
});

describe("local proposal recovery is untrusted and scoped", () => {
  const draft = { schemaVersion: 1, proposalId: "proposal-a", version: 3, draftHash: "a".repeat(64), blocks: [{ kind: "absatz", inhalt: [{ text: "Edited proposal", marks: [] }] }] };
  it("keeps the original version and hash rather than silently rebasing", () => { expect(readChronistDraft(JSON.stringify(draft), "proposal-a")).toEqual(draft); });
  it("rejects another proposal, corrupt JSON, broken blocks and unbounded input", () => {
    expect(readChronistDraft(JSON.stringify(draft), "proposal-b")).toBeNull();
    expect(readChronistDraft("{", "proposal-a")).toBeNull();
    expect(readChronistDraft(JSON.stringify({ ...draft, blocks: [{ kind: "absatz", inhalt: null }] }), "proposal-a")).toBeNull();
    expect(readChronistDraft(JSON.stringify({ ...draft, blocks: [{ kind: "liste", geordnet: true, punkte: [[{ text: "safe", marks: [{ art: "link", zielSlug: 12 }] }]] }] }), "proposal-a")).toBeNull();
    expect(readChronistDraft(" ".repeat(2_097_153), "proposal-a")).toBeNull();
  });
  it("removes only the campaign's protected recovery after a rights loss", () => {
    const values = new Map([["chronist-draft:campaign-a:p1", "private"], ["chronist-draft:campaign-a:p2", "private"], ["chronist-draft:campaign-b:p1", "other"], ["appearance", "light"]]);
    const storage = { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, removeItem: (key: string) => values.delete(key) } as Storage;
    clearChronistDrafts(storage, "campaign-a"); expect([...values.values()]).toEqual(["other", "light"]);
  });
  it("never translates an unknown tariff into free usage", () => {
    expect(chronistCost(null, "EUR")).toBe("Kosten unbekannt");
    expect(chronistCost(0, null)).toBe("Kosten unbekannt");
    expect(chronistCost(1_500_000, "EUR")).toContain("1,5");
  });
});

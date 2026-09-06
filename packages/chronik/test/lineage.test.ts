import { describe, expect, it } from "vitest";
import { trustActorId, trustPassageId } from "@chronicle/core";
import { erfahrungsgrad, lineage, mergeGuard, resolvePassage, tuerklasse } from "../src/index.ts";

const p = trustPassageId;
const b = (pid: string, text: string) => ({ pid: p(pid), text });

describe("passage identity at a save boundary", () => {
  it("keeps identity on reorder and records content and mark changes", () => {
    expect(lineage([b("a", "A"), b("b", "B")], [b("b", "B"), b("a", "A")])).toEqual([]);
    expect(lineage([b("a", "A")], [{ ...b("a", "A"), fingerprint: "new-link" }])).toEqual([{ kind: "revise", pid: "a" }]);
  });
  it("splits a passage and resolves an existing revelation to both children", () => {
    const events = lineage([b("a", "Hello world")], [b("x", "Hello"), b("y", " world")]);
    expect(events).toEqual([{ kind: "split", parent: "a", children: ["x", "y"] }]);
    expect(resolvePassage(p("a"), events)).toEqual(["x", "y"]);
  });
  it("tracks a split at the start, including the empty child", () => {
    expect(lineage([b("a", "Hello")], [b("x", ""), b("y", "Hello")])).toEqual([
      { kind: "split", parent: "a", children: ["x", "y"] },
    ]);
  });
  it("never infers a split across a resident block or an ambiguous copy", () => {
    expect(lineage([b("a", "AB"), b("resident", "-")], [b("x", "A"), b("resident", "-"), b("y", "B")]))
      .not.toContainEqual(expect.objectContaining({ kind: "split" }));
    expect(lineage([b("a", "AB")], [b("w", "A"), b("x", "B"), b("y", "A"), b("z", "B")]))
      .not.toContainEqual(expect.objectContaining({ kind: "split" }));
  });
  it("records a merge into either the surviving parent or a fresh identity", () => {
    for (const child of ["a", "new"]) {
      const events = lineage([b("a", "A"), b("b", "B")], [b(child, "AB")]);
      expect(events).toEqual([{ kind: "merge", parents: ["a", "b"], child }]);
      expect(resolvePassage(p("b"), events)).toEqual([child]);
    }
  });
  it("does not absorb a parent that still exists independently", () => {
    expect(lineage([b("a", "A"), b("b", "B")], [b("a", "AB"), b("b", "B")]))
      .toEqual([{ kind: "revise", pid: "a" }]);
  });
  it("never assigns unrelated ancestors to a resident identity with matching text", () => {
    expect(lineage([b("a", "A"), b("b", "B"), b("c", "C")], [b("c", "AB")]))
      .not.toContainEqual(expect.objectContaining({ kind: "merge" }));
  });
  it("does not choose arbitrarily between duplicate parents or merged copies", () => {
    expect(lineage([b("a", "AB"), b("b", "AB")], [b("x", "A"), b("y", "B")]))
      .not.toContainEqual(expect.objectContaining({ kind: "split" }));
    expect(lineage([b("a", "A"), b("b", "B")], [b("x", "AB"), b("y", "AB")]))
      .not.toContainEqual(expect.objectContaining({ kind: "merge" }));
  });
  it("resolves repeated splits, merges and retirement chronologically", () => {
    const events = [
      { kind: "split" as const, parent: p("a"), children: [p("b"), p("c")] },
      { kind: "merge" as const, parents: [p("b"), p("c")], child: p("b") },
      { kind: "split" as const, parent: p("b"), children: [p("d"), p("e")] },
      { kind: "retire" as const, pid: p("d") },
    ];
    expect(resolvePassage(p("a"), events)).toEqual(["e"]);
  });
  it("rejects duplicate identities and cycles rather than granting a wrong atom", () => {
    expect(() => lineage([], [b("a", "A"), b("a", "B")])).toThrow(/unique/);
    expect(() => resolvePassage(p("a"), [
      { kind: "split", parent: p("a"), children: [p("b")] },
      { kind: "split", parent: p("b"), children: [p("a")] },
    ])).toThrow(/Cyclic/);
  });
});

describe("audience and provenance guards", () => {
  it("blocks a merge that would expose a private paragraph to another holder", () => {
    const alice = trustActorId("alice");
    expect(mergeGuard([p("public"), p("secret")], (pid) => pid === "public" ? [alice] : []))
      .toEqual({ blocked: true, gains: [{ holder: "alice", wouldGain: "secret" }] });
    expect(mergeGuard([p("a"), p("b")], () => [alice, alice])).toBeNull();
  });
  it("derives experience without upgrading a citation or hearsay to a roll", () => {
    expect(erfahrungsgrad({ art: "wurf", wurfId: "r" })).toBe("erfahren");
    expect(erfahrungsgrad({ art: "gesprochen", sitzung: "s" })).toBe("gesprochen");
    expect(erfahrungsgrad({ art: "passage", ueber: p("a") })).toBe("gehoert");
  });
  it("triages demand from distinct entries and honors notation rejection", () => {
    expect([1, 2, 3, 30].map((count) => tuerklasse(count))).toEqual(["notiz", "spur", "tuer", "tuer"]);
    expect(tuerklasse(20, true)).toBe("verworfen");
    expect(() => tuerklasse(0)).toThrow();
  });
});

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalHash, trustUniverseId } from "@chronicle/core";
import { createWikiBundle, importEron, parseWikiBundle, serializeWikiBundle, validateWikiBundle } from "../src/index.ts";

const imported = importEron({
  universeId: trustUniverseId("world"), wikiUrl: "https://eron.fandom.com/de/", importiertAm: "2026-09-06T12:00:00Z",
  articles: JSON.parse(readFileSync(new URL("../../../design/fixtures/eron/articles.json", import.meta.url), "utf8")),
  templates: JSON.parse(readFileSync(new URL("../../../design/fixtures/eron/templates.json", import.meta.url), "utf8")),
});
const data = { universeId: imported.universeId, entries: imported.entries, revisions: imported.revisions, passages: imported.passages,
  aliases: imported.aliases, links: imported.links, provenance: imported.provenance, sources: [imported.source], importReports: [imported.report],
  // Die Bildpassagen des Korpus verweisen auf Asset-Ids; ein Bündel ohne diese Assets wäre ein
  // Bündel mit unauflösbaren Verweisen, und genau das lehnt der Validator zu Recht ab.
  revelations: [], lineage: [], assets: imported.assets };
const snapshot = () => JSON.parse(JSON.stringify(createWikiBundle(data)));

describe("versioned wiki bundles", () => {
  it("round-trips the real corpus with no semantic loss, including original source and incomplete attribution", () => {
    const bundle = createWikiBundle(data), encoded = serializeWikiBundle(bundle), parsed = parseWikiBundle(encoded);
    expect(parsed).toEqual(bundle);
    expect(serializeWikiBundle(parsed)).toBe(encoded);
    expect(parsed.entries).toHaveLength(73);
    expect(parsed.sources[0]?.articles).toEqual(imported.source.articles);
    expect(parsed.provenance[0]?.status).toBe("incomplete");
  });
  it("rejects unknown bundle/AST versions and future fields without silently discarding them", () => {
    for (const patch of [{ version: 2 }, { blockAstVersion: 2 }, { futureObject: { important: true } }]) {
      expect(() => validateWikiBundle({ ...snapshot(), ...patch })).toThrow(/version|migration|unknown/);
    }
  });
  it("rejects unsafe or unknown block constructors and forged inline marks", () => {
    const first = snapshot(); first.passages[0].inhalt = { kind: "html", html: "<script>boom</script>" };
    expect(() => validateWikiBundle(first)).toThrow(/expected/);
    const second = snapshot(); second.passages[0].inhalt = { kind: "absatz", inhalt: [{ text: "safe", marks: [{ art: "link", zielSlug: "unsafe", javascript: "alert(1)" }] }] };
    expect(() => validateWikiBundle(second)).toThrow(/unknown field/);
  });
  it("rejects dangling, cross-entry and scope-confused references", () => {
    const missing = snapshot(); missing.entries[0].aktuelleRevision = "absent";
    expect(() => validateWikiBundle(missing)).toThrow(/dangling/);
    const revision = snapshot(); revision.entries[0].aktuelleRevision = revision.entries[1].aktuelleRevision;
    expect(() => validateWikiBundle(revision)).toThrow(/another entry/);
    const scope = snapshot(); scope.entries[0].universeId = "another-world";
    expect(() => validateWikiBundle(scope)).toThrow(/scope/);
    const mark = snapshot(); mark.passages[0].inhalt = { kind: "absatz", inhalt: [{ text: "secret", marks: [{ art: "link", zielSlug: "secret", zielEntryId: "missing" }] }] };
    expect(() => validateWikiBundle(mark)).toThrow(/dangling/);
  });
  it("rejects duplicate ids, revision sequences, live ordinals and shadowing aliases", () => {
    const identities = snapshot(); identities.passages.push(identities.passages[0]);
    expect(() => validateWikiBundle(identities)).toThrow(/duplicate/);
    const revisions = snapshot(); revisions.revisions.push({ ...revisions.revisions[0], id: "new-id" });
    expect(() => validateWikiBundle(revisions)).toThrow(/sequence/);
    const order = snapshot(); order.passages[1].ord = order.passages[0].ord;
    expect(() => validateWikiBundle(order)).toThrow(/ordinal/);
    const alias = snapshot(); alias.aliases[0].vonSlug = alias.entries[0].slug;
    expect(() => validateWikiBundle(alias)).toThrow(/shadowing/);
  });
  it("requires source provenance for every imported passage and verifies preserved source hashes", () => {
    const provenance = snapshot(); provenance.provenance.pop();
    expect(() => validateWikiBundle(provenance)).toThrow(/source record/);
    const source = snapshot(); source.sources[0].articles[0].wikitext += "tampered";
    expect(() => validateWikiBundle(source)).toThrow(/digest/);
    const authors = snapshot(); authors.provenance[0].value.autoren = ["Made up"];
    expect(() => validateWikiBundle(authors)).toThrow(/unknown/);
    const missingSource = snapshot(); missingSource.sources = [];
    expect(() => validateWikiBundle(missingSource)).toThrow(/source artifact/);
  });
  it("preserves revelations and historical lineage while rejecting cyclic ancestry", () => {
    const bundle = snapshot(), a = bundle.passages[0].pid, b = bundle.passages[1].pid, c = bundle.passages[2].pid;
    bundle.revelations = [{ passageId: a, actorId: "historical-actor", quelle: { art: "gesprochen", sitzung: "S1" } }];
    bundle.lineage = [{ kind: "split", parent: a, children: [b, c] }];
    expect(parseWikiBundle(serializeWikiBundle(validateWikiBundle(bundle))).revelations).toEqual(bundle.revelations);
    bundle.lineage.push({ kind: "merge", parents: [b, c], child: a });
    expect(() => validateWikiBundle(bundle)).toThrow(/cyclic/);
  });
  it("rejects malformed JSON, prototype pollution and oversized/deep uploads", () => {
    expect(() => parseWikiBundle("{oops")).toThrow(/invalid JSON/);
    expect(() => parseWikiBundle('{"__proto__":{"polluted":true}}')).toThrow(/unsafe/);
    let deep: unknown = null;
    for (let i = 0; i < 66; i++) deep = { next: deep };
    expect(() => validateWikiBundle(deep)).toThrow(/depth/);
  });
  it("does not keep caller-owned references after validation", () => {
    const raw = snapshot(), copy = validateWikiBundle(raw);
    raw.entries[0].titel = "changed after validation";
    expect(copy.entries[0]?.titel).not.toBe(raw.entries[0].titel);
    expect(canonicalHash({ x: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });
});

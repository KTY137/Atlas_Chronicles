import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiError } from "../src/api";
import { LetterContents } from "../src/features/WeekView";
import { createLetterSubmission, type LetterDetail, type LetterDraft, type SendLetterRequest } from "../src/features/week-api";

const at = Date.UTC(2026, 8, 6, 12);
const draft: LetterDraft = { fromActorId: "sender", toActorIds: ["recipient"], passageIds: ["passage"], note: "A personal note" };
function letter(grant: "current" | "historical-only" = "current"): LetterDetail {
  const citation = { passageId: "passage", sourceRevisionId: "frozen-revision", sourceHash: "a".repeat(64), quelle: { art: "gehoert" as const, von: "sender" } };
  return {
    id: "letter", direction: "received", fromActorId: "sender", sentAt: at, sentDay: 10, sentLabel: "Zehnter Frosttag", arrivalDay: 13, seal: "b".repeat(64),
    recipients: [{ actorId: "recipient", deliveredAt: at + 5000, deliveredDay: 13, deliveredLabel: "Dreizehnter Frosttag", readAt: null, readDay: null }],
    note: "<script>private note</script>", noteIsCanon: false,
    articles: [{ entryId: "entry", slug: "Old_Gate", titel: "Das alte Tor", passagen: [{ pid: "passage", ord: 0, pfad: ["Der Weg"], inhalt: { kind: "absatz", inhalt: [{ text: "The frozen route", marks: [] }] } }], citations: [citation] }],
    delivery: [{ seal: "c".repeat(64), proof: { schemaVersion: 1, letterId: "letter", letterSeal: "b".repeat(64), fromActorId: "sender", toActorId: "recipient", sentAt: at, sentDay: 10, scheduledDay: 13, deliveredAt: at + 5000, deliveredDay: 13, deliveredLabel: "Dreizehnter Frosttag", passages: [{ ...citation, grant }] } }],
  };
}

describe("week letter submission", () => {
  it("retains the exact command after a lost response and permits a new intentional send after success", async () => {
    const requests: SendLetterRequest[] = []; let nextId = 0;
    const submission = createLetterSubmission(async request => {
      requests.push(request);
      if (requests.length === 1) throw new TypeError("response lost after commit");
      return letter();
    }, () => `command-${++nextId}`);
    await expect(submission.submit(draft)).rejects.toThrow("response lost");
    expect(submission.pending?.commandId).toBe("command-1");
    await expect(submission.submit({ ...draft, note: "Different intent" })).rejects.toThrow("vorherige Versand");
    expect(requests).toHaveLength(1);
    await submission.submit(draft);
    expect(requests[1]).toBe(requests[0]);
    expect(submission.pending).toBeNull();
    await submission.submit(draft);
    expect(requests[2]?.commandId).toBe("command-2");
  });

  it("coalesces repeated submit gestures and freezes caller-owned selection arrays", async () => {
    let resolve!: (value: LetterDetail) => void; let calls = 0;
    const answer = new Promise<LetterDetail>(done => { resolve = done; });
    const submission = createLetterSubmission(async () => { calls++; return answer; }, () => "one-command");
    const recipients = ["recipient"], passages = ["passage"], original = { ...draft, toActorIds: recipients, passageIds: passages };
    const first = submission.submit(original), second = submission.submit(original);
    recipients.push("another-reader"); passages.push("another-passage");
    expect(submission.pending).toMatchObject({ toActorIds: ["recipient"], passageIds: ["passage"] });
    await Promise.resolve(); expect(calls).toBe(1);
    expect(() => submission.discard()).toThrow("Versand läuft");
    resolve(letter()); await Promise.all([first, second]);
  });

  it("keeps rejected draft data editable while retaining uncertain server failures", async () => {
    let failure: Error = new ApiError(404, "unavailable");
    const submission = createLetterSubmission(async () => { throw failure; }, () => "command");
    await expect(submission.submit(draft)).rejects.toThrow("unavailable");
    expect(submission.pending).toBeNull();
    failure = new ApiError(503, "server unavailable");
    await expect(submission.submit({ ...draft, note: "Corrected" })).rejects.toThrow("server unavailable");
    expect(submission.pending?.note).toBe("Corrected");
    submission.discard(); expect(submission.pending).toBeNull();
  });
});

describe("the received frozen letter", () => {
  const names = new Map([["sender", "Sera"], ["recipient", "Brannt"], ["other-recipient", "Private recipient"]]);
  const render = (value: LetterDetail) => renderToStaticMarkup(createElement(LetterContents, { letter: value, names, onOpenEntry: () => {}, onRead: () => {} }));

  it("renders the received projection and its own receipt without other roster identities or executable note markup", () => {
    const html = render(letter());
    expect(html).toContain("The frozen route");
    expect(html).toContain("frozen-revision");
    expect(html).toContain("Dreizehnter Frosttag");
    expect(html).toMatch(/datetime="2026-09-06T12:00:05\.000Z"/i);
    expect(html).toContain("b".repeat(64)); expect(html).toContain("c".repeat(64));
    expect(html).toContain("&lt;script&gt;private note&lt;/script&gt;");
    expect(html).not.toContain("<script>"); expect(html).not.toContain("Private recipient");
    expect(html).toContain("Brief als gelesen markieren");
  });

  it("keeps historical-only evidence readable without claiming a current article grant", () => {
    const html = render(letter("historical-only"));
    expect(html).toContain("The frozen route");
    expect(html).toContain("Historische Abschrift: Die Quelle hat sich verändert.");
    expect(html).not.toContain("In der Chronik öffnen");
    expect(html).not.toContain("ins Buch aufgenommen");
  });

  it("shows recorded read status without another read action", () => {
    const value = letter(); value.recipients[0]!.readAt = at + 10_000; value.recipients[0]!.readDay = 13;
    const html = render(value);
    expect(html).toContain("Deine Lesebestätigung ist gespeichert.");
    expect(html).not.toContain("Brief als gelesen markieren");
  });
});

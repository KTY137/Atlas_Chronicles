// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ApiError, type EntryDocument, type ProjectedPassage } from "../api";
import type { DoorCard } from "./game-api";

export interface FictionClock { day: number; label: string; postDays: number; version: number }
export type KnowledgeSource = { art: "wurf"; wurfId: string } | { art: "gesprochen"; sitzung: string } | { art: "gehoert"; von: string } | { art: "passage"; ueber: string };
export interface LetterRecipient {
  actorId: string; deliveredAt: number | null; deliveredDay: number | null; deliveredLabel: string | null;
  readAt: number | null; readDay: number | null;
}
export interface LetterEnvelope {
  id: string; direction: "sent" | "received"; fromActorId: string; sentAt: number; sentDay: number; sentLabel: string;
  arrivalDay: number; recipients: LetterRecipient[]; seal: string;
}
export interface LetterCitation { passageId: string; sourceRevisionId: string; sourceHash: string; quelle: KnowledgeSource }
export interface LetterArticle extends EntryDocument { citations: LetterCitation[] }
export interface DeliveryOutcome extends LetterCitation { grant: "current" | "historical-only" }
export interface DeliveryProof {
  schemaVersion: 1; letterId: string; letterSeal: string; fromActorId: string; toActorId: string;
  sentAt: number; sentDay: number; scheduledDay: number; deliveredAt: number; deliveredDay: number; deliveredLabel: string;
  passages: DeliveryOutcome[];
}
export interface DeliveryReceipt { proof: DeliveryProof; seal: string }
export interface LetterDetail extends LetterEnvelope { note: string; noteIsCanon: false; articles: LetterArticle[]; delivery: DeliveryReceipt[] }
export interface Umbruch { entryId: string; slug: string; titel: string; passagen: (ProjectedPassage & { unread: boolean })[]; unreadCount: number; readHash?: string }
export interface WeekDifference {
  sinceSessionId: string | null; baselineKnown: boolean; window: { from: number | null; to: number };
  knowledgeAdded: { actorId: string; passageId: string; entryId: string; quelle: KnowledgeSource; grantedAt: number }[];
  open: DoorCard[]; expired: DoorCard[];
  inTransit: { letterId: string; fromActorId: string; toActorId: string; arrivalDay: number }[];
}
export interface LetterDraft { fromActorId: string; toActorIds: readonly string[]; passageIds: readonly string[]; note: string }
export interface SendLetterRequest extends LetterDraft { commandId: string }

/** An unresolved submission keeps its exact request, even after a lost response.
 * Editing it requires an explicit discard; changing a note must never retarget a retry. */
export function createLetterSubmission(transport: (request: SendLetterRequest) => Promise<LetterDetail>, makeId: () => string = () => crypto.randomUUID()) {
  let pending: { fingerprint: string; request: SendLetterRequest } | null = null;
  let inFlight: Promise<LetterDetail> | null = null;
  return {
    get pending() { return pending?.request ?? null; },
    discard() { if (inFlight) throw new Error("Der Versand läuft noch."); pending = null; },
    submit(draft: LetterDraft): Promise<LetterDetail> {
      const body = { fromActorId: draft.fromActorId, toActorIds: [...draft.toActorIds].sort(), passageIds: [...draft.passageIds].sort(), note: draft.note };
      const fingerprint = JSON.stringify(body);
      if (pending && pending.fingerprint !== fingerprint) return Promise.reject(new Error("Der vorherige Versand ist noch ungeklärt. Wiederhole ihn oder verwirf diesen Entwurf ausdrücklich."));
      if (inFlight) return inFlight;
      pending ??= { fingerprint, request: Object.freeze({ ...body, toActorIds: Object.freeze(body.toActorIds), passageIds: Object.freeze(body.passageIds), commandId: makeId() }) };
      const attempt = pending;
      inFlight = Promise.resolve().then(() => transport(attempt.request)).then(result => {
        pending = null;
        return result;
      }, error => {
        // These responses reject the command. Network errors, timeouts and server
        // failures can follow a committed write, so their command ID stays reserved.
        if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status)) pending = null;
        throw error;
      }).finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}

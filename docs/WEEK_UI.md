# Die Woche: application acceptance

The Week stage uses the production campaign endpoints. It contains the fictional clock,
explicitly authored letters and the GM's state comparison. New knowledge remains marked
inside its wiki article through `umbruch`; Week does not create an unread passage feed.

## Client integration

- `WeekView.tsx` accepts `campaign`, `userId`, optional `liveRevision`, `onDirty`,
  `onOpenEntry(entryId)`, `onOpenDoors(doorId?)` and optional
  `composeSeed: { entryId, passageIds }`.
- `week-api.ts` exports the wire models, including `Umbruch` and its optional `readHash`.
  Root Wiki passes the server's current hash when explicitly acknowledging an article.
- Article passage actions open a seeded composer. The selected atoms are reloaded through
  the authenticated document projection before they become a selection.
- Existing `Button`, `Notice` and `BlockReader` render the controls and frozen article AST.
  Inline links use the server projection; available door marks use the existing table route.

## Behavior to preserve

A sender uses their own controlled actor and shares one to thirty-two held passages with
one to sixteen other campaign actors. A GM without an actor can operate the clock and
comparison; that access does not impersonate player senders or open another person's mail.
The server rechecks ownership, held passages and every recipient when sending.

The composer survives polling and collapse. An uncertain response keeps the exact immutable
command and request for retry. A changed request cannot take over that command; an explicit
discard is required. Completed sends clear the draft. Definite client errors retain editable
content. Switching campaign or user creates a separate component state. Drafts do not claim
durability across a reload; the shell's unsaved-work guard remains active.

The GM clock uses the existing expected-version contract. An edited clock retains its base
version through refreshes; newer remote state requires explicit discard before a new edit.
Advancing the day delivers due letters. Post-duration changes affect future sends, while an
existing envelope retains its scheduled day. Delivery follows fictional days, not elapsed
wall-clock time.

Recipients receive no envelope before delivery. Each recipient sees only their own delivery
and reading state; senders see their recipients' envelope status. The GM comparison may show
transit metadata without granting access to the letter body.

Letter detail renders the frozen projected articles returned by the letter endpoint, with
source revisions and hashes, envelope seal, actual server send/delivery timestamps and both
fictional dates. Delivery outcomes distinguish a current heard grant from a historical copy
whose source changed. The cover note remains ordinary escaped text and never becomes canon.
Reading a delivered letter is a separate explicit request. No local placeholder reports a
successful send, delivery or read.

The GM comparison groups added knowledge by article and separately shows open doors, expired
doors and envelopes in transit. Missing historical baselines are identified as unknown;
an empty comparison is not presented as proof that nothing happened.

## Verification

`packages/client/test/week-ui.test.ts` exercises lost-response retries, concurrent submit
gestures, immutable selections, definite versus uncertain errors, received-only render
data, escaped cover notes, historical copies and explicit reading state through React DOM.

`e2e/week.spec.ts` runs the actual built application with a fresh schema on the real Postgres
service and three authenticated browser contexts. Domain fixtures provide two controlled
actors, disjoint held passages, a hidden passage and a session baseline. The application flow
marks the recipient's article read, composes from the sender's wiki, delays delivery, advances
the world clock, reads the frozen article and independently checks the receipt seal, verifies
inline unread state and the GM difference, then opens the sender's existing door. It also
checks recipient phone overflow and persistence after reload. It must run after the shared
client build, using the same `E2E_DATABASE_URL` or local configuration as the other acceptance
tests. Its isolated test schema is removed on completion.

Synthetic acceptance establishes the application flow. It does not replace the Champion's
required observations of real play over multiple sessions and weeks.

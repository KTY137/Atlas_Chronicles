// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Internal reasons never cross HTTP: existence and permission failures have one response. */
export class Gone extends Error {
  constructor(readonly reason = "unavailable") { super("gone"); }
}
export class Conflict extends Error {
  /**
   * `hinweis` ist der eine Satz, den der Nutzer statt „Bitte den aktuellen Stand laden" lesen
   * soll — fuer die Faelle, in denen der Konflikt keine veraltete Version ist, sondern eine
   * konkrete Sache, die im Weg steht. Ohne Angabe bleibt alles wie bisher.
   */
  constructor(readonly hinweis?: string) { super("version-conflict"); }
}

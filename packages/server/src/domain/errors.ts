/** Internal reasons never cross HTTP: existence and permission failures have one response. */
export class Gone extends Error {
  constructor(readonly reason = "unavailable") { super("gone"); }
}
export class Conflict extends Error {
  constructor() { super("version-conflict"); }
}

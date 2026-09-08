// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash,createHmac,randomBytes,timingSafeEqual } from "node:crypto";
import { canonicalJson,type CanonicalValue } from "@chronicle/core";
import type { ChronistFreigabe } from "@chronicle/protocol";

/**
 * Die Egress-Freigabe.
 *
 * Vorher war `externalConsent` eine Behauptung des Browsers: wer die Kästchen im
 * Formular umging, sendete trotzdem. Hier entsteht die Freigabe **auf dem Server**
 * bei der Vorschau und bindet genau das, was gezeigt wurde — Kampagne, Person,
 * Umfang, Anbieterabdruck, Modell und einen Ablauf. Sie wird mit dem Cookie-Geheimnis
 * der Anwendung signiert, gilt fünf Minuten und wird genau einmal verbraucht.
 *
 * Das Token ist ein Geheimnis wie ein Sitzungscookie: es steht nie im Beleg, nie im
 * Export und nie in einer Fehlermeldung. Belegt wird nur sein SHA-256 und sein Ablauf.
 *
 * **Kodierung ist Identität.** base64url ist nicht injektiv, wenn man es lässt: an ein
 * Token angehängte Zeichen fallen beim Dekodieren weg, ergeben dieselben Bytes und
 * damit dieselbe gültige Signatur — aber eine andere Zeichenkette und folglich einen
 * anderen Abdruck. Aus einem Einmal-Token würden so 65 Läufe. Deshalb gilt hier: nur
 * die kanonische Kodierung ist gültig, und jeder Abdruck wird über die **dekodierten
 * Bytes** gebildet, nie über die Zeichenkette.
 */
export interface ChronistFreigabeClaim {
  readonly campaignId: string; readonly userId: string; readonly scopeHash: string;
  readonly providerFingerprint: string; readonly model: string;
}
/** Fünf Minuten: lang genug, um die Liste der Passagen wirklich zu lesen, kurz genug für ein Fenster. */
export const CHRONIST_FREIGABE_TTL_MS = 300_000;
/**
 * Geheimnis, aus dem die Freigabe signiert wird. Der Anwendungsrahmen liefert es als
 * `cookieSecret`; ohne ausreichendes Geheimnis gibt es keinen Ersatzschlüssel, sondern
 * eine Verweigerung an der Stelle, an der eine Freigabe gebraucht würde.
 */
export interface ChronistFreigabeConfig { readonly cookieSecret?: string }
/** Dasselbe Mindestmaß wie für die Sitzungssignatur in `identity/index.ts`. */
export const CHRONIST_FREIGABE_SECRET_MIN = 32;
const TOKEN = /^([0-9]{1,15})\.([a-f0-9]{32})\.([a-f0-9]{64})$/;
/**
 * Die Einmaligkeit hängt an der Kennung, nicht an der Uhr: zwei Vorschauen in derselben
 * Millisekunde ergäben sonst dasselbe Token, und die zweite wäre schon verbraucht.
 */
const sign = (secret: string, claim: ChronistFreigabeClaim, ablaufAt: number, nonce: string) =>
  createHmac("sha256", secret).update(canonicalJson({ campaignId: claim.campaignId, userId: claim.userId, scopeHash: claim.scopeHash,
    providerFingerprint: claim.providerFingerprint, model: claim.model, ablaufAt, nonce } as unknown as CanonicalValue)).digest("hex");
/** Genau eine Zeichenkette steht für diese Bytes; jede andere Schreibweise ist kein Token. */
function bytes(token: unknown): Buffer | null {
  if (typeof token !== "string" || token.length < 16 || token.length > 512 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const decoded = Buffer.from(token, "base64url");
  return decoded.toString("base64url") === token ? decoded : null;
}
const payload = (token: string): RegExpExecArray | null => {
  const decoded = bytes(token);
  return decoded ? TOKEN.exec(decoded.toString("utf8")) : null;
};

export function issueFreigabe(secret: string, claim: ChronistFreigabeClaim, now: number, ttlMs: number = CHRONIST_FREIGABE_TTL_MS): ChronistFreigabe {
  const ablaufAt = now + ttlMs, nonce = randomBytes(16).toString("hex");
  return { token: Buffer.from(`${ablaufAt}.${nonce}.${sign(secret, claim, ablaufAt, nonce)}`, "utf8").toString("base64url"), ablaufAt };
}

/**
 * `mismatch` deckt jede Verwechslung ab — fremde Kampagne, andere Person, geänderter
 * Umfang, anderes Modell, ausgetauschter Anbieter — und sagt bewusst nicht, welche.
 */
export function verifyFreigabe(secret: string, token: string, claim: ChronistFreigabeClaim, now: number): "ok" | "expired" | "mismatch" | "malformed" {
  const decoded = payload(token);
  if (!decoded) return "malformed";
  const ablaufAt = Number(decoded[1]);
  const expected = Buffer.from(sign(secret, claim, ablaufAt, decoded[2]!), "utf8"), actual = Buffer.from(decoded[3]!, "utf8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "mismatch";
  return now > ablaufAt ? "expired" : "ok";
}

/** Der Ablauf steht unsigniert im Token; er zählt erst, nachdem die Signatur ihn bestätigt hat. */
export function freigabeAblaufAt(token: string): number | null {
  const decoded = payload(token);
  return decoded ? Number(decoded[1]) : null;
}
/**
 * Der Beleg trägt diesen Abdruck, nie das Token selbst. Er läuft über die dekodierten
 * Bytes, damit auch eine nicht-kanonische Schreibweise denselben Verbrauch trifft.
 */
export const freigabeHash = (token: string) => createHash("sha256").update(Buffer.from(token, "base64url")).digest("hex");

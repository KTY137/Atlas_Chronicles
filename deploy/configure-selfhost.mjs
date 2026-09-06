// Generates deploy/.env with fresh secrets for the self-host Verbund. Never prints them.
//   node deploy/configure-selfhost.mjs chronik.example.org                 # app + Postgres (+ tls)
//   node deploy/configure-selfhost.mjs chronik.example.org --media 203.0.113.10   # + LiveKit/coturn
//
// Without --media all four LIVEKIT_* values stay empty, which the app treats as "no media layer"
// (packages/server/src/domain/media.ts). Half-configured media makes the app refuse to start —
// deliberately, so a broken voice setup is never a silent one.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, ".env");
if (existsSync(target)) {
  console.error(`${target} exists — refusing to overwrite secrets. Delete it yourself if you mean it.`);
  process.exit(2);
}
const args = process.argv.slice(2);
const domain = args[0] ?? "chronik.example.org";
if (!/^[a-z0-9.-]+$/i.test(domain)) {
  console.error(`"${domain}" is not a plain hostname.`);
  process.exit(2);
}
const mediaAt = args.indexOf("--media");
const media = mediaAt >= 0;
const publicIp = media ? args[mediaAt + 1] : undefined;
if (media && !(publicIp && /^[0-9a-f.:]+$/i.test(publicIp))) {
  console.error("--media needs the public IP players reach the SFU/TURN on, e.g. --media 203.0.113.10");
  process.exit(2);
}
const hex = (n) => randomBytes(n).toString("hex");
const lines = [
  `CHRONICLE_ORIGIN=https://${domain}`,
  `CHRONICLE_DOMAIN=${domain}`,
  `POSTGRES_PASSWORD=${hex(24)}`,
  `COOKIE_SECRET=${hex(32)}`,
  `BOOTSTRAP_TOKEN=${hex(32)}`,
  `# Media layer — all four LIVEKIT_* set together or not at all.`,
  `LIVEKIT_API_KEY=${media ? `APIchronicle${hex(6)}` : ""}`,
  `LIVEKIT_API_SECRET=${media ? hex(32) : ""}`,
  `LIVEKIT_URL=${media ? `wss://livekit.${domain}` : ""}`,
  `LIVEKIT_API_URL=${media ? "http://livekit:7880" : ""}`,
  `TURN_SECRET=${media ? hex(24) : ""}`,
  `PUBLIC_IP=${publicIp ?? ""}`,
  "",
];
writeFileSync(target, lines.join("\n"), { flag: "wx", mode: 0o600 });
console.log(
  media
    ? `Wrote ${target} for ${domain} with the media layer (PUBLIC_IP=${publicIp}). Start with --profile tls --profile media.`
    : `Wrote ${target} for ${domain} without the media layer. Re-run with --media <public-ip> to add voice/video.`,
);

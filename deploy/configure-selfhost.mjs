// Generates deploy/.env with fresh secrets for the self-host Verbund. Never prints them.
//   node deploy/configure-selfhost.mjs chronik.example.org
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
const domain = process.argv[2] ?? "chronik.example.org";
if (!/^[a-z0-9.-]+$/i.test(domain)) {
  console.error(`"${domain}" is not a plain hostname.`);
  process.exit(2);
}
const hex = (n) => randomBytes(n).toString("hex");
const lines = [
  `CHRONICLE_ORIGIN=https://${domain}`,
  `CHRONICLE_DOMAIN=${domain}`,
  `POSTGRES_PASSWORD=${hex(24)}`,
  `COOKIE_SECRET=${hex(32)}`,
  `BOOTSTRAP_TOKEN=${hex(32)}`,
  `LIVEKIT_API_KEY=APIchronicle${hex(6)}`,
  `LIVEKIT_API_SECRET=${hex(32)}`,
  `LIVEKIT_URL=wss://livekit.${domain}`,
  `LIVEKIT_API_URL=http://livekit:7880`,
  `TURN_SECRET=${hex(24)}`,
  `PUBLIC_IP=`,
  "",
];
writeFileSync(target, lines.join("\n"), { flag: "wx", mode: 0o600 });
console.log(`Wrote ${target} for ${domain}. Set PUBLIC_IP before enabling the media profile.`);

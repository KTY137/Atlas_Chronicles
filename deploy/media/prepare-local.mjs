import { randomBytes } from "node:crypto";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// No default credentials and no overwrite of an existing local setup.
const root = new URL("./.runtime/", import.meta.url);
try { await stat(root); throw new Error("Local media configuration already exists; preserve it or explicitly move it before creating new keys."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(root, { recursive: true, mode: 0o700 });
const key = `chronicle${randomBytes(12).toString("hex")}`;
const secret = randomBytes(32).toString("hex"), turnSecret = randomBytes(32).toString("hex");
const files = {
  "app.env": `LIVEKIT_URL=ws://localhost:7880\nLIVEKIT_API_URL=http://127.0.0.1:7880\nLIVEKIT_API_KEY=${key}\nLIVEKIT_API_SECRET=${secret}\n`,
  "livekit.yaml": `port: 7880
bind_addresses: ["0.0.0.0"]
rtc:
  node_ip: 127.0.0.1
  use_external_ip: false
  enable_loopback_candidate: true
  tcp_port: 7881
  udp_port: 7882
  stun_servers: []
  turn_servers:
    - host: 127.0.0.1
      port: 3478
      protocol: udp
      secret: ${turnSecret}
      ttl: 300
    - host: 127.0.0.1
      port: 3478
      protocol: tcp
      secret: ${turnSecret}
      ttl: 300
keys:
  ${key}: ${secret}
room:
  auto_create: false
  max_participants: 32
  empty_timeout: 300
  departure_timeout: 20
  enable_remote_unmute: false
logging:
  level: warn
`,
  "turnserver.conf": `listening-port=3478
listening-ip=0.0.0.0
relay-ip=127.0.0.1
external-ip=127.0.0.1
min-port=39060
max-port=39100
realm=chronicle.local
server-name=chronicle.local
fingerprint
use-auth-secret
static-auth-secret=${turnSecret}
user-quota=12
total-quota=96
max-bps=128000
no-tls
no-dtls
no-cli
no-multicast-peers
# Local-only exception: SFU and TURN share a network namespace and loopback ports.
allow-loopback-peers
allowed-peer-ip=127.0.0.1
denied-peer-ip=0.0.0.0-255.255.255.255
no-stun-backward-compatibility
log-file=stdout
no-stdout-log
simple-log
pidfile=/tmp/turnserver.pid
userdb=/tmp/turnserver.db
relay-threads=1
`,
};
for (const [name, data] of Object.entries(files)) await writeFile(new URL(name, root), data, { mode: 0o600, flag: "wx" });
process.stdout.write(`Local media configuration created in ${fileURLToPath(root)}. Keys were not printed.\n`);

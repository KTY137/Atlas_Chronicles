// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// The private container probe still presents the configured canonical Host in LAN mode.
import { get } from "node:http";
const probe = process.argv[2];
if (!["live", "ready"].includes(probe)) process.exit(1);
try {
  const origin = new URL(process.env.CHRONICLE_ORIGIN ?? "http://localhost:3000");
  // Node fetch may discard an explicit Host header; the HTTP client preserves it.
  const ok = await new Promise((resolve, reject) => {
    const request = get(`http://127.0.0.1:3000/api/${probe}`, { headers: { host: origin.host }, timeout: 4000 }, response => {
      response.resume(); resolve(response.statusCode === 200);
    });
    request.once("timeout", () => request.destroy(new Error("Probe timeout")));
    request.once("error", reject);
  });
  process.exitCode = ok ? 0 : 1;
} catch { process.exitCode = 1; }

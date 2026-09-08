// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdir, writeFile } from "node:fs/promises";
import { reviewApp } from "../../e2e/helpers/review-app.ts";

const app = await reviewApp(9731);
const directory = ".local/review-20260908";
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/browser-state.json`, JSON.stringify({ cookies: [{ name: "chronicle_session", value: app.gm.value, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Strict", expires: -1 }], origins: [] }));
await writeFile(`${directory}/preview.json`, JSON.stringify({ origin: app.origin, campaignId: app.campaign.id }));
console.log(`Isolated review preview: ${app.origin}/?campaign=${app.campaign.id}&stage=schmiede`);
process.once("SIGINT", () => { void app.close(); });
process.once("SIGTERM", () => { void app.close(); });

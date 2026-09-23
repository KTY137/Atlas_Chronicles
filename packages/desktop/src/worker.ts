// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile, stat } from "node:fs/promises";
import { startEmbeddedHost, startBeleg, loadChronistRuntime, type EmbeddedHostConfig } from "@chronicle/server/host";
import { object } from "./policy.ts";

interface ParentPort { on(event: "message", callback: (event: { data: unknown }) => void): void; postMessage(message: unknown): void }
const parent = (process as NodeJS.Process & { parentPort?: ParentPort }).parentPort;
if (!parent) throw new Error("Desktop host requires its private parent port.");
let host: Awaited<ReturnType<typeof startEmbeddedHost>> | undefined;
let startId: string | undefined;
let chain = Promise.resolve();
parent.on("message", event => {
  chain = chain.then(async () => {
    let id = "";
    try {
      const request = object(event.data, ["id", "kind", "startId", "config", "name", "path", "campaignId", "userId", "role", "requestId"]);
      if (typeof request["id"] !== "string" || request["id"].length > 80 || typeof request["startId"] !== "string") throw new Error("Invalid worker message.");
      id = request["id"];
      if (request["kind"] === "start") {
        if (startId) throw new Error("Host already started.");
        startId = request["startId"];
        const config = object(request["config"], ["databaseUrl", "origin", "cookieSecret", "staticRoot", "lanAddress"]);
        if (!Object.values(config).every(value => typeof value === "string")) throw new Error("Invalid host configuration.");
        // Operator configuration belongs to this trusted worker, never to renderer IPC or a campaign bundle.
        const chronist = await loadChronistRuntime({ allowCli: true,
          ...(process.env["CHRONICLE_CHRONIST_CONFIG"] ? { configPath: process.env["CHRONICLE_CHRONIST_CONFIG"] } : {}) });
        host = await startEmbeddedHost({ ...config as unknown as EmbeddedHostConfig, chronist });
        parent.postMessage({ id, startId, ok: true, value: startBeleg(host, await host.state()) });
        return;
      }
      if (request["startId"] !== startId) throw new Error("Host identity mismatch.");
      if (request["kind"] === "stop") {
        // A failed startup already closed its pool; it still needs a verified
        // private stop receipt so Main can release the owned profile safely.
        await host?.close();
        parent.postMessage({ id, startId, ok: true, value: { stopped: true } }); process.exit(0); return;
      }
      if (!host) throw new Error("Host is unavailable.");
      let value: unknown;
      switch (request["kind"]) {
        case "state": value = await host.state(); break;
        case "setup": if (typeof request["name"] !== "string") throw new Error("Invalid setup."); value = await host.setup(request["name"]); break;
        case "inspect": case "restore": {
          if (typeof request["path"] !== "string" || (await stat(request["path"])).size > 268_435_456) throw new Error("Invalid campaign file.");
          const text = await readFile(request["path"], "utf8");
          value = request["kind"] === "inspect" ? await host.inspectRestore(text) : await host.restore(text);
          break;
        }
        case "enroll":
          if (typeof request["campaignId"] !== "string" || typeof request["userId"] !== "string") throw new Error("Invalid enrollment.");
          value = await host.enroll(request["campaignId"], request["userId"]); break;
        // Die Zugangsverwaltung des Hostfensters. Sie stellt keine Sitzung aus; sie erzeugt
        // Codes, die im Browser eingeloest werden muessen. Siehe `domain/hostzugaenge.ts`.
        case "runden": value = await host.runden(); break;
        case "einladung":
          if (typeof request["campaignId"] !== "string") throw new Error("Invalid invitation.");
          value = await host.einladung(request["campaignId"]); break;
        case "kopplung":
          if (typeof request["campaignId"] !== "string" || typeof request["userId"] !== "string") throw new Error("Invalid pairing.");
          value = await host.kopplung(request["campaignId"], request["userId"]); break;
        case "rolle":
          if (typeof request["campaignId"] !== "string" || typeof request["userId"] !== "string"
            || (request["role"] !== "leitung" && request["role"] !== "spieler")) throw new Error("Invalid role.");
          value = await host.rolle(request["campaignId"], request["userId"], request["role"]); break;
        case "runde-anlegen":
          if (typeof request["name"] !== "string") throw new Error("Invalid round.");
          value = await host.rundeAnlegen(request["name"]); break;
        case "freigeben": case "ablehnen":
          if (typeof request["campaignId"] !== "string" || typeof request["requestId"] !== "string") throw new Error("Invalid join decision.");
          value = request["kind"] === "freigeben" ? await host.freigeben(request["campaignId"], request["requestId"])
            : await host.ablehnen(request["campaignId"], request["requestId"]);
          break;
        default: throw new Error("Invalid worker method.");
      }
      parent.postMessage({ id, startId, ok: true, value });
    } catch (error) {
      // Never return raw driver errors, stack traces, database URLs, or credentials. Die Saetze der
      // Zugangsverwaltung sind dagegen fuer Menschen geschrieben und tragen nichts davon.
      const satz = error instanceof Error && error.name === "HostZugangError" ? error.message : "Host-Aktion fehlgeschlagen. Zustand und Eingaben prüfen.";
      parent.postMessage({ id, startId, ok: false, error: satz });
    }
  });
});

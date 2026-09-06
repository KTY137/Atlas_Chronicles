import { readFile, stat } from "node:fs/promises";
import { startEmbeddedHost, type EmbeddedHostConfig } from "@chronicle/server/host";
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
      const request = object(event.data, ["id", "kind", "startId", "config", "name", "path", "campaignId", "userId"]);
      if (typeof request["id"] !== "string" || request["id"].length > 80 || typeof request["startId"] !== "string") throw new Error("Invalid worker message.");
      id = request["id"];
      if (request["kind"] === "start") {
        if (startId) throw new Error("Host already started.");
        startId = request["startId"];
        const config = object(request["config"], ["databaseUrl", "origin", "cookieSecret", "staticRoot"]);
        if (!Object.values(config).every(value => typeof value === "string")) throw new Error("Invalid host configuration.");
        host = await startEmbeddedHost(config as unknown as EmbeddedHostConfig);
        parent.postMessage({ id, startId, ok: true, value: { origin: host.origin, nodeVersion: host.nodeVersion, decoder: host.decoder, ...await host.state() } });
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
        default: throw new Error("Invalid worker method.");
      }
      parent.postMessage({ id, startId, ok: true, value });
    } catch {
      // Never return raw driver errors, stack traces, database URLs, or credentials.
      parent.postMessage({ id, startId, ok: false, error: "Host-Aktion fehlgeschlagen. Zustand und Eingaben prüfen." });
    }
  });
});

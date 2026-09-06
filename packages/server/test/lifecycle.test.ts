import { once } from "node:events";
import { get } from "node:http";
import { connect, type Socket } from "node:net";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerHttpLifecycle } from "../src/http/lifecycle.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe("HTTP shutdown with live browser connections", () => {
  it("closes an accepted TCP preconnection that has never sent HTTP bytes", async () => {
    const app = Fastify();
    registerHttpLifecycle(app);
    const accepted = deferred<Socket>();
    app.server.once("connection", socket => accepted.resolve(socket));
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP listener");
    const client = connect({ host: "127.0.0.1", port: address.port });
    client.on("error", () => {});
    const serverSocket = await accepted.promise;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      expect(serverSocket.bytesRead).toBe(0);
      const closed = await Promise.race([
        app.close().then(() => true),
        new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 1000); }),
      ]);
      expect(closed).toBe(true);
      expect(serverSocket.destroyed).toBe(true);
    } finally {
      clearTimeout(timer);
      client.destroy();
      serverSocket.destroy();
      await app.close();
    }
  });

  it("waits for an active writer and delivers its entire response before closing", async () => {
    const app = Fastify();
    registerHttpLifecycle(app);
    const started = deferred<void>(), releaseWriter = deferred<void>();
    const preClose = deferred<void>();
    app.addHook("preClose", async () => { preClose.resolve(); });
    let persisted = false;
    const body = "persisted campaign content\n".repeat(32_768);
    app.get("/write", async () => {
      started.resolve();
      await releaseWriter.promise;
      persisted = true;
      return body;
    });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const response = deferred<{ body: string; complete: boolean }>();
    const request = get(`${address}/write`, reply => {
      reply.setEncoding("utf8");
      let received = "";
      reply.on("data", (chunk: string) => { received += chunk; });
      reply.on("end", () => response.resolve({ body: received, complete: reply.complete }));
    });
    const requestError = once(request, "error").then(([error]) => { throw error; });
    let closed = false;
    try {
      await Promise.race([started.promise, requestError]);
      const closing = app.close().then(() => { closed = true; });
      await preClose.promise;
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(closed).toBe(false);
      expect(persisted).toBe(false);
      releaseWriter.resolve();
      const result = await Promise.race([response.promise, requestError]);
      await closing;
      expect(persisted).toBe(true);
      expect(result.complete).toBe(true);
      expect(result.body).toBe(body);
    } finally {
      releaseWriter.resolve();
      request.destroy();
      await app.close();
    }
  });
});

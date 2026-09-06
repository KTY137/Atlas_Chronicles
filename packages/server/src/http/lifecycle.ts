import type { Socket } from "node:net";
import type { FastifyInstance } from "fastify";

/** Drain real HTTP work while also closing browser TCP preconnections that have
 * never sent a request and are missing from Node's HTTP idle-connection list. */
export function registerHttpLifecycle(app: FastifyInstance): void {
  const sockets = new Map<Socket, { responses: number }>();
  let closing = false;

  const drain = (socket: Socket, state: { responses: number }) => {
    if (closing && sockets.get(socket) === state && state.responses === 0 && !socket.destroyed) socket.destroySoon();
  };

  app.server.on("connection", socket => {
    const state = { responses: 0 };
    sockets.set(socket, state);
    socket.once("close", () => sockets.delete(socket));
    drain(socket, state);
  });

  // WebSocket owns its close frame and peer grace period after HTTP upgrades.
  // Late response callbacks must also relinquish this socket (see drain above).
  app.server.on("upgrade", request => { sockets.delete(request.socket); });

  app.server.on("request", (request, response) => {
    const socket = request.socket, state = sockets.get(socket);
    if (!state) return;
    state.responses++;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      state.responses--;
      response.off("finish", finish);
      response.off("close", finish);
      drain(socket, state);
    };
    response.once("finish", finish);
    response.once("close", finish);
  });

  app.addHook("preClose", async () => {
    closing = true;
    for (const [socket, state] of sockets) drain(socket, state);
  });
}

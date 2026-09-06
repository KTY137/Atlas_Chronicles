import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AccessToken, RoomServiceClient, TokenVerifier } from "livekit-server-sdk";
import WebSocket from "ws";

const env = Object.fromEntries((await readFile(new URL("./.runtime/app.env", import.meta.url), "utf8")).trim().split(/\r?\n/).map(line => {
  const split = line.indexOf("="); return [line.slice(0, split), line.slice(split + 1)];
}));
const sdk = new RoomServiceClient(env.LIVEKIT_API_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { requestTimeout: 5 });
const name = `chronicle-check-${randomUUID()}`;
async function signaling(jwt, shouldJoin) {
  const url = new URL("/rtc", env.LIVEKIT_URL);
  url.searchParams.set("access_token", jwt); url.searchParams.set("protocol", "15"); url.searchParams.set("auto_subscribe", "1");
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url), timer = setTimeout(() => { socket.terminate(); reject(new Error("Signaling check timed out")); }, 6000);
    const finish = (error) => { clearTimeout(timer); socket.close(); if (error) reject(error); else resolve(); };
    socket.once("message", () => finish(shouldJoin ? undefined : new Error("Deleted room admitted an old token; auto_create:false is required")));
    socket.once("unexpected-response", (_request, response) => {
      response.resume(); finish(!shouldJoin && response.statusCode === 404 ? undefined : new Error(`Unexpected signaling response ${response.statusCode}`));
    });
    socket.once("error", () => { if (shouldJoin) finish(new Error("Signaling connection failed")); });
  });
}
try {
  const room = await sdk.createRoom({ name, emptyTimeout: 30, maxParticipants: 2 });
  if (room.name !== name) throw new Error("RoomService returned a different room");
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { identity: "local-probe", ttl: 60 });
  token.addGrant({ roomJoin: true, room: name, canPublish: false, canSubscribe: true, canPublishData: false });
  const jwt = await token.toJwt();
  const claims = await new TokenVerifier(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET).verify(jwt);
  if (claims.video?.room !== name) throw new Error("JWT scope mismatch");
  if (!(await sdk.listRooms([name])).length) throw new Error("RoomService failed to persist a room");
  await signaling(jwt, true);
  await sdk.deleteRoom(name);
  if ((await sdk.listRooms([name])).length) throw new Error("RoomService failed to remove a room");
  await signaling(jwt, false);
  process.stdout.write("PASS: live SFU create/list/delete, room JWT verification, signaling join and rejection of a cached token after deletion. Audio/video require browser verification.\n");
} finally {
  try { await sdk.deleteRoom(name); } catch { /* Already deleted, or service unavailable; room empty-timeout is 30s. */ }
}

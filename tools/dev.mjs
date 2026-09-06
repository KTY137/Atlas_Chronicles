import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("..", import.meta.url));
const children = [
  spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "watch", "packages/server/src/main.ts"], { cwd, stdio: "inherit", env: { ...process.env, CHRONICLE_ORIGIN: "http://localhost:5173" } }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "packages/client/vite.config.ts", "--host", "localhost", "--port", "5173"], { cwd, stdio: "inherit" }),
];
let stopping = false;
function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill(); }
for (const child of children) { child.on("error", error => { console.error(error); stop(); process.exitCode = 1; }); child.on("exit", code => { if (!stopping) { stop(); process.exitCode = code || 1; } }); }
process.on("SIGINT", stop); process.on("SIGTERM", stop);

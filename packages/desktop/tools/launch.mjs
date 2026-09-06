import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require=createRequire(import.meta.url),executable=require("electron");
const env={...process.env};
for(const key of["ELECTRON_RUN_AS_NODE","NODE_OPTIONS","NODE_PATH","DATABASE_URL","COOKIE_SECRET","CHRONICLE_ORIGIN","CHRONICLE_PUBLIC_DELIVERY"])delete env[key];
const child=spawn(executable,[fileURLToPath(new URL("../dist/",import.meta.url)),...process.argv.slice(2)],{env,stdio:"inherit",windowsHide:true});
child.once("error",()=>{console.error("Electron konnte nicht gestartet werden. Bitte die Desktop-Laufzeit installieren.");process.exitCode=1;});
child.once("exit",code=>{process.exitCode=code??1;});

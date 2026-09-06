import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root=fileURLToPath(new URL("../../../.local/desktop-runtime/",import.meta.url));
const archive="postgresql-17.11-1-windows-x64-binaries.zip";
const expected="6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3";
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
if(hash(await readFile(join(root,archive)))!==expected)throw new Error("Pinned PostgreSQL archive checksum mismatch.");
const runtime=join(root,"pgsql"),files={};
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isSymbolicLink())throw new Error("Runtime symlinks forbidden.");if(entry.isDirectory())await walk(child);else if(entry.name!=="runtime.json")files[relative(runtime,child).replaceAll("\\","/")]=hash(await readFile(child));}}
await walk(runtime);
await writeFile(join(runtime,"runtime.json"),JSON.stringify({version:1,platform:"win32",architecture:"x64",postgres:"17.11",source:`https://get.enterprisedb.com/postgresql/${archive}`,archiveSha256:expected,files},null,2));
console.log(`PostgreSQL17.11 runtime: ${Object.keys(files).length} pinned files; archive SHA256 ${expected}.`);

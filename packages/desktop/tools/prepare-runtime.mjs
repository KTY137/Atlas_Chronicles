import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root=fileURLToPath(new URL("../../../.local/desktop-runtime/",import.meta.url));
const archive="postgresql-17.11-1-windows-x64-binaries.zip";
const expected="6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3";
// Der Host braucht Server, Werkzeuge und share. pgAdmin 4 (16.000 Dateien samt eigener Python-
// und Electron-Laufzeit), StackBuilder, Header und Doku gehoeren nicht in die Anwendung — und der
// Paketierer liesse einzelne davon (.obj, node_modules/.bin, yarn.lock) stillschweigend weg, womit
// das Laufzeitmanifest im fertigen Paket nicht mehr stimmte.
const KEEP=new Set(["bin","lib","share","server_license.txt","commandlinetools_3rd_party_licenses.txt"]);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
if(hash(await readFile(join(root,archive)))!==expected)throw new Error("Pinned PostgreSQL archive checksum mismatch.");
const runtime=join(root,"pgsql"),files={};
const removed=[];
for(const entry of await readdir(runtime,{withFileTypes:true})){if(entry.name==="runtime.json"||KEEP.has(entry.name))continue;await rm(join(runtime,entry.name),{recursive:true,force:true});removed.push(entry.name);}
for(const name of KEEP)await readdir(join(runtime,name)).catch(error=>{if(error.code==="ENOTDIR")return;throw new Error(`Runtime entry missing: ${name}`);});
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isSymbolicLink())throw new Error("Runtime symlinks forbidden.");if(entry.isDirectory())await walk(child);else if(entry.name!=="runtime.json")files[relative(runtime,child).replaceAll("\\","/")]=hash(await readFile(child));}}
await walk(runtime);
await writeFile(join(runtime,"runtime.json"),JSON.stringify({version:1,platform:"win32",architecture:"x64",postgres:"17.11",source:`https://get.enterprisedb.com/postgresql/${archive}`,archiveSha256:expected,files},null,2));
console.log(`PostgreSQL17.11 runtime: ${Object.keys(files).length} pinned files; archive SHA256 ${expected}.${removed.length?` Not shipped: ${removed.join(", ")}.`:""}`);

import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root=fileURLToPath(new URL("../../../",import.meta.url)),desktop=join(root,"packages/desktop"),out=join(desktop,"dist");
await mkdir(out,{recursive:true});
const resourcePlugin={name:"desktop-resource-boundaries",setup(builder){
  builder.onResolve({filter:/^@electric-sql\/pglite$/},()=>({path:"@electric-sql/pglite",external:true,sideEffects:false}));
  builder.onLoad({filter:/server[\\/]src[\\/]domain[\\/]grundriss\.ts$/},async args=>{
    const source=await readFile(args.path,"utf8"),old='new URL("../../../../assets/packs/';
    if(!source.includes(old))throw new Error("Grundriss resource boundary changed; inspect before packaging.");
    // Every generator style owns a manifest. Relocate the entire named boundary so
    // adding a style cannot silently leave its resources outside the packaged app.
    return{contents:source.replaceAll(old,'new URL("./assets/packs/'),loader:"ts"};
  });
  // Dieselbe Grenze für den Paketserver. Ohne sie löst `DEFAULT_ROOT` aus dem gepackten
  // `dist/worker.cjs` vier Ebenen nach oben auf, also aus der Anwendung heraus, und
  // `/api/packs` liefert einen leeren Katalog: die Karte zeichnet Räume und keine Kunst.
  builder.onLoad({filter:/server[\\/]src[\\/]domain[\\/]packs\.ts$/},async args=>{
    const source=await readFile(args.path,"utf8"),old='new URL("../../../../assets/packs/", import.meta.url)';
    if(!source.includes(old))throw new Error("Packs resource boundary changed; inspect before packaging.");
    return{contents:source.replace(old,'new URL("./assets/packs/", import.meta.url)'),loader:"ts"};
  });
  builder.onLoad({filter:/server[\\/]src[\\/]domain[\\/]atlas\.ts$/},async args=>{
    const source=await readFile(args.path,"utf8"),old='new URL("../../../../design/fixtures/eron/';
    if(!source.includes(old))throw new Error("Atlas resource boundary changed; inspect before packaging.");
    return{contents:source.replaceAll(old,'new URL("./fixtures/eron/'),loader:"ts"};
  });
}};
const shared={bundle:true,platform:"node",target:"node24",format:"cjs",packages:"bundle",external:["electron","sharp","pg-native"],plugins:[resourcePlugin],logLevel:"warning",tsconfig:join(root,"tsconfig.json"),define:{"import.meta.url":"__moduleUrl"},banner:{js:"const __moduleUrl = require('node:url').pathToFileURL(__filename).href;"}};
await build({...shared,entryPoints:[join(desktop,"src/main.ts")],outfile:join(out,"main.cjs")});
await build({...shared,entryPoints:[join(desktop,"src/worker.ts")],outfile:join(out,"worker.cjs")});
await build({entryPoints:[join(desktop,"src/preload.ts")],outfile:join(out,"preload.cjs"),bundle:true,platform:"node",format:"cjs",external:["electron"],target:"node24"});
await cp(join(desktop,"manager"),join(out,"manager"),{recursive:true});
await cp(join(root,"packages/server/src/db/migrations"),join(out,"migrations"),{recursive:true});
// This exact generated subtree is replaced, so earlier content-hashed assets do
// not remain as hidden additions to the supposedly identical web client.
const clientTarget=join(out,"client");
if(relative(desktop,clientTarget)!==join("dist","client"))throw new Error("Unsafe desktop client target.");
await rm(clientTarget,{recursive:true,force:true});
await cp(join(root,"packages/client/dist"),clientTarget,{recursive:true});
await cp(join(root,".local/desktop-runtime/pgsql"),join(out,"runtime"),{recursive:true});
await cp(join(root,"assets/packs"),join(out,"assets/packs"),{recursive:true});
// Only the two resources reached by the Atlas product route are shipped. The
// source fixture directory also contains research/import inputs unrelated to it.
const atlasFiles=["map-andaria.json","media/Andaria_03.02.2024.webp"];
for(const name of atlasFiles){
  const target=join(out,"fixtures/eron",name);
  await mkdir(join(target,".."),{recursive:true});
  await cp(join(root,"design/fixtures/eron",name),target);
}
const paketIds=(await readdir(join(root,"assets/packs"),{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
if(!paketIds.includes("pk.grundriss"))throw new Error("Grundriss pack missing from assets/packs.");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex"),clientFiles={};
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else clientFiles[relative(join(out,"client"),child).replaceAll("\\","/")]=hash(await readFile(child));}}
await walk(join(out,"client"));
const atlasResources={};
for(const name of atlasFiles){
  const source=await readFile(join(root,"design/fixtures/eron",name)),copied=await readFile(join(out,"fixtures/eron",name));
  if(!source.equals(copied))throw new Error(`Copied Atlas resource differs from source: ${name}`);
  atlasResources[name]=hash(copied);
}
const paketManifeste={};
for(const id of paketIds){
  const sourcePack=await readFile(join(root,"assets/packs",id,"paket.json")),copiedPack=await readFile(join(out,"assets/packs",id,"paket.json"));
  if(!sourcePack.equals(copiedPack))throw new Error(`Copied ${id} manifest differs from source.`);
  const assetPack=JSON.parse(copiedPack);
  for(const asset of [...assetPack.assets,{datei:assetPack.lizenz.datei,sha256:assetPack.lizenz.textSha256}]){
    if(asset.datei.split("/").includes("..")||asset.datei.includes("\\"))throw new Error(`Unsafe asset resource path in ${id}.`);
    if(hash(await readFile(join(out,"assets/packs",id,asset.datei)))!==asset.sha256)throw new Error(`Copied ${id} resource checksum mismatch.`);
  }
  paketManifeste[id]=hash(copiedPack);
}
await writeFile(join(out,"build.json"),JSON.stringify({version:1,electron:"44.2.0",node:"24.20.0",postgres:"17.11",clientFiles,atlasResources,grundrissManifest:paketManifeste["pk.grundriss"],paketManifeste,worker:hash(await readFile(join(out,"worker.cjs"))),runtimeManifest:hash(await readFile(join(out,"runtime/runtime.json")))},null,2));
await writeFile(join(out,"package.json"),JSON.stringify({name:"atlas-chronicles",productName:"Atlas Chronicles",version:"0.1.0",main:"main.cjs",description:"Atlas Chronicles local worlds",author:"Atlas Chronicles",license:"UNLICENSED"},null,2));
console.log(`Desktop compiled; ${Object.keys(clientFiles).length} client files copied byte-for-byte, ${paketIds.length} asset pack(s) verified (${paketIds.join(", ")}). No client rebuild.`);

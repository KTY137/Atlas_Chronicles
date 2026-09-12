import { build } from "esbuild";
import { cp, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { prepareDesktopBuildOutput } from "./build-output.mjs";

const root=fileURLToPath(new URL("../../../",import.meta.url)),desktop=join(root,"packages/desktop");
const out=await prepareDesktopBuildOutput(desktop);
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
  // Karten liegen NICHT mehr als Datei im Paket. Jede kommt aus einem Wiki, als hochgeladenes
  // Bild oder als Karten-JSON — immer, weil ein Mensch sie hereinholt. Deshalb gibt es hier keine
  // Atlas-Ressourcengrenze mehr, und der Wachhund darunter sorgt dafuer, dass keine
  // zurueckkommt, ohne dass jemand diese Zeilen liest.
  builder.onLoad({filter:/server[\\/]src[\\/]domain[\\/]atlas-quellen\.ts$/},async args=>{
    const source=await readFile(args.path,"utf8");
    // Gemeint ist ein AUFLOESBARER Pfad, kein Wort im Kommentar: die Erklaerung darueber nennt die
    // README des Pruefmusters, und das soll sie duerfen.
    if(/new URL\(\s*"[^"]*design\/fixtures\//.test(source))throw new Error("atlas-quellen.ts resolves a path into design/fixtures again; that content is not packaged.");
    return{contents:source,loader:"ts"};
  });
}};
const shared={bundle:true,platform:"node",target:"node24",format:"cjs",packages:"bundle",external:["electron","sharp","pg-native"],plugins:[resourcePlugin],logLevel:"warning",tsconfig:join(root,"tsconfig.json"),define:{"import.meta.url":"__moduleUrl"},banner:{js:"const __moduleUrl = require('node:url').pathToFileURL(__filename).href;"}};
await build({...shared,entryPoints:[join(desktop,"src/main.ts")],outfile:join(out,"main.cjs")});
await build({...shared,entryPoints:[join(desktop,"src/worker.ts")],outfile:join(out,"worker.cjs")});
await build({entryPoints:[join(desktop,"src/preload.ts")],outfile:join(out,"preload.cjs"),bundle:true,platform:"node",format:"cjs",external:["electron"],target:"node24"});
await cp(join(desktop,"manager"),join(out,"manager"),{recursive:true});
// Electron's top-level LICENSE covers Electron; ship Atlas's own notice beside its code.
await cp(join(root,"LICENSE"),join(out,"LICENSE"));
await cp(join(root,"packages/server/src/db/migrations"),join(out,"migrations"),{recursive:true});
// The complete generated output was reset before compilation. Every copied tree,
// including migrations/runtime/manager/packs, now contains only current resources.
const clientTarget=join(out,"client");
await cp(join(root,"packages/client/dist"),clientTarget,{recursive:true});
await cp(join(root,".local/desktop-runtime/pgsql"),join(out,"runtime"),{recursive:true});
await cp(join(root,"assets/packs"),join(out,"assets/packs"),{recursive:true});
// No map ships with the app. The example map and its picture used to be copied here; they were
// somebody else's drawing under no stated licence, and the product does not need them — a map
// arrives from a wiki, as an uploaded picture, or as a map JSON, always because a person fetched
// it. The check below is what keeps that true: a fixture copy would leave a directory behind.
if((await readdir(out)).includes("fixtures"))throw new Error("Unlicensed map fixtures must not enter the desktop build.");
const paketIds=(await readdir(join(root,"assets/packs"),{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
if(!paketIds.includes("pk.grundriss"))throw new Error("Grundriss pack missing from assets/packs.");
const hash=bytes=>createHash("sha256").update(bytes).digest("hex"),clientFiles={};
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await walk(child);else clientFiles[relative(join(out,"client"),child).replaceAll("\\","/")]=hash(await readFile(child));}}
await walk(join(out,"client"));
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
await writeFile(join(out,"build.json"),JSON.stringify({version:1,electron:"44.2.0",node:"24.20.0",postgres:"17.11",clientFiles,grundrissManifest:paketManifeste["pk.grundriss"],paketManifeste,worker:hash(await readFile(join(out,"worker.cjs"))),runtimeManifest:hash(await readFile(join(out,"runtime/runtime.json")))},null,2));
// Die Version des Pakets kommt aus `packages/desktop/package.json` — der Datei, die
// `gate:version` gegen die Wurzel prueft. Bis zum 10.09.2026 stand hier fest "0.1.0": eine
// zweite Versionsquelle, die kein Gate sah. Beim Bau von 0.2.0 fiel es auf, weil das fertige
// Installationspaket sich weiter 0.1.0 nannte — und Squirrel entscheidet an genau dieser Zahl,
// ob eine Installation eine Aktualisierung ist.
const paketManifest=JSON.parse(await readFile(join(desktop,"package.json"),"utf8")),paketVersion=paketManifest.version;
if(typeof paketVersion!=="string"||!/^\d+\.\d+\.\d+$/.test(paketVersion))throw new Error("packages/desktop/package.json fuehrt keine brauchbare Version.");
await writeFile(join(out,"package.json"),JSON.stringify({name:"atlas-chronicles",productName:"Atlas Chronicles",version:paketVersion,main:"main.cjs",description:"Atlas Chronicles local worlds",author:paketManifest.author,license:paketManifest.license},null,2));
console.log(`Desktop compiled; ${Object.keys(clientFiles).length} client files copied byte-for-byte, ${paketIds.length} asset pack(s) verified (${paketIds.join(", ")}). No client rebuild.`);

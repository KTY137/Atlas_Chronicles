import { packager } from "@electron/packager";
import { cp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root=fileURLToPath(new URL("../../../",import.meta.url)),require=createRequire(import.meta.url);
const stamp=new Date().toISOString().replaceAll(/[:.]/g,"-"),destination=join(root,".local/desktop-artifacts",stamp),stage=join(destination,"source");
await mkdir(stage,{recursive:true});
await cp(join(root,"packages/desktop/dist"),stage,{recursive:true});
const copied=new Map();
async function dependency(name,from=root){
  if(copied.has(name))return;
  let path,lastError;
  for(const specifier of[`${name}/package.json`,`${name}/package`,`${name}/sharp.node`,name]){try{path=dirname(require.resolve(specifier,{paths:[from]}));break;}catch(error){lastError=error;}}
  if(!path)throw lastError;
  while(true){try{const p=JSON.parse(await readFile(join(path,"package.json"),"utf8"));if(p.name===name)break;}catch{}const parent=dirname(path);if(parent===path)throw new Error(`Package manifest missing: ${name}`);path=parent;}
  const manifest=JSON.parse(await readFile(join(path,"package.json"),"utf8"));
  copied.set(name,{version:manifest.version,license:manifest.license});
  await cp(path,join(stage,"node_modules",name),{recursive:true,filter:source=>!relative(path,source).split(/[\\/]/).includes("node_modules")});
  for(const child of Object.keys(manifest.dependencies??{}))await dependency(child,path);
  for(const child of Object.keys(manifest.optionalDependencies??{})){try{await dependency(child,path);}catch(error){if(error.code!=="MODULE_NOT_FOUND"&&error.code!=="ERR_PACKAGE_PATH_NOT_EXPORTED")throw error;}}
}
await dependency("sharp");
await writeFile(join(stage,"DEPENDENCIES.json"),JSON.stringify(Object.fromEntries(copied),null,2));
const paths=await packager({dir:stage,out:destination,name:"Atlas Chronicles",executableName:"AtlasChronicles",platform:"win32",arch:"x64",electronVersion:"44.2.0",appVersion:"0.1.0",asar:false,prune:false,overwrite:false,download:{cacheRoot:join(root,".local/desktop-runtime/electron-cache")}});
const hash=createHash("sha256").update(await readFile(join(paths[0],"AtlasChronicles.exe"))).digest("hex");
let size=0;async function measure(path){for(const entry of await readdir(path,{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())await measure(child);else size+=(await readFile(child)).length;}}await measure(paths[0]);
await writeFile(join(destination,"artifact.json"),JSON.stringify({kind:"unsigned-local-unpacked-windows-app",version:"0.1.0",electron:"44.2.0",postgres:"17.11",paths,exeSha256:hash,bytes:size,publicRelease:false,missingReleaseGates:["ASAR integrity and release fuses","signed installer and update feed","NVDA and real device acceptance"]},null,2));
console.log(`Unsigned local unpacked app: ${paths[0]} (${size} bytes). Public release gates remain open.`);

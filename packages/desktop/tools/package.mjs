import { packager } from "@electron/packager";
import { cp, mkdir, readFile, writeFile, readdir, lstat } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

/** One inventory owns both the package measurement and the installer's admission check.
 * Symlinks/junctions are not distributable resources: every recorded byte belongs to this tree. */
export async function measureArtifactFiles(directory) {
  const root=resolve(directory),files=Object.create(null);
  const rootInfo=await lstat(root);
  if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink())throw new Error("Packaged application must be an ordinary directory.");
  let bytes=0;
  async function visit(folder){
    for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
      const child=join(folder,entry.name),name=relative(root,child).replaceAll("\\","/");
      if(entry.isSymbolicLink())throw new Error(`Packaged resource must not be a link: ${name}`);
      if(entry.isDirectory()){await visit(child);continue;}
      if(!entry.isFile())throw new Error(`Packaged resource must be a regular file: ${name}`);
      const content=await readFile(child);
      files[name]={bytes:content.length,sha256:createHash("sha256").update(content).digest("hex")};
      bytes+=content.length;
      if(!Number.isSafeInteger(bytes))throw new Error("Packaged resource byte count exceeds the supported range.");
    }
  }
  await visit(root);
  return {bytes,files};
}

async function main(){
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
const inventory=await measureArtifactFiles(paths[0]);
await writeFile(join(destination,"artifact.json"),JSON.stringify({kind:"unsigned-local-unpacked-windows-app",version:"0.1.0",electron:"44.2.0",postgres:"17.11",paths,exeSha256:hash,...inventory,publicRelease:false,missingReleaseGates:["ASAR integrity and release fuses","signed installer and update feed","NVDA and real device acceptance"]},null,2));
console.log(`Unsigned local unpacked app: ${paths[0]} (${inventory.bytes} bytes, ${Object.keys(inventory.files).length} verified files). Public release gates remain open.`);
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();

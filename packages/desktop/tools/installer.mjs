// Squirrel bleibt die adoptierte Windows-Paketbasis (design/iterations/desktop-shell-20260906.md §B).
// Dieser Schritt umhüllt ausschließlich ein bereits gepacktes, aufgezeichnetes Artefakt: er baut
// nicht neu, ändert die Packager-Grenze nicht und erzeugt keinen Update-Feed. Das Ergebnis ist ein
// unsignierter per-user Setup, kein signiertes Release.
import { createWindowsInstaller } from "electron-winstaller";
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile, realpath, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { measureArtifactFiles } from "./package.mjs";

/** An unpacked Electron executable does not identify its separate worker/client resources. */
export async function verifyArtifactFiles(directory,record){
  if(!record?.files||typeof record.files!=="object"||Array.isArray(record.files)||!Object.keys(record.files).length)
    throw new Error("Artifact record has no complete file inventory; package the application again.");
  const names=new Set();
  for(const [name,file] of Object.entries(record.files)){
    if(!name||/[<>:"|?*\\\u0000-\u001f\u007f]/u.test(name)||name.split("/").some(part=>!part||part==="."||part===".."||/[. ]$/.test(part)))
      throw new Error(`Unsafe packaged resource path: ${name}`);
    const normalized=name.toLowerCase();
    if(names.has(normalized))throw new Error(`Duplicate packaged resource path: ${name}`);
    names.add(normalized);
    if(!file||typeof file!=="object"||!Number.isSafeInteger(file.bytes)||file.bytes<0||typeof file.sha256!=="string"||!/^[a-f0-9]{64}$/.test(file.sha256))
      throw new Error(`Invalid packaged resource fingerprint: ${name}`);
  }
  const measured=await measureArtifactFiles(directory);
  for(const name of Object.keys(record.files)){
    const actual=measured.files[name],expected=record.files[name];
    if(!actual)throw new Error(`Packaged resource is missing: ${name}`);
    if(actual.bytes!==expected.bytes||actual.sha256!==expected.sha256)throw new Error(`Packaged resource differs from its artifact record: ${name}`);
  }
  for(const name of Object.keys(measured.files))if(!Object.hasOwn(record.files,name))throw new Error(`Unrecorded packaged resource: ${name}`);
  if(!Number.isSafeInteger(record.bytes)||record.bytes!==measured.bytes)throw new Error("Packaged byte count differs from its artifact record.");
  if(measured.files["AtlasChronicles.exe"]?.sha256!==record.exeSha256)throw new Error("Packaged executable differs from its artifact record.");
  return measured;
}

/** NuGet still applies MAX_PATH, and electron-winstaller writes Squirrel.exe into its
 * input directory. Give it a short, verified copy so the measured artifact stays frozen. */
export async function buildInstallerArtifact(appDirectory,record,outputDirectory,installer=createWindowsInstaller){
  await verifyArtifactFiles(appDirectory,record);
  await mkdir(outputDirectory,{recursive:true});
  if((await readdir(outputDirectory)).length)throw new Error("Installer output directory must be empty; existing output is preserved.");
  const squirrel=await readFile(createRequire(import.meta.url).resolve("electron-winstaller/vendor/Squirrel.exe"));
  const squirrelFingerprint={bytes:squirrel.length,sha256:createHash("sha256").update(squirrel).digest("hex")};
  const stagedRecord={...record,bytes:record.bytes-(record.files["Squirrel.exe"]?.bytes??0)+squirrel.length,files:{...record.files,"Squirrel.exe":squirrelFingerprint}};
  const temporaryRoot=await realpath(tmpdir()),stage=await mkdtemp(join(temporaryRoot,"atlas-setup-"));
  try{
    const stagedApp=join(stage,"app"),stagedOutput=join(stage,"out"),licenses="LICENSES.chromium.html";
    await cp(appDirectory,stagedApp,{recursive:true,force:false,errorOnExist:true});
    await verifyArtifactFiles(stagedApp,record);
    await readFile(join(stagedApp,licenses));
    await installer({appDirectory:stagedApp,outputDirectory:stagedOutput,exe:"AtlasChronicles.exe",name:"AtlasChronicles",title:"Atlas Chronicles",authors:"Atlas Chronicles",description:"Atlas Chronicles local worlds",version:record.version,setupExe:"Atlas-Chronicles-Setup.exe",noMsi:true,additionalFiles:[{src:join(stagedApp,licenses),target:join("lib","net45",licenses)}]});
    await verifyArtifactFiles(stagedApp,stagedRecord);
    await verifyArtifactFiles(appDirectory,record);
    for(const name of await readdir(stagedOutput))await cp(join(stagedOutput,name),join(outputDirectory,name),{recursive:true,force:false,errorOnExist:true});
  }finally{
    const resolvedStage=await realpath(stage);
    if(resolvedStage!==stage||dirname(resolvedStage)!==temporaryRoot||!relative(temporaryRoot,resolvedStage).startsWith("atlas-setup-"))
      throw new Error("Installer cleanup must stay inside its own temporary directory.");
    await rm(resolvedStage,{recursive:true,force:true});
  }
}

async function main(){
const root=fileURLToPath(new URL("../../../",import.meta.url)),artifacts=join(root,".local/desktop-artifacts");
const flag=process.argv.find(value=>value.startsWith("--artifact="));
const stamp=flag?flag.slice("--artifact=".length):(await readdir(artifacts,{withFileTypes:true}).catch(()=>[])).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort().at(-1);
if(!stamp)throw new Error("No packaged desktop artifact; run tools/package.mjs first.");
if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(stamp))throw new Error("Artifact selection must name one local artifact directory.");
const destination=join(artifacts,stamp),record=JSON.parse(await readFile(join(destination,"artifact.json"),"utf8"));
if(!Array.isArray(record.paths)||record.paths.length!==1)throw new Error("Artifact record must name one packaged application directory.");
const appDirectory=record.paths[0];
const within=(base,target)=>{const suffix=relative(base,target);return suffix!==""&&!isAbsolute(suffix)&&suffix!==".."&&!suffix.startsWith(`..${process.platform==="win32"?"\\":"/"}`);};
if(typeof appDirectory!=="string"||!isAbsolute(appDirectory)||!within(await realpath(artifacts),await realpath(destination))
  ||!within(await realpath(destination),await realpath(appDirectory)))throw new Error("Packaged application must stay inside the selected artifact directory.");
// Verify every unpacked resource before invoking Squirrel, including missing and extra files.
await verifyArtifactFiles(appDirectory,record);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const exeHash=hash(await readFile(join(appDirectory,"AtlasChronicles.exe")));
const outputDirectory=join(destination,"installer");
await mkdir(outputDirectory,{recursive:true});
// Das nuspec-Template des Werkzeugs ist eine Allow-List und führt Chromiums Lizenzhinweise
// nicht auf. Ohne diese Nachreichung liefert die installierte Anwendung Electrons Fremdlizenzen
// nicht mit. Electrons `version` fehlt bewusst weiter: die Anwendung liest ihren eigenen
// `build.json`, und eine zweite Versionsquelle im Paket wäre genau die Drift, die gate:version
// verhindert.
const licenses="LICENSES.chromium.html";
await buildInstallerArtifact(appDirectory,record,outputDirectory);
const setup=await readFile(join(outputDirectory,"Atlas-Chronicles-Setup.exe"));
await writeFile(join(destination,"installer.json"),JSON.stringify({kind:"unsigned-local-per-user-squirrel-setup",version:record.version,electron:record.electron,tool:"electron-winstaller@5.4.4",appDirectory,appExeSha256:exeHash,bundledThirdPartyLicenses:[licenses],setupExe:join(outputDirectory,"Atlas-Chronicles-Setup.exe"),setupSha256:hash(setup),bytes:setup.length,publicRelease:false,missingReleaseGates:["signed installer, timestamping and expected publisher","configured update feed and tested updater","ASAR integrity and release fuses","drain, recovery point and migration admission before install"]},null,2));
console.log(`Unsigned per-user Squirrel setup: ${join(outputDirectory,"Atlas-Chronicles-Setup.exe")} (${setup.length} bytes). Unsigned; no update feed. Public release gates remain open.`);
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();

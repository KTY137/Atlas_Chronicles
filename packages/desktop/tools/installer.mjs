// Squirrel bleibt die adoptierte Windows-Paketbasis (design/iterations/desktop-shell-20260906.md §B).
// Dieser Schritt umhüllt ausschließlich ein bereits gepacktes, aufgezeichnetes Artefakt: er baut
// nicht neu, ändert die Packager-Grenze nicht und erzeugt keinen Update-Feed. Das Ergebnis ist ein
// unsignierter per-user Setup, kein signiertes Release.
import { createWindowsInstaller } from "electron-winstaller";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root=fileURLToPath(new URL("../../../",import.meta.url)),artifacts=join(root,".local/desktop-artifacts");
const flag=process.argv.find(value=>value.startsWith("--artifact="));
const stamp=flag?flag.slice("--artifact=".length):(await readdir(artifacts,{withFileTypes:true}).catch(()=>[])).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort().at(-1);
if(!stamp)throw new Error("No packaged desktop artifact; run tools/package.mjs first.");
const destination=join(artifacts,stamp),record=JSON.parse(await readFile(join(destination,"artifact.json"),"utf8")),appDirectory=record.paths[0];
// Der Setup darf nur genau die vermessene Anwendung tragen. Weicht die EXE vom aufgezeichneten
// Hash ab, ist das Artefakt nach seiner Messung verändert worden und wird nicht ausgeliefert.
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const exeHash=hash(await readFile(join(appDirectory,"AtlasChronicles.exe")));
if(exeHash!==record.exeSha256)throw new Error(`Packaged executable differs from its artifact record: ${exeHash} != ${record.exeSha256}`);
const outputDirectory=join(destination,"installer");
await mkdir(outputDirectory,{recursive:true});
// Das nuspec-Template des Werkzeugs ist eine Allow-List und führt Chromiums Lizenzhinweise
// nicht auf. Ohne diese Nachreichung liefert die installierte Anwendung Electrons Fremdlizenzen
// nicht mit. Electrons `version` fehlt bewusst weiter: die Anwendung liest ihren eigenen
// `build.json`, und eine zweite Versionsquelle im Paket wäre genau die Drift, die gate:version
// verhindert.
const licenses="LICENSES.chromium.html",additionalFiles=[{src:join(appDirectory,licenses),target:join("lib","net45",licenses)}];
await readFile(additionalFiles[0].src);
await createWindowsInstaller({appDirectory,outputDirectory,exe:"AtlasChronicles.exe",name:"AtlasChronicles",title:"Atlas Chronicles",authors:"Atlas Chronicles",description:"Atlas Chronicles local worlds",version:record.version,setupExe:"Atlas-Chronicles-Setup.exe",noMsi:true,additionalFiles});
const setup=await readFile(join(outputDirectory,"Atlas-Chronicles-Setup.exe"));
await writeFile(join(destination,"installer.json"),JSON.stringify({kind:"unsigned-local-per-user-squirrel-setup",version:record.version,electron:record.electron,tool:"electron-winstaller@5.4.4",appDirectory,appExeSha256:exeHash,bundledThirdPartyLicenses:[licenses],setupExe:join(outputDirectory,"Atlas-Chronicles-Setup.exe"),setupSha256:hash(setup),bytes:setup.length,publicRelease:false,missingReleaseGates:["signed installer, timestamping and expected publisher","configured update feed and tested updater","ASAR integrity and release fuses","drain, recovery point and migration admission before install"]},null,2));
console.log(`Unsigned per-user Squirrel setup: ${join(outputDirectory,"Atlas-Chronicles-Setup.exe")} (${setup.length} bytes). Unsigned; no update feed. Public release gates remain open.`);

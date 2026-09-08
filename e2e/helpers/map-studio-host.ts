// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { build } from "esbuild";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { serializeTacticalMapDocument, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { buildApp } from "../../packages/server/src/app.ts";
import { createTestDb, migrate } from "../../packages/server/src/db/index.ts";
import { createIdentity } from "../../packages/server/src/identity/index.ts";
import { createCampaigns } from "../../packages/server/src/domain/campaigns.ts";
import { createTactical } from "../../packages/server/src/domain/tactical.ts";
import { createGrundriss } from "../../packages/server/src/domain/grundriss.ts";

export async function studioHost() {
  const db = await createTestDb();
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  try {
    await migrate(db);
    const port = 10400 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
    const gm = await createIdentity(db, config).bootstrap("Kartenstudio Prüfung"), campaign = await createCampaigns(db).createCampaign(gm.userId, { name: "Kartenstudio" });
    const document: TacticalMapDocumentV1 = { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      geometry: { v: 3, size: [1000, 800], stamps: [], places: [], regions: [] }, grid: { kind: "square", size: 50, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
    const tactical = createTactical(db, config);
    const imported = await tactical.importMap(gm.userId, campaign.id, { commandId: randomUUID(), name: "Die neue Kartenwerkstatt", format: "native", sourceText: serializeTacticalMapDocument(document), provenance: { name: "Studio fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null } },
      { cartography: { schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 50, origin: [0, 0] }, regions: [] }, nodes: [] });
    const compiled = await build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
      import {useCallback,useEffect,useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {AppearanceProvider} from './packages/client/src/features/Appearance.tsx';
      import {MapEditor} from './packages/client/src/features/MapEditor.tsx';
      import '@chronicle/ui/tokens.css'; import './packages/client/src/styles.css'; import './packages/client/src/features/tactical.css';
      const path='/api/campaigns/${campaign.id}/tactical/maps/'+(new URLSearchParams(location.search).get('map')||'${imported.subjectId}');
      const dirty=value=>{window.editorDirty=value};
      function Studio(){const [card,setCard]=useState(null);const reload=useCallback(()=>fetch(path).then(r=>r.json()).then(setCard),[]);useEffect(()=>{reload()},[]);return <AppearanceProvider>{card?<MapEditor current={card} campaignId='${campaign.id}' onChanged={reload} onDirty={dirty}/>:<p>Laden</p>}</AppearanceProvider>}
      createRoot(document.querySelector('#root')).render(<Studio/>);
    ` }, bundle: true, format: "esm", platform: "browser", target: "es2022", jsx: "automatic", write: false, outdir: ".local/map-studio-memory", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' }, loader: { ".svg": "dataurl", ".webp": "dataurl", ".png": "dataurl", ".woff2": "dataurl" } });
    const staticRoot = await mkdtemp(resolve(".local/map-studio-host-")); await mkdir(join(staticRoot, "assets"));
    await Promise.all([writeFile(join(staticRoot, "studio.js"), compiled.outputFiles!.find(f => f.path.endsWith(".js"))!.text), writeFile(join(staticRoot, "studio.css"), compiled.outputFiles!.find(f => f.path.endsWith(".css"))!.text), writeFile(join(staticRoot, "index.html"), '<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/studio.css"></head><body><main id="root"></main><script type="module" src="/studio.js"></script></body></html>')]);
    app = await buildApp(db, { ...config, staticRoot }); await app.listen({ host: "127.0.0.1", port });
    return { origin, campaignId: campaign.id, mapId: imported.subjectId, cookie: { name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" as const },
      map: () => tactical.getMap(gm.userId, campaign.id, imported.subjectId),
      generate: (standort: "gebirge" | "insel" | "kueste") => createGrundriss(db, config).generate(gm.userId, campaign.id, { commandId: randomUUID(), name: standort === "gebirge" ? "Dorf im Gebirge" : standort === "insel" ? "Inselhafen" : "Küstenstadt", keim: `studio-${standort}`, art: "siedlung", stil: "gemalt", optionen: { art: "dorf", standort, bauwerke: 32 } }),
      close: async () => { await app?.close(); await db.close(); } };
  } catch (error) { await app?.close(); await db.close(); throw error; }
}

#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { cc0Text, erzeugePaket } from "./tusche.mjs";
import { heritage } from "./genres-heritage.mjs";
import { frontier } from "./genres-frontier.mjs";
import { future } from "./genres-future.mjs";
import { GENRES } from "./genre-tusche.mjs";

const katalog = [...heritage, ...frontier, ...future];
if (katalog.length !== 300 || new Set(katalog.map(asset => asset.name)).size !== 300) throw new Error("Das Genre-Archiv braucht 300 eindeutige Motive.");
for (const genre of GENRES) if (katalog.filter(asset => asset.schlagworte.includes(`genre_${genre}`)).length !== 25) throw new Error(`${genre}: erwartet 25 Motive`);

export const genreKonfiguration = {
  paketId: "pk.genres", titel: "Genre-Archiv · 300 Motive aus zwölf Welten", version: "1.0.0",
  urheber: "Chronicle contributors", zelle: 64,
  lizenzDatei: "lizenz.txt", lizenz: { spdx: "CC0-1.0", inhaber: "Chronicle contributors 2026", herkunft: "eigen", quelle: null },
  lizenzText: cc0Text("pk.genres", "Chronicle contributors", "tools/assets/erzeuge-genrepaket.mjs und genres-*.mjs"),
  katalog,
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await erzeugePaket(genreKonfiguration, fileURLToPath(new URL("../../assets/packs/pk.genres", import.meta.url)));
}

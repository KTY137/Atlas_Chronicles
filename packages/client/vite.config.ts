// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true,
  proxy: { "/api": "http://localhost:3000", "/join": "http://localhost:3000" } }, build: { outDir: "dist", sourcemap: true } });

// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Page } from "@playwright/test";
import { build } from "esbuild";

/** Real React and production components, isolated from HTTP for precise event regressions. */
export async function mount(page: Page, content: string) {
  const bundle = await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:content},bundle:true,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',write:false,outdir:'.local/gui-memory',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'}});
  await page.setContent('<main id="root"></main>');
  for (const file of bundle.outputFiles ?? []) {
    if(file.path.endsWith('.css')) await page.addStyleTag({content:file.text});
    else if(file.path.endsWith('.js')) await page.addScriptTag({content:file.text});
  }
}

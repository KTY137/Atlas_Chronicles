import { validateCampaignBundleV4 } from "@chronicle/io";
import { exportCampaignBundle as exportCurrent } from "../src/domain/bundles.ts";

/** Legacy fixtures must continue exporting the exact v4 profile after v5 is introduced. */
export async function exportCampaignBundle(...args: Parameters<typeof exportCurrent>) {
  return validateCampaignBundleV4(await exportCurrent(...args));
}

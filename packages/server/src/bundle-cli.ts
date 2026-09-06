import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseCampaignBundle, CAMPAIGN_BUNDLE_LIMITS } from "@chronicle/io";
import { createPgDb } from "./db/index.ts";
import { initializeCampaignRestoreTarget, inspectCampaignRestore, restoreCampaignBundle, enrollRestoredCampaignGm, CampaignRestoreError } from "./domain/bundles.ts";

export async function runBundleCli(args: readonly string[], env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const [command, ...flags] = args;
  if (command !== "initialize" && command !== "check" && command !== "restore" && command !== "enroll")
    throw new CampaignRestoreError("Usage: campaign-bundle initialize|check|restore|enroll [--database-url URL] [--input FILE] [--campaign-id ID --user-id ID]. DATABASE_URL is preferred.");
  const options = new Map<string, string>();
  for (let index = 0; index < flags.length; index += 2) {
    const key = flags[index], value = flags[index + 1];
    if ((key !== "--database-url" && key !== "--input" && key !== "--campaign-id" && key !== "--user-id") || !value || options.has(key)) throw new CampaignRestoreError("Invalid or duplicate command-line option.");
    options.set(key, value);
  }
  const databaseUrl = options.get("--database-url") ?? env["DATABASE_URL"];
  if (!databaseUrl) throw new CampaignRestoreError("Set DATABASE_URL for the explicitly selected destination database.");
  const file = options.get("--input");
  if (((command === "initialize" || command === "enroll") && file) || ((command === "check" || command === "restore") && !file)) throw new CampaignRestoreError("Only check and restore require --input FILE.");
  const campaignId = options.get("--campaign-id"), userId = options.get("--user-id");
  if (command === "enroll" ? !campaignId || !userId : campaignId || userId) throw new CampaignRestoreError("Only enroll requires --campaign-id ID and --user-id ID.");
  const origin = env["CHRONICLE_ORIGIN"], cookieSecret = env["COOKIE_SECRET"];
  if (command === "enroll" && (!origin || !cookieSecret || cookieSecret.length < 32)) throw new CampaignRestoreError("Enrollment requires CHRONICLE_ORIGIN and COOKIE_SECRET from the target application environment.");
  // Parse before connecting or performing any target mutation.
  if (file && (await stat(file)).size > CAMPAIGN_BUNDLE_LIMITS.bytes) throw new CampaignRestoreError("Campaign file exceeds the native bundle size limit.");
  const bundle = file ? parseCampaignBundle(await readFile(file, "utf8")) : null;
  const db = createPgDb(databaseUrl);
  try {
    if (command === "initialize") {
      await initializeCampaignRestoreTarget(db);
      console.log("Empty campaign restore destination initialized. No identities or credentials were created.");
    } else if (command === "enroll") {
      const pairing = await enrollRestoredCampaignGm(db, campaignId!, userId!, { origin: origin!, cookieSecret: cookieSecret! });
      // This explicit administrator command is the only CLI path that emits a
      // one-use enrollment code. No environment secrets or browser credential.
      console.log(JSON.stringify(pairing));
    } else {
      const result = command === "check" ? await inspectCampaignRestore(db, bundle) : await restoreCampaignBundle(db, bundle);
      console.log(JSON.stringify(result));
    }
  } finally { await db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runBundleCli(process.argv.slice(2)).catch(error => {
    // Driver messages can include connection credentials. Only our own fixed
    // operating errors are rendered; no raw URL, bundle contents or stack trace.
    console.error(error instanceof CampaignRestoreError ? error.message : "Campaign bundle operation failed. Verify the file, target schema and database connection.");
    process.exitCode = 1;
  });
}

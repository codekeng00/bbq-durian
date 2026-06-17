// Mac/cross-platform helper: read band-agents.local.json and write the
// BAND_AGENTS_JSON line into .dev.vars so the local Worker picks up the agents.
// Usage: npm run band:sync
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const credsPath = new URL("band-agents.local.json", root);
const devVarsPath = new URL(".dev.vars", root);

const REQUIRED = [
  "sales_parser",
  "sales_enrichment",
  "sales_construction",
  "sales_validation",
  "business_parser",
  "business_evaluation",
  "business_judgment",
];

let creds;
try {
  creds = JSON.parse((await readFile(credsPath, "utf8")).replace(/^﻿/, ""));
} catch {
  console.error("Cannot read band-agents.local.json. Copy band-agents.example.json and fill it first.");
  process.exit(1);
}

const missing = [];
for (const key of REQUIRED) {
  const a = creds[key];
  if (!a?.id || !a?.key || a.id.startsWith("PASTE") || a.key.startsWith("PASTE")) {
    missing.push(key);
  }
}
if (missing.length) {
  console.error("These agents still need a real id/key in band-agents.local.json:");
  for (const k of missing) console.error("  - " + k);
  process.exit(1);
}

const oneLine = JSON.stringify(creds);

let devVars = "";
try {
  devVars = await readFile(devVarsPath, "utf8");
} catch {
  console.error(".dev.vars not found. Create it from .dev.vars.example first.");
  process.exit(1);
}

const line = `BAND_AGENTS_JSON=${oneLine}`;
devVars = /^BAND_AGENTS_JSON=.*$/m.test(devVars)
  ? devVars.replace(/^BAND_AGENTS_JSON=.*$/m, line)
  : devVars.trimEnd() + "\n" + line + "\n";

await writeFile(devVarsPath, devVars);
console.log("Synced 7 Band agents into .dev.vars (BAND_AGENTS_JSON). Restart the worker to apply.");

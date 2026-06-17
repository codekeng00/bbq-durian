// Mac/Node port of create-band-agents.ps1.
// Reads your Band USER API key from band-user-key.local.txt, registers the
// seven Remote Agents via Band's Human API, and writes band-agents.local.json.
// Each agent's api_key is returned only once, so we save after every create.
// Usage: npm run band:create
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const keyPath = new URL("band-user-key.local.txt", root);
const outPath = new URL("band-agents.local.json", root);
const BASE = "https://app.band.ai";

const DEFS = {
  sales_parser: { name: "Sales Parsing Agent", handle: "sales.parser", description: "Extracts customer intent, deal facts, requirements, quantities, dates, value, and decision makers from sales conversations." },
  sales_enrichment: { name: "Sales Enrichment Agent", handle: "sales.enrichment", description: "Retrieves product, pricing, inventory, and commercial policy context for a parsed sales opportunity." },
  sales_construction: { name: "Sales Construction Agent", handle: "sales.construction", description: "Constructs a tailored proposal email from structured deal facts and retrieved enterprise knowledge." },
  sales_validation: { name: "Sales Validation Agent", handle: "sales.validation", description: "Reviews proposal drafts for completeness, formatting, policy compliance, sensitive data, and unsupported promises." },
  business_parser: { name: "Business Parsing Agent", handle: "business.parser", description: "Transforms submitted proposal emails into structured commercial terms, clauses, obligations, and requested metrics." },
  business_evaluation: { name: "Business Evaluation Agent", handle: "business.evaluation", description: "Uses enterprise policy and RAG context to score proposal risk, profitability, compliance, and priority." },
  business_judgment: { name: "Business Judgment Agent", handle: "business.judgment", description: "Combines business evaluation scores into an explainable approve or reject recommendation for human review." },
};

let userKey;
try {
  userKey = (await readFile(keyPath, "utf8")).replace(/^﻿/, "").trim();
} catch {
  console.error("Missing band-user-key.local.txt. Create it and paste your Band user API key (starts with thnv_u_).");
  console.error("Get it from: https://app.band.ai/users/settings");
  process.exit(1);
}
if (!userKey || userKey === "PASTE_YOUR_BAND_USER_API_KEY_HERE") {
  console.error("band-user-key.local.txt is empty. Paste your Band user API key (thnv_u_...) from https://app.band.ai/users/settings");
  process.exit(1);
}

const headers = { "X-API-Key": userKey, "Content-Type": "application/json" };

// 1) Verify the user key.
const profile = await fetch(`${BASE}/api/v1/me/profile`, { headers });
if (!profile.ok) {
  console.error(`Band rejected the user API key (${profile.status}). Copy a current user key from https://app.band.ai/users/settings`);
  process.exit(1);
}
console.log("Authenticated with Band.");

// 2) Register the seven agents, saving after each (api_key is one-time).
const output = {};
for (const [key, def] of Object.entries(DEFS)) {
  console.log(`Registering ${def.name}...`);
  const res = await fetch(`${BASE}/api/v1/me/agents/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ agent: { name: def.name, description: def.description } }),
  });
  if (!res.ok) {
    console.error(`Failed while registering ${def.name}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const payload = await res.json();
  const id = payload?.data?.agent?.id;
  const apiKey = payload?.data?.credentials?.api_key;
  if (!id || !apiKey) {
    console.error(`Band did not return credentials for ${def.name}. Stop now to avoid losing a one-time key.`);
    process.exit(1);
  }
  output[key] = { id: String(id), key: String(apiKey), name: def.name, handle: def.handle };
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n");
}

console.log("\nCreated all seven agents and saved credentials to band-agents.local.json.");
console.log("Next:\n  npm run band:sync     # write BAND_AGENTS_JSON into .dev.vars\n  npm run band:online   # keep agents connected (separate terminal)\n  npm run dev:demo      # restart the worker");

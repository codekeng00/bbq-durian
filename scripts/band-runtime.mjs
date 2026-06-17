import { readFile } from "node:fs/promises";
import { Agent, GenericAdapter } from "@thenvoi/sdk";

const configPath = new URL("../band-agents.local.json", import.meta.url);
const config = JSON.parse((await readFile(configPath, "utf8")).replace(/^\uFEFF/, ""));

const requiredAgents = [
  "sales_parser",
  "sales_enrichment",
  "sales_construction",
  "sales_validation",
  "business_parser",
  "business_evaluation",
  "business_judgment",
];

const agents = requiredAgents.map((key) => {
  const credentials = config[key];
  if (!credentials?.id || !credentials?.key) {
    throw new Error(`${key} is missing its Band ID or API key.`);
  }

  const adapter = new GenericAdapter(async () => {
    // DealMaker's Cloudflare LangGraph workflow owns message processing.
    // This runtime keeps the registered remote identity connected to Band.
  });

  return {
    key,
    name: credentials.name,
    agent: Agent.create({
      adapter,
      agentId: credentials.id,
      apiKey: credentials.key,
    }),
  };
});

async function shutdown(signal) {
  console.log(`Received ${signal}; disconnecting Band agents...`);
  await Promise.allSettled(agents.map(({ agent }) => agent.stop()));
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.log(`Connecting ${agents.length} DealMaker agents to Band...`);
await Promise.all(
  agents.map(async ({ name, agent }) => {
    await agent.start();
    console.log(`Online: ${name}`);
  }),
);

console.log("All DealMaker agents are online. Press Ctrl+C to stop.");
await new Promise(() => {});

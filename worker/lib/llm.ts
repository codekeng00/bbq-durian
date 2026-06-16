import { z } from "zod";
import type { Env } from "../types";

type Message = { role: "system" | "user" | "assistant"; content: string };
export type LlmProvider = "featherless";

type ProviderConfig = {
  apiKey?: string;
  endpoint: string;
  model: string;
  label: string;
};

export type CompletionResult<T> = {
  data: T;
  mode: "live_ai" | "rules_only";
  provider: string;
  failureReason?: string;
};

function escapeJsonStringControls(value: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      result += character;
      inString = !inString;
      continue;
    }
    if (inString && character === "\n") {
      result += "\\n";
      continue;
    }
    if (inString && character === "\r") {
      result += "\\r";
      continue;
    }
    if (inString && character === "\t") {
      result += "\\t";
      continue;
    }
    result += character;
  }

  return result;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return JSON.parse(escapeJsonStringControls(candidate));
  }
}

function parseStructured<T>(schema: z.ZodType<T>, value: unknown): T {
  const direct = schema.safeParse(value);
  if (direct.success) return direct.data;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const nested of Object.values(value)) {
      const parsed = schema.safeParse(nested);
      if (parsed.success) return parsed.data;
    }
  }

  throw direct.error;
}

export async function structuredCompletion<T>(
  env: Env,
  schema: z.ZodType<T>,
  messages: Message[],
  fallback: () => T,
  provider: LlmProvider = "featherless",
): Promise<T> {
  return (await structuredCompletionDetailed(env, schema, messages, fallback, provider)).data;
}

export async function structuredCompletionDetailed<T>(
  env: Env,
  schema: z.ZodType<T>,
  messages: Message[],
  fallback: () => T,
  _provider: LlmProvider = "featherless",
): Promise<CompletionResult<T>> {
  const config: ProviderConfig = {
    apiKey: env.FEATHERLESS_API_KEY,
    endpoint: "https://api.featherless.ai/v1/chat/completions",
    model: env.FEATHERLESS_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
    label: "Featherless",
  };

  if (!config.apiKey) {
    return {
      data: fallback(),
      mode: "rules_only",
      provider: config.label,
      failureReason: `${config.label} is not configured.`,
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.15,
        max_tokens: 1800,
        messages: [
          ...messages,
          {
            role: "system",
            content: "Return only one valid JSON object. Do not use markdown.",
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `${config.label} returned ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${config.label} returned no content.`);
    return {
      data: parseStructured(schema, extractJson(content)),
      mode: "live_ai",
      provider: `${config.label}:${config.model}`,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      message: "LLM fallback used",
      provider: config.label,
      error: failureReason,
    }));
    return {
      data: fallback(),
      mode: "rules_only",
      provider: config.label,
      failureReason,
    };
  }
}

// Embeddings provider removed (no AI/ML API). Returning null makes RAG fall
// back to D1 keyword retrieval (see worker/lib/rag.ts).
export async function embed(_env: Env, _inputs: string[]): Promise<number[][] | null> {
  return null;
}

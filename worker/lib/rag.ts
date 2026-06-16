import { embed } from "./llm";
import type { Env } from "../types";

type KnowledgeRow = {
  id: string;
  title: string;
  content: string;
  category: string;
};

export async function retrieveKnowledge(
  env: Env,
  query: string,
  category?: string,
): Promise<KnowledgeRow[]> {
  const vectors = await embed(env, [query]);

  if (env.KNOWLEDGE && vectors?.[0]) {
    try {
      const result = await env.KNOWLEDGE.query(vectors[0], {
        topK: 5,
        returnMetadata: "all",
        filter: category ? { category: { $eq: category } } : undefined,
      });
      const ids = result.matches.map((match) => match.id);
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const rows = await env.DB.prepare(
          `SELECT id, title, content, category FROM knowledge_chunks WHERE id IN (${placeholders})`,
        )
          .bind(...ids)
          .all<KnowledgeRow>();
        if (rows.results.length > 0) return rows.results;
      }
    } catch (error) {
      console.error("Vectorize query failed; using D1 fallback:", error);
    }
  }

  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 6);
  const needle = `%${terms[0] ?? query.slice(0, 24)}%`;
  const statement = category
    ? env.DB.prepare(
        "SELECT id, title, content, category FROM knowledge_chunks WHERE category = ? AND lower(content) LIKE ? LIMIT 5",
      ).bind(category, needle)
    : env.DB.prepare(
        "SELECT id, title, content, category FROM knowledge_chunks WHERE lower(content) LIKE ? LIMIT 5",
      ).bind(needle);
  const rows = await statement.all<KnowledgeRow>();
  if (rows.results.length > 0) return rows.results;

  const fallback = category
    ? env.DB.prepare(
        "SELECT id, title, content, category FROM knowledge_chunks WHERE category = ? LIMIT 5",
      ).bind(category)
    : env.DB.prepare("SELECT id, title, content, category FROM knowledge_chunks LIMIT 5");
  return (await fallback.all<KnowledgeRow>()).results;
}

export function knowledgeContext(rows: KnowledgeRow[]): string {
  if (rows.length === 0) return "No internal knowledge was retrieved.";
  return rows.map((row) => `[${row.category}] ${row.title}\n${row.content}`).join("\n\n");
}

export async function reindexKnowledge(env: Env): Promise<number> {
  if (!env.KNOWLEDGE) throw new Error("Vectorize binding is not configured.");
  const rows = (
    await env.DB.prepare(
      "SELECT id, title, content, category FROM knowledge_chunks ORDER BY id",
    ).all<KnowledgeRow>()
  ).results;
  const vectors = await embed(
    env,
    rows.map((row) => `${row.title}\n${row.content}`),
  );
  if (!vectors) throw new Error("Embedding provider is not configured.");

  await env.KNOWLEDGE.upsert(
    rows.map((row, index) => ({
      id: row.id,
      values: vectors[index],
      metadata: { category: row.category, title: row.title },
    })),
  );
  return rows.length;
}

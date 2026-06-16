import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createBandRoom, handoff } from "../lib/band";
import { knowledgeContext, retrieveKnowledge } from "../lib/rag";
import { structuredCompletion, structuredCompletionDetailed } from "../lib/llm";
import { recordAgentEvent } from "../lib/repository";
import type { Email, Env, ExtractedInfo } from "../types";

const ExtractedSchema = z.object({
  clientName: z.string().nullish(),
  value: z.number().nonnegative().nullish(),
  description: z.string().nullish(),
  decisionMaker: z.string().nullish(),
  contactEmail: z.string().email().nullish(),
});

const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

const ValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  email: EmailSchema,
});

function extractValue(text: string): number | undefined {
  const match = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s?([kKmM])?/);
  if (!match) return undefined;
  let value = Number(match[1].replace(/,/g, ""));
  if (match[2]?.toLowerCase() === "k") value *= 1_000;
  if (match[2]?.toLowerCase() === "m") value *= 1_000_000;
  return Math.round(value);
}

function extractClient(text: string): string | undefined {
  return text.match(
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Corp|Corporation|Inc|LLC|Ltd|Systems|Industries|Technologies|Tech))/,
  )?.[1];
}

function extractDecisionMaker(text: string): string | undefined {
  return text.match(
    /(?:decision maker|decision-maker|Decision Maker|Decision-Maker|CFO|CEO|CTO|COO|Director|Manager)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
  )?.[1];
}

function deterministicExtraction(rawConversation: string): ExtractedInfo {
  return {
    clientName: extractClient(rawConversation),
    value: extractValue(rawConversation),
    description: "Tailored commercial proposal based on the sales conversation",
    decisionMaker: extractDecisionMaker(rawConversation),
    contactEmail: rawConversation.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    )?.[0],
  };
}

export async function parseConversation(
  env: Env,
  rawConversation: string,
): Promise<ExtractedInfo> {
  const fallback = deterministicExtraction(rawConversation);
  const modelResult = await structuredCompletion(
    env,
    ExtractedSchema,
    [
      {
        role: "system",
        content:
          'You are DealMaker\'s Sales Parsing Agent. Extract only facts supported by the conversation. Return exactly {"clientName":"string","value":number,"description":"string","decisionMaker":"string"}. Omit only facts that are genuinely absent.',
      },
      { role: "user", content: rawConversation },
    ],
    () => fallback,
  );
  return {
    clientName: modelResult.clientName || fallback.clientName,
    value: modelResult.value ?? fallback.value,
    description: modelResult.description || fallback.description,
    decisionMaker: modelResult.decisionMaker || fallback.decisionMaker,
    contactEmail: modelResult.contactEmail || fallback.contactEmail,
  };
}

const SalesState = Annotation.Root({
  extracted: Annotation<ExtractedInfo>,
  rawConversation: Annotation<string>,
  knowledge: Annotation<string>,
  email: Annotation<Email>,
  validationIssues: Annotation<string[]>,
  validationMode: Annotation<"live_ai" | "rules_only">,
  validationFailure: Annotation<string | undefined>,
  roomId: Annotation<string | undefined>,
  coordinationContext: Annotation<string>,
});

export async function runSalesGraph(
  env: Env,
  extracted: ExtractedInfo,
  rawConversation = "",
  workflowContext: { organizationId: string; dealId?: string },
): Promise<{
  email: Email;
  validationIssues: string[];
  validationMode: "live_ai" | "rules_only";
  validationFailure?: string;
  roomId?: string;
}> {
  const room = await createBandRoom(env, [
    "sales_parser",
    "sales_enrichment",
    "sales_construction",
    "sales_validation",
  ]);
  const workflowId = room.id ?? `local-${crypto.randomUUID()}`;

  const graph = new StateGraph(SalesState)
    .addNode("parser", async (state) => {
      const parsed =
        Object.keys(state.extracted).length > 0
          ? state.extracted
          : await parseConversation(env, state.rawConversation);
      await recordAgentEvent(env, workflowContext.organizationId, workflowContext.dealId ?? null, workflowId, "sales_parser", "parsed", {
        provider: "featherless",
        output: parsed,
      });
      const coordinationContext = await handoff(
        env,
        room,
        "sales_parser",
        "sales_enrichment",
        `Extracted deal facts: ${JSON.stringify(parsed)}`,
      );
      return { extracted: parsed, roomId: workflowId, coordinationContext };
    })
    .addNode("enrichment", async (state) => {
      const rows = await retrieveKnowledge(
        env,
        `${state.extracted.clientName ?? ""} ${state.extracted.description ?? ""} ${state.extracted.value ?? ""} ${state.coordinationContext ?? ""}`,
        "sales",
      );
      const context = knowledgeContext(rows);
      await recordAgentEvent(env, workflowContext.organizationId, workflowContext.dealId ?? null, workflowId, "sales_enrichment", "rag", {
        provider: "keyword-fallback",
        sources: rows.map((row) => row.title),
      });
      const coordinationContext = await handoff(
        env,
        room,
        "sales_enrichment",
        "sales_construction",
        `RAG enrichment complete. Sources: ${rows.map((row) => row.title).join(", ")}`,
      );
      return { knowledge: context, coordinationContext };
    })
    .addNode("construction", async (state) => {
      const client = state.extracted.clientName ?? "the client";
      const decisionMaker = state.extracted.decisionMaker ?? "the team";
      const value = state.extracted.value ?? 0;
      const email = await structuredCompletion(
        env,
        EmailSchema,
        [
          {
            role: "system",
            content:
              'You are the Sales Construction Agent. Draft a concise, professional proposal email. Use retrieved policy facts, never invent discounts, inventory, or legal commitments. Return exactly {"to":"string","subject":"string","body":"string"}.',
          },
          {
            role: "user",
            content: `Band handoff context:\n${state.coordinationContext}\n\nDeal facts:\n${JSON.stringify(state.extracted)}\n\n<untrusted_conversation>\n${state.rawConversation}\n</untrusted_conversation>\n\nInternal knowledge:\n${state.knowledge}`,
          },
        ],
        () => ({
          to: state.extracted.contactEmail ?? "",
          subject: `Proposal for ${client}: ${state.extracted.description ?? "Partnership Opportunity"}`,
          body: [
            `Dear ${decisionMaker},`,
            "",
            `Thank you for discussing ${client}'s initiative. We prepared a tailored proposal valued at approximately $${value.toLocaleString()}.`,
            "",
            "The proposed scope follows our standard commercial policy, including Net 30 payment terms and confirmation of final availability before contract signature.",
            "",
            "Would you be available this week to review the scope, timeline, and commercial terms?",
            "",
            "Best regards,",
            "Alice Chen",
            "DealMaker Sales Team",
          ].join("\n"),
        }),
      );
      await recordAgentEvent(env, workflowContext.organizationId, workflowContext.dealId ?? null, workflowId, "sales_construction", "drafted", {
        provider: "featherless",
        subject: email.subject,
      });
      const coordinationContext = await handoff(
        env,
        room,
        "sales_construction",
        "sales_validation",
        `Proposal draft ready for compliance validation: ${email.subject}`,
      );
      return { email, coordinationContext };
    })
    .addNode("validation", async (state) => {
      const completion = await structuredCompletionDetailed(
        env,
        ValidationSchema,
        [
          {
            role: "system",
            content:
              'You are the Sales Validation Agent. Check completeness, professional format, unsupported promises, sensitive data, and compliance. Correct the email when needed. Return exactly {"valid":boolean,"issues":["string"],"email":{"to":"string","subject":"string","body":"string"}}.',
          },
          {
            role: "user",
            content: `Band handoff context:\n${state.coordinationContext}\n\nDeal facts:\n${JSON.stringify(state.extracted)}\n\nPolicy context:\n${state.knowledge}\n\nEmail:\n${JSON.stringify(state.email)}`,
          },
        ],
        () => ({
          valid: true,
          issues: [],
          email: state.email,
        }),
        "featherless",
      );
      const result = completion.data;
      await recordAgentEvent(env, workflowContext.organizationId, workflowContext.dealId ?? null, workflowId, "sales_validation", "validated", {
        provider: "featherless",
        valid: result.valid,
        issues: result.issues,
        mode: completion.mode,
        failureReason: completion.failureReason,
      });
      await handoff(
        env,
        room,
        "sales_validation",
        "sales_parser",
        `Validation complete. Human sales review is required. Issues: ${result.issues.join("; ") || "none"}`,
      );
      return {
        email: result.email,
        validationIssues: result.issues,
        validationMode: completion.mode,
        validationFailure: completion.failureReason,
      };
    })
    .addEdge(START, "parser")
    .addEdge("parser", "enrichment")
    .addEdge("enrichment", "construction")
    .addEdge("construction", "validation")
    .addEdge("validation", END)
    .compile();

  const result = await graph.invoke({ extracted, rawConversation });
  return {
    email: result.email,
    validationIssues: result.validationIssues ?? [],
    validationMode: result.validationMode ?? "rules_only",
    validationFailure: result.validationFailure,
    roomId: result.roomId,
  };
}

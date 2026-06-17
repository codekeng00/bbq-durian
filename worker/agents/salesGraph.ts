import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createBandRoom, handoff } from "../lib/band";
import { knowledgeContext, retrieveKnowledge } from "../lib/rag";
import { structuredCompletion, structuredCompletionDetailed, textCompletion } from "../lib/llm";
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
  // Match $1,000 / ¥210,000 / 210,000 RMB / 210000 CNY
  const match =
    text.match(/(?:\$|¥|￥)\s?([\d,]+(?:\.\d+)?)\s?([kKmM])?/) ||
    text.match(/([\d,]+(?:\.\d+)?)\s?(?:RMB|CNY|USD|EUR)(?:\b)/);
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
          'You are DealMaker\'s Sales Parsing Agent. Carefully read the sales conversation and extract only facts that are explicitly stated or clearly implied.\n\n- clientName: the client\'s company or organisation name\n- value: total deal value as a number (convert currencies if needed, e.g. ¥210000 → 210000)\n- description: a concise one-sentence summary of what is being sold and why (product, quantity, use case)\n- decisionMaker: the name of the person making the purchase decision on the client side\n- contactEmail: the client\'s email address if mentioned\n\nDo not invent or infer facts that are not present. If a field is genuinely absent from the conversation, omit it. Return exactly {"clientName":"string","value":number,"description":"string","decisionMaker":"string","contactEmail":"string"}.',
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

const QuestionSchema = z.object({ question: z.string() });

// Sales Supplement Agent: when a required field is missing, the agent itself
// composes the clarifying question (LLM). The hardcoded text is only a fallback
// used when live AI is unavailable.
export async function generateClarifyingQuestion(
  env: Env,
  field: string,
  extracted: ExtractedInfo,
  rawConversation: string,
  fallbackQuestion: string,
): Promise<string> {
  const result = await structuredCompletion(
    env,
    QuestionSchema,
    [
      {
        role: "system",
        content:
          'You are DealMaker\'s Sales Supplement Agent. The proposal is missing one required detail. Ask the salesperson ONE short, natural, specific question to obtain it. Do not ask for anything already known. Return exactly {"question":"string"}.',
      },
      {
        role: "user",
        content: `Missing field: ${field}\nKnown facts: ${JSON.stringify(extracted)}\n\n<conversation>\n${rawConversation}\n</conversation>`,
      },
    ],
    () => ({ question: fallbackQuestion }),
  );
  return result.question?.trim() || fallbackQuestion;
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

export type AgentEmit = (agentName: string, to: string, message: string) => void;

export async function runSalesGraph(
  env: Env,
  extracted: ExtractedInfo,
  rawConversation = "",
  workflowContext: { organizationId: string; dealId?: string },
  emit: AgentEmit = () => {},
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
      const parserMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Sales Parsing Agent. Write a short, natural, first-person handoff message to the Sales Enrichment Agent summarising what you extracted from the conversation. Mention the client, deal value, scope, decision maker, and contact email if available. End by telling the Enrichment Agent what you need from them. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content: `Extracted facts: ${JSON.stringify(parsed)}`,
          },
        ],
        () =>
          [
            `I've completed my analysis of the sales conversation.`,
            parsed.clientName ? `Client: ${parsed.clientName}.` : `Client name could not be confirmed.`,
            parsed.value ? `Deal value: ¥${parsed.value.toLocaleString()}.` : `Deal value not specified.`,
            parsed.description ?? "",
            `Passing to Sales Enrichment — please retrieve relevant product knowledge and pricing policies.`,
          ].filter(Boolean).join(" "),
      );
      const coordinationContext = await handoff(env, room, "sales_parser", "sales_enrichment", parserMsg);
      emit("Sales Parsing Agent", "Sales Enrichment Agent", parserMsg);
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
      const enrichMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Sales Enrichment Agent. Write a short, natural, first-person handoff message to the Sales Construction Agent summarising the knowledge you retrieved. Mention the sources by name if available, explain what they cover, and tell the Construction Agent how to use this context in the proposal. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content:
              rows.length > 0
                ? `Retrieved sources: ${rows.map((r) => r.title).join("; ")}.\nContext summary: ${context.slice(0, 400)}`
                : `No knowledge sources matched this deal. Proceeding with deal facts only.`,
          },
        ],
        () =>
          rows.length > 0
            ? `Knowledge enrichment complete. Retrieved ${rows.length} source(s): ${rows.map((r) => r.title).join("; ")}. Passing full context to Sales Construction for proposal drafting.`
            : `No matching knowledge sources found. Sales Construction should proceed using the deal facts alone.`,
      );
      const coordinationContext = await handoff(env, room, "sales_enrichment", "sales_construction", enrichMsg);
      emit("Sales Enrichment Agent", "Sales Construction Agent", enrichMsg);
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
              'You are DealMaker\'s Sales Construction Agent. Your task is to draft a polished, persuasive, and professional proposal email on behalf of the salesperson.\n\nGuidelines:\n- Open with a warm, personalised greeting referencing the client by name.\n- Briefly recap the client\'s stated goals and pain points to show you listened.\n- Clearly present the proposed solution, product/service scope, quantity, and pricing.\n- Highlight 2–3 concrete benefits or value points relevant to the client\'s context.\n- Include delivery timeline, payment terms, and any next steps discussed.\n- Close with a confident, friendly call to action inviting the client to confirm or schedule a follow-up.\n- Maintain a professional yet approachable tone throughout — not stiff or generic.\n- Only include facts supported by the conversation or internal knowledge. Never invent discounts, inventory levels, or legal commitments.\n\nReturn exactly {"to":"string","subject":"string","body":"string"}.',
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
      const constructMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Sales Construction Agent. Write a short, natural, first-person handoff message to the Sales Validation Agent describing the proposal email you just drafted. Mention the client, subject line, key deal points covered, and what you need the Validation Agent to check. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content: `Client: ${client}. Decision maker: ${decisionMaker}. Subject: "${email.subject}". Recipient: ${email.to}. Email body (first 300 chars): ${email.body.slice(0, 300)}`,
          },
        ],
        () =>
          `Proposal draft complete. Subject: "${email.subject}", addressed to ${email.to || decisionMaker} at ${client}. Handing off to Sales Validation for compliance and quality review.`,
      );
      const coordinationContext = await handoff(env, room, "sales_construction", "sales_validation", constructMsg);
      emit("Sales Construction Agent", "Sales Validation Agent", constructMsg);
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
              'You are DealMaker\'s Sales Validation Agent. Your role is to review and improve the drafted proposal email before it goes to the human sales team for final sign-off.\n\nCheck and correct the following:\n1. Completeness — does it address the client\'s requirements, scope, pricing, timeline, and next steps?\n2. Accuracy — are all figures, product names, and commitments supported by the deal facts and policy knowledge? Remove or flag anything invented.\n3. Unsupported promises — remove any discounts, guarantees, or legal commitments not grounded in the internal knowledge base.\n4. Professional tone — the email should be warm but polished; fix awkward phrasing, grammar, or overly generic language.\n5. Sensitive data — remove any data that should not appear in an outbound client email.\n6. Call to action — ensure there is a clear, specific next step for the client.\n\nIf issues are found, correct them directly in the email and list each issue concisely. If the email is already strong, return it unchanged with an empty issues array.\n\nReturn exactly {"valid":boolean,"issues":["string"],"email":{"to":"string","subject":"string","body":"string"}}.',
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
      const validMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Sales Validation Agent. Write a short, natural, first-person summary message describing the outcome of your compliance review. Mention whether issues were found, briefly describe any corrections made, confirm the proposal is ready for human review, and state what happens next. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content:
              result.issues.length === 0
                ? `No issues found. The proposal passed all compliance checks.`
                : `Issues found and corrected: ${result.issues.join("; ")}.`,
          },
        ],
        () =>
          result.issues.length === 0
            ? `Compliance validation complete. No issues detected — the proposal is clean and ready for human sales review and sign-off.`
            : `Validation complete. ${result.issues.length} issue(s) corrected: ${result.issues.join("; ")}. The proposal is now ready for human review.`,
      );
      await handoff(env, room, "sales_validation", "sales_parser", validMsg);
      emit("Sales Validation Agent", "Sales Parsing Agent", validMsg);
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

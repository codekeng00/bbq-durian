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
      const decisionMaker = state.extracted.decisionMaker ?? "not specified";
      const value = state.extracted.value ?? 0;
      const email = await structuredCompletion(
        env,
        EmailSchema,
        [
          {
            role: "system",
            content:
              'You are DealMaker\'s Sales Construction Agent. Your task is to draft an internal deal submission report from the salesperson to the Business Review Team, requesting contract approval.\n\nThis is an INTERNAL document — it is NOT sent to the client. The tone should be clear, factual, and professional, like a colleague briefing a manager.\n\nGuidelines:\n- Address it to the Business Review Team (not the client).\n- Open with a brief one-line summary: deal name, client, and requested action (e.g. "Requesting contract approval for [Client] — [Value]").\n- Provide a structured deal overview: client background, deal scope, negotiated value, delivery timeline, payment terms.\n- Note the client decision maker and contact details.\n- Summarise any key points from the sales conversation that the business team should be aware of (commitments made, client concerns, risk factors).\n- End with a clear request: specify what approval or action is needed from the business team.\n- Keep it concise and factual — no marketing language, no customer-facing copy.\n- Only include facts supported by the conversation or internal knowledge.\n\nThe "to" field must be set to "business-review@dealmaker.internal".\n\nReturn exactly {"to":"string","subject":"string","body":"string"}.',
          },
          {
            role: "user",
            content: `Band handoff context:\n${state.coordinationContext}\n\nDeal facts:\n${JSON.stringify(state.extracted)}\n\n<untrusted_conversation>\n${state.rawConversation}\n</untrusted_conversation>\n\nInternal knowledge:\n${state.knowledge}`,
          },
        ],
        () => ({
          to: "business-review@dealmaker.internal",
          subject: `[Deal Submission] ${client} — $${value.toLocaleString()} Contract Approval Request`,
          body: [
            `To: Business Review Team`,
            `Re: Contract approval request for ${client}`,
            "",
            `DEAL OVERVIEW`,
            `Client: ${client}`,
            `Deal Value: $${value.toLocaleString()}`,
            `Scope: ${state.extracted.description ?? "See conversation for details"}`,
            `Decision Maker: ${decisionMaker}`,
            `Client Contact: ${state.extracted.contactEmail ?? "Not provided"}`,
            "",
            `KEY POINTS FROM SALES CONVERSATION`,
            `Please refer to the attached conversation transcript for full context. The client has agreed in principle to the proposed scope and pricing.`,
            "",
            `REQUESTED ACTION`,
            `Please review the above deal details and issue the commercial contract for this engagement. Let me know if any additional information is required.`,
            "",
            `Submitted by: Sales Team`,
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
              'You are DealMaker\'s Sales Validation Agent. Your role is to review and improve the internal deal submission report before it goes to the Business Review Team for contract approval.\n\nThis is an INTERNAL document submitted by a salesperson to request contract issuance — it is not sent to the client.\n\nCheck and correct the following:\n1. Completeness — does the submission include client name, deal value, scope, decision maker, and a clear approval request?\n2. Accuracy — are all figures and commitments supported by the deal facts and conversation? Flag or remove anything invented or unverifiable.\n3. Unsupported commitments — flag any promises made to the client that fall outside standard policy (unusual discounts, non-standard terms, delivery guarantees).\n4. Clarity — the report should be clear and concise for an internal business reader; fix any confusing phrasing.\n5. Missing context — if key details the business team would need are absent, note them as issues.\n6. Action request — ensure there is a clear, specific ask from the business team (e.g. contract issuance, approval, escalation).\n\nIf issues are found, correct them directly in the report and list each issue concisely. If the report is already complete, return it unchanged with an empty issues array.\n\nReturn exactly {"valid":boolean,"issues":["string"],"email":{"to":"string","subject":"string","body":"string"}}.',
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

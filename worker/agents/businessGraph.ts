import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { createBandRoom, handoff } from "../lib/band";
import { structuredCompletion, structuredCompletionDetailed, textCompletion } from "../lib/llm";
import { knowledgeContext, retrieveKnowledge } from "../lib/rag";
import { recordAgentEvent } from "../lib/repository";
import type { DealRecord, Env } from "../types";

const ParsedProposalSchema = z.object({
  clientName: z.string(),
  value: z.number().nonnegative(),
  requestedTerms: z.array(z.string()),
  obligations: z.array(z.string()),
});

const EvaluationSchema = z.object({
  riskScore: z.enum(["low", "medium", "high"]),
  profitScore: z.number().min(0).max(100),
  complianceScore: z.number().min(0).max(100),
  priorityScore: z.number().min(0).max(100),
  complianceNotes: z.array(z.string()),
});

const JudgmentSchema = z.object({
  recommendation: z.enum(["approve", "reject"]),
  reason: z.string(),
});

type Evaluation = z.infer<typeof EvaluationSchema>;

const BusinessState = Annotation.Root({
  deal: Annotation<DealRecord>,
  parsed: Annotation<z.infer<typeof ParsedProposalSchema>>,
  policy: Annotation<string>,
  evaluation: Annotation<Evaluation>,
  judgment: Annotation<z.infer<typeof JudgmentSchema>>,
  policySources: Annotation<string[]>,
  evaluationMode: Annotation<"live_ai" | "rules_only">,
  evaluationProvider: Annotation<string>,
  evaluationFailure: Annotation<string | undefined>,
  contractDocument: Annotation<string>,
  roomId: Annotation<string | undefined>,
  coordinationContext: Annotation<string>,
});

export type BusinessAgentEmit = (agentName: string, to: string, message: string) => void;

export async function runBusinessGraph(
  env: Env,
  deal: DealRecord,
  context: { organizationName: string; reviewerName: string },
  emit: BusinessAgentEmit = () => {},
): Promise<
  Evaluation &
    z.infer<typeof JudgmentSchema> & {
      roomId?: string;
      policySources: string[];
      mode: "live_ai" | "rules_only";
      provider: string;
      failureReason?: string;
      contractDocument: string;
    }
> {
  const room = await createBandRoom(env, [
    "business_parser",
    "business_evaluation",
    "business_judgment",
  ]);

  const graph = new StateGraph(BusinessState)
    .addNode("parser", async (state) => {
      const parsed = await structuredCompletion(
        env,
        ParsedProposalSchema,
        [
          {
            role: "system",
            content:
              'You are the Business Parsing Agent. Convert the proposal into explicit terms and obligations without adding facts. Return exactly {"clientName":"string","value":number,"requestedTerms":["string"],"obligations":["string"]}.',
          },
          {
            role: "user",
            content: JSON.stringify({ extracted: state.deal.extracted, email: state.deal.email }),
          },
        ],
        () => ({
          clientName: state.deal.extracted.clientName ?? "Client",
          value: state.deal.extracted.value ?? 0,
          requestedTerms: ["Net 30"],
          obligations: [state.deal.extracted.description ?? "Service engagement"],
        }),
      );
      const rows = await retrieveKnowledge(
        env,
        `${parsed.value} ${parsed.requestedTerms.join(" ")} ${parsed.obligations.join(" ")}`,
        "business",
      );
      await recordAgentEvent(env, deal.organizationId, deal.id, room.id, "business_parser", "parsed", {
        provider: "featherless",
        output: parsed,
      });

      const today = new Date().toISOString().slice(0, 10);
      const contractDocument = await textCompletion(
        env,
        [
          {
            role: "system",
            content: `You are DealMaker's Business Parsing Agent acting as a contract drafter. Generate a formal commercial contract in plain text based on the deal information provided. The contract must include these sections clearly labelled:

1. CONTRACT TITLE (e.g. "COMMERCIAL SALES CONTRACT")
2. CONTRACT DATE and CONTRACT NO.
3. PARTIES — Seller details and Buyer details (name, contact, email)
4. SCOPE OF WORK / DELIVERABLES — itemised list of products/services, quantities, specifications
5. COMMERCIAL TERMS — unit price, total value, currency, payment terms (e.g. Net 30), invoice requirements
6. DELIVERY & TIMELINE — delivery date, delivery location, shipping terms
7. WARRANTIES & OBLIGATIONS — seller and buyer obligations
8. GOVERNING LAW — applicable jurisdiction
9. SIGNATURES — two signature blocks: Seller Representative and Buyer Representative, each with Name / Title / Date / Signature lines

Write in formal legal language. Use the deal facts provided. Where information is missing, use reasonable placeholders in [square brackets]. Do not use JSON or markdown formatting — plain text only.`,
          },
          {
            role: "user",
            content: `Contract date: ${today}\nSeller company: ${context.organizationName}\nSeller representative: ${context.reviewerName}\nDeal facts: ${JSON.stringify(state.deal.extracted)}\nProposal email subject: ${state.deal.email?.subject ?? ""}\nProposal email body:\n${state.deal.email?.body ?? ""}\nParsed terms: ${JSON.stringify(parsed)}`,
          },
        ],
        () => `COMMERCIAL SALES CONTRACT\n\nDate: ${today}\nContract No.: [AUTO-GENERATED]\n\nPARTIES\nSeller: ${context.organizationName}\nSeller Representative: ${context.reviewerName}\nBuyer: ${parsed.clientName}\nBuyer Contact: ${state.deal.extracted.contactEmail ?? "[Not provided]"}\n\nSCOPE\n${parsed.obligations.join("\n")}\n\nCOMMERCIAL TERMS\nTotal Value: $${parsed.value.toLocaleString()}\nPayment Terms: ${parsed.requestedTerms.join(", ")}\n\nSIGNATURES\nSeller Representative: _______________________\nBuyer Representative: _______________________`,
      );

      const parserMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Business Parsing Agent. Write a short, natural, first-person handoff message to the Business Evaluation Agent summarising the proposal you just parsed. Mention the client, deal value, key terms, obligations, and how many policy sources were retrieved. Tell the Evaluation Agent what to focus on. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content: `Parsed proposal: ${JSON.stringify(parsed)}. Policy sources retrieved: ${rows.length} (${rows.map((r) => r.title).join("; ")}).`,
          },
        ],
        () =>
          `Proposal parsed for ${parsed.clientName}. Deal value: $${parsed.value.toLocaleString()}. Retrieved ${rows.length} policy source(s). Passing to Business Evaluation for scoring.`,
      );
      const coordinationContext = await handoff(env, room, "business_parser", "business_evaluation", parserMsg);
      emit("Business Parsing Agent", "Business Evaluation Agent", parserMsg);
      return {
        parsed,
        policy: knowledgeContext(rows),
        policySources: rows.map((row) => row.title),
        contractDocument,
        roomId: room.id,
        coordinationContext,
      };
    })
    .addNode("evaluation_agent", async (state) => {
      const value = state.parsed.value;
      const fallbackRisk = value >= 500_000 ? "high" : value >= 150_000 ? "medium" : "low";
      const completion = await structuredCompletionDetailed(
        env,
        EvaluationSchema,
        [
          {
            role: "system",
            content:
              'You are the Business Evaluation Agent. Score risk, profitability, compliance, and priority using the internal policy context. Scores are 0-100 where higher profit/compliance/priority is better. Return exactly {"riskScore":"low|medium|high","profitScore":number,"complianceScore":number,"priorityScore":number,"complianceNotes":["string"]}.',
          },
          {
            role: "user",
            content: `Band handoff context:\n${state.coordinationContext}\n\nProposal:\n${JSON.stringify(state.parsed)}\n\nInternal policy:\n${state.policy}`,
          },
        ],
        () => ({
          riskScore: fallbackRisk,
          profitScore: value > 0 ? 72 : 20,
          complianceScore: fallbackRisk === "high" ? 45 : 86,
          priorityScore: value >= 150_000 ? 82 : 68,
          complianceNotes: [
            `Deal value of $${value.toLocaleString()} assessed at ${fallbackRisk} risk.`,
            "Payment terms require standard Net 30 confirmation.",
            "Liability cap must remain within company policy.",
          ],
        }),
        "featherless",
      );
      const evaluation = completion.data;
      await recordAgentEvent(
        env,
        deal.organizationId,
        deal.id,
        room.id,
        "business_evaluation",
        "scored",
        {
          provider: completion.provider,
          mode: completion.mode,
          failureReason: completion.failureReason,
          output: evaluation,
        },
      );
      const evalMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Business Evaluation Agent. Write a short, natural, first-person handoff message to the Business Judgment Agent summarising the scores you produced. Mention risk level, profit score, compliance score, priority score, and any notable compliance concerns. Tell the Judgment Agent what recommendation you expect they should consider. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content: `Scores: ${JSON.stringify(evaluation)}`,
          },
        ],
        () =>
          `Evaluation complete. Risk: ${evaluation.riskScore}, Profit: ${evaluation.profitScore}, Compliance: ${evaluation.complianceScore}, Priority: ${evaluation.priorityScore}. Passing to Business Judgment for final recommendation.`,
      );
      const coordinationContext = await handoff(env, room, "business_evaluation", "business_judgment", evalMsg);
      emit("Business Evaluation Agent", "Business Judgment Agent", evalMsg);
      return {
        evaluation,
        coordinationContext,
        evaluationMode: completion.mode,
        evaluationProvider: completion.provider,
        evaluationFailure: completion.failureReason,
      };
    })
    .addNode("judgment_agent", async (state) => {
      const completion = await structuredCompletionDetailed(
        env,
        JudgmentSchema,
        [
          {
            role: "system",
            content:
              'You are the Business Judgment Agent. Recommend approval only when policy, risk, and profitability support it. The human business reviewer makes the final decision. Return exactly {"recommendation":"approve|reject","reason":"string"}.',
          },
          {
            role: "user",
            content: `Band handoff context:\n${state.coordinationContext}\n\nEvaluation:\n${JSON.stringify(state.evaluation)}`,
          },
        ],
        () => ({
          recommendation: state.evaluation.riskScore === "high" ? "reject" : "approve",
          reason:
            state.evaluation.riskScore === "high"
              ? "Risk exceeds the standard approval threshold."
              : "The proposal is within standard approval thresholds.",
        }),
        "featherless",
      );
      const judgment = completion.data;
      await recordAgentEvent(
        env,
        deal.organizationId,
        deal.id,
        room.id,
        "business_judgment",
        "recommended",
        {
          provider: completion.provider,
          mode: completion.mode,
          failureReason: completion.failureReason,
          output: judgment,
        },
      );
      const judgmentMsg = await textCompletion(
        env,
        [
          {
            role: "system",
            content:
              "You are DealMaker's Business Judgment Agent. Write a short, natural, first-person summary message describing your final recommendation. Mention whether you recommend approval or rejection, briefly explain your reasoning, and state that the human business reviewer will make the final decision. Write 3–4 sentences, no bullet points, no JSON.",
          },
          {
            role: "user",
            content: `Judgment: ${JSON.stringify(judgment)}. Evaluation scores: ${JSON.stringify(state.evaluation)}.`,
          },
        ],
        () =>
          judgment.recommendation === "approve"
            ? `Judgment complete. I recommend approving this proposal — the risk and compliance scores are within acceptable thresholds. The human business reviewer will make the final call.`
            : `Judgment complete. I recommend rejecting this proposal — ${judgment.reason}. The human business reviewer will make the final decision.`,
      );
      await handoff(env, room, "business_judgment", "business_parser", judgmentMsg);
      emit("Business Judgment Agent", "Business Parsing Agent", judgmentMsg);
      return {
        judgment,
        evaluationMode:
          state.evaluationMode === "live_ai" && completion.mode === "live_ai"
            ? "live_ai"
            : "rules_only",
        evaluationProvider: `${state.evaluationProvider}; ${completion.provider}`,
        evaluationFailure:
          state.evaluationFailure ?? completion.failureReason,
      };
    })
    .addEdge(START, "parser")
    .addEdge("parser", "evaluation_agent")
    .addEdge("evaluation_agent", "judgment_agent")
    .addEdge("judgment_agent", END)
    .compile();

  const result = await graph.invoke({ deal });
  return {
    ...result.evaluation,
    ...result.judgment,
    policySources: result.policySources ?? [],
    mode: result.evaluationMode ?? "rules_only",
    provider: result.evaluationProvider ?? "Rules engine",
    failureReason: result.evaluationFailure,
    roomId: result.roomId,
    contractDocument: result.contractDocument ?? "",
  };
}

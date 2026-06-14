import type { Deal } from "../../data/types";

export type EvaluateResult = {
  riskScore: "low" | "medium" | "high";
  complianceNotes: string[];
  recommendation: "approve" | "reject";
};

const DELAY_MS = 1400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function evaluateProposal(deal: Deal): Promise<EvaluateResult> {
  await delay(DELAY_MS);

  const value = deal.extracted.value ?? 0;

  // Simple rule: higher value → higher risk.
  let riskScore: EvaluateResult["riskScore"];
  if (value >= 500_000) riskScore = "high";
  else if (value >= 150_000) riskScore = "medium";
  else riskScore = "low";

  const complianceNotes: string[] = [
    `Deal value of $${value.toLocaleString()} assessed at ${riskScore} risk.`,
    "Payment terms require standard Net-30 confirmation.",
    "Liability cap should be confirmed against company policy.",
  ];

  const recommendation: EvaluateResult["recommendation"] =
    riskScore === "high" ? "reject" : "approve";

  return { riskScore, complianceNotes, recommendation };
}

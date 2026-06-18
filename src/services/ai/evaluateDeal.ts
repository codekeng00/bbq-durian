import type { Evaluation } from "../../data/types";
import { apiFetch } from "../api";

export type BusinessAgentStep = {
  agentName: string;
  to: string;
  message: string;
};

export async function evaluateDealStream(
  dealId: string,
  onStep: (step: BusinessAgentStep) => void = () => {},
): Promise<Evaluation> {
  const data = await apiFetch<{ evaluation: Evaluation }>(`/api/deals/${dealId}/evaluate`, {
    method: "POST",
  });
  return data.evaluation;
}

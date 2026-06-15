import type { ExtractedInfo } from "../../data/types";
import { apiFetch } from "../api";

export type ProvideResult = {
  extracted: ExtractedInfo;
  missingFields: string[];
  nextQuestion?: string;
};

export async function provideMissingInfo(
  current: ExtractedInfo,
  field: string,
  answer: string,
): Promise<ProvideResult> {
  return apiFetch<ProvideResult>("/api/agents/missing-info", {
    method: "POST",
    body: JSON.stringify({ current, field, answer }),
  });
}

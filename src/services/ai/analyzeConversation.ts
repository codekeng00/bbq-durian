import type { ExtractedInfo } from "../../data/types";
import { apiFetch } from "../api";

export type AnalyzeResult = {
  extracted: ExtractedInfo;
  missingFields: string[];
  nextQuestion?: string;
};

export async function analyzeConversation(rawText: string): Promise<AnalyzeResult> {
  return apiFetch<AnalyzeResult>("/api/agents/analyze", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}

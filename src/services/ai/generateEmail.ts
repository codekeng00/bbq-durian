import type { Email, ExtractedInfo } from "../../data/types";
import { apiFetch } from "../api";

export type AgentStep = {
  agentName: string;
  to: string;
  message: string;
};

export type GenerateEmailResult = {
  email: Email;
  validationIssues: string[];
  validationMode: "live_ai" | "rules_only";
  validationFailure?: string;
  roomId?: string;
};

export async function generateEmail(
  info: ExtractedInfo,
  rawConversation = "",
  onStep: (step: AgentStep) => void = () => {},
): Promise<GenerateEmailResult> {
  const data = await apiFetch<GenerateEmailResult>("/api/agents/generate-email", {
    method: "POST",
    body: JSON.stringify({ info, rawConversation }),
  });
  return data;
}

import type { Email, ExtractedInfo } from "../../data/types";

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
  const response = await fetch("/api/agents/generate-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ info, rawConversation }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Email generation failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE chunks are separated by double newline.
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const eventLine = part.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      const event = eventLine?.slice("event:".length).trim() ?? "message";
      const data = JSON.parse(dataLine.slice("data:".length).trim()) as unknown;

      if (event === "agent_step") {
        onStep(data as AgentStep);
      } else if (event === "done") {
        return data as GenerateEmailResult;
      } else if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
    }
  }

  throw new Error("Stream ended without a result.");
}

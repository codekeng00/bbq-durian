import type { Evaluation } from "../../data/types";

export type BusinessAgentStep = {
  agentName: string;
  to: string;
  message: string;
};

export async function evaluateDealStream(
  dealId: string,
  onStep: (step: BusinessAgentStep) => void = () => {},
): Promise<Evaluation> {
  const response = await fetch(`/api/deals/${dealId}/evaluate`, {
    method: "POST",
    credentials: "same-origin",
  });

  // Cached result — plain JSON response (no SSE)
  if (response.headers.get("content-type")?.includes("application/json")) {
    const data = (await response.json()) as { evaluation: Evaluation };
    return data.evaluation;
  }

  if (!response.ok || !response.body) {
    throw new Error(`Evaluation failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const eventLine = part.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      const event = eventLine?.slice("event:".length).trim() ?? "message";
      const data = JSON.parse(dataLine.slice("data:".length).trim()) as unknown;

      if (event === "agent_step") {
        onStep(data as BusinessAgentStep);
      } else if (event === "done") {
        return (data as { evaluation: Evaluation }).evaluation;
      } else if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
    }
  }

  throw new Error("Stream ended without a result.");
}

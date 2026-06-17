import { apiFetch } from "../api";

// Real agent activity recorded by the worker (one row per agent step).
export type AgentEvent = {
  agentName: string;
  stage: string;
  payload: unknown;
  roomId: string | null;
  createdAt: string;
};

// Real @mention messages pulled from the Band room(s) via the Band Agent API.
export type BandTranscriptMessage = {
  roomId: string;
  sender: string;
  content: string;
  at: string;
};

export type DealEvents = {
  events: AgentEvent[];
  transcript: BandTranscriptMessage[];
};

export async function getDealEvents(dealId: string): Promise<DealEvents> {
  return apiFetch<DealEvents>(`/api/deals/${dealId}/events`);
}

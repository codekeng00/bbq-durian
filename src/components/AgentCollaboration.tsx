import { useEffect, useRef, useState } from "react";
import {
  getDealEvents,
  type AgentEvent,
  type BandTranscriptMessage,
} from "../services/ai/getDealEvents";

// Renders the real multi-agent collaboration for a deal: the Band room
// @mention transcript and the recorded agent activity. Every line of content
// comes from the backend (agent_events + Band Agent API) — nothing is hardcoded.
//
// When `sequential` is set, the Band messages reveal one-by-one (chat-room
// effect) instead of all at once.

// Band encodes @mentions as "@[[uuid]]" tokens. Strip them so the real
// handoff text reads cleanly (the sender is already shown separately).
function cleanMention(content: string): string {
  return content.replace(/@\[\[[^\]]+\]\]\s*/g, "").trim();
}

function summarizePayload(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

const REVEAL_INTERVAL_MS = 1200;

export default function AgentCollaboration({
  dealId,
  sequential = false,
}: {
  dealId: string;
  sequential?: boolean;
}) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [transcript, setTranscript] = useState<BandTranscriptMessage[]>([]);
  const [revealed, setRevealed] = useState(sequential ? 0 : Number.MAX_SAFE_INTEGER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  function applyData(data: { events: AgentEvent[]; transcript: BandTranscriptMessage[] }) {
    setEvents(data.events);
    setTranscript(data.transcript);
    setRevealed(sequential ? 0 : Number.MAX_SAFE_INTEGER);
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      applyData(await getDealEvents(dealId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load agent activity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getDealEvents(dealId)
      .then((data) => active && applyData(data))
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load agent activity.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  // Sequential chat-room reveal: show one more Band message at a time.
  useEffect(() => {
    if (!sequential || revealed >= transcript.length) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [sequential, revealed, transcript.length]);

  // Keep the chat scrolled to the newest revealed message.
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [revealed]);

  const shownMessages = transcript.slice(0, Math.min(revealed, transcript.length));
  const allRevealed = revealed >= transcript.length;

  return (
    <aside className="agent-collab">
      <header className="agent-collab-head">
        <h2>Agent Collaboration</h2>
        <button type="button" onClick={refresh} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && <p className="error-banner" role="alert">{error}</p>}

      <section className="agent-collab-section">
        <h3>Band room conversation</h3>
        <div className="band-feed" ref={feedRef}>
          {transcript.length === 0 ? (
            <p className="muted-note">
              {loading ? "Loading..." : "No Band messages recorded for this deal yet."}
            </p>
          ) : (
            <>
              {shownMessages.map((message, index) => (
                <div key={`${message.roomId}-${index}`} className="band-message">
                  <span className="band-sender">{message.sender}</span>
                  <span className="band-content">{cleanMention(message.content)}</span>
                </div>
              ))}
              {sequential && !allRevealed && (
                <div className="band-typing" aria-label="agent is responding">
                  <span></span><span></span><span></span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="agent-collab-section">
        <h3>Agent activity</h3>
        {events.length === 0 ? (
          <p className="muted-note">
            {loading ? "Loading..." : "No agent activity recorded yet."}
          </p>
        ) : (
          <ol className="agent-events">
            {events.map((event, index) => (
              <li key={`${event.agentName}-${index}`} className="agent-event">
                <div className="agent-event-head">
                  <strong>{event.agentName}</strong>
                  <span className="agent-stage">{event.stage}</span>
                </div>
                <pre className="agent-payload">{summarizePayload(event.payload)}</pre>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

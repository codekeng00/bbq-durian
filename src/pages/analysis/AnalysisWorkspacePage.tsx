import { useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import { analyzeConversation } from "../../services/ai/analyzeConversation";
import { provideMissingInfo } from "../../services/ai/provideMissingInfo";
import { generateEmail } from "../../services/ai/generateEmail";
import type { ChatMessage, ExtractedInfo } from "../../data/types";

type Phase = "upload" | "analyzing" | "chat" | "ready" | "generating";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type BandAgentMessage = {
  agent: string;
  text: string;
};

function buildBandConversation(
  info: ExtractedInfo,
  incompleteFields: string[],
): BandAgentMessage[] {
  const client = info.clientName ?? "the client";
  const value = info.value ? `$${info.value.toLocaleString()}` : "an unconfirmed value";
  const missingSummary = incompleteFields.length > 0
    ? incompleteFields.join(", ")
    : "none";

  return [
    {
      agent: "@Sales Parsing Agent",
      text: `Parsed the uploaded sales conversation. Client: ${client}. Estimated value: ${value}. Missing fields: ${missingSummary}. @Sales Construction Agent, use these supported facts only.`,
    },
    {
      agent: "@Sales Construction Agent",
      text: `Received the structured opportunity from @Sales Parsing Agent. I prepared the proposal outline and sent it to @Sales Validation Agent for completeness and policy review.`,
    },
    {
      agent: "@Sales Validation Agent",
      text: incompleteFields.length > 0
        ? `Validation is paused. @Sales Construction Agent needs confirmed values for ${missingSummary} before the proposal can proceed.`
        : "Validation passed. The proposal uses the confirmed deal facts and contains no unsupported commitments. @Sales Construction Agent may prepare the next step.",
    },
    {
      agent: "@Sales Construction Agent",
      text: incompleteFields.length > 0
        ? "Acknowledged @Sales Validation Agent. Waiting for the user to provide the missing information."
        : "Acknowledged @Sales Validation Agent. The proposal is ready, but it will only be generated when the user chooses View next step.",
    },
  ];
}

export default function AnalysisWorkspacePage() {
  const navigate = useNavigate();
  const { createDeal } = useDemoData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [extracted, setExtracted] = useState<ExtractedInfo>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState<string>("");
  const [nextStepDeferred, setNextStepDeferred] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const bandMessages = buildBandConversation(extracted, missingFields);

  async function startAnalysis(text: string, name: string) {
    setRawText(text);
    setFileName(name);
    setExtracted({});
    setMissingFields([]);
    setChat([]);
    setAnswer("");
    setNextStepDeferred(false);
    setUploadError("");
    setPhase("analyzing");
    const result = await analyzeConversation(text);
    setExtracted(result.extracted);
    setMissingFields(result.missingFields);
    if (result.nextQuestion) {
      setChat([{ role: "agent", text: result.nextQuestion }]);
      setPhase("chat");
    } else {
      setChat([
        {
          role: "agent",
          text: "Analysis complete. Review the Band conversation, then choose whether to view the next step.",
        },
      ]);
      setPhase("ready");
    }
  }

  async function readFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    setUploadError("");

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("The file is larger than 10 MB. Upload a smaller conversation document.");
      return;
    }

    if (extension === "doc") {
      setUploadError("Legacy .doc files are not supported. Save the document as .docx and upload it again.");
      return;
    }

    if (extension !== "txt" && extension !== "docx") {
      setUploadError("Unsupported file type. Upload a .txt or .docx file.");
      return;
    }

    try {
      let text: string;
      if (extension === "docx") {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        })).value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        setUploadError("No readable conversation text was found in this document.");
        return;
      }

      await startAnalysis(text.trim(), file.name);
    } catch {
      setUploadError("The document could not be read. Check that it is a valid .txt or .docx file.");
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void readFile(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  async function loadSample() {
    const res = await fetch("/sample-conversation.txt");
    const text = await res.text();
    startAnalysis(text, "sample-conversation.txt");
  }

  async function submitAnswer() {
    if (!answer.trim() || missingFields.length === 0) return;
    const field = missingFields[0];
    const userMsg: ChatMessage = { role: "user", text: answer };
    setChat((prev) => [...prev, userMsg]);
    const current = answer;
    setAnswer("");
    const result = await provideMissingInfo(extracted, field, current);
    setExtracted(result.extracted);
    setMissingFields(result.missingFields);
    const nextChat = [...chat, userMsg];
    if (result.nextQuestion) {
      setChat([...nextChat, { role: "agent", text: result.nextQuestion }]);
    } else {
      setChat([
        ...nextChat,
        {
          role: "agent",
          text: "All required details are complete. Review the Band conversation, then choose whether to view the next step.",
        },
      ]);
      setPhase("ready");
    }
  }

  async function finish(info: ExtractedInfo, chatHistory: ChatMessage[]) {
    setPhase("generating");
    const email = await generateEmail(info);
    const deal = createDeal({ rawConversation: rawText, extracted: info, chatHistory, email });
    navigate(`/analysis-chat?dealId=${deal.id}`);
  }

  return (
    <main className="workspace">
      <section className="workspace-left">
        <header className="workspace-brand">
          <strong>DealMaker</strong>
          <Link className="workspace-back" to="/active-pipelines-sales">
            <img src="/assets/workspace-back.svg" alt="" />
            back
          </Link>
        </header>
        <div className="workspace-intro">
          <h1>Analysis Workspace</h1>
          <p>Upload a sales conversation and let the AI build a proposal.</p>
        </div>

        <section
          className="upload-card"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <img src="/assets/workspace-upload.svg" alt="" />
          <div>
            <h2>Upload conversation</h2>
            <p>Drag a .txt or Word .docx file here, or browse. Maximum 10 MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
          <button className="browse-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <img src="/assets/workspace-plus.svg" alt="" />
            Browse Files
          </button>
          <button type="button" onClick={loadSample} className="sample-link">
            Use sample conversation
          </button>
          {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
        </section>

        {fileName && (
          <>
            <h2 className="queue-title">
              <img src="/assets/workspace-queue.svg" alt="" />
              QUEUE
            </h2>
            <div className="queue-list">
              <article className="queue-item">
                <div className="queue-file">
                  <img
                    src={phase === "analyzing" ? "/assets/workspace-processing.svg" : "/assets/workspace-document.svg"}
                    alt=""
                  />
                  <div>
                    <span>{fileName}</span>
                    <small className={phase === "analyzing" ? "" : "ready"}>
                      {phase === "analyzing" ? "Processing..." : "Ready"}
                    </small>
                  </div>
                </div>
                {phase !== "analyzing" && <img src="/assets/workspace-ready.svg" width={12} alt="" />}
              </article>
            </div>
          </>
        )}

      </section>

      <section className="workspace-chat">
        <header className="assistant-header">
          <img src="/assets/workspace-assistant.svg" alt="" />
          <div>
            <strong>AI Agents Workflow</strong>
            <small>
              {phase === "upload" && "Waiting for conversation..."}
              {phase === "analyzing" && "Analyzing context..."}
              {phase === "chat" && "Needs a few details..."}
              {phase === "ready" && "Waiting for your decision..."}
              {phase === "generating" && "Generating proposal..."}
            </small>
          </div>
        </header>
        <div className="chat-feed">
          {phase === "analyzing" && (
            <section className="pipeline-box">
              <h3>CURRENT PIPELINE</h3>
              <div className="pipeline-step">
                <span>
                  <img src="/assets/workspace-complete.svg" alt="" />
                  Text Extraction
                </span>
                <small>Extraction Agent • Completed</small>
              </div>
              <div className="pipeline-step in-progress">
                <span>
                  <img src="/assets/workspace-progress.svg" alt="" />
                  Intent Mapping
                </span>
                <small>Analysis Agent • In Progress</small>
              </div>
              <div className="pipeline-step pending">
                <span>
                  <img src="/assets/workspace-pending.svg" alt="" />
                  Strategy Drafting
                </span>
                <small>Strategy Agent • Pending</small>
              </div>
            </section>
          )}

          {rawText && phase !== "analyzing" && (
            <section className="band-agent-thread" aria-labelledby="band-conversation-title">
              <header className="band-thread-header">
                <div>
                  <span className="band-label">BAND</span>
                  <h3 id="band-conversation-title">Sales agent conversation</h3>
                </div>
                <small>{bandMessages.length} messages</small>
              </header>
              <div className="band-agent-messages">
                {bandMessages.map((message, index) => (
                  <article className="band-agent-message" key={`${message.agent}-${index}`}>
                    <div className="band-agent-avatar" aria-hidden="true">
                      {message.agent.replace("@Sales ", "").charAt(0)}
                    </div>
                    <div>
                      <strong>{message.agent}</strong>
                      <p>{message.text}</p>
                      <small>Band room • Just now</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {chat.map((msg, i) => (
            <article key={i}>
              <div className={msg.role === "user" ? "ai-bubble user-bubble" : "ai-bubble"}>
                {msg.text}
              </div>
              <p className="agent-meta">
                <b className={msg.role === "agent" ? "purple" : ""}>{msg.role === "agent" ? "SUPPLEMENT AGENT" : "YOU"}</b> &nbsp;• Just now
              </p>
            </article>
          ))}

          {phase === "generating" && (
            <article>
              <div className="ai-bubble">Generating the proposal email...</div>
              <p className="agent-meta">
                <b>BUILD AGENT</b> &nbsp;• Just now
              </p>
            </article>
          )}

          {phase === "ready" && (
            <section className="next-step-card" aria-labelledby="next-step-title">
              <span className="next-step-eyebrow">YOUR DECISION</span>
              <h3 id="next-step-title">
                {nextStepDeferred ? "Next step paused" : "Ready to view the next step?"}
              </h3>
              <p>
                {nextStepDeferred
                  ? "Your analysis remains in this workspace. Continue whenever you are ready."
                  : "The next step generates a proposal email from the completed analysis. Nothing is submitted to Business yet."}
              </p>
              <div className="next-step-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => finish(extracted, chat)}
                >
                  View next step
                </button>
                {!nextStepDeferred && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setNextStepDeferred(true)}
                  >
                    Not now
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {phase === "chat" && missingFields.length > 0 && (
          <div className="chat-composer">
            <div className="composer-field">
              <textarea
                placeholder="Type your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer();
                  }
                }}
              />
              <button type="button" onClick={submitAnswer}>↑</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

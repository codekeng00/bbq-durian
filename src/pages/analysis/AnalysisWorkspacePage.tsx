import { useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import { analyzeConversation } from "../../services/ai/analyzeConversation";
import { provideMissingInfo } from "../../services/ai/provideMissingInfo";
import { generateEmail, type AgentStep, type GenerateEmailResult } from "../../services/ai/generateEmail";
import type { ChatMessage, ExtractedInfo } from "../../data/types";

type Phase = "upload" | "analyzing" | "chat" | "generating" | "ready";

export default function AnalysisWorkspacePage() {
  const navigate = useNavigate();
  const { createDeal, devMode } = useDemoData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedInfo>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [samplePreview, setSamplePreview] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<{ agentName: string; to: string; message: string }[]>([]);
  const [emailResult, setEmailResult] = useState<GenerateEmailResult | null>(null);
  const [pendingFinishArgs, setPendingFinishArgs] = useState<{
    info: ExtractedInfo;
    chatHistory: ChatMessage[];
    sourceText: string;
  } | null>(null);

  async function startAnalysis(text: string, name: string) {
    setError("");
    setRawText(text);
    setFileName(name);
    setPhase("analyzing");
    try {
      const result = await analyzeConversation(text);
      setExtracted(result.extracted);
      setMissingFields(result.missingFields);
      if (result.nextQuestion) {
        setChat([{ role: "agent", text: result.nextQuestion }]);
        setPhase("chat");
      } else {
        await finish(result.extracted, [], text);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
      setPhase("upload");
    }
  }

  function readFile(file: File) {
    const isPlainText =
      file.name.toLowerCase().endsWith(".txt") &&
      (!file.type || file.type === "text/plain");
    if (!isPlainText) {
      setError("Upload a plain-text .txt file.");
      return;
    }
    if (file.size > 100_000) {
      setError("The conversation file must be 100 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => void startAnalysis(String(reader.result), file.name);
    reader.onerror = () => setError("The selected file could not be read.");
    reader.readAsText(file);
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  async function loadSample() {
    setError("");
    try {
      const response = await fetch("/sample-conversation.txt");
      if (!response.ok) throw new Error("Training sample is unavailable.");
      setSamplePreview(await response.text());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sample could not load.");
    }
  }

  async function confirmSample() {
    if (!samplePreview) return;
    const text = samplePreview;
    setSamplePreview(null);
    await startAnalysis(text, "sample-conversation.txt");
  }

  async function submitAnswer() {
    if (!answer.trim() || missingFields.length === 0 || submitting) return;
    setSubmitting(true);
    setError("");
    const field = missingFields[0];
    const userMessage: ChatMessage = { role: "user", text: answer };
    const nextChat = [...chat, userMessage];
    setChat(nextChat);
    const currentAnswer = answer;
    setAnswer("");
    try {
      const result = await provideMissingInfo(extracted, field, currentAnswer);
      setExtracted(result.extracted);
      setMissingFields(result.missingFields);
      if (result.nextQuestion) {
        setChat([...nextChat, { role: "agent", text: result.nextQuestion }]);
      } else {
        const completeMessage: ChatMessage = {
          role: "agent",
          text: "All required details are present. Generating the proposal now.",
        };
        setChat([...nextChat, completeMessage]);
        await finish(result.extracted, [...nextChat, completeMessage], rawText);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that answer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finish(
    info: ExtractedInfo,
    chatHistory: ChatMessage[],
    sourceText: string,
  ) {
    setPhase("generating");
    setAgentSteps([]);
    setPendingFinishArgs({ info, chatHistory, sourceText });
    const generated = await generateEmail(info, sourceText, (step: AgentStep) => {
      setAgentSteps((prev) => [...prev, { agentName: step.agentName, to: step.to, message: step.message }]);
    });
    setEmailResult(generated);
    setPhase("ready");
  }

  async function handleProceed() {
    if (!emailResult || !pendingFinishArgs) return;
    const { info, chatHistory, sourceText } = pendingFinishArgs;
    const deal = await createDeal({
      rawConversation: sourceText,
      extracted: info,
      chatHistory,
      email: emailResult.email,
      validationIssues:
        emailResult.validationMode === "rules_only"
          ? [
              ...emailResult.validationIssues,
              "Live AI validation was unavailable; complete a manual proposal review.",
            ]
          : emailResult.validationIssues,
      validationMode: emailResult.validationMode,
      validationFailure: emailResult.validationFailure,
      bandRoomId: emailResult.roomId,
    });
    navigate(`/analysis-chat?dealId=${deal.id}`);
  }

  return (
    <main className="workspace">
      <section className="workspace-left">
        <header className="workspace-brand">
          <strong>DealMaker</strong>
          <Link className="workspace-back" to="/active-pipelines-sales">
            <img src="/assets/workspace-back.svg" alt="" />
            Back
          </Link>
        </header>
        <div className="workspace-intro">
          <h1>Proposal Workspace</h1>
          <p>Upload a plain-text sales conversation to create a reviewable proposal.</p>
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <section
          className="upload-card"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <img src="/assets/workspace-upload.svg" alt="" />
          <div>
            <h2>Upload conversation text</h2>
            <p>Plain-text .txt files only, maximum 100 KB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={handleFileInput}
          />
          <button
            className="browse-button"
            type="button"
            disabled={phase !== "upload"}
            onClick={() => fileInputRef.current?.click()}
          >
            <img src="/assets/workspace-plus.svg" alt="" />
            Select Text File
          </button>
          {devMode && (
            <button type="button" onClick={loadSample} className="sample-link">
              Use local training sample
            </button>
          )}
        </section>

        {fileName && (
          <>
            <h2 className="queue-title">
              <img src="/assets/workspace-queue.svg" alt="" />
              PROCESSING
            </h2>
            <div className="queue-list">
              <article className="queue-item">
                <div className="queue-file">
                  <img
                    src={
                      phase === "analyzing"
                        ? "/assets/workspace-processing.svg"
                        : "/assets/workspace-document.svg"
                    }
                    alt=""
                  />
                  <div>
                    <span>{fileName}</span>
                    <small className={phase === "analyzing" ? "" : "ready"}>
                      {phase === "analyzing" ? "Processing..." : "Validated"}
                    </small>
                  </div>
                </div>
              </article>
            </div>
          </>
        )}
      </section>

      <section className="workspace-chat">
        <header className="assistant-header">
          <img src="/assets/workspace-assistant.svg" alt="" />
          <div>
            <strong>Proposal Assistant</strong>
            <small>
              {phase === "upload" && "Waiting for conversation text"}
              {phase === "analyzing" && "Extracting supported facts"}
              {phase === "chat" && "Collecting required business details"}
              {phase === "generating" && "Drafting and validating proposal"}
              {phase === "ready" && "Proposal ready — review when you're set"}
            </small>
          </div>
        </header>

        <div className="chat-feed">
          {phase === "analyzing" && (
            <section className="pipeline-box">
              <h3>CURRENT WORKFLOW</h3>
              <div className="pipeline-step in-progress">
                <span>Fact extraction and required-field validation</span>
                <small>In progress</small>
              </div>
            </section>
          )}

          {chat.map((message, index) => (
            <article key={`${message.role}-${index}`}>
              <div
                className={
                  message.role === "user" ? "ai-bubble user-bubble" : "ai-bubble"
                }
              >
                {message.text}
              </div>
              <p className="agent-meta">
                <b className={message.role === "agent" ? "purple" : ""}>
                  {message.role === "agent" ? "ASSISTANT" : "YOU"}
                </b>
              </p>
            </article>
          ))}

          {(phase === "generating" || phase === "ready") && agentSteps.map((step, i) => (
            <div key={i} className="band-msg">
              <span className="band-msg-sender">{step.agentName}</span>
              <div className="band-msg-bubble">
                <span className="band-msg-mention">@{step.to}</span>
                {" "}{step.message}
              </div>
            </div>
          ))}

          {phase === "generating" && (
            <div className="band-msg band-msg--pending">
              <span className="band-msg-sender">
                {agentSteps.length === 0 ? "Pipeline" : agentSteps[agentSteps.length - 1]?.agentName}
              </span>
              <div className="band-msg-bubble band-msg-bubble--pending">
                <span className="agent-typing"><span /><span /><span /></span>
                <span>{agentSteps.length === 0 ? "Starting up..." : "Thinking..."}</span>
              </div>
            </div>
          )}

          {phase === "ready" && (
            <article>
              <div className="ai-bubble">
                All agents have finished deliberating. The proposal is ready for your review.
              </div>
              <p className="agent-meta"><b className="purple">ASSISTANT</b></p>
            </article>
          )}
        </div>

        {phase === "ready" && (
          <div className="chat-composer">
            <div className="composer-field composer-field--centered">
              <button type="button" className="proceed-btn" onClick={handleProceed}>
                Review Proposal →
              </button>
            </div>
          </div>
        )}

        {phase === "chat" && missingFields.length > 0 && (
          <div className="chat-composer">
            <div className="composer-field">
              <textarea
                placeholder="Type the required information..."
                value={answer}
                disabled={submitting}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitAnswer();
                  }
                }}
              />
              <button type="button" disabled={submitting} onClick={submitAnswer}>
                {submitting ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </section>

      {samplePreview !== null && (
        <div className="sample-modal-overlay" onClick={() => setSamplePreview(null)}>
          <div className="sample-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sample-modal-header">
              <h2>Sample Conversation Preview</h2>
              <button
                type="button"
                className="sample-modal-close"
                onClick={() => setSamplePreview(null)}
              >
                ✕
              </button>
            </div>
            <pre className="sample-modal-body">{samplePreview}</pre>
            <div className="sample-modal-footer">
              <button
                type="button"
                className="sample-modal-cancel"
                onClick={() => setSamplePreview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sample-modal-confirm"
                onClick={confirmSample}
              >
                Use This Sample →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

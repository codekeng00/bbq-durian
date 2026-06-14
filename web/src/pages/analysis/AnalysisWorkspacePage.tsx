import { useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import { analyzeConversation } from "../../services/ai/analyzeConversation";
import { provideMissingInfo } from "../../services/ai/provideMissingInfo";
import { generateEmail } from "../../services/ai/generateEmail";
import type { ChatMessage, ExtractedInfo } from "../../data/types";

type Phase = "upload" | "analyzing" | "chat" | "generating";

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

  async function startAnalysis(text: string, name: string) {
    setRawText(text);
    setFileName(name);
    setPhase("analyzing");
    const result = await analyzeConversation(text);
    setExtracted(result.extracted);
    setMissingFields(result.missingFields);
    if (result.nextQuestion) {
      setChat([{ role: "agent", text: result.nextQuestion }]);
      setPhase("chat");
    } else {
      await finish(result.extracted, []);
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => startAnalysis(String(reader.result), file.name);
    reader.readAsText(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".txt")) readFile(file);
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
      setChat([...nextChat, { role: "agent", text: "All set — generating the proposal email now." }]);
      await finish(result.extracted, [...nextChat, { role: "agent", text: "All set — generating the proposal email now." }]);
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
            <p>Drag a .txt file here, or browse. Supports .txt only.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
          <button className="browse-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <img src="/assets/workspace-plus.svg" alt="" />
            Browse Files
          </button>
          <button
            type="button"
            onClick={loadSample}
            style={{ marginTop: "8px", background: "none", border: "none", color: "#0053cd", cursor: "pointer" }}
          >
            Use sample conversation
          </button>
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
            <strong>AI Assistant</strong>
            <small>
              {phase === "upload" && "Waiting for conversation..."}
              {phase === "analyzing" && "Analyzing context..."}
              {phase === "chat" && "Needs a few details..."}
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

          {chat.map((msg, i) => (
            <article key={i}>
              <div className={msg.role === "agent" ? "ai-bubble" : "ai-bubble"} style={msg.role === "user" ? { background: "#eef3ff" } : undefined}>
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

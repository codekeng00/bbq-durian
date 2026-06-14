import { Link } from "react-router-dom";

export default function AnalysisWorkspacePage() {
  return (
    <main className="workspace">
      <section className="workspace-left">
        <header className="workspace-brand">
          <strong>DealMaker</strong>
          <Link className="workspace-back" to="/active-pipelines-susu">
            <img src="/assets/workspace-back.svg" alt="" />
            back
          </Link>
        </header>
        <div className="workspace-intro">
          <h1>Analysis Workspace</h1>
          <p>Review conversation data and AI insights.</p>
        </div>
        <section className="upload-card">
          <img src="/assets/workspace-upload.svg" alt="" />
          <div>
            <h2>Upload conversation</h2>
            <p>Supports .txt files only</p>
          </div>
          <button className="browse-button">
            <img src="/assets/workspace-plus.svg" alt="" />
            Browse Files
          </button>
        </section>
        <h2 className="queue-title">
          <img src="/assets/workspace-queue.svg" alt="" />
          QUEUE
        </h2>
        <div className="queue-list">
          <article className="queue-item">
            <div className="queue-file">
              <img src="/assets/workspace-processing.svg" alt="" />
              <div>
                <span>meeting_notes.txt</span>
                <small>65% Processed</small>
              </div>
            </div>
            <span className="progress">
              <i></i>
            </span>
          </article>
          <article className="queue-item">
            <div className="queue-file">
              <img src="/assets/workspace-document.svg" alt="" />
              <div>
                <span>client_a_brief.txt</span>
                <small className="ready">Ready</small>
              </div>
            </div>
            <img src="/assets/workspace-ready.svg" width={12} alt="" />
          </article>
        </div>
      </section>
      <section className="workspace-chat">
        <header className="assistant-header">
          <img src="/assets/workspace-assistant.svg" alt="" />
          <div>
            <strong>AI Assistant</strong>
            <small>Analyzing context...</small>
          </div>
        </header>
        <div className="chat-feed">
          <article>
            <div className="ai-bubble">
              I've started scanning client_a_brief.txt. I'm focusing on budget mentions and
              decision-maker roles. <span style={{ color: "#0053cd" }}>@ExtractionAgent</span>,
              please begin pulling the specific line items.
            </div>
            <p className="agent-meta">
              <b>ANALYSIS AGENT</b> &nbsp;• Just now
            </p>
          </article>
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
          <article>
            <div className="ai-bubble">
              The text mentions "Project Zenith" multiple times.{" "}
              <span style={{ color: "#0053cd" }}>@AnalysisAgent</span>, should we prioritize this
              as the primary account name?
              <div className="quick-actions">
                <button>Yes, prioritize</button>
                <button>No, it's a sub-task</button>
              </div>
            </div>
            <p className="agent-meta">
              <b className="purple">ORCHESTRATOR AGENT</b> &nbsp;• Just now
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

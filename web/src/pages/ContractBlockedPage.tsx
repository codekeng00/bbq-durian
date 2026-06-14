import { Link } from "react-router-dom";

export default function ContractBlockedPage() {
  return (
    <main className="contract-shell blocked">
      <header className="contract-brand">DealMaker</header>
      <section className="contract-summary">
        <div className="contract-title">
          <span className="contract-icon">⊘</span>
          <div>
            <h1>
              Contract #DEAL-2024-8842 <span className="pill">REQUIRES REVIEW</span>
            </h1>
            <p>Global Enterprise Tech • Service Agreement V1</p>
          </div>
        </div>
        <div className="contract-stats">
          <span>
            <small>TOTAL VALUE</small>
            <strong>$94,500.00</strong>
          </span>
          <span>
            <small>PRIORITY</small>
            <strong style={{ color: "#ba1a1a" }}>Critical</strong>
          </span>
          <span>
            <small>OWNER</small>
            <strong>Marcus Chen</strong>
          </span>
        </div>
      </section>
      <div className="contract-grid">
        <section className="document-viewer">
          <div className="viewer-tools">
            ○ &nbsp; △ &nbsp;&nbsp; 🔍 100% &nbsp;
            <span style={{ float: "right", color: "#ba1a1a" }}>Override Unavailable</span>
          </div>
          <div className="blocked-center">
            <div>
              <div className="ban">⊘</div>
              <h2>Contract Generation Blocked</h2>
              <p>
                Generation of the terms requested by Global Enterprise Tech has been suspended due
                to high-risk commercial provisions.
              </p>
              <div className="blocked-tags">
                <span>No SOW Definition</span>
                <span>Liability Cap Exclusion</span>
                <span>Non-standard SLA</span>
              </div>
            </div>
          </div>
        </section>
        <aside>
          <section className="approval-panel">
            <h2>Authorization Blocked</h2>
            <p>
              AI compliance has identified critical commercial violations. This contract cannot be
              approved.
            </p>
            <div className="agent-card">
              Risk Assessment Update
              <strong>RECOMMENDED: HOLD GENERATION</strong>
              <p>Supplier termination and uncapped liability terms exceed policy limits.</p>
            </div>
            <div className="approval-actions">
              <Link
                className="primary-button"
                to="/compliance-report"
                style={{ textAlign: "center", background: "#ba1a1a" }}
              >
                Reject &amp; Feedback
              </Link>
            </div>
          </section>
          <section className="manual-fields">
            <strong>MANUAL REVIEW</strong>
            <label>
              POLICY STATUS
              <input defaultValue="Not Approveable" readOnly />
            </label>
            <label>
              LEGAL SLA
              <input defaultValue="Escalate immediately" readOnly />
            </label>
          </section>
        </aside>
      </div>
    </main>
  );
}

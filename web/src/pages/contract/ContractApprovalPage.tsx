import { Link } from "react-router-dom";

export default function ContractApprovalPage() {
  return (
    <main className="contract-shell">
      <header className="contract-brand">DealMaker</header>
      <section className="contract-summary">
        <div className="contract-title">
          <span className="contract-icon">◇</span>
          <div>
            <h1>
              Contract #DEAL-2024-8842 <span className="pill">PREPARED</span>
            </h1>
            <p>Acme 2024 • Pricing Manager Package</p>
          </div>
        </div>
        <div className="contract-stats">
          <span>
            <small>TOTAL VALUE</small>
            <strong style={{ color: "#0053cd" }}>$44,800.00</strong>
          </span>
          <span>
            <small>PRIORITY</small>
            <strong style={{ color: "#ba1a1a" }}>High</strong>
          </span>
          <span>
            <small>OWNER</small>
            <strong>Marcus Chen</strong>
          </span>
        </div>
      </section>
      <div className="contract-grid">
        <section className="document-viewer">
          <div className="viewer-tools">● &nbsp; △ &nbsp;&nbsp; 🔍 100% ↗</div>
          <article className="document-paper">
            <h2>SERVICE AGREEMENT</h2>
            <p>REF: PROP-2024-8842</p>
            <h3>1. Terms &amp; Termination</h3>
            <p>
              This Agreement shall commence on the Effective Date and continue for an initial term
              of twelve months. Either party may terminate this Agreement for convenience with
              thirty days' written notice.
            </p>
            <p className="document-note">
              AI Note: Supplier termination language appears standard and within approved
              commercial policy.
            </p>
            <h3>2. Payment Schedule</h3>
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Project Kickoff</td>
                  <td>$18,800.00</td>
                </tr>
                <tr>
                  <td>Implementation Phase 1</td>
                  <td>$24,000.00</td>
                </tr>
                <tr>
                  <td>Final Delivery &amp; Verification</td>
                  <td>$12,000.00</td>
                </tr>
              </tbody>
            </table>
          </article>
        </section>
        <aside className="approval-panel">
          <h2>Authorization Signature</h2>
          <p>
            Final review completed. One approval is required before the contract can move to
            signing.
          </p>
          <div className="agent-card">
            DealMaker Assistant
            <strong>AI confidence: 94% complete</strong>
            <p>Terms, risk, and commercial items are within policy thresholds.</p>
          </div>
          <div className="approval-actions">
            <Link className="primary-button" to="/contract-received" style={{ textAlign: "center" }}>
              Approve &amp; Generate
            </Link>
            <button>Reject &amp; Feedback</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

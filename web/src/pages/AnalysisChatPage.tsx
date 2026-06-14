import { Link } from "react-router-dom";

export default function AnalysisChatPage() {
  return (
    <main className="email-chat-layout">
      <section className="email-editor">
        <header className="mini-brand">DealMaker</header>
        <article className="email-paper">
          <header className="email-head">
            <div className="email-head-row">
              <div>
                <h1>
                  Sarah Johnson{" "}
                  <span className="pill" style={{ color: "#712ae2" }}>
                    CLIENT
                  </span>
                </h1>
                <p>Acme Corp • Senior Procurement Manager</p>
              </div>
              <span className="pill" style={{ color: "#ba1a1a", background: "#fff0ef" }}>
                Pending Review
              </span>
            </div>
          </header>
          <div className="email-body">
            <p>
              <strong>To:</strong> sarah.johnson@acme.com
            </p>
            <p>
              <strong>Subject:</strong> Streamlining Acme's Supply Chain: Q4 Strategic Proposal
            </p>
            <p>Dear Sarah,</p>
            <p>
              Following our conversation regarding Acme Corp's recent expansion, I've tailored a
              preliminary proposal for <a>automated Q4 inventory forecasting</a> designed to
              accelerate your regional operations.
            </p>
            <p>
              Based on our <a>Salesforce's Cloud Proposal</a>, we estimate operational latency can
              be reduced by 32% while maintaining cross-regional compliance standards.
            </p>
            <p>
              I've attached the full breakdown below. Would you be available for a brief sync this
              Thursday at 3 PM to walk through the assumptions?
            </p>
            <p>
              Best regards,
              <br />
              Alexandra Reed
            </p>
          </div>
          <div className="send-row">
            <Link className="primary-button" to="/client-email-review">
              Send Email ↗
            </Link>
          </div>
        </article>
      </section>
      <aside className="chat-rail">
        <div className="user-bubble">Can you make it sound a bit more professional and urgent?</div>
        <div className="assistant-bubble">
          Updated. I've emphasized the delivery date and tightened the value proposition without
          adding pressure.
        </div>
        <div className="assistant-bubble">
          I've highlighted the Salesforce Cloud Proposal. Should we keep this wording?
        </div>
        <div className="chat-spacer"></div>
        <div className="chat-composer">
          <div className="chips">
            <span>ANALYTICS</span>
            <span>APPROVAL</span>
            <span>INDUSTRY INSIGHTS</span>
          </div>
          <div className="composer-field">
            <textarea placeholder="Ask me to refine this email or suggest changes..."></textarea>
            <button>↑</button>
          </div>
        </div>
      </aside>
    </main>
  );
}

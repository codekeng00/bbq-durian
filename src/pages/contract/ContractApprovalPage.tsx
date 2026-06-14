import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import { evaluateProposal } from "../../services/ai/evaluateProposal";

const REJECT_REASONS = [
  "Deal value too high for current policy",
  "Terms are non-compliant",
  "Information incomplete",
];

export default function ContractApprovalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { getDeal, approveDeal, rejectDeal } = useDemoData();

  const dealId = params.get("dealId") ?? "";
  const deal = getDeal(dealId);

  const [evaluating, setEvaluating] = useState(true);
  const [riskScore, setRiskScore] = useState<"low" | "medium" | "high">("low");
  const [complianceNotes, setComplianceNotes] = useState<string[]>([]);
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    if (!deal) return;
    let active = true;
    evaluateProposal(deal).then((res) => {
      if (!active) return;
      setRiskScore(res.riskScore);
      setComplianceNotes(res.complianceNotes);
      setEvaluating(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  if (!deal || !deal.email) {
    return (
      <main className="contract-shell">
        <header className="contract-brand">DealMaker</header>
        <p style={{ padding: "2rem" }}>
          Deal not found. <Link to="/active-pipelines-business">Back to pipelines</Link>
        </p>
      </main>
    );
  }

  function handleApprove() {
    const contractContent = [
      "SERVICE AGREEMENT",
      `Client: ${deal!.extracted.clientName ?? "Client"}`,
      `Total Value: $${(deal!.extracted.value ?? 0).toLocaleString()}`,
      `Decision Maker: ${deal!.extracted.decisionMaker ?? "N/A"}`,
      "",
      "1. SCOPE OF SERVICES",
      deal!.extracted.description ?? "Service engagement as agreed.",
      "",
      "2. COMMERCIAL TERMS",
      "Payment terms are Net 30 from the effective date.",
    ].join("\n");

    approveDeal(deal!.id, { riskScore, complianceNotes, contractContent });
    navigate("/active-pipelines-business");
  }

  function handleReject(reason: string) {
    rejectDeal(deal!.id, { riskScore, complianceNotes, rejectReason: reason });
    navigate("/active-pipelines-business");
  }

  return (
    <main className="contract-shell">
      <header className="contract-brand">DealMaker</header>
      <section className="contract-summary">
        <div className="contract-title">
          <span className="contract-icon">◇</span>
          <div>
            <h1>
              {deal.extracted.clientName ?? "Client"} <span className="pill">PENDING REVIEW</span>
            </h1>
            <p>{deal.email.subject}</p>
          </div>
        </div>
        <div className="contract-stats">
          <span>
            <small>TOTAL VALUE</small>
            <strong style={{ color: "#0053cd" }}>${(deal.extracted.value ?? 0).toLocaleString()}</strong>
          </span>
          <span>
            <small>AI RISK</small>
            <strong style={{ color: riskScore === "high" ? "#ba1a1a" : "#0b1c30" }}>
              {evaluating ? "…" : riskScore.toUpperCase()}
            </strong>
          </span>
          <span>
            <small>DECISION MAKER</small>
            <strong>{deal.extracted.decisionMaker ?? "N/A"}</strong>
          </span>
        </div>
      </section>

      <div className="contract-grid">
        <section className="document-viewer">
          <div className="viewer-tools">● &nbsp; △ &nbsp;&nbsp; 🔍 100% ↗</div>
          <article className="document-paper">
            <h2>PROPOSAL EMAIL</h2>
            <p>To: {deal.email.to}</p>
            <h3>{deal.email.subject}</h3>
            {deal.email.body.split("\n").map((line, i) => (
              <p key={i}>{line || " "}</p>
            ))}
          </article>
        </section>

        <aside className="approval-panel">
          <h2>AI Compliance Review</h2>
          {evaluating ? (
            <p>Evaluating proposal…</p>
          ) : (
            <div className="agent-card">
              Evaluation Agent
              <strong>Risk level: {riskScore.toUpperCase()}</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                {complianceNotes.map((note, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {!showReject ? (
            <div className="approval-actions">
              <button
                className="primary-button"
                type="button"
                disabled={evaluating}
                onClick={handleApprove}
                style={{ textAlign: "center" }}
              >
                Approve &amp; Generate
              </button>
              <button type="button" disabled={evaluating} onClick={() => setShowReject(true)}>
                Reject &amp; Feedback
              </button>
            </div>
          ) : (
            <div className="approval-actions" style={{ flexDirection: "column", gap: "8px" }}>
              <strong style={{ display: "block", marginBottom: "4px" }}>Select a reason:</strong>
              {REJECT_REASONS.map((reason) => (
                <button key={reason} type="button" onClick={() => handleReject(reason)}>
                  {reason}
                </button>
              ))}
              <button type="button" onClick={() => setShowReject(false)} style={{ color: "#67748a" }}>
                Cancel
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import { evaluateDealStream, type BusinessAgentStep } from "../../services/ai/evaluateDeal";
import type { Deal, Evaluation } from "../../data/types";

const REJECT_CATEGORIES = [
  ["risk", "Risk threshold"],
  ["compliance", "Compliance issue"],
  ["incomplete", "Information incomplete"],
  ["commercial", "Commercial terms"],
  ["other", "Other"],
] as const;

export default function ContractApprovalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, loadDeal, approveDeal, rejectDeal } = useDemoData();

  const dealId = params.get("dealId") ?? "";
  const [deal, setDeal] = useState<Deal>();
  const [evaluation, setEvaluation] = useState<Evaluation>();
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectCategory, setRejectCategory] = useState("compliance");
  const [rejectDetails, setRejectDetails] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [agentSteps, setAgentSteps] = useState<BusinessAgentStep[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDeal(dealId)
      .then(async (loaded) => {
        if (!active) return;
        setDeal(loaded);
        setEvaluation(loaded.evaluation);
        if (
          loaded.status === "pending_business_review" &&
          !loaded.evaluation
        ) {
          setEvaluating(true);
          const result = await evaluateDealStream(loaded.id, (step) => {
            if (active) setAgentSteps((prev) => [...prev, step]);
          });
          if (active) setEvaluation(result);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Review could not load.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setEvaluating(false);
        }
      });
    return () => {
      active = false;
    };
  }, [dealId, evaluateDeal, loadDeal]);

  if (loading) {
    return (
      <main className="contract-shell">
        <header className="contract-brand">
          DealMaker
          <Link to="/active-pipelines-business">Back to Pipelines</Link>
        </header>
        <section className="evaluation-stream-page">
          <h2>Agent Review in Progress</h2>
          <p className="evaluation-stream-sub">Our agents are evaluating this proposal. Results will appear when they finish.</p>
          <div className="evaluation-stream-feed">
            {agentSteps.map((step, i) => (
              <div key={i} className="band-msg">
                <span className="band-msg-sender">{step.agentName}</span>
                <div className="band-msg-bubble">
                  <span className="band-msg-mention">@{step.to}</span>
                  {" "}{step.message}
                </div>
              </div>
            ))}
            <div className="band-msg">
              <span className="band-msg-sender">
                {agentSteps.length === 0 ? "Pipeline" : agentSteps[agentSteps.length - 1]?.agentName}
              </span>
              <div className="band-msg-bubble band-msg-bubble--pending">
                <span className="agent-typing"><span /><span /><span /></span>
                <span>{agentSteps.length === 0 ? "Starting review pipeline..." : "Thinking..."}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!deal || !deal.email) {
    return (
      <main className="contract-shell">
        <header className="contract-brand">DealMaker</header>
        <p className="page-message">
          {error || "Deal not found."}{" "}
          <Link to="/active-pipelines-business">Back to pipelines</Link>
        </p>
      </main>
    );
  }

  const isPending = deal.status === "pending_business_review";
  const highRiskBlocked =
    evaluation?.riskScore === "high" && !currentUser?.canApproveHighRisk;
  const rulesOverrideMissing =
    evaluation?.mode === "rules_only" && overrideReason.trim().length < 20;

  async function handleApprove() {
    if (!deal || !evaluation || busy) return;
    setBusy(true);
    setError("");
    try {
      await approveDeal(
        deal.id,
        deal.version,
        evaluation.id,
        overrideReason.trim() || undefined,
      );
      navigate("/active-pipelines-business");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!deal || !evaluation || busy) return;
    setBusy(true);
    setError("");
    try {
      await rejectDeal(
        deal.id,
        deal.version,
        evaluation.id,
        rejectCategory,
        rejectDetails,
      );
      navigate("/active-pipelines-business");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Rejection failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadProposal() {
    if (!deal?.email) return;
    const content = [
      `To: ${deal.email.to}`,
      `Subject: ${deal.email.subject}`,
      "",
      deal.email.body,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${deal.extracted.clientName}-submitted-proposal.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="contract-shell">
      <header className="contract-brand">
        DealMaker
        <Link to="/active-pipelines-business">Back to Pipelines</Link>
      </header>

      {error && <p className="error-banner" role="alert">{error}</p>}

      <section className="contract-summary">
        <div className="contract-title">
          <div>
            <h1>
              {deal.extracted.clientName}{" "}
              <span className="pill">
                {isPending ? "PENDING REVIEW" : deal.status.toUpperCase()}
              </span>
            </h1>
            <p>{deal.email.subject}</p>
          </div>
        </div>
        <div className="contract-stats">
          <span>
            <small>TOTAL VALUE</small>
            <strong className="stat-value-blue">
              ${deal.extracted.value?.toLocaleString()}
            </strong>
          </span>
          <span>
            <small>SERVER RISK</small>
            <strong>{evaluation?.riskScore.toUpperCase() ?? "PENDING"}</strong>
          </span>
          <span>
            <small>PROPOSAL VERSION</small>
            <strong>{deal.version}</strong>
          </span>
        </div>
      </section>

      <div className="contract-grid">
        <section className="document-viewer">
          <div className="viewer-tools">
            <button type="button" onClick={downloadProposal}>Download</button>
            <button type="button" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
          <article className="document-paper">
            <h2>SUBMITTED PROPOSAL</h2>
            <p>To: {deal.email.to}</p>
            <h3>{deal.email.subject}</h3>
            {deal.email.body.split("\n").map((line, index) => (
              <p key={`${index}-${line}`}>{line || " "}</p>
            ))}
          </article>
        </section>

        <aside className="approval-panel">
          <h2>Policy and Risk Review</h2>
          {evaluating ? (
            <div className="evaluation-aside-stream">
              {agentSteps.map((step, i) => (
                <div key={i} className="band-msg">
                  <span className="band-msg-sender">{step.agentName}</span>
                  <div className="band-msg-bubble">
                    <span className="band-msg-mention">@{step.to}</span>
                    {" "}{step.message}
                  </div>
                </div>
              ))}
              <div className="band-msg">
                <span className="band-msg-sender">
                  {agentSteps.length === 0 ? "Pipeline" : agentSteps[agentSteps.length - 1]?.agentName}
                </span>
                <div className="band-msg-bubble band-msg-bubble--pending">
                  <span className="agent-typing"><span /><span /><span /></span>
                  <span>{agentSteps.length === 0 ? "Starting review pipeline..." : "Thinking..."}</span>
                </div>
              </div>
            </div>
          ) : evaluation ? (
            <>
              <div
                className={
                  evaluation.mode === "rules_only"
                    ? "warning-banner compact-banner"
                    : "info-banner compact-banner"
                }
              >
                <strong>
                  {evaluation.mode === "live_ai"
                    ? "Live AI and policy review"
                    : "Rules-only degraded review"}
                </strong>
                <small>{evaluation.provider}</small>
                {evaluation.failureReason && <p>{evaluation.failureReason}</p>}
              </div>
              <div className="score-grid">
                <span>Profit <strong>{evaluation.profitScore}</strong></span>
                <span>Compliance <strong>{evaluation.complianceScore}</strong></span>
                <span>Priority <strong>{evaluation.priorityScore}</strong></span>
              </div>
              <div className="agent-card">
                <strong>
                  Recommendation: {evaluation.recommendation.toUpperCase()}
                </strong>
                <p>{evaluation.reason}</p>
                <ul className="compliance-notes">
                  {evaluation.complianceNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                {evaluation.policySources.length > 0 && (
                  <p>
                    <small>
                      Policy sources: {evaluation.policySources.join(", ")}
                    </small>
                  </p>
                )}
              </div>
            </>
          ) : (
            <p>No evaluation is available for this historical record.</p>
          )}

          {highRiskBlocked && (
            <p className="error-banner">
              High-risk deals require an executive approver configured by an
              organization administrator.
            </p>
          )}

          {isPending && evaluation?.mode === "rules_only" && (
            <label className="form-field">
              <span>Required human override reason</span>
              <textarea
                rows={4}
                value={overrideReason}
                placeholder="Explain the manual policy checks completed and why approval is justified."
                onChange={(event) => setOverrideReason(event.target.value)}
              />
            </label>
          )}

          {isPending && evaluation && !showReject && (
            <div className="approval-actions">
              <button
                className="primary-button"
                type="button"
                disabled={
                  busy ||
                  evaluating ||
                  highRiskBlocked ||
                  rulesOverrideMissing
                }
                onClick={handleApprove}
              >
                {busy ? "Saving..." : "Approve and Create Contract Draft"}
              </button>
              <button
                type="button"
                disabled={busy || evaluating}
                onClick={() => setShowReject(true)}
              >
                Return with Feedback
              </button>
            </div>
          )}

          {isPending && evaluation && showReject && (
            <div className="approval-actions approval-actions-column">
              <label className="form-field">
                <span>Feedback category</span>
                <select
                  value={rejectCategory}
                  onChange={(event) => setRejectCategory(event.target.value)}
                >
                  {REJECT_CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Required remediation details</span>
                <textarea
                  rows={5}
                  value={rejectDetails}
                  onChange={(event) => setRejectDetails(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || rejectDetails.trim().length < 10}
                onClick={handleReject}
              >
                {busy ? "Saving..." : "Return Proposal"}
              </button>
              <button
                type="button"
                onClick={() => setShowReject(false)}
                className="link-button"
              >
                Cancel
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

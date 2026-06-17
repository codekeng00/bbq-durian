import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import type { Deal } from "../../data/types";

export default function AnalysisChatPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const {
    getDeal,
    loadDeal,
    updateDealEmail,
    submitToBusiness,
    withdrawForRevision,
  } = useDemoData();

  const dealId = params.get("dealId") ?? "";
  const cachedDeal = getDeal(dealId);
  const [deal, setDeal] = useState<Deal | undefined>(cachedDeal);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDeal(dealId)
      .then((loaded) => {
        if (!active) return;
        setDeal(loaded);
        setSubject(loaded.email?.subject ?? "");
        setBody(loaded.email?.body ?? "");
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Deal could not load.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dealId, loadDeal]);

  if (loading) {
    return <main className="page-message">Loading proposal...</main>;
  }

  if (!deal || !deal.email) {
    return (
      <main className="email-chat-layout">
        <section className="email-editor">
          <header className="mini-brand">DealMaker</header>
          <p className="page-message">
            {error || "Deal not found."}{" "}
            <Link to="/active-pipelines-sales">Back to pipelines</Link>
          </p>
        </section>
      </main>
    );
  }

  const readOnly = deal.status === "pending_business_review";

  async function handleSubmit() {
    if (!deal || !deal.email || busy) return;
    setBusy(true);
    setError("");
    try {
      let current = deal;
      if (subject !== deal.email.subject || body !== deal.email.body) {
        current = await updateDealEmail(
          deal.id,
          { to: deal.email.to, subject, body },
          deal.version,
        );
      }
      const submitted = await submitToBusiness(
        current.id,
        current.version,
        acknowledgeWarnings,
      );
      setDeal(submitted);
      navigate("/active-pipelines-sales");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!deal || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await withdrawForRevision(deal.id, deal.version);
      setDeal(updated);
      setSubject(updated.email?.subject ?? "");
      setBody(updated.email?.body ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Withdrawal failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadProposal() {
    if (!deal?.email) return;
    const content = [
      `To: ${deal.email.to}`,
      `Subject: ${subject}`,
      "",
      body,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${deal.extracted.clientName ?? "proposal"}-proposal.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="email-chat-layout">
      <section className="email-editor">
        <header className="mini-brand">
          DealMaker
          <Link to="/active-pipelines-sales">Back to Pipelines</Link>
        </header>

        {deal.status === "rejected" && deal.rejectReason && (
          <div className="reject-banner">
            <strong>Returned by Business:</strong> {deal.rejectReason}
          </div>
        )}

        {readOnly && (
          <div className="info-banner">
            This proposal is locked while Business reviews version {deal.version}.
            Withdraw it before making changes.
          </div>
        )}

        {deal.validationIssues.length > 0 && (
          <div className="warning-banner">
            <strong>Proposal validation warnings</strong>
            <ul>
              {deal.validationIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        )}

        {deal.validationMode === "rules_only" && (
          <div className="warning-banner">
            <strong>Rules-only proposal validation</strong>
            <p>
              Live AI validation was unavailable. Review the complete proposal
              manually before submission.
            </p>
            {deal.validationFailure && <small>{deal.validationFailure}</small>}
          </div>
        )}

        {error && <p className="error-banner" role="alert">{error}</p>}

        <article className="email-paper">
          <header className="email-head">
            <div className="email-head-row">
              <div>
                <h1>{deal.extracted.clientName}</h1>
                <p>{deal.extracted.description}</p>
              </div>
              <span className="pill pill-status">
                {deal.status === "pending_business_review"
                  ? "IN REVIEW"
                  : deal.status === "rejected"
                    ? "RETURNED"
                    : "DRAFT"}
              </span>
            </div>
          </header>
          <div className="email-body">
            <p><strong>To:</strong> {deal.email.to}</p>
            <label htmlFor="proposal-subject"><strong>Subject</strong></label>
            <input
              id="proposal-subject"
              value={subject}
              readOnly={readOnly}
              onChange={(event) => setSubject(event.target.value)}
              className="email-input"
            />
            <label htmlFor="proposal-body"><strong>Proposal message</strong></label>
            <textarea
              id="proposal-body"
              value={body}
              readOnly={readOnly}
              onChange={(event) => setBody(event.target.value)}
              rows={14}
              className="email-textarea"
            />
          </div>
          <div className="send-row action-row">
            <button type="button" onClick={downloadProposal}>
              Download Proposal
            </button>
            {readOnly ? (
              <button
                className="primary-button"
                type="button"
                disabled={busy}
                onClick={handleWithdraw}
              >
                {busy ? "Withdrawing..." : "Withdraw for Revision"}
              </button>
            ) : (
              <div>
                {deal.validationIssues.length > 0 && (
                  <label className="acknowledge-option">
                    <input
                      type="checkbox"
                      checked={acknowledgeWarnings}
                      onChange={(event) =>
                        setAcknowledgeWarnings(event.target.checked)
                      }
                    />
                    I reviewed the validation warnings.
                  </label>
                )}
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    busy ||
                    !subject.trim() ||
                    !body.trim() ||
                    (deal.validationIssues.length > 0 && !acknowledgeWarnings)
                  }
                  onClick={handleSubmit}
                >
                  {busy ? "Submitting..." : "Submit Version to Business"}
                </button>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

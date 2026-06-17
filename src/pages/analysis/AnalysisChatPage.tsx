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
    return <main className="page-message">Loading submission...</main>;
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
  const isApproved = deal.status === "approved";
  const contractDocument = deal.evaluation?.contractDocument;

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


  function downloadContract() {
    if (!contractDocument) return;
    const url = URL.createObjectURL(new Blob([contractDocument], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${deal?.extracted.clientName ?? "contract"}-commercial-contract.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const statusLabel = isApproved
    ? "APPROVED"
    : deal.status === "pending_business_review"
      ? "IN REVIEW"
      : deal.status === "rejected"
        ? "RETURNED"
        : "DRAFT";

  const statusClass = isApproved
    ? "ready"
    : deal.status === "pending_business_review"
      ? "analysis"
      : deal.status === "rejected"
        ? "high"
        : "";

  return (
    <main className="email-chat-layout">
      <section className="email-editor">
        <header className="mini-brand">
          <Link className="workspace-brand-logo" to="/active-pipelines-sales">
            <img src="/assets/logo.svg" alt="" />
            <strong>DealMaker</strong>
          </Link>
          <Link className="workspace-back" to="/active-pipelines-sales">
            <img src="/assets/workspace-back.svg" alt="" />
            Back to Pipelines
          </Link>
        </header>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <article className="email-paper">
          <header className="email-head">
            <div className="email-head-row">
              <div>
                <h1>{deal.extracted.clientName}</h1>
                <p>{deal.extracted.description}</p>
              </div>
              <span className={`status ${statusClass}`}>{statusLabel}</span>
            </div>
          </header>

          {isApproved && contractDocument ? (
            <>
              <div className="email-body">
                <div className="contract-doc-badge">COMMERCIAL CONTRACT</div>
                {contractDocument.split("\n").map((line, i) => {
                  const isHeading =
                    /^[A-Z][A-Z\s\/&]{4,}[A-Z]$/.test(line.trim()) ||
                    /^\d+\.\s+[A-Z]/.test(line.trim());
                  return isHeading
                    ? <h3 key={i} className="contract-section-heading">{line}</h3>
                    : <p key={i} className="contract-line">{line || " "}</p>;
                })}
              </div>
              <div className="send-row action-row">
                <button type="button" onClick={downloadContract}>
                  Download Contract
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="email-body">
                <p><strong>To:</strong> Business Review Team</p>
                <label htmlFor="proposal-subject"><strong>Subject</strong></label>
                <input
                  id="proposal-subject"
                  value={subject}
                  readOnly={readOnly}
                  onChange={(event) => setSubject(event.target.value)}
                  className="email-input"
                />
                <label htmlFor="proposal-body"><strong>Submission report</strong></label>
                <textarea
                  id="proposal-body"
                  value={body}
                  readOnly={readOnly}
                  onChange={(event) => setBody(event.target.value)}
                  className="email-textarea email-textarea--fill"
                />
              </div>
              <div className="send-row action-row">
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
            </>
          )}
        </article>
      </section>

      {/* Right panel: deal summary + validation */}
      <aside className="deal-sidebar">
        <div className="deal-sidebar-section">
          <h3 className="deal-sidebar-title">Deal Summary</h3>
          {deal.extracted.value && (
            <div className="deal-meta-hero">
              <div className="deal-meta-hero-label">Pipeline Value</div>
              <div className="deal-meta-hero-value">
                ${deal.extracted.value.toLocaleString()}
              </div>
              {deal.extracted.clientName && (
                <div className="deal-meta-hero-client">{deal.extracted.clientName}</div>
              )}
            </div>
          )}
          <dl className="deal-meta">
            <div className="deal-meta-row">
              <dt>Client</dt>
              <dd>{deal.extracted.clientName ?? "—"}</dd>
            </div>
            <div className="deal-meta-row">
              <dt>Decision Maker</dt>
              <dd>{deal.extracted.decisionMaker ?? "—"}</dd>
            </div>
            <div className="deal-meta-row">
              <dt>Contact</dt>
              <dd>{deal.extracted.contactEmail ?? "—"}</dd>
            </div>
            <div className="deal-meta-row">
              <dt>Version</dt>
              <dd>v{deal.version}</dd>
            </div>
          </dl>
        </div>

        {deal.status === "rejected" && deal.rejectReason && (
          <div className="deal-sidebar-section deal-sidebar-alert deal-sidebar-alert--red">
            <h3 className="deal-sidebar-title">Returned by Business</h3>
            <p>{deal.rejectReason}</p>
          </div>
        )}

        {readOnly && deal.status !== "rejected" && (
          <div className="deal-sidebar-section deal-sidebar-alert deal-sidebar-alert--blue">
            <h3 className="deal-sidebar-title">Locked for Review</h3>
            <p>This submission is locked while the Business team reviews version {deal.version}. Withdraw it to make further changes.</p>
          </div>
        )}

        {(deal.validationIssues.length > 0 || deal.validationMode === "rules_only") && (
          <div className="deal-sidebar-section deal-sidebar-alert deal-sidebar-alert--amber">
            <h3 className="deal-sidebar-title">Validation Warnings</h3>
            {deal.validationMode === "rules_only" && (
              <p>Live AI validation was unavailable. Please review the submission manually before sending to Business.</p>
            )}
            {deal.validationIssues.length > 0 && (
              <ul className="deal-sidebar-issues">
                {deal.validationIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            )}
          </div>
        )}
      </aside>
    </main>
  );
}

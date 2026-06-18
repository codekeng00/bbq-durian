import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../../components/AppSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";
import { useDemoData } from "../../hooks/useDemoData";

export default function ActivePipelinesBusinessPage() {
  const navigate = useNavigate();
  const { deals, currentUser, clearAllDeals } = useDemoData();
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function handleClearAll() {
    setConfirmingClear(false);
    setClearing(true);
    try {
      await clearAllDeals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clear data.");
    } finally {
      setClearing(false);
    }
  }

  const pending = deals.filter((deal) => deal.status === "pending_business_review");
  const history = deals.filter(
    (deal) => deal.status === "approved" || deal.status === "rejected",
  );
  const approved = history.filter((d) => d.status === "approved");
  const rejected = history.filter((d) => d.status === "rejected");
  const totalReviewed = history.length;

  function fmtValue(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  }

  if (pending.length === 0 && history.length === 0) {
    return (
      <>
        <AppSidebar brandTo="/active-pipelines-business" />
        <main className="app-main pipeline-main">
          <header className="pipeline-heading">
            <div className="pipeline-heading-copy">
              <h1>Welcome back, {currentUser?.email}</h1>
            </div>
          </header>
          <EmptyPipelineState titleId="business-empty-title" />
        </main>
      </>
    );
  }

  return (
    <>
      <AppSidebar brandTo="/active-pipelines-business" />
      <main className="app-main pipeline-main">
        <header className="pipeline-heading">
          <div className="pipeline-heading-copy">
            <h1>Welcome back, {currentUser?.email}</h1>
            {pending.length > 0 && (
              <p className="review-notice">
                {pending.length} proposal{pending.length === 1 ? "" : "s"} awaiting review
              </p>
            )}
          </div>
          <button
            type="button"
            className="clear-all-btn"
            disabled={clearing}
            onClick={() => setConfirmingClear(true)}
          >
            {clearing ? "Clearing..." : "Clear All Data"}
          </button>
        </header>

        <div className="pipeline-stats">
          <div className="stat-card">
            <div className="stat-card-label">Pending Review</div>
            <div className="stat-card-value amber">{pending.length}</div>
            <div className="stat-card-sub">proposals to action</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Approved</div>
            <div className="stat-card-value green">{approved.length}</div>
            <div className="stat-card-sub">deals approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Rejected</div>
            <div className="stat-card-value red">{rejected.length}</div>
            <div className="stat-card-sub">returned for revision</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Reviewed</div>
            <div className="stat-card-value">{fmtValue(totalReviewed)}</div>
            <div className="stat-card-sub">decisions made</div>
          </div>
        </div>

        <section className="pipeline-card">
          <h2>Pending Review</h2>
          {pending.length === 0 ? (
            <p className="muted-note table-note">No proposals awaiting review.</p>
          ) : (
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Client</th>
                  <th style={{ width: "18%" }}>Value</th>
                  <th>Proposal</th>
                  <th style={{ width: "18%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((deal) => (
                  <tr key={deal.id}>
                    <td data-label="Client">
                      <strong>{deal.extracted.clientName}</strong>
                    </td>
                    <td data-label="Value">
                      ${deal.extracted.value?.toLocaleString()}
                    </td>
                    <td data-label="Proposal">
                      <small>{deal.email?.subject}</small>
                    </td>
                    <td data-label="Action">
                      <button
                        className="table-action"
                        type="button"
                        onClick={() =>
                          navigate(`/contract-approval?dealId=${deal.id}`)
                        }
                      >
                        Review Proposal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {history.length > 0 && (
          <section className="pipeline-card pipeline-card-stacked">
            <h2>Decision History</h2>
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Client</th>
                  <th style={{ width: "18%" }}>Value</th>
                  <th>Outcome</th>
                  <th style={{ width: "18%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((deal) => (
                  <tr key={deal.id}>
                    <td data-label="Client">
                      <strong>{deal.extracted.clientName}</strong>
                    </td>
                    <td data-label="Value">
                      ${deal.extracted.value?.toLocaleString()}
                    </td>
                    <td data-label="Outcome">
                      <span
                        className={`status ${
                          deal.status === "approved" ? "ready" : "high"
                        }`}
                      >
                        {deal.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                    <td data-label="Action">
                      <button
                        className="table-action"
                        type="button"
                        onClick={() =>
                          navigate(`/contract-approval?dealId=${deal.id}`)
                        }
                      >
                        View Decision
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="pipeline-rule"></div>

      </main>
      {confirmingClear && (
        <div className="confirm-overlay" onClick={() => setConfirmingClear(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear All Data?</h3>
            <p>This will permanently delete all deal data and cannot be undone.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-cancel" type="button" onClick={() => setConfirmingClear(false)}>
                Cancel
              </button>
              <button className="confirm-danger" type="button" disabled={clearing} onClick={handleClearAll}>
                {clearing ? "Clearing..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

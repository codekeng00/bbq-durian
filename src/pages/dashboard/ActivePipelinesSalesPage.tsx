import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../../components/AppSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";
import { useDemoData } from "../../hooks/useDemoData";
import type { Deal, DealStatus } from "../../data/types";

const STATUS_LABEL: Record<DealStatus, string> = {
  draft: "Draft",
  pending_business_review: "In Business Review",
  rejected: "Returned for Revision",
  approved: "Approved",
};

const STATUS_CLASS: Record<DealStatus, string> = {
  draft: "analysis",
  pending_business_review: "analysis",
  rejected: "high",
  approved: "ready",
};

export default function ActivePipelinesSalesPage() {
  const navigate = useNavigate();
  const { deals, currentUser, archiveDeal, clearAllDeals } = useDemoData();
  const [busyId, setBusyId] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const active = deals.filter((deal) => deal.status !== "approved");
  const completed = deals.filter((deal) => deal.status === "approved");
  const submitted = deals.filter((d) => d.status === "pending_business_review");
  const totalValue = deals.reduce((s, d) => s + (d.extracted.value ?? 0), 0);

  function fmtValue(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  }

  function openDeal(deal: Deal) {
    if (deal.status === "approved") {
      navigate(`/contract-received?dealId=${deal.id}`);
    } else {
      navigate(`/analysis-chat?dealId=${deal.id}`);
    }
  }

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

  async function handleArchive(deal: Deal) {
    setBusyId(deal.id);
    try {
      await archiveDeal(deal.id, deal.version);
    } finally {
      setBusyId("");
    }
  }

  if (deals.length === 0) {
    return (
      <>
        <AppSidebar brandTo="/active-pipelines-sales" />
        <main className="app-main pipeline-main">
          <header className="pipeline-heading">
            <div className="pipeline-heading-copy">
              <h1>Welcome back, {currentUser?.name}</h1>
            </div>
          </header>
          <EmptyPipelineState
            titleId="sales-empty-title"
            onNew={() => navigate("/analysis-workspace")}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <AppSidebar brandTo="/active-pipelines-sales" />
      <main className="app-main pipeline-main">
        <header className="pipeline-heading">
          <div className="pipeline-heading-copy">
            <h1>Welcome back, {currentUser?.name}</h1>
            {active.length > 0 && (
              <p className="review-notice">
                {active.length} active opportunit{active.length === 1 ? "y" : "ies"}
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
            <div className="stat-card-label">Active</div>
            <div className="stat-card-value accent">{active.length}</div>
            <div className="stat-card-sub">proposals in progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Submitted</div>
            <div className="stat-card-value amber">{submitted.length}</div>
            <div className="stat-card-sub">awaiting business review</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Approved</div>
            <div className="stat-card-value green">{completed.length}</div>
            <div className="stat-card-sub">agreements signed</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Pipeline Value</div>
            <div className="stat-card-value">{fmtValue(totalValue)}</div>
            <div className="stat-card-sub">total across all deals</div>
          </div>
        </div>

        <section className="pipeline-card">
          <h2>Active Work</h2>
          {active.length === 0 ? (
            <p className="muted-note table-note">No active proposals.</p>
          ) : (
            <DealTable deals={active} onOpen={openDeal} />
          )}
        </section>

        {completed.length > 0 && (
          <section className="pipeline-card pipeline-card-stacked">
            <h2>Approved Agreements</h2>
            <DealTable
              deals={completed}
              onOpen={openDeal}
              onArchive={handleArchive}
              busyId={busyId}
            />
          </section>
        )}

        <div className="pipeline-rule"></div>
        <button
          className="floating-new"
          type="button"
          onClick={() => navigate("/analysis-workspace")}
        >
          + New Proposal
        </button>

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
      </main>
    </>
  );
}

function DealTable({
  deals,
  onOpen,
  onArchive,
  busyId,
}: {
  deals: Deal[];
  onOpen: (deal: Deal) => void;
  onArchive?: (deal: Deal) => void;
  busyId?: string;
}) {
  return (
    <table className="pipeline-table">
      <thead>
        <tr>
          <th style={{ width: "32%" }}>Client</th>
          <th style={{ width: "16%" }}>Value</th>
          <th>Status</th>
          <th style={{ width: "24%" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <tr key={deal.id}>
            <td data-label="Client">
              <strong>{deal.extracted.clientName}</strong>
              <small>{deal.extracted.description}</small>
            </td>
            <td data-label="Value">${deal.extracted.value?.toLocaleString()}</td>
            <td data-label="Status">
              <span className={`status ${STATUS_CLASS[deal.status]}`}>
                {STATUS_LABEL[deal.status]}
              </span>
            </td>
            <td data-label="Actions">
              <div className="table-actions">
                <button type="button" onClick={() => onOpen(deal)}>
                  {deal.status === "approved"
                    ? "View Agreement"
                    : deal.status === "pending_business_review"
                      ? "View Submission"
                      : "Edit Proposal"}
                </button>
                {onArchive && (
                  <button
                    type="button"
                    disabled={busyId === deal.id}
                    onClick={() => onArchive(deal)}
                  >
                    {busyId === deal.id ? "Archiving..." : "Archive"}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

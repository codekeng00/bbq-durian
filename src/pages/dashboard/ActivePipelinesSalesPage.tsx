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
  const active = deals.filter((deal) => deal.status !== "approved");
  const completed = deals.filter((deal) => deal.status === "approved");

  function openDeal(deal: Deal) {
    if (deal.status === "approved") {
      navigate(`/contract-received?dealId=${deal.id}`);
    } else {
      navigate(`/analysis-chat?dealId=${deal.id}`);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Delete all deal data? This cannot be undone.")) return;
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
            <h1>Welcome back, {currentUser?.name}</h1>
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
          <h1>Welcome back, {currentUser?.name}</h1>
          <p className="review-notice">
            {active.length} active opportunit{active.length === 1 ? "y" : "ies"}
          </p>
          <button
            type="button"
            className="clear-all-btn"
            disabled={clearing}
            onClick={handleClearAll}
          >
            {clearing ? "Clearing..." : "Clear All Data"}
          </button>
        </header>

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

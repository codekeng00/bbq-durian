import { useNavigate } from "react-router-dom";
import AppSidebar from "../../components/AppSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";
import { useDemoData } from "../../hooks/useDemoData";
import type { DealStatus } from "../../data/types";

const STATUS_LABEL: Record<DealStatus, string> = {
  draft: "Draft",
  pending_business_review: "Pending Review",
  rejected: "Rejected",
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
  const { deals } = useDemoData();

  // Clicking a row routes by status: rejected/draft → edit email; approved → view contract; pending → email (read).
  function openDeal(id: string, status: DealStatus) {
    if (status === "approved") navigate(`/contract-received?dealId=${id}`);
    else navigate(`/analysis-chat?dealId=${id}`);
  }

  if (deals.length === 0) {
    return (
      <>
        <AppSidebar brandTo="/active-pipelines-sales" />
        <main className="app-main pipeline-main">
          <header className="pipeline-heading">
            <h1>Welcome back, Alice</h1>
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
          <h1>Welcome back, Alice</h1>
          <p className="review-notice">{deals.length} active opportunit{deals.length === 1 ? "y" : "ies"}</p>
        </header>
        <section className="pipeline-card">
          <h2>Active Pipelines</h2>
          <table className="pipeline-table">
            <thead>
              <tr>
                <th style={{ width: "32%" }}>Client Name</th>
                <th style={{ width: "16%" }}>Value</th>
                <th>Status</th>
                <th style={{ width: "12%" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} style={{ cursor: "pointer" }} onClick={() => openDeal(deal.id, deal.status)}>
                  <td>
                    <strong>{deal.extracted.clientName ?? "Untitled Client"}</strong>
                    <small>{deal.extracted.description ?? ""}</small>
                  </td>
                  <td>${(deal.extracted.value ?? 0).toLocaleString()}</td>
                  <td>
                    <span className={`status ${STATUS_CLASS[deal.status]}`.trim()}>
                      {STATUS_LABEL[deal.status]}
                    </span>
                  </td>
                  <td>
                    <span className="more">⋮</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="pipeline-rule"></div>
        <button
          className="floating-new"
          type="button"
          onClick={() => navigate("/analysis-workspace")}
          style={{ border: "none", cursor: "pointer" }}
        >
          ＋ New
        </button>
      </main>
    </>
  );
}

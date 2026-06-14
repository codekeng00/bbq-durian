import { useNavigate } from "react-router-dom";
import AppSidebar from "../../components/AppSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";
import { useDemoData } from "../../hooks/useDemoData";

export default function ActivePipelinesBusinessPage() {
  const navigate = useNavigate();
  const { deals } = useDemoData();

  const pending = deals.filter((d) => d.status === "pending_business_review");
  const history = deals.filter((d) => d.status === "approved" || d.status === "rejected");

  if (pending.length === 0 && history.length === 0) {
    return (
      <>
        <AppSidebar brandTo="/active-pipelines-business" />
        <main className="app-main pipeline-main">
          <header className="pipeline-heading">
            <h1>Welcome back, Bob</h1>
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
          <h1>Welcome back, Bob</h1>
          <p className="review-notice">{pending.length} proposal{pending.length === 1 ? "" : "s"} awaiting review</p>
        </header>

        <section className="pipeline-card">
          <h2>Pending Review</h2>
          {pending.length === 0 ? (
            <p className="muted-note">No proposals awaiting review.</p>
          ) : (
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th style={{ width: "36%" }}>Client Name</th>
                  <th style={{ width: "20%" }}>Value</th>
                  <th>Subject</th>
                  <th style={{ width: "12%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((deal) => (
                  <tr
                    key={deal.id}
                    className="row-clickable"
                    onClick={() => navigate(`/contract-approval?dealId=${deal.id}`)}
                  >
                    <td data-label="Client">
                      <strong>{deal.extracted.clientName ?? "Untitled Client"}</strong>
                    </td>
                    <td data-label="Value">${(deal.extracted.value ?? 0).toLocaleString()}</td>
                    <td data-label="Subject">
                      <small>{deal.email?.subject ?? ""}</small>
                    </td>
                    <td data-label="">
                      <span className="more">⋮</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {history.length > 0 && (
          <section className="pipeline-card pipeline-card-stacked">
            <h2>History</h2>
            <table className="pipeline-table">
              <thead>
                <tr>
                  <th style={{ width: "36%" }}>Client Name</th>
                  <th style={{ width: "20%" }}>Value</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {history.map((deal) => (
                  <tr key={deal.id}>
                    <td data-label="Client">
                      <strong>{deal.extracted.clientName ?? "Untitled Client"}</strong>
                    </td>
                    <td data-label="Value">${(deal.extracted.value ?? 0).toLocaleString()}</td>
                    <td data-label="Outcome">
                      <span className={`status ${deal.status === "approved" ? "ready" : "high"}`}>
                        {deal.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="pipeline-rule"></div>
      </main>
    </>
  );
}

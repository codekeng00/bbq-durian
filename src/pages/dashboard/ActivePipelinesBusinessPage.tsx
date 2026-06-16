import { useNavigate } from "react-router-dom";
import AppSidebar from "../../components/AppSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";
import { useDemoData } from "../../hooks/useDemoData";

export default function ActivePipelinesBusinessPage() {
  const navigate = useNavigate();
  const { deals, currentUser } = useDemoData();

  const pending = deals.filter((deal) => deal.status === "pending_business_review");
  const history = deals.filter(
    (deal) => deal.status === "approved" || deal.status === "rejected",
  );

  if (pending.length === 0 && history.length === 0) {
    return (
      <>
        <AppSidebar brandTo="/active-pipelines-business" />
        <main className="app-main pipeline-main">
          <header className="pipeline-heading">
            <h1>Welcome back, {currentUser?.name}</h1>
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
          <h1>Welcome back, {currentUser?.name}</h1>
          <p className="review-notice">
            {pending.length} proposal{pending.length === 1 ? "" : "s"} awaiting review
          </p>
        </header>

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
    </>
  );
}

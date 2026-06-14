import AppSidebar from "../../components/AppSidebar";
import DashboardSidebar from "../../components/DashboardSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";

type Pipeline = {
  client: string;
  description: string;
  risk: "low" | "medium" | "high";
  riskLabel: string;
  value: string;
  status: string;
  statusClassName: string;
};

const defaultPipelines: Pipeline[] = [
  {
    client: "Acme Corp",
    description: "Enterprise SaaS Agreement",
    risk: "low",
    riskLabel: "Low",
    value: "$450,000",
    status: "Ready for Analyzing",
    statusClassName: "ready",
  },
  {
    client: "Global Tech Inc",
    description: "Infrastructure Expansion",
    risk: "high",
    riskLabel: "High",
    value: "$1,200,000",
    status: "Analyzing",
    statusClassName: "analysis",
  },
  {
    client: "Nebula Systems",
    description: "Security Audit Service",
    risk: "medium",
    riskLabel: "Medium",
    value: "$120,000",
    status: "Reviewing",
    statusClassName: "",
  },
];

export default function ActivePipelinesKengPage({
  pipelines = defaultPipelines,
}: {
  pipelines?: Pipeline[];
}) {
  if (pipelines.length === 0) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar brandTo="/active-pipelines-keng-empty" />
        <div className="main-area">
          <header className="page-header">
            <h1>Welcome back, Keng</h1>
          </header>
          <main className="content-canvas">
            <div className="page-spacer" aria-hidden="true"></div>
            <EmptyPipelineState titleId="keng-empty-title" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar brandTo="/active-pipelines-keng" />
      <main className="app-main pipeline-main">
        <header className="pipeline-heading">
          <h1>Welcome back, Keng</h1>
          <p className="review-notice">3 contracts require compliance review</p>
        </header>
        <section className="pipeline-card">
          <h2>Active Pipelines</h2>
          <table className="pipeline-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Client Name</th>
                <th style={{ width: "17%" }}>AI Risk Score</th>
                <th style={{ width: "14%" }}>Value</th>
                <th>Status</th>
                <th style={{ width: "9%" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map((pipeline) => (
                <tr key={pipeline.client}>
                  <td>
                    <strong>{pipeline.client}</strong>
                    <small>{pipeline.description}</small>
                  </td>
                  <td>
                    <span className={`risk ${pipeline.risk}`}>{pipeline.riskLabel}</span>
                  </td>
                  <td>{pipeline.value}</td>
                  <td>
                    <span className={`status ${pipeline.statusClassName}`.trim()}>
                      {pipeline.status}
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
      </main>
    </>
  );
}

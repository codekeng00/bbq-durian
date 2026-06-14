import AppSidebar from "../components/AppSidebar";

export default function ActivePipelinesKengPage() {
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
              <tr>
                <td>
                  <strong>Acme Corp</strong>
                  <small>Enterprise SaaS Agreement</small>
                </td>
                <td>
                  <span className="risk low">Low</span>
                </td>
                <td>$450,000</td>
                <td>
                  <span className="status ready">Ready for Analyzing</span>
                </td>
                <td>
                  <span className="more">⋮</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Global Tech Inc</strong>
                  <small>Infrastructure Expansion</small>
                </td>
                <td>
                  <span className="risk high">High</span>
                </td>
                <td>$1,200,000</td>
                <td>
                  <span className="status analysis">Analyzing</span>
                </td>
                <td>
                  <span className="more">⋮</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Nebula Systems</strong>
                  <small>Security Audit Service</small>
                </td>
                <td>
                  <span className="risk medium">Medium</span>
                </td>
                <td>$120,000</td>
                <td>
                  <span className="status">Reviewing</span>
                </td>
                <td>
                  <span className="more">⋮</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <div className="pipeline-rule"></div>
      </main>
    </>
  );
}

import DashboardSidebar from "../components/DashboardSidebar";
import EmptyPipelineState from "../components/EmptyPipelineState";

export default function ActivePipelinesKengEmptyPage() {
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

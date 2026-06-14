import { useNavigate } from "react-router-dom";
import DashboardSidebar from "../../components/DashboardSidebar";
import EmptyPipelineState from "../../components/EmptyPipelineState";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-shell">
      <DashboardSidebar brandTo="/dashboard" />
      <div className="main-area">
        <header className="page-header">
          <h1>Welcome back, Susu</h1>
        </header>
        <main className="content-canvas">
          <div className="page-spacer" aria-hidden="true"></div>
          <EmptyPipelineState
            titleId="empty-state-title"
            onNew={() => navigate("/analysis-workspace")}
          />
        </main>
      </div>
    </div>
  );
}

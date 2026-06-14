import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ActivePipelinesKengEmptyPage from "./pages/ActivePipelinesKengEmptyPage";
import ActivePipelinesKengPage from "./pages/ActivePipelinesKengPage";
import ActivePipelinesSusuPage from "./pages/ActivePipelinesSusuPage";
import AnalysisWorkspacePage from "./pages/AnalysisWorkspacePage";
import AnalysisChatPage from "./pages/AnalysisChatPage";
import ClientEmailReviewPage from "./pages/ClientEmailReviewPage";
import ComplianceReportPage from "./pages/ComplianceReportPage";
import ContractApprovalPage from "./pages/ContractApprovalPage";
import ContractBlockedPage from "./pages/ContractBlockedPage";
import ContractReceivedPage from "./pages/ContractReceivedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/active-pipelines-keng-empty" element={<ActivePipelinesKengEmptyPage />} />
      <Route path="/active-pipelines-keng" element={<ActivePipelinesKengPage />} />
      <Route path="/active-pipelines-susu" element={<ActivePipelinesSusuPage />} />
      <Route path="/analysis-workspace" element={<AnalysisWorkspacePage />} />
      <Route path="/analysis-chat" element={<AnalysisChatPage />} />
      <Route path="/client-email-review" element={<ClientEmailReviewPage />} />
      <Route path="/compliance-report" element={<ComplianceReportPage />} />
      <Route path="/contract-approval" element={<ContractApprovalPage />} />
      <Route path="/contract-blocked" element={<ContractBlockedPage />} />
      <Route path="/contract-received" element={<ContractReceivedPage />} />
    </Routes>
  );
}

import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ActivePipelinesKengEmptyPage from "./pages/dashboard/ActivePipelinesKengEmptyPage";
import ActivePipelinesKengPage from "./pages/dashboard/ActivePipelinesKengPage";
import ActivePipelinesSusuPage from "./pages/dashboard/ActivePipelinesSusuPage";
import AnalysisWorkspacePage from "./pages/analysis/AnalysisWorkspacePage";
import AnalysisChatPage from "./pages/analysis/AnalysisChatPage";
import ClientEmailReviewPage from "./pages/email/ClientEmailReviewPage";
import ComplianceReportPage from "./pages/contract/ComplianceReportPage";
import ContractApprovalPage from "./pages/contract/ContractApprovalPage";
import ContractBlockedPage from "./pages/contract/ContractBlockedPage";
import ContractReceivedPage from "./pages/contract/ContractReceivedPage";

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

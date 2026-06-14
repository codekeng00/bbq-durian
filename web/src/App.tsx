import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import ActivePipelinesSalesPage from "./pages/dashboard/ActivePipelinesSalesPage";
import ActivePipelinesBusinessPage from "./pages/dashboard/ActivePipelinesBusinessPage";
import AnalysisWorkspacePage from "./pages/analysis/AnalysisWorkspacePage";
import AnalysisChatPage from "./pages/analysis/AnalysisChatPage";
import ContractApprovalPage from "./pages/contract/ContractApprovalPage";
import ContractReceivedPage from "./pages/contract/ContractReceivedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/active-pipelines-sales" element={<ActivePipelinesSalesPage />} />
      <Route path="/active-pipelines-business" element={<ActivePipelinesBusinessPage />} />
      <Route path="/analysis-workspace" element={<AnalysisWorkspacePage />} />
      <Route path="/analysis-chat" element={<AnalysisChatPage />} />
      <Route path="/contract-approval" element={<ContractApprovalPage />} />
      <Route path="/contract-received" element={<ContractReceivedPage />} />
    </Routes>
  );
}

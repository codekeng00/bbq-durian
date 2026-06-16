import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import ActivePipelinesSalesPage from "./pages/dashboard/ActivePipelinesSalesPage";
import ActivePipelinesBusinessPage from "./pages/dashboard/ActivePipelinesBusinessPage";
import AnalysisWorkspacePage from "./pages/analysis/AnalysisWorkspacePage";
import AnalysisChatPage from "./pages/analysis/AnalysisChatPage";
import ContractApprovalPage from "./pages/contract/ContractApprovalPage";
import ContractReceivedPage from "./pages/contract/ContractReceivedPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/active-pipelines-sales" element={<ProtectedRoute team="sales"><ActivePipelinesSalesPage /></ProtectedRoute>} />
      <Route path="/active-pipelines-business" element={<ProtectedRoute team="business"><ActivePipelinesBusinessPage /></ProtectedRoute>} />
      <Route path="/analysis-workspace" element={<ProtectedRoute team="sales"><AnalysisWorkspacePage /></ProtectedRoute>} />
      <Route path="/analysis-chat" element={<ProtectedRoute team="sales"><AnalysisChatPage /></ProtectedRoute>} />
      <Route path="/contract-approval" element={<ProtectedRoute team="business"><ContractApprovalPage /></ProtectedRoute>} />
      <Route path="/contract-received" element={<ProtectedRoute team="sales"><ContractReceivedPage /></ProtectedRoute>} />
    </Routes>
  );
}

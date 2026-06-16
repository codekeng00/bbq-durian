export type Team = "sales" | "business";

export type DealStatus =
  | "draft"
  | "pending_business_review"
  | "rejected"
  | "approved";

export type ExtractedInfo = {
  clientName?: string;
  value?: number;
  description?: string;
  decisionMaker?: string;
  contactEmail?: string;
};

export type ChatMessage = {
  role: "agent" | "user";
  text: string;
};

export type Email = {
  to: string;
  subject: string;
  body: string;
};

export type Evaluation = {
  id: string;
  dealId: string;
  proposalVersion: number;
  riskScore: "low" | "medium" | "high";
  profitScore: number;
  complianceScore: number;
  priorityScore: number;
  complianceNotes: string[];
  recommendation: "approve" | "reject";
  reason: string;
  mode: "live_ai" | "rules_only";
  provider: string;
  policySources: string[];
  failureReason?: string;
  createdBy: string;
  createdAt: string;
};

export type User = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  name: string;
  team: Team;
  canApproveHighRisk: boolean;
};

export type Deal = {
  id: string;
  organizationId: string;
  createdBy: string;
  assignedTo?: string;
  version: number;
  status: DealStatus;
  rawConversation: string;
  extracted: ExtractedInfo;
  chatHistory: ChatMessage[];
  email?: Email;
  validationIssues: string[];
  validationMode: "live_ai" | "rules_only";
  validationFailure?: string;
  riskScore?: "low" | "medium" | "high";
  complianceNotes?: string[];
  rejectReason?: string;
  contractContent?: string;
  contractStatus?: "draft" | "signed" | "void";
  contractHash?: string;
  evaluation?: Evaluation;
  bandRoomId?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user?: User;
  devMode: boolean;
};

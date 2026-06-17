export type Team = "sales" | "business";

export type ExtractedInfo = {
  clientName?: string;
  value?: number;
  description?: string;
  decisionMaker?: string;
  contactEmail?: string;
};

export type Email = {
  to: string;
  subject: string;
  body: string;
};

export type DealStatus =
  | "draft"
  | "pending_business_review"
  | "rejected"
  | "approved";

export type DealRecord = {
  id: string;
  organizationId: string;
  createdBy: string;
  assignedTo?: string;
  version: number;
  status: DealStatus;
  rawConversation: string;
  extracted: ExtractedInfo;
  chatHistory: Array<{ role: "agent" | "user"; text: string }>;
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
  evaluation?: EvaluationRecord;
  bandRoomId?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationRecord = {
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
  contractDocument?: string;
  createdBy: string;
  createdAt: string;
};

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  name: string;
  team: Team;
  canApproveHighRisk: boolean;
};

export interface Env extends Cloudflare.Env {
  AUTH_SECRET?: string;
  DEV_AUTH_ENABLED?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_TOKEN?: string;
  FEATHERLESS_API_KEY?: string;
  BAND_AGENTS_JSON?: string;
}

export type AgentName =
  | "sales_parser"
  | "sales_enrichment"
  | "sales_construction"
  | "sales_validation"
  | "business_parser"
  | "business_evaluation"
  | "business_judgment";

export type BandAgentConfig = {
  id: string;
  key: string;
  name: string;
  handle?: string;
};

export type BandAgentMap = Partial<Record<AgentName, BandAgentConfig>>;

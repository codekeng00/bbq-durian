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

export type Deal = {
  id: string;
  status: DealStatus;
  rawConversation: string;
  extracted: ExtractedInfo;
  chatHistory: ChatMessage[];
  email?: Email;
  riskScore?: "low" | "medium" | "high";
  complianceNotes?: string[];
  rejectReason?: string;
  contractContent?: string;
  createdAt: string;
  updatedAt: string;
};

export type Team = "sales" | "business";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  team: Team;
};

export type DemoState = {
  deals: Deal[];
  currentTeam?: Team;
};

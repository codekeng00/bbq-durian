CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_business_review', 'rejected', 'approved')),
  raw_conversation TEXT NOT NULL,
  extracted_json TEXT NOT NULL,
  chat_history_json TEXT NOT NULL DEFAULT '[]',
  email_json TEXT,
  risk_score TEXT CHECK (risk_score IN ('low', 'medium', 'high')),
  compliance_notes_json TEXT,
  reject_reason TEXT,
  contract_content TEXT,
  band_room_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_status_updated
ON deals(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY,
  deal_id TEXT,
  band_room_id TEXT,
  agent_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_events_deal_created
ON agent_events(deal_id, created_at);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sales', 'business')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO knowledge_chunks (id, title, category, content) VALUES
('sales-standard-terms', 'Standard Commercial Terms', 'sales',
 'Default payment terms are Net 30. Sales may not promise custom liability caps, exclusivity, guaranteed inventory, or discounts above 10 percent without business approval. All delivery dates remain subject to final inventory confirmation.'),
('sales-proposal-quality', 'Proposal Quality Checklist', 'sales',
 'Every proposal must include the client name, decision maker, estimated value, business need, scope summary, next step, and a professional call to action. Avoid personal sensitive data and unsupported performance claims.'),
('sales-discount-policy', 'Discount and Pricing Policy', 'sales',
 'List pricing is authoritative. Discounts from 1 to 10 percent require manager review. Discounts above 10 percent require finance approval. Proposal emails should state estimated value and avoid presenting estimates as final invoices.'),
('business-risk-policy', 'Deal Risk Thresholds', 'business',
 'Deals below 150000 USD are normally low risk. Deals from 150000 to 499999 USD require medium-risk review. Deals at or above 500000 USD are high risk and require executive approval before contract generation.'),
('business-compliance-policy', 'Contract Compliance Rules', 'business',
 'Approved contracts use Net 30 terms, a standard liability cap, no automatic exclusivity, and final inventory confirmation. Missing decision makers, unclear scope, nonstandard payment terms, or unsupported guarantees must be returned to Sales.'),
('business-profit-policy', 'Profitability and Priority Scoring', 'business',
 'Prioritize deals with clear scope, standard terms, and credible decision makers. Profitability should account for discount level, delivery complexity, and support burden. High-value deals can have high priority while still requiring elevated risk approval.');

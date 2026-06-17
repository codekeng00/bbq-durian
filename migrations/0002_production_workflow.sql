CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('sales', 'business')),
  can_approve_high_risk INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

INSERT OR IGNORE INTO organizations (id, name, created_at)
VALUES ('org-demo', 'DealMaker Demo Organization', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO users (
  id, organization_id, email, name, team, can_approve_high_risk, active, created_at
) VALUES
  ('user-sales-alice', 'org-demo', 'alice@dealmaker.com', 'Alice Chen', 'sales', 0, 1, CURRENT_TIMESTAMP),
  ('user-business-bob', 'org-demo', 'bob@dealmaker.com', 'Bob Wilson', 'business', 0, 1, CURRENT_TIMESTAMP);

ALTER TABLE deals ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'org-demo';
ALTER TABLE deals ADD COLUMN created_by TEXT NOT NULL DEFAULT 'user-sales-alice';
ALTER TABLE deals ADD COLUMN assigned_to TEXT;
ALTER TABLE deals ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE deals ADD COLUMN validation_issues_json TEXT;
ALTER TABLE deals ADD COLUMN evaluation_id TEXT;
ALTER TABLE deals ADD COLUMN contract_status TEXT CHECK (contract_status IN ('draft', 'signed', 'void'));
ALTER TABLE deals ADD COLUMN contract_hash TEXT;
ALTER TABLE deals ADD COLUMN archived_at TEXT;

ALTER TABLE agent_events ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'org-demo';

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  proposal_version INTEGER NOT NULL,
  risk_score TEXT NOT NULL CHECK (risk_score IN ('low', 'medium', 'high')),
  profit_score INTEGER NOT NULL,
  compliance_score INTEGER NOT NULL,
  priority_score INTEGER NOT NULL,
  compliance_notes_json TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'reject')),
  reason TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('live_ai', 'rules_only')),
  provider TEXT NOT NULL,
  policy_sources_json TEXT NOT NULL,
  failure_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (deal_id, proposal_version),
  FOREIGN KEY (deal_id) REFERENCES deals(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  deal_version INTEGER NOT NULL,
  signer_user_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id),
  FOREIGN KEY (signer_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  deal_id TEXT,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_org_status_updated
ON deals(organization_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluations_deal_version
ON evaluations(deal_id, proposal_version);

CREATE INDEX IF NOT EXISTS idx_audit_org_created
ON audit_events(organization_id, created_at DESC);

ALTER TABLE deals ADD COLUMN validation_mode TEXT NOT NULL DEFAULT 'rules_only'
  CHECK (validation_mode IN ('live_ai', 'rules_only'));
ALTER TABLE deals ADD COLUMN validation_failure TEXT;

CREATE TABLE IF NOT EXISTS entitlements (
  license_key TEXT PRIMARY KEY,
  customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entitlements_customer_id
ON entitlements(customer_id);

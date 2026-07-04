-- Customer-requested tools (via AI assistant when not in catalog)

CREATE TABLE tool_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  requested_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_requests_status ON tool_requests (status, created_at DESC);

ALTER TABLE tool_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit tool requests"
  ON tool_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users view own tool requests"
  ON tool_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage tool requests"
  ON tool_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

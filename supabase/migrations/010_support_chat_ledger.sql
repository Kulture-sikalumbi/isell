-- Customer ↔ admin support chat

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  body TEXT NOT NULL,
  read_by_user_at TIMESTAMPTZ,
  read_by_admin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_user_created
  ON support_messages (user_id, created_at DESC);

-- Ledger for mobile money / account balance tracking
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('payment_in', 'payout', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_created ON ledger_entries (created_at DESC);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Support messages: users see own thread
CREATE POLICY "Users view own support messages"
  ON support_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users send support messages"
  ON support_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND sender_role = 'user');

CREATE POLICY "Admins manage support messages"
  ON support_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ledger: admins only
CREATE POLICY "Admins view ledger"
  ON ledger_entries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins insert ledger"
  ON ledger_entries FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE support_messages IS 'Direct chat between customers and admin';
COMMENT ON TABLE ledger_entries IS 'Account ledger — mobile money in, payouts, adjustments';

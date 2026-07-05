-- User inbox notifications (activations, deposits, support replies)

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user_created
  ON user_notifications (user_id, created_at DESC);

CREATE INDEX idx_user_notifications_unread
  ON user_notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service manages user notifications"
  ON user_notifications FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE user_notifications IS 'Customer inbox — activations, deposits, support replies';

-- Realtime for live inbox updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

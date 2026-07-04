-- Admin inbox notifications for new orders and system events

CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'new_order',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_unread ON admin_notifications (created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE admin_notifications IS 'In-app admin alerts — new orders, etc.';

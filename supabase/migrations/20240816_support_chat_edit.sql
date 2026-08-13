-- Support chat: allow editing a message before it has been delivered
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

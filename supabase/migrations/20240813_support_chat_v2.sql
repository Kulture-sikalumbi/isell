-- Support chat v2: image attachments, tool references, replies, delete, delivered status
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS image_url        text,
  ADD COLUMN IF NOT EXISTS tool_id          uuid REFERENCES tools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_id      uuid REFERENCES support_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_for_all  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_sender boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at     timestamptz;

-- Optional: make body nullable (it was previously required, now images/tools can replace it)
ALTER TABLE support_messages
  ALTER COLUMN body DROP NOT NULL;

-- Storage bucket for chat images (run in Supabase dashboard Storage section if not using CLI)
-- Bucket name: support-chat-images  (public bucket)
-- Policy: allow authenticated users to upload to chat/{user_id}/
-- Policy: allow public read on all objects

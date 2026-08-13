-- Support chat audio: voice note attachments
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Storage bucket for voice notes (create in Supabase dashboard Storage section):
-- Bucket name: support-chat-audio  (public bucket)
-- Policy: allow authenticated users to upload to {user_id}/
-- Policy: allow public read on all objects

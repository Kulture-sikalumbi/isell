-- Track one-time welcome email per customer (saves Resend free-tier credits)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.welcome_email_sent_at IS 'Set after first welcome email is sent — never send twice';

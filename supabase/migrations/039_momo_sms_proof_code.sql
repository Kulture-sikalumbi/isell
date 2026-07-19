-- Short proof codes for customer submit (Airtel last segment; MTN full TID digits).
ALTER TABLE momo_sms_receipts
  ADD COLUMN IF NOT EXISTS proof_code TEXT;

UPDATE momo_sms_receipts
SET proof_code = CASE
  WHEN method = 'airtel' AND position('.' in transaction_id) > 0
    THEN UPPER(reverse(split_part(reverse(transaction_id), '.', 1)))
  WHEN method = 'mtn'
    THEN regexp_replace(UPPER(transaction_id), '[^0-9]', '', 'g')
  WHEN position('.' in transaction_id) > 0
    THEN UPPER(reverse(split_part(reverse(transaction_id), '.', 1)))
  ELSE UPPER(regexp_replace(transaction_id, '[^0-9A-Z]', '', 'g'))
END
WHERE proof_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_momo_sms_receipts_proof_unmatched
  ON momo_sms_receipts (method, proof_code, received_at DESC)
  WHERE matched_deposit_id IS NULL;

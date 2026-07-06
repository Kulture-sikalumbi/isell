-- Orders paid but never fulfilled (auto API failed or legacy data) → awaiting admin
UPDATE payments p
SET fulfillment_status = 'awaiting'
WHERE p.status = 'completed'
  AND p.fulfillment_status IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM activations a WHERE a.payment_id = p.id
  );

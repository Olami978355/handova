-- Adds transfer-tracking to inspection_bookings, mirroring the pattern
-- already used on deals (transfer_status, paystack_transfer_reference,
-- paystack_transfer_code). Needed so agent payouts for inspection fees
-- can be tracked, retried, and debugged instead of failing silently.

ALTER TABLE inspection_bookings
  ADD COLUMN IF NOT EXISTS transfer_status text
    CHECK (transfer_status IN ('pending', 'success', 'failed')),
  ADD COLUMN IF NOT EXISTS paystack_transfer_reference text,
  ADD COLUMN IF NOT EXISTS paystack_transfer_code text;

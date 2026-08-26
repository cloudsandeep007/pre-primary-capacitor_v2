-- Safe Payment Reversal: Add reversal tracking columns to fee_payments
-- These are nullable and additive -- no existing rows are affected

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS reversal_note TEXT,
  ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- Existing RLS: fees.write permission covers UPDATE on fee_payments
-- No new policy needed

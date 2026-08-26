-- Add payment period allocation to fee_payments
ALTER TABLE public.fee_payments 
ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'Unspecified' CHECK (period_type IN ('Monthly', 'Term', 'Yearly', 'One-time', 'Unspecified')),
ADD COLUMN IF NOT EXISTS period_value TEXT;

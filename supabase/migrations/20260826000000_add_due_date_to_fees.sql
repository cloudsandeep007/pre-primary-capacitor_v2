-- Add due_date and fee_period to student_fees
ALTER TABLE public.student_fees 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS fee_period TEXT;

-- Backfill from fee_structures
UPDATE public.student_fees sf
SET due_date = fs.due_date::date,
    fee_period = fs.frequency
FROM public.fee_structures fs
WHERE sf.fee_structure_id = fs.id;

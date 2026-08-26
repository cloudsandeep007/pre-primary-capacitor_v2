
-- Add category_id to student_fees for Ad-hoc fee collection
ALTER TABLE public.student_fees ADD COLUMN category_id UUID REFERENCES public.fee_categories(id);

-- Backfill existing records from fee_structures
UPDATE public.student_fees sf
SET category_id = fs.category_id
FROM public.fee_structures fs
WHERE sf.fee_structure_id = fs.id;

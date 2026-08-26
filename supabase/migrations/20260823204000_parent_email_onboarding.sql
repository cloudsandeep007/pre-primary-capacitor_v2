-- PHASE 2 Extension: Add Parent Email to Students Table

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);

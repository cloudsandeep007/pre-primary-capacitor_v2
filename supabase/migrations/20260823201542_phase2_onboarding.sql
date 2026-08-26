-- PHASE 2: Secure Onboarding Schema Enhancements

-- 1. Add employee_id to staff table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

-- Make employee_id unique if it has data, or just add the constraint. 
-- Since it might be null for existing data, we can create a unique index that ignores nulls.
CREATE UNIQUE INDEX IF NOT EXISTS staff_employee_id_idx ON public.staff (employee_id) WHERE employee_id IS NOT NULL;

-- 2. Add parent_id to parents table
ALTER TABLE public.parents
ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS parents_parent_id_idx ON public.parents (parent_id) WHERE parent_id IS NOT NULL;

-- 3. Add emergency contact and relationship fields to students or parents?
-- The onboarding form adds "Emergency Contact Number, Relationship Type (Mother/Father/Guardian)".
-- Relationship type already exists in student_parents table.
-- Emergency contact can go to students table.
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);

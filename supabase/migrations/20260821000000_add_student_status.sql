-- Migration: Add status column to students table
-- Description: Supports active/dropout tracking for the Admin Dashboard
-- Impact: Safe. Defaults existing students to 'active'

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'dropout', 'graduated'));

-- (Optional Rollback)
-- ALTER TABLE public.students DROP COLUMN IF EXISTS status;

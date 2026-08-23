-- Phase B: Academic Management & Core Entities

-- 1. Create Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section TEXT DEFAULT 'A',
    class_teacher_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    room_number TEXT,
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(name, section)
);

-- Enable RLS for Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on classes" 
    ON public.classes FOR SELECT USING (true);

CREATE POLICY "Allow admins write on classes" 
    ON public.classes FOR INSERT WITH CHECK (has_permission('academics.write'));

CREATE POLICY "Allow admins update on classes" 
    ON public.classes FOR UPDATE USING (has_permission('academics.write'));

CREATE POLICY "Allow admins delete on classes" 
    ON public.classes FOR DELETE USING (has_permission('academics.delete'));

-- Seed default classes based on existing students data to prevent breakage
INSERT INTO public.classes (name, section) VALUES 
  ('Nursery', 'A'),
  ('Junior KG', 'A'),
  ('Senior KG', 'A')
ON CONFLICT (name, section) DO NOTHING;

-- 2. Extend Students Table (safely)
-- We add class_id but keep it nullable so existing legacy insertions don't break.
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS admission_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Alumni', 'Transferred'));

-- Update existing students to link to the new classes based on their string `class_name`
UPDATE public.students s
SET class_id = c.id
FROM public.classes c
WHERE s.class_name = c.name AND s.class_id IS NULL;

-- 3. Extend Staff Table
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave'));

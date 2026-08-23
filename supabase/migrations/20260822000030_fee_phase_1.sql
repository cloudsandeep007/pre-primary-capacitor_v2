-- Phase 1: Fee Categories & Structures
CREATE TABLE IF NOT EXISTS public.fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on fee_categories" 
    ON public.fee_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins write on fee_categories" 
    ON public.fee_categories FOR ALL USING (has_permission('fees.write'));

-- Insert default categories safely
INSERT INTO public.fee_categories (name, description) VALUES
('Tuition Fee', 'Standard monthly/termly tuition fee'),
('Admission Fee', 'One-time admission charge'),
('Transport Fee', 'Transportation and bus fee'),
('Activity Fee', 'Extracurricular activities and sports'),
('Annual Fee', 'Yearly maintenance and infrastructure fee')
ON CONFLICT (name) DO NOTHING;

-- Alter fee_structures to support category_id strictly
ALTER TABLE public.fee_structures ADD COLUMN category_id UUID REFERENCES public.fee_categories(id) ON DELETE RESTRICT;

-- Attempt to map any existing fee_structures to the new category_id based on the text column
UPDATE public.fee_structures fs
SET category_id = fc.id
FROM public.fee_categories fc
WHERE fs.fee_category = fc.name;

-- Now that category_id is populated for matches, we can make it NOT NULL for future records if we wanted, 
-- but since there might be unmapped legacy strings, we leave it nullable for now and enforce it at app-level.


-- Phase A Foundation: Settings Table & New Permissions

-- 1. Insert New Capabilities into Permissions Table
INSERT INTO public.permissions (name, module, description) VALUES
  ('settings.read', 'settings', 'View school settings'),
  ('settings.write', 'settings', 'Modify school settings'),
  ('academics.read', 'academics', 'View academic structures'),
  ('academics.write', 'academics', 'Manage classes and subjects'),
  ('academics.delete', 'academics', 'Delete academic structures'),
  ('fees.read', 'fees', 'View fee structures and ledgers'),
  ('fees.write', 'fees', 'Manage fees and record payments'),
  ('fees.delete', 'fees', 'Delete fee records and payments'),
  ('admissions.read', 'admissions', 'View admission applications'),
  ('admissions.write', 'admissions', 'Manage admission applications'),
  ('admissions.delete', 'admissions', 'Delete admission applications'),
  ('complaints.read', 'complaints', 'View complaints and requests'),
  ('complaints.write', 'complaints', 'Manage and resolve complaints'),
  ('complaints.delete', 'complaints', 'Delete complaints'),
  ('documents.read', 'documents', 'View document metadata'),
  ('documents.write', 'documents', 'Manage document metadata'),
  ('documents.delete', 'documents', 'Delete document metadata')
ON CONFLICT (name) DO NOTHING;

-- 2. Create School Settings Table
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Enable RLS on School Settings
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for School Settings
-- Everyone authenticated (staff, parents, admins) needs to read settings like "Current Academic Year"
CREATE POLICY "Allow authenticated read on school_settings" 
    ON public.school_settings 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Only admins with settings.write can modify settings
CREATE POLICY "Allow admins write on school_settings" 
    ON public.school_settings 
    FOR INSERT 
    WITH CHECK (has_permission('settings.write'));

CREATE POLICY "Allow admins update on school_settings" 
    ON public.school_settings 
    FOR UPDATE 
    USING (has_permission('settings.write'));

CREATE POLICY "Allow admins delete on school_settings" 
    ON public.school_settings 
    FOR DELETE 
    USING (has_permission('settings.write'));

-- 5. Insert Initial Default Settings
INSERT INTO public.school_settings (setting_key, setting_value, description) VALUES
  ('academic_year', '"2026-2027"', 'The current active academic year for the school'),
  ('school_name', '"Demo International School"', 'The official name of the school'),
  ('currency', '"USD"', 'The default currency for fee tracking')
ON CONFLICT (setting_key) DO NOTHING;

-- Phase D: Admissions, Complaints, and Documents

-- 1. Admissions Table
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_name TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    applied_class TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Waitlisted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- who raised it (parent or staff)
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL, -- staff member handling it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents Table (Metadata for Supabase Storage)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General' CHECK (category IN ('General', 'Policy', 'Curriculum', 'Forms')),
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admissions Policies
CREATE POLICY "Allow authenticated read on admissions" 
    ON public.admissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins write on admissions" 
    ON public.admissions FOR INSERT WITH CHECK (has_permission('admissions.write'));
CREATE POLICY "Allow admins update on admissions" 
    ON public.admissions FOR UPDATE USING (has_permission('admissions.write'));
CREATE POLICY "Allow admins delete on admissions" 
    ON public.admissions FOR DELETE USING (has_permission('admissions.delete'));

-- Complaints Policies
CREATE POLICY "Allow authors and admins read on complaints" 
    ON public.complaints FOR SELECT TO authenticated USING (
        auth.uid() = author_id OR has_permission('complaints.read')
    );
CREATE POLICY "Allow authenticated insert on complaints" 
    ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id OR has_permission('complaints.write'));
CREATE POLICY "Allow admins update on complaints" 
    ON public.complaints FOR UPDATE USING (has_permission('complaints.write'));
CREATE POLICY "Allow admins delete on complaints" 
    ON public.complaints FOR DELETE USING (has_permission('complaints.delete'));

-- Documents Policies
CREATE POLICY "Allow public read on public documents" 
    ON public.documents FOR SELECT TO authenticated USING (is_public = true OR has_permission('documents.read'));
CREATE POLICY "Allow admins write on documents" 
    ON public.documents FOR INSERT WITH CHECK (has_permission('documents.write'));
CREATE POLICY "Allow admins update on documents" 
    ON public.documents FOR UPDATE USING (has_permission('documents.write'));
CREATE POLICY "Allow admins delete on documents" 
    ON public.documents FOR DELETE USING (has_permission('documents.delete'));

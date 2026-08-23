-- =========================================================================
-- PARENT GOOGLE LOGIN + SCHOOL FEEDBACK + GOOGLE REVIEW
-- Migration for Phase 1: Database Preparation
-- =========================================================================

-- 1. Create Parents Table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Student_Parents Junction Table
CREATE TABLE IF NOT EXISTS public.student_parents (
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'Guardian' CHECK (relationship_type IN ('Father', 'Mother', 'Guardian')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, parent_id)
);

-- 3. Create School Feedback Table
CREATE TABLE IF NOT EXISTS public.school_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    rating_overall INTEGER NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
    comments TEXT,
    is_public_review_clicked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Parents
CREATE POLICY "Parents can read own profile" 
    ON public.parents FOR SELECT 
    USING (auth_user_id = auth.uid() OR has_permission('parents.read'));

CREATE POLICY "Admins can manage parents" 
    ON public.parents FOR ALL 
    USING (has_permission('parents.write'));

-- 6. RLS Policies for Student_Parents
CREATE POLICY "Parents can read own student links" 
    ON public.student_parents FOR SELECT 
    USING (parent_id IN (SELECT id FROM public.parents WHERE auth_user_id = auth.uid()) OR has_permission('parents.read'));

CREATE POLICY "Admins can manage student_parents" 
    ON public.student_parents FOR ALL 
    USING (has_permission('parents.write'));

-- 7. RLS Policies for Feedback
CREATE POLICY "Parents can read own feedback" 
    ON public.school_feedback FOR SELECT 
    USING (parent_id IN (SELECT id FROM public.parents WHERE auth_user_id = auth.uid()) OR has_permission('feedback.read'));

CREATE POLICY "Parents can submit feedback" 
    ON public.school_feedback FOR INSERT 
    WITH CHECK (parent_id IN (SELECT id FROM public.parents WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can read all feedback" 
    ON public.school_feedback FOR SELECT 
    USING (has_permission('feedback.read'));

-- 8. Update Students Table RLS to support Parents
-- This adds the condition that if a user is in auth.users and is linked to the student via student_parents, they can read the student record.
CREATE POLICY "Parents can read their children" 
    ON public.students FOR SELECT 
    USING (
        id IN (
            SELECT student_id FROM public.student_parents 
            WHERE parent_id = (SELECT id FROM public.parents WHERE auth_user_id = auth.uid())
        )
    );

-- 9. Insert new permissions for Parents and Feedback
INSERT INTO public.permissions (name, module, description) VALUES
    ('parents.read', 'parents', 'View parent profiles and mappings'),
    ('parents.write', 'parents', 'Manage parent profiles and mappings'),
    ('feedback.read', 'feedback', 'View school feedback submissions'),
    ('parent.portal.view', 'parent', 'Access the parent portal'),
    ('parent.feedback.create', 'parent', 'Submit school feedback')
ON CONFLICT (name) DO NOTHING;

-- 10. Map permissions to roles
DO $$
DECLARE
    super_admin_id UUID;
    principal_id UUID;
    parent_role_id UUID;
BEGIN
    SELECT id INTO super_admin_id FROM public.roles WHERE name = 'super_admin';
    SELECT id INTO principal_id FROM public.roles WHERE name = 'principal';
    SELECT id INTO parent_role_id FROM public.roles WHERE name = 'parent';

    -- Super Admin & Principal get parent/feedback read/write
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM (VALUES (super_admin_id), (principal_id)) as r(id)
    CROSS JOIN public.permissions p 
    WHERE p.name IN ('parents.read', 'parents.write', 'feedback.read')
    ON CONFLICT DO NOTHING;

    -- Parent Role gets parent portal access
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT parent_role_id, p.id FROM public.permissions p 
    WHERE p.name IN ('parent.portal.view', 'parent.feedback.create')
    ON CONFLICT DO NOTHING;
END $$;

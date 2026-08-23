-- ==============================================================================
-- Phase 5: RLS Enforcement (The Lock Down - Staggered Rollout Step 1)
-- ==============================================================================

-- 1. Drop Legacy Insecure Policies on Staff
DROP POLICY IF EXISTS "anon_read_staff" ON public.staff;
DROP POLICY IF EXISTS "anon_insert_staff" ON public.staff;
DROP POLICY IF EXISTS "anon_update_staff" ON public.staff;
DROP POLICY IF EXISTS "anon_delete_staff" ON public.staff;

-- 2. Drop Legacy Insecure Policies on Students
DROP POLICY IF EXISTS "anon_read_students" ON public.students;
DROP POLICY IF EXISTS "anon_insert_students" ON public.students;
DROP POLICY IF EXISTS "anon_update_students" ON public.students;
DROP POLICY IF EXISTS "anon_delete_students" ON public.students;

DROP POLICY IF EXISTS "public read students" ON public.students;
DROP POLICY IF EXISTS "public write students" ON public.students;
DROP POLICY IF EXISTS "public update students" ON public.students;

-- 3. Enforce Strict RBAC Policies on STAFF
-- READ: Users can read their own profile, OR users with 'staff.view' permission can read all
CREATE POLICY "Staff read access" ON public.staff FOR SELECT
USING ( auth_user_id = auth.uid() OR public.has_permission('staff.view') );

-- INSERT: Only users with 'staff.manage' permission
CREATE POLICY "Staff insert access" ON public.staff FOR INSERT
WITH CHECK ( public.has_permission('staff.manage') );

-- UPDATE: Only users with 'staff.manage' permission
CREATE POLICY "Staff update access" ON public.staff FOR UPDATE
USING ( public.has_permission('staff.manage') );

-- DELETE: Only users with 'staff.manage' permission
CREATE POLICY "Staff delete access" ON public.staff FOR DELETE
USING ( public.has_permission('staff.manage') );

-- 4. Enforce Strict RBAC Policies on STUDENTS
-- READ: Parents can read their own children, OR users with 'students.view' permission can read all
CREATE POLICY "Students read access" ON public.students FOR SELECT
USING ( auth_parent_id = auth.uid() OR public.has_permission('students.view') );

-- INSERT: Only users with 'students.edit' permission
CREATE POLICY "Students insert access" ON public.students FOR INSERT
WITH CHECK ( public.has_permission('students.edit') );

-- UPDATE: Only users with 'students.edit' permission
CREATE POLICY "Students update access" ON public.students FOR UPDATE
USING ( public.has_permission('students.edit') );

-- DELETE: Only users with 'students.edit' permission
CREATE POLICY "Students delete access" ON public.students FOR DELETE
USING ( public.has_permission('students.edit') );

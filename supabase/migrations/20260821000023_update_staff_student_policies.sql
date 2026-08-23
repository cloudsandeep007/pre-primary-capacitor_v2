-- Drop old staff policies
DROP POLICY IF EXISTS "Staff read access" ON public.staff;
DROP POLICY IF EXISTS "Staff update access" ON public.staff;
DROP POLICY IF EXISTS "Staff delete access" ON public.staff;
DROP POLICY IF EXISTS "Staff insert access" ON public.staff;

-- Create new staff policies
CREATE POLICY "Staff read access" ON public.staff
    FOR SELECT
    USING ((auth_user_id = auth.uid()) OR has_permission('staff.read'));

CREATE POLICY "Staff insert access" ON public.staff
    FOR INSERT
    WITH CHECK (has_permission('staff.write'));

CREATE POLICY "Staff update access" ON public.staff
    FOR UPDATE
    USING (has_permission('staff.write'));

CREATE POLICY "Staff delete access" ON public.staff
    FOR DELETE
    USING (has_permission('staff.delete'));

-- Drop old students policies
DROP POLICY IF EXISTS "Students read access" ON public.students;
DROP POLICY IF EXISTS "Students update access" ON public.students;
DROP POLICY IF EXISTS "Students delete access" ON public.students;
DROP POLICY IF EXISTS "Students insert access" ON public.students;

-- Create new students policies
CREATE POLICY "Students read access" ON public.students
    FOR SELECT
    USING ((auth_parent_id = auth.uid()) OR has_permission('students.read'));

CREATE POLICY "Students insert access" ON public.students
    FOR INSERT
    WITH CHECK (has_permission('students.write'));

CREATE POLICY "Students update access" ON public.students
    FOR UPDATE
    USING (has_permission('students.write'));

CREATE POLICY "Students delete access" ON public.students
    FOR DELETE
    USING (has_permission('students.delete'));

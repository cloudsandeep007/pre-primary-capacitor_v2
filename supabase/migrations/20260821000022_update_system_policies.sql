-- Drop old policies
DROP POLICY IF EXISTS "Super admin manage role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Super admin manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Super admin manage roles" ON public.roles;

-- Recreate with system.write
CREATE POLICY "Super admin manage role_permissions" ON public.role_permissions
    FOR ALL
    USING (has_permission('system.write'));

CREATE POLICY "Super admin manage user_roles" ON public.user_roles
    FOR ALL
    USING (has_permission('system.write'));

CREATE POLICY "Super admin manage permissions" ON public.permissions
    FOR ALL
    USING (has_permission('system.write'));

CREATE POLICY "Super admin manage roles" ON public.roles
    FOR ALL
    USING (has_permission('system.write'));

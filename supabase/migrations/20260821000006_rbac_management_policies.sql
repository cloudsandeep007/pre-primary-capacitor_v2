-- ==============================================================================
-- Phase 6: RBAC Management Policies
-- ==============================================================================

-- 1. Policies for `permissions`
-- Only super admins can insert, update, or delete permissions.
-- (Everyone can read permissions, as they are used in the UI)
DROP POLICY IF EXISTS "Public read permissions" ON public.permissions;
CREATE POLICY "Public read permissions" ON public.permissions FOR SELECT USING (true);

CREATE POLICY "Super admin manage permissions" ON public.permissions FOR ALL
USING ( public.has_permission('system.manage') );

-- 2. Policies for `roles`
DROP POLICY IF EXISTS "Public read roles" ON public.roles;
CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);

CREATE POLICY "Super admin manage roles" ON public.roles FOR ALL
USING ( public.has_permission('system.manage') );

-- 3. Policies for `role_permissions`
DROP POLICY IF EXISTS "Public read role_permissions" ON public.role_permissions;
CREATE POLICY "Public read role_permissions" ON public.role_permissions FOR SELECT USING (true);

CREATE POLICY "Super admin manage role_permissions" ON public.role_permissions FOR ALL
USING ( public.has_permission('system.manage') );

-- 4. Policies for `user_roles`
DROP POLICY IF EXISTS "Public read user_roles" ON public.user_roles;
CREATE POLICY "Public read user_roles" ON public.user_roles FOR SELECT USING (true);

CREATE POLICY "Super admin manage user_roles" ON public.user_roles FOR ALL
USING ( public.has_permission('system.manage') );

-- 5. Helper RPC to safely assign a role to a user (handles updates vs inserts)
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, target_role_id uuid)
RETURNS void AS $$
BEGIN
  -- Verify caller has system.manage
  IF NOT public.has_permission('system.manage') THEN
    RAISE EXCEPTION 'Access Denied: Requires system.manage permission';
  END IF;

  -- Delete existing role assignment
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insert new role assignment if a role was provided
  IF target_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (target_user_id, target_role_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

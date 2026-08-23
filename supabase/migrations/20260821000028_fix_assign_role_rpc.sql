-- Fix assign_user_role permission check
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, target_role_id uuid)
RETURNS void AS $$
BEGIN
  -- Verify caller has system.write (updated from legacy system.manage)
  IF NOT public.has_permission('system.write') THEN
    RAISE EXCEPTION 'Access Denied: Requires system.write permission';
  END IF;

  -- Delete existing role assignment
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insert new if not null
  IF target_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (target_user_id, target_role_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

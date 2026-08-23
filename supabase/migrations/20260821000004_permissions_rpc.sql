-- ==============================================================================
-- Phase 4: Frontend Permission RPC
-- ==============================================================================

-- Create a secure RPC function so the frontend can easily fetch the active
-- user's flattened list of permissions without making complex joins.
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

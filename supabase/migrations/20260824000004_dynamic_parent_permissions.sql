-- Update get_my_permissions to automatically grant parent role permissions 
-- to users who are linked in the parents table, without requiring a direct user_roles mapping.
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = auth.uid()
  UNION
  SELECT DISTINCT p.name
  FROM public.role_permissions rp
  JOIN public.permissions p ON rp.permission_id = p.id
  JOIN public.roles r ON rp.role_id = r.id
  WHERE r.name = 'parent' 
  AND EXISTS (SELECT 1 FROM public.parents WHERE auth_user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid() 
      AND p.name = permission_name
  ) OR EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.name = 'parent' 
      AND p.name = permission_name
      AND EXISTS (SELECT 1 FROM public.parents WHERE auth_user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


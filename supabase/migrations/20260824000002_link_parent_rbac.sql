-- Update verify_and_link_parent to also sync RBAC (user_profiles and user_roles)
CREATE OR REPLACE FUNCTION public.verify_and_link_parent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- runs as postgres, bypassing RLS
AS $$
DECLARE
    v_parent_id uuid;
    v_user_email text;
    v_role_parent uuid;
BEGIN
    -- Extract the verified email from the current user's JWT
    v_user_email := auth.jwt()->>'email';
    
    IF v_user_email IS NULL THEN
        RETURN false;
    END IF;

    -- Find the parent record created by the school
    SELECT id INTO v_parent_id FROM public.parents WHERE email = v_user_email;
    
    IF v_parent_id IS NOT NULL THEN
        -- Link the newly created Supabase auth user to the parent record
        UPDATE public.parents SET auth_user_id = auth.uid() WHERE id = v_parent_id;

        -- Ensure user_profiles exists
        INSERT INTO public.user_profiles (id, email) 
        VALUES (auth.uid(), v_user_email)
        ON CONFLICT (id) DO NOTHING;

        -- Find parent role
        SELECT id INTO v_role_parent FROM public.roles WHERE name = 'parent';

        -- Ensure user_roles exists
        IF v_role_parent IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (auth.uid(), v_role_parent)
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;

        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

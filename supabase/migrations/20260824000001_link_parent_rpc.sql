-- Create a function to verify and securely link the parent's Supabase auth ID
CREATE OR REPLACE FUNCTION public.verify_and_link_parent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- runs as postgres, bypassing RLS
AS $$
DECLARE
    v_parent_id uuid;
    v_user_email text;
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
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

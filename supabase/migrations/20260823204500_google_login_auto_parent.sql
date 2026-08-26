-- PHASE 2 Extension: Enhance verify_and_link_parent to auto-create parent from student's parent_email

CREATE OR REPLACE FUNCTION public.verify_and_link_parent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_id uuid;
    v_user_email text;
    v_student_id uuid;
    v_guardian_name text;
    v_parent_phone text;
BEGIN
    v_user_email := auth.jwt()->>'email';
    
    IF v_user_email IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Check if parent already exists in public.parents
    SELECT id INTO v_parent_id FROM public.parents WHERE email = v_user_email;
    
    IF v_parent_id IS NULL THEN
        -- 2. Check if they were onboarded via the System Core Parent Onboarding (stored in students.parent_email)
        SELECT id, guardian_name, parent_phone INTO v_student_id, v_guardian_name, v_parent_phone
        FROM public.students 
        WHERE parent_email = v_user_email 
        LIMIT 1;
        
        IF v_student_id IS NOT NULL THEN
            -- Create the parent record on the fly
            INSERT INTO public.parents (email, name, phone, auth_user_id)
            VALUES (v_user_email, COALESCE(v_guardian_name, 'Registered Parent'), v_parent_phone, auth.uid())
            RETURNING id INTO v_parent_id;
            
            -- Link to the student
            INSERT INTO public.student_parents (student_id, parent_id, relationship_type, is_primary)
            VALUES (v_student_id, v_parent_id, 'Guardian', true);
            
            -- Also link any other students that might share this parent_email
            INSERT INTO public.student_parents (student_id, parent_id, relationship_type, is_primary)
            SELECT id, v_parent_id, 'Guardian', false
            FROM public.students
            WHERE parent_email = v_user_email AND id != v_student_id
            ON CONFLICT DO NOTHING;

            RETURN true;
        END IF;
    ELSE
        -- Parent exists, just link their auth_user_id
        UPDATE public.parents SET auth_user_id = auth.uid() WHERE id = v_parent_id;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

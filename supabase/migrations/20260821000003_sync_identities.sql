-- ==============================================================================
-- Phase 2: Identity Syncing (Shadow Migration)
-- ==============================================================================

DO $$
DECLARE
  staff_rec RECORD;
  student_rec RECORD;
  new_user_id UUID;
  temp_password TEXT := 'Samsidh@123';
  encrypted_pw TEXT;
  role_super_admin UUID;
  role_principal UUID;
  role_teacher UUID;
  role_gate UUID;
  role_parent UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO role_super_admin FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO role_principal FROM public.roles WHERE name = 'principal';
  SELECT id INTO role_teacher FROM public.roles WHERE name = 'teacher';
  SELECT id INTO role_gate FROM public.roles WHERE name = 'gate';
  SELECT id INTO role_parent FROM public.roles WHERE name = 'parent';

  -- Encrypt the temporary password
  encrypted_pw := extensions.crypt(temp_password, extensions.gen_salt('bf'));

  -- Loop through Staff
  FOR staff_rec IN SELECT * FROM public.staff WHERE auth_user_id IS NULL LOOP
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      role, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', staff_rec.email, encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      'authenticated', '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id, new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', staff_rec.email),
      'email', now(), now(), now()
    );

    UPDATE public.staff SET auth_user_id = new_user_id WHERE id = staff_rec.id;

    INSERT INTO public.user_profiles (id, first_name, email)
    VALUES (new_user_id, staff_rec.name, staff_rec.email);

    IF staff_rec.role = 'admin' THEN
      INSERT INTO public.user_roles (user_id, role_id) VALUES (new_user_id, role_super_admin);
    ELSIF staff_rec.role = 'principal' THEN
      INSERT INTO public.user_roles (user_id, role_id) VALUES (new_user_id, role_principal);
    ELSIF staff_rec.role = 'gate' THEN
      INSERT INTO public.user_roles (user_id, role_id) VALUES (new_user_id, role_gate);
    ELSE
      INSERT INTO public.user_roles (user_id, role_id) VALUES (new_user_id, role_teacher);
    END IF;

  END LOOP;

  -- Loop through Students (Parents)
  FOR student_rec IN SELECT * FROM public.students WHERE auth_parent_id IS NULL LOOP
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      role, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'parent_' || student_rec.roll_no || '@samsidh.local', encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      'authenticated', '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_user_id, new_user_id::text,
      jsonb_build_object('sub', new_user_id::text, 'email', 'parent_' || student_rec.roll_no || '@samsidh.local'),
      'email', now(), now(), now()
    );

    UPDATE public.students SET auth_parent_id = new_user_id WHERE id = student_rec.id;

    INSERT INTO public.user_profiles (id, first_name, phone)
    VALUES (new_user_id, student_rec.guardian_name, student_rec.parent_phone);

    INSERT INTO public.user_roles (user_id, role_id) VALUES (new_user_id, role_parent);

  END LOOP;

END $$;

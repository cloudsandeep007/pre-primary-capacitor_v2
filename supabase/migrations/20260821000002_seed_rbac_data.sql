-- ==============================================================================
-- RBAC Architecture Seed Data
-- ==============================================================================

-- 1. Insert Base Roles
INSERT INTO public.roles (name, display_name, description) VALUES
  ('super_admin', 'Super Admin', 'Full system access and RBAC management'),
  ('principal', 'Principal', 'School administrator with full academic and staff access'),
  ('teacher', 'Teacher', 'Academic staff managing assigned classes and students'),
  ('gate', 'Gate Staff', 'Security personnel managing entry and exit'),
  ('parent', 'Parent', 'Guardian of enrolled students')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Granular Permissions
INSERT INTO public.permissions (name, module, description) VALUES
  -- System & RBAC
  ('system.manage', 'system', 'Manage users, roles, and permissions'),
  
  -- Staff
  ('staff.view', 'staff', 'View staff directory'),
  ('staff.manage', 'staff', 'Add, edit, or remove staff members'),
  
  -- Students
  ('students.view', 'students', 'View student profiles'),
  ('students.edit', 'students', 'Edit student profiles and onboarding'),
  
  -- Attendance
  ('attendance.view', 'attendance', 'View student attendance'),
  ('attendance.edit', 'attendance', 'Mark or modify student attendance'),
  
  -- Daily Logs
  ('dailylogs.view', 'dailylogs', 'View daily logs (meals, naps, moods)'),
  ('dailylogs.edit', 'dailylogs', 'Create or modify daily logs'),
  
  -- Academics (Classwork, Homework, Grades)
  ('academics.view', 'academics', 'View classwork, homework, and grades'),
  ('academics.edit', 'academics', 'Create, grade, or modify academic records'),
  
  -- Communication
  ('communication.view', 'communication', 'View announcements and messages'),
  ('communication.manage', 'communication', 'Create or delete announcements'),
  
  -- Gate Passes
  ('gate.scan', 'gate', 'Scan and approve gate passes'),
  ('gate.request', 'gate', 'Request a new gate pass'),
  
  -- Finance/Fees (Future modules)
  ('finance.view', 'finance', 'View fee payments and structures'),
  ('finance.manage', 'finance', 'Collect fees and issue refunds')
ON CONFLICT (name) DO NOTHING;

-- 3. Assign Permissions to Roles

-- Helper variables for IDs
DO $$
DECLARE
  role_super_admin UUID;
  role_principal UUID;
  role_teacher UUID;
  role_gate UUID;
  role_parent UUID;
BEGIN
  SELECT id INTO role_super_admin FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO role_principal FROM public.roles WHERE name = 'principal';
  SELECT id INTO role_teacher FROM public.roles WHERE name = 'teacher';
  SELECT id INTO role_gate FROM public.roles WHERE name = 'gate';
  SELECT id INTO role_parent FROM public.roles WHERE name = 'parent';

  -- Super Admin gets EVERYTHING
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_super_admin, id FROM public.permissions
  ON CONFLICT DO NOTHING;

  -- Principal gets everything EXCEPT system.manage (maybe they shouldn't change RBAC)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_principal, id FROM public.permissions WHERE name != 'system.manage'
  ON CONFLICT DO NOTHING;

  -- Teacher gets academic, logs, students, and communication
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_teacher, id FROM public.permissions 
  WHERE name IN (
    'students.view', 'attendance.view', 'attendance.edit', 
    'dailylogs.view', 'dailylogs.edit', 'academics.view', 'academics.edit',
    'communication.view', 'staff.view'
  )
  ON CONFLICT DO NOTHING;

  -- Gate gets only gate scanning
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_gate, id FROM public.permissions 
  WHERE name IN ('gate.scan', 'students.view')
  ON CONFLICT DO NOTHING;

  -- Parent gets specific view access + gate requests
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_parent, id FROM public.permissions 
  WHERE name IN (
    'students.view', 'attendance.view', 'dailylogs.view', 
    'academics.view', 'communication.view', 'gate.request'
  )
  ON CONFLICT DO NOTHING;

END $$;

-- Migration: 20260821000021_restructure_rbac_and_status.sql
-- Description: Adds is_active to staff, replaces old permissions with 42 granular read/write/delete permissions.

-- 1. Add is_active to staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create the 42 new permissions
CREATE TEMP TABLE temp_new_perms (name text, module text, description text);

INSERT INTO temp_new_perms (name, module, description) VALUES
('students.read', 'students', 'View student profiles and directory'),
('students.write', 'students', 'Add or modify student records'),
('students.delete', 'students', 'Delete student records'),
('staff.read', 'staff', 'View staff directory'),
('staff.write', 'staff', 'Add or modify staff accounts and status'),
('staff.delete', 'staff', 'Delete staff accounts'),
('classes.read', 'classes', 'View curriculum and class setup'),
('classes.write', 'classes', 'Modify curriculum and class setup'),
('classes.delete', 'classes', 'Delete classes and curriculum items'),
('attendance.read', 'attendance', 'View daily attendance'),
('attendance.write', 'attendance', 'Mark or modify daily attendance'),
('attendance.delete', 'attendance', 'Delete attendance records'),
('dailylogs.read', 'dailylogs', 'View daily activity logs (meals, naps, photos)'),
('dailylogs.write', 'dailylogs', 'Create or modify daily activity logs'),
('dailylogs.delete', 'dailylogs', 'Delete daily activity logs'),
('homework.read', 'homework', 'View homework assignments and replies'),
('homework.write', 'homework', 'Create or modify homework assignments'),
('homework.delete', 'homework', 'Delete homework assignments'),
('classwork.read', 'classwork', 'View classwork posts'),
('classwork.write', 'classwork', 'Create or modify classwork posts'),
('classwork.delete', 'classwork', 'Delete classwork posts'),
('performance.read', 'performance', 'View student performance and grades'),
('performance.write', 'performance', 'Enter or modify student grades'),
('performance.delete', 'performance', 'Delete student grades'),
('reports.read', 'reports', 'View student reports'),
('reports.write', 'reports', 'Generate or modify student reports'),
('reports.delete', 'reports', 'Delete student reports'),
('announcements.read', 'announcements', 'View school-wide announcements'),
('announcements.write', 'announcements', 'Create or modify announcements'),
('announcements.delete', 'announcements', 'Delete announcements'),
('events.read', 'events', 'View school calendar and events'),
('events.write', 'events', 'Create or modify school events'),
('events.delete', 'events', 'Delete school events'),
('gatepasses.read', 'gatepasses', 'View gate pass requests'),
('gatepasses.write', 'gatepasses', 'Request, approve, or scan gate passes'),
('gatepasses.delete', 'gatepasses', 'Delete gate passes'),
('finance.read', 'finance', 'View fee management and payments'),
('finance.write', 'finance', 'Modify fee management and payments'),
('finance.delete', 'finance', 'Delete finance records'),
('system.read', 'system', 'View system settings and logs'),
('system.write', 'system', 'Modify system settings and RBAC'),
('system.delete', 'system', 'Delete system records and audit logs');

INSERT INTO public.permissions (name, module, description)
SELECT name, module, description FROM temp_new_perms
ON CONFLICT (name) DO NOTHING;

-- 3. Remap existing role permissions
DO $$
DECLARE
  role_rec RECORD;
  old_perm text;
  new_perm text;
BEGIN
  CREATE TEMP TABLE perm_mapping (old_p text, new_p text);
  
  INSERT INTO perm_mapping VALUES ('students.view', 'students.read');
  INSERT INTO perm_mapping VALUES ('students.edit', 'students.write'), ('students.edit', 'students.delete');
  
  INSERT INTO perm_mapping VALUES ('attendance.view', 'attendance.read');
  INSERT INTO perm_mapping VALUES ('attendance.edit', 'attendance.write'), ('attendance.edit', 'attendance.delete');
  
  INSERT INTO perm_mapping VALUES ('dailylogs.view', 'dailylogs.read');
  INSERT INTO perm_mapping VALUES ('dailylogs.edit', 'dailylogs.write'), ('dailylogs.edit', 'dailylogs.delete');
  
  INSERT INTO perm_mapping VALUES ('academics.view', 'homework.read'), ('academics.view', 'classwork.read'), ('academics.view', 'performance.read'), ('academics.view', 'reports.read'), ('academics.view', 'classes.read');
  INSERT INTO perm_mapping VALUES ('academics.edit', 'homework.write'), ('academics.edit', 'homework.delete'), ('academics.edit', 'classwork.write'), ('academics.edit', 'classwork.delete'), ('academics.edit', 'performance.write'), ('academics.edit', 'performance.delete'), ('academics.edit', 'reports.write'), ('academics.edit', 'reports.delete'), ('academics.edit', 'classes.write'), ('academics.edit', 'classes.delete');
  
  INSERT INTO perm_mapping VALUES ('communication.view', 'announcements.read');
  INSERT INTO perm_mapping VALUES ('communication.manage', 'announcements.write'), ('communication.manage', 'announcements.delete'), ('communication.manage', 'events.write'), ('communication.manage', 'events.delete'), ('communication.view', 'events.read');
  
  INSERT INTO perm_mapping VALUES ('gate.request', 'gatepasses.read'), ('gate.request', 'gatepasses.write'), ('gate.scan', 'gatepasses.read'), ('gate.scan', 'gatepasses.write');
  
  INSERT INTO perm_mapping VALUES ('finance.view', 'finance.read');
  INSERT INTO perm_mapping VALUES ('finance.manage', 'finance.write'), ('finance.manage', 'finance.delete');
  
  INSERT INTO perm_mapping VALUES ('staff.view', 'staff.read');
  INSERT INTO perm_mapping VALUES ('staff.manage', 'staff.write'), ('staff.manage', 'staff.delete');
  
  INSERT INTO perm_mapping VALUES ('system.manage', 'system.read'), ('system.manage', 'system.write'), ('system.manage', 'system.delete');

  FOR role_rec IN (SELECT id FROM public.roles) LOOP
    FOR old_perm, new_perm IN (
      SELECT pm.old_p, pm.new_p 
      FROM perm_mapping pm
      JOIN public.permissions p_old ON p_old.name = pm.old_p
      JOIN public.role_permissions rp ON rp.permission_id = p_old.id AND rp.role_id = role_rec.id
    ) LOOP
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT role_rec.id, p_new.id
      FROM public.permissions p_new
      WHERE p_new.name = new_perm
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  
  DROP TABLE perm_mapping;
END;
$$;

-- 4. Delete the old 17 permissions
DELETE FROM public.permissions WHERE name IN (
  'students.view', 'students.edit',
  'attendance.view', 'attendance.edit',
  'dailylogs.view', 'dailylogs.edit',
  'academics.view', 'academics.edit',
  'finance.view', 'finance.manage',
  'communication.view', 'communication.manage',
  'gate.request', 'gate.scan',
  'staff.view', 'staff.manage',
  'system.manage'
);

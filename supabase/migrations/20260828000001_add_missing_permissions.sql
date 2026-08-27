-- ============================================================
-- Migration: 20260828000001_add_missing_permissions.sql
-- Purpose  : Add missing permission records that exist in the
--            frontend but were never seeded into the permissions
--            table. This is purely ADDITIVE — no existing rows
--            are modified.
-- ============================================================

-- Admissions permissions
INSERT INTO public.permissions (name, module, description)
VALUES
  ('admissions.read',   'admissions', 'View admission requests and applications'),
  ('admissions.write',  'admissions', 'Process and manage admission requests'),
  ('admissions.delete', 'admissions', 'Delete admission records')
ON CONFLICT (name) DO NOTHING;

-- Complaints permissions
INSERT INTO public.permissions (name, module, description)
VALUES
  ('complaints.read',   'complaints', 'View parent and staff complaints'),
  ('complaints.write',  'complaints', 'Respond to and manage complaints'),
  ('complaints.delete', 'complaints', 'Delete complaint records')
ON CONFLICT (name) DO NOTHING;

-- Documents permissions
INSERT INTO public.permissions (name, module, description)
VALUES
  ('documents.read',   'documents', 'View uploaded school documents'),
  ('documents.write',  'documents', 'Upload and manage school documents'),
  ('documents.delete', 'documents', 'Delete school documents')
ON CONFLICT (name) DO NOTHING;

-- Settings permissions
INSERT INTO public.permissions (name, module, description)
VALUES
  ('settings.read',  'settings', 'View school settings and configuration'),
  ('settings.write', 'settings', 'Modify school settings and configuration')
ON CONFLICT (name) DO NOTHING;

-- Fees-specific delete (finance module already exists; this is a granular sub-permission)
INSERT INTO public.permissions (name, module, description)
VALUES
  ('fees.read',   'fees', 'View fee categories and structures'),
  ('fees.write',  'fees', 'Create and edit fee categories and structures'),
  ('fees.delete', 'fees', 'Delete fee categories, structures and ledger entries')
ON CONFLICT (name) DO NOTHING;

-- Messages permissions (used in parent and staff communication)
INSERT INTO public.permissions (name, module, description)
VALUES
  ('messages.read',  'messages', 'View internal messages and notifications'),
  ('messages.write', 'messages', 'Send and manage messages')
ON CONFLICT (name) DO NOTHING;

-- Photos permissions (daily log photos visible to parents)
INSERT INTO public.permissions (name, module, description)
VALUES
  ('photos.read',   'photos', 'View student activity photos'),
  ('photos.write',  'photos', 'Upload and manage student activity photos'),
  ('photos.delete', 'photos', 'Delete student activity photos')
ON CONFLICT (name) DO NOTHING;

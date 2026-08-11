/*
# Onboarding, Photo Verification & Admin Schema Enhancements

1. Purpose
   Add photo fields for students, parents, and staff to support visual handover verification
   and staff profiles. Add role column to staff for Admin permissions.

2. Columns Added
   - `students`: `student_photo_url` (text), `parent_photo_url` (text), `parent_phone` (text)
   - `staff`: `photo_url` (text), `role` (text DEFAULT 'staff')
   - `gate_passes`: `student_photo_url` (text), `parent_photo_url` (text)

3. Storage & Policies
   Ensure RLS policies permit anon reads/writes for photos and activity tracking.
*/

-- Add photo and parent contact columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_photo_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_photo_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone text;

-- Add photo and role columns to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';

-- Add photo columns to gate_passes table
ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS student_photo_url text;
ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS parent_photo_url text;

-- Seed admin account if missing
INSERT INTO staff (email, password_hash, name, assigned_class, role)
SELECT 'admin@school.com', encode('admin123'::bytea, 'base64'), 'Principal Sharma', 'All', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'admin@school.com');

/*
====================================================================
SAMSIDH PRESCHOOL APP — COMPLETE SUPABASE DATABASE SETUP SCRIPT
====================================================================
Copy and paste this script into your Supabase Dashboard SQL Editor 
(https://supabase.com/dashboard/project/_/sql) and click "RUN".

This script:
1. Creates/Updates `staff`, `students`, `daily_logs` / `activity_logs`, and `gate_passes` tables.
2. Adds photo fields, phone numbers, and role columns.
3. Enables Row Level Security (RLS) with open anon policies.
4. Enables Supabase Realtime for live updates across Parent & Staff portals.
5. Seeds initial demo staff and admin accounts (`admin@school.com` / `admin123`).
====================================================================
*/

-- 1. STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password text,
  name text NOT NULL DEFAULT 'Teacher',
  assigned_class text DEFAULT 'All',
  photo_url text,
  role text DEFAULT 'staff',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_class text DEFAULT 'All';

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_staff" ON staff;
CREATE POLICY "anon_read_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff" ON staff;
CREATE POLICY "anon_insert_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff" ON staff;
CREATE POLICY "anon_update_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff" ON staff;
CREATE POLICY "anon_delete_staff" ON staff FOR DELETE TO anon, authenticated USING (true);


-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no text,
  roll_number text,
  pin text NOT NULL DEFAULT '1234',
  name text NOT NULL,
  class_name text,
  class text,
  guardian_name text,
  parent_phone text,
  student_photo_url text,
  parent_photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_number text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_photo_url text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_photo_url text;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);


-- 3. DAILY LOGS / ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  staff_name text,
  meal_status text,
  nap_time text,
  mood text,
  teacher_notes text,
  photo_url text,
  media_items jsonb DEFAULT '[]'::jsonb,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  staff_name text,
  meal_status text,
  meal text,
  nap_time text,
  nap text,
  mood text,
  teacher_notes text,
  note text,
  photo_url text,
  media_items jsonb DEFAULT '[]'::jsonb,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_daily_logs" ON daily_logs;
CREATE POLICY "anon_all_daily_logs" ON daily_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_activity_logs" ON activity_logs;
CREATE POLICY "anon_all_activity_logs" ON activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 4. GATE PASSES TABLE
CREATE TABLE IF NOT EXISTS gate_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  roll_no text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  pickup_time timestamptz,
  approved_by_staff text,
  status text DEFAULT 'PENDING',
  pass_date date DEFAULT CURRENT_DATE,
  student_photo_url text,
  parent_photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS student_photo_url text;
ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS parent_photo_url text;
ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS approved_by_staff text;
ALTER TABLE gate_passes ADD COLUMN IF NOT EXISTS pickup_time timestamptz;

ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_gate_passes" ON gate_passes;
CREATE POLICY "anon_all_gate_passes" ON gate_passes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 5. ENABLE SUPABASE REALTIME REPLICATION FOR LIVE SYNC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gate_passes;
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE students;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Handle duplicate publication additions gracefully
  NULL;
END $$;


-- 6. SEED DEMO ACCOUNTS
INSERT INTO staff (email, password_hash, password, name, assigned_class, photo_url, role)
SELECT 'admin@school.com', encode('admin123'::bytea, 'base64'), 'admin123', 'Principal Sharma', 'All', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'admin@school.com');

INSERT INTO staff (email, password_hash, password, name, assigned_class, photo_url, role)
SELECT 'teacher@school.com', encode('teacher123'::bytea, 'base64'), 'teacher123', 'Ms. Priya', 'Nursery', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80', 'staff'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'teacher@school.com');

INSERT INTO staff (email, password_hash, password, name, assigned_class, photo_url, role)
SELECT 'lkg@school.com', encode('teacher123'::bytea, 'base64'), 'teacher123', 'Mrs. Sunita', 'Junior KG', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80', 'staff'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'lkg@school.com');

INSERT INTO staff (email, password_hash, password, name, assigned_class, photo_url, role)
SELECT 'ukg@school.com', encode('teacher123'::bytea, 'base64'), 'teacher123', 'Mr. Ramesh', 'Senior KG', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80', 'staff'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'ukg@school.com');

INSERT INTO students (roll_no, roll_number, pin, name, class_name, class, guardian_name, parent_phone, student_photo_url, parent_photo_url)
SELECT '101', '101', '1234', 'Aarav Sharma', 'Nursery', 'Nursery', 'Rahul Sharma', '+91 98765 43210', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = '101' OR roll_number = '101');

INSERT INTO students (roll_no, roll_number, pin, name, class_name, class, guardian_name, parent_phone, student_photo_url, parent_photo_url)
SELECT '102', '102', '1234', 'Diya Patel', 'Junior KG', 'Junior KG', 'Meera Patel', '+91 98765 12345', 'https://images.unsplash.com/photo-1595454038955-498d87741763?w=400&q=80', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = '102' OR roll_number = '102');

INSERT INTO students (roll_no, roll_number, pin, name, class_name, class, guardian_name, parent_phone, student_photo_url, parent_photo_url)
SELECT '103', '103', '1234', 'Kabir Singh', 'Senior KG', 'Senior KG', 'Anita Singh', '+91 98765 67890', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = '103' OR roll_number = '103');

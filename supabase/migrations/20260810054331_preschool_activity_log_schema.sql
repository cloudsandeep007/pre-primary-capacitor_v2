/*
# Preschool Daily Activity Log Schema

1. Purpose
   A preschool daily activity log app where staff log meals, naps, moods, notes,
   and photos for students, and parents view their child's daily report card.

2. New Tables
   - `staff`: school staff who log activities (email + password_hash). Staff authenticate
     by checking credentials against this table directly (no Supabase Auth) since the
     requirement is to validate against a 'staff' table with demo credentials.
   - `students`: children enrolled at the preschool. Each has roll_number, pin, name, class.
   - `activity_logs`: one row per activity entry (meal, nap, mood, note, photo) for a student.

3. Columns
   staff:
     - id (uuid pk)
     - email (text, unique)
     - password_hash (text) — simple hash for demo (not production-grade; demo app)
     - name (text)
     - created_at (timestamptz)
   students:
     - id (uuid pk)
     - roll_number (int, unique)
     - pin (text 4-char) — parent login PIN
     - name (text)
     - class (text: Nursery / Junior KG / Senior KG)
     - guardian_name (text)
     - created_at (timestamptz)
   activity_logs:
     - id (uuid pk)
     - student_id (uuid fk -> students.id)
     - staff_id (uuid fk -> staff.id, nullable)
     - staff_name (text) — denormalized for display
     - meal (text nullable: 'finished' | 'half' | 'barely')
     - nap (text nullable: 'none' | '30min' | '1hour+')
     - mood (text nullable: 'happy' | 'energetic' | 'tearful')
     - note (text nullable)
     - photo_url (text nullable)
     - log_date (date) — the day this log pertains to (defaults to today)
     - created_at (timestamptz)

4. Security (RLS)
   This is a no-auth-via-Supabase-Auth app: staff and parents log in against custom tables,
   not auth.users. The frontend uses the anon key. Therefore all policies use
   TO anon, authenticated and the data is intentionally shared (it's a school-wide app,
   not per-user private data). RLS is enabled on all tables to follow best practice,
   with open CRUD policies for the anon-key client.

5. Storage
   A 'child-photos' storage bucket will be created (public read for parent portal to
   display photos; staff writes via anon key). Storage policies are set separately.

6. Notes
   - Demo staff row: teacher@school.com / teacher123 (stored as simple hash).
   - Demo students with roll numbers 101, 102, 103 and PINs 1234 each.
   - password_hash uses a simple reversible encoding for demo simplicity — this is a
     demo preschool app, not handling real sensitive data. In production, use Supabase Auth.
*/

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT 'Teacher',
  assigned_class text DEFAULT 'All',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_staff" ON staff;
CREATE POLICY "anon_read_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff" ON staff;
CREATE POLICY "anon_insert_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff" ON staff;
CREATE POLICY "anon_update_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff" ON staff;
CREATE POLICY "anon_delete_staff" ON staff FOR DELETE TO anon, authenticated USING (true);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number int UNIQUE NOT NULL,
  pin text NOT NULL DEFAULT '1234',
  name text NOT NULL,
  class text NOT NULL CHECK (class IN ('Nursery', 'Junior KG', 'Senior KG')),
  guardian_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text,
  meal text CHECK (meal IN ('finished', 'half', 'barely')),
  nap text CHECK (nap IN ('none', '30min', '1hour+')),
  mood text CHECK (mood IN ('happy', 'energetic', 'tearful')),
  note text,
  photo_url text,
  media_items jsonb DEFAULT '[]'::jsonb,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_activity_logs" ON activity_logs;
CREATE POLICY "anon_read_activity_logs" ON activity_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activity_logs" ON activity_logs;
CREATE POLICY "anon_insert_activity_logs" ON activity_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_activity_logs" ON activity_logs;
CREATE POLICY "anon_update_activity_logs" ON activity_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activity_logs" ON activity_logs;
CREATE POLICY "anon_delete_activity_logs" ON activity_logs FOR DELETE TO anon, authenticated USING (true);

-- Index for querying logs by student + date (the main dashboard/feed query)
CREATE INDEX IF NOT EXISTS idx_activity_logs_student_date ON activity_logs(student_id, log_date);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);

-- Insert demo staff with assigned classes
INSERT INTO staff (email, password_hash, name, assigned_class)
SELECT 'teacher@school.com', encode('teacher123'::bytea, 'base64'), 'Ms. Priya', 'Nursery'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'teacher@school.com');

INSERT INTO staff (email, password_hash, name, assigned_class)
SELECT 'lkg@school.com', encode('teacher123'::bytea, 'base64'), 'Mrs. Sunita', 'Junior KG'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'lkg@school.com');

INSERT INTO staff (email, password_hash, name, assigned_class)
SELECT 'ukg@school.com', encode('teacher123'::bytea, 'base64'), 'Mr. Ramesh', 'Senior KG'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'ukg@school.com');

INSERT INTO staff (email, password_hash, name, assigned_class)
SELECT 'admin@school.com', encode('admin123'::bytea, 'base64'), 'Principal Sharma', 'All'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'admin@school.com');

-- Insert demo students
INSERT INTO students (roll_number, pin, name, class, guardian_name)
SELECT 101, '1234', 'Aarav Sharma', 'Nursery', 'Rahul Sharma'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_number = 101);

INSERT INTO students (roll_number, pin, name, class, guardian_name)
SELECT 102, '1234', 'Diya Patel', 'Junior KG', 'Meera Patel'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_number = 102);

INSERT INTO students (roll_number, pin, name, class, guardian_name)
SELECT 103, '1234', 'Kabir Singh', 'Senior KG', 'Anita Singh'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_number = 103);

-- Insert a sample activity log for demo student 101 today
INSERT INTO activity_logs (student_id, staff_name, meal, nap, mood, note, log_date)
SELECT s.id, 'Ms. Priya', 'finished', '30min', 'happy', 'Had a wonderful day! Enjoyed finger painting and shared toys with friends.', CURRENT_DATE
FROM students s
WHERE s.roll_number = 101
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs al WHERE al.student_id = s.id AND al.log_date = CURRENT_DATE
  );

-- Gate Passes Table
CREATE TABLE IF NOT EXISTS gate_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  roll_no text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  pickup_time timestamptz,
  approved_by_staff text,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED')),
  pass_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_gate_passes" ON gate_passes;
CREATE POLICY "anon_all_gate_passes" ON gate_passes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

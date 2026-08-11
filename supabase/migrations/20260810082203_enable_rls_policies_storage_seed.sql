/*
# Enable RLS, add policies, storage bucket, and seed data

1. Purpose
   The database has pre-existing tables (staff, students, daily_logs) with no RLS.
   This migration enables RLS, adds anon-accessible CRUD policies (no-auth app using
   anon key), creates the child-photos storage bucket with policies, adds a
   staff_name column to daily_logs for display, and seeds missing demo data.

2. Tables affected
   - staff: enable RLS + 4 CRUD policies (anon, authenticated)
   - students: enable RLS + 4 CRUD policies
   - daily_logs: enable RLS + 4 CRUD policies, ADD staff_name column

3. Storage
   - Create 'child-photos' public bucket
   - Add SELECT/INSERT/DELETE policies for anon, authenticated

4. Seed data
   - Add a Senior KG student (roll 103) if missing
   - Add a sample daily_logs entry for student 101 today

5. Security
   Open policies (TO anon, authenticated) are appropriate because this is a
   school-wide app with no Supabase Auth — the frontend uses the anon key.
*/

-- Enable RLS on all tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Staff policies
DROP POLICY IF EXISTS "anon_read_staff" ON staff;
CREATE POLICY "anon_read_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff" ON staff;
CREATE POLICY "anon_insert_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff" ON staff;
CREATE POLICY "anon_update_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff" ON staff;
CREATE POLICY "anon_delete_staff" ON staff FOR DELETE TO anon, authenticated USING (true);

-- Students policies
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- Add staff_name column to daily_logs for display in parent feed
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS staff_name text;

-- Daily logs policies
DROP POLICY IF EXISTS "anon_read_daily_logs" ON daily_logs;
CREATE POLICY "anon_read_daily_logs" ON daily_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_daily_logs" ON daily_logs;
CREATE POLICY "anon_insert_daily_logs" ON daily_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_daily_logs" ON daily_logs;
CREATE POLICY "anon_update_daily_logs" ON daily_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_daily_logs" ON daily_logs;
CREATE POLICY "anon_delete_daily_logs" ON daily_logs FOR DELETE TO anon, authenticated USING (true);

-- Create child-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('child-photos', 'child-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "anon_read_child_photos" ON storage.objects;
CREATE POLICY "anon_read_child_photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'child-photos');

DROP POLICY IF EXISTS "anon_insert_child_photos" ON storage.objects;
CREATE POLICY "anon_insert_child_photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'child-photos');

DROP POLICY IF EXISTS "anon_delete_child_photos" ON storage.objects;
CREATE POLICY "anon_delete_child_photos" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'child-photos');

-- Seed: add Senior KG student if missing
INSERT INTO students (roll_no, pin, name, class_name)
SELECT '103', '1234', 'Kabir Singh', 'Senior KG'
WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = '103');

-- Seed: sample daily log for student 101 today
INSERT INTO daily_logs (student_id, staff_name, meal_status, nap_time, mood, teacher_notes, log_date)
SELECT s.id, 'Priya Teacher', 'finished', '30min', 'happy', 'Had a wonderful day! Enjoyed finger painting and shared toys with friends.', CURRENT_DATE
FROM students s
WHERE s.roll_no = '101'
  AND NOT EXISTS (
    SELECT 1 FROM daily_logs dl WHERE dl.student_id = s.id AND dl.log_date = CURRENT_DATE
  );

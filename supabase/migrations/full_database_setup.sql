-- ============================================================
-- SAMSIDH INTERNATIONAL SCHOOL — COMPLETE DATABASE BACKUP
-- Generated: 2026-08-13
-- Run this entire file in Supabase SQL Editor to rebuild DB from scratch
-- ============================================================

-- ─── EXTENSIONS ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── STAFF TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  assigned_class TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('staff','admin','gate_staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column if table already exists
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';

-- ─── STUDENTS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  roll_no TEXT UNIQUE NOT NULL,
  roll_number TEXT,
  pin TEXT DEFAULT '1234',
  class_name TEXT NOT NULL,
  guardian_name TEXT,
  parent_phone TEXT,
  student_photo_url TEXT,
  parent_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DAILY LOGS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  staff_name TEXT,
  meal_status TEXT CHECK (meal_status IN ('finished','half','barely')),
  nap_time TEXT CHECK (nap_time IN ('none','30min','1hour+')),
  mood TEXT CHECK (mood IN ('happy','energetic','tearful')),
  teacher_notes TEXT,
  photo_url TEXT,
  media_items JSONB DEFAULT '[]',
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GATE PASSES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gate_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','COMPLETED')),
  pickup_time TIMESTAMPTZ,
  approved_by_staff TEXT,
  pass_date DATE NOT NULL DEFAULT CURRENT_DATE,
  student_photo_url TEXT,
  parent_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANNOUNCEMENTS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  staff_name TEXT,
  staff_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANNOUNCEMENT REPLIES TABLE ───────────────────────────────
CREATE TABLE IF NOT EXISTS announcement_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent','teacher')),
  sender_name TEXT,
  student_id TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOMEWORK TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homework (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  staff_name TEXT,
  staff_id TEXT,
  title TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  due_date DATE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOMEWORK REPLIES TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS homework_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent','teacher')),
  sender_name TEXT,
  student_id TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCHOOL EVENTS / CALENDAR TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS school_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'event' CHECK (event_type IN ('holiday','event','exam','activity')),
  description TEXT,
  class_name TEXT DEFAULT 'All',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES (allow public read/write for app anon key) ──
DO $$ BEGIN
  -- staff
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff' AND policyname='public read staff') THEN
    CREATE POLICY "public read staff" ON staff FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff' AND policyname='public write staff') THEN
    CREATE POLICY "public write staff" ON staff FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff' AND policyname='public update staff') THEN
    CREATE POLICY "public update staff" ON staff FOR UPDATE USING (true);
  END IF;

  -- students
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='public read students') THEN
    CREATE POLICY "public read students" ON students FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='public write students') THEN
    CREATE POLICY "public write students" ON students FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='public update students') THEN
    CREATE POLICY "public update students" ON students FOR UPDATE USING (true);
  END IF;

  -- daily_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_logs' AND policyname='public read daily_logs') THEN
    CREATE POLICY "public read daily_logs" ON daily_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_logs' AND policyname='public write daily_logs') THEN
    CREATE POLICY "public write daily_logs" ON daily_logs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_logs' AND policyname='public update daily_logs') THEN
    CREATE POLICY "public update daily_logs" ON daily_logs FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_logs' AND policyname='public delete daily_logs') THEN
    CREATE POLICY "public delete daily_logs" ON daily_logs FOR DELETE USING (true);
  END IF;

  -- gate_passes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gate_passes' AND policyname='public read gate_passes') THEN
    CREATE POLICY "public read gate_passes" ON gate_passes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gate_passes' AND policyname='public write gate_passes') THEN
    CREATE POLICY "public write gate_passes" ON gate_passes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gate_passes' AND policyname='public update gate_passes') THEN
    CREATE POLICY "public update gate_passes" ON gate_passes FOR UPDATE USING (true);
  END IF;

  -- announcements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='public read announcements') THEN
    CREATE POLICY "public read announcements" ON announcements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcements' AND policyname='public write announcements') THEN
    CREATE POLICY "public write announcements" ON announcements FOR INSERT WITH CHECK (true);
  END IF;

  -- announcement_replies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcement_replies' AND policyname='public read ann_replies') THEN
    CREATE POLICY "public read ann_replies" ON announcement_replies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='announcement_replies' AND policyname='public write ann_replies') THEN
    CREATE POLICY "public write ann_replies" ON announcement_replies FOR INSERT WITH CHECK (true);
  END IF;

  -- homework
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homework' AND policyname='public read homework') THEN
    CREATE POLICY "public read homework" ON homework FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homework' AND policyname='public write homework') THEN
    CREATE POLICY "public write homework" ON homework FOR INSERT WITH CHECK (true);
  END IF;

  -- homework_replies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homework_replies' AND policyname='public read hw_replies') THEN
    CREATE POLICY "public read hw_replies" ON homework_replies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homework_replies' AND policyname='public write hw_replies') THEN
    CREATE POLICY "public write hw_replies" ON homework_replies FOR INSERT WITH CHECK (true);
  END IF;

  -- school_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='school_events' AND policyname='public read events') THEN
    CREATE POLICY "public read events" ON school_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='school_events' AND policyname='public write events') THEN
    CREATE POLICY "public write events" ON school_events FOR INSERT WITH CHECK (true);
  END IF;

END $$;

-- ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gate_passes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE announcement_replies;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE homework;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE homework_replies;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE school_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── SEED: Sample school events (optional) ────────────────────
INSERT INTO school_events (title, event_date, event_type, description, class_name)
VALUES
  ('Independence Day', '2026-08-15', 'holiday', 'National Holiday', 'All'),
  ('Ganesh Chaturthi', '2026-08-27', 'holiday', 'School Closed', 'All'),
  ('Annual Sports Day', '2026-09-05', 'event', 'Fun sports activities for all students', 'All'),
  ('Parent Teacher Meeting', '2026-09-12', 'event', 'PTM for all classes', 'All'),
  ('Dussehra', '2026-10-02', 'holiday', 'School Closed', 'All'),
  ('Diwali Break', '2026-10-20', 'holiday', 'School Closed - Diwali Vacation', 'All'),
  ('Christmas', '2026-12-25', 'holiday', 'School Closed', 'All')
ON CONFLICT DO NOTHING;

-- ─── VERIFICATION ─────────────────────────────────────────────
SELECT 
  tablename,
  (SELECT count(*) FROM information_schema.columns c 
   WHERE c.table_name = t.tablename AND c.table_schema = 'public') AS column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

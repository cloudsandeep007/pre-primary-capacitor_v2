-- =========================================================================
-- Missing Tables Migration (Sourced directly from Production)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid not null default gen_random_uuid (),
  class_name text not null,
  staff_name text null,
  staff_id text null,
  title text not null,
  body text null,
  image_url text null,
  created_at timestamp with time zone null default now(),
  constraint announcements_pkey primary key (id)
);

CREATE TABLE IF NOT EXISTS public.announcement_replies (
  id uuid not null default gen_random_uuid (),
  announcement_id uuid null,
  sender_type text not null,
  sender_name text null,
  student_id text null,
  body text not null,
  created_at timestamp with time zone null default now(),
  constraint announcement_replies_pkey primary key (id),
  constraint announcement_replies_announcement_id_fkey foreign KEY (announcement_id) references announcements (id) on delete CASCADE,
  constraint announcement_replies_sender_type_check check (
    (sender_type = any (array['parent'::text, 'teacher'::text]))
  )
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid not null default gen_random_uuid (),
  student_id text not null,
  class_name text not null,
  date date not null default CURRENT_DATE,
  status text not null,
  created_at timestamp with time zone not null default now(),
  constraint attendance_pkey primary key (id),
  constraint attendance_student_date_unique unique (student_id, date),
  constraint attendance_status_check check (
    (status = any (array['present'::text, 'absent'::text, 'late'::text]))
  )
);

CREATE TABLE IF NOT EXISTS public.classwork (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  subject text not null,
  class_name text not null,
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone not null default now(),
  image_url text null,
  constraint classwork_pkey primary key (id)
);

CREATE TABLE IF NOT EXISTS public.daily_grades (
  id uuid not null default gen_random_uuid (),
  student_id text not null,
  class_name text not null,
  date date not null default CURRENT_DATE,
  cw_stars integer not null,
  hw_stars integer not null,
  activity_stars integer not null,
  teacher_notes text null,
  created_at timestamp with time zone not null default now(),
  constraint daily_grades_pkey primary key (id),
  constraint daily_grades_student_date_unique unique (student_id, date),
  constraint daily_grades_activity_stars_check check (((activity_stars >= 0) and (activity_stars <= 5))),
  constraint daily_grades_cw_stars_check check (((cw_stars >= 0) and (cw_stars <= 5))),
  constraint daily_grades_hw_stars_check check (((hw_stars >= 0) and (hw_stars <= 5)))
);

CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid not null default gen_random_uuid (),
  student_id uuid null,
  log_date date null default CURRENT_DATE,
  meal_status text null,
  nap_time text null,
  mood text null,
  photo_url text null,
  teacher_notes text null,
  created_at timestamp with time zone null default now(),
  staff_name text null,
  media_items jsonb null default '[]'::jsonb,
  constraint daily_logs_pkey primary key (id),
  constraint daily_logs_student_id_fkey foreign KEY (student_id) references students (id) on delete CASCADE
);

CREATE TABLE IF NOT EXISTS public.homework (
  id uuid not null default gen_random_uuid (),
  class_name text not null,
  staff_name text null,
  staff_id text null,
  title text not null,
  subject text null,
  description text null,
  due_date date null,
  attachment_url text null,
  created_at timestamp with time zone null default now(),
  constraint homework_pkey primary key (id)
);

CREATE TABLE IF NOT EXISTS public.homework_completions (
  id uuid not null default gen_random_uuid (),
  homework_id uuid not null,
  student_id text not null,
  completed_at timestamp with time zone not null default now(),
  constraint homework_completions_pkey primary key (id)
);

CREATE TABLE IF NOT EXISTS public.homework_replies (
  id uuid not null default gen_random_uuid (),
  homework_id uuid null,
  sender_type text not null,
  sender_name text null,
  student_id text null,
  body text not null,
  created_at timestamp with time zone null default now(),
  constraint homework_replies_pkey primary key (id),
  constraint homework_replies_homework_id_fkey foreign KEY (homework_id) references homework (id) on delete CASCADE,
  constraint homework_replies_sender_type_check check (
    (sender_type = any (array['parent'::text, 'teacher'::text]))
  )
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid not null default gen_random_uuid (),
  student_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone not null default now(),
  constraint push_subscriptions_pkey primary key (id)
);

CREATE TABLE IF NOT EXISTS public.school_events (
  id uuid not null default gen_random_uuid (),
  title text not null,
  event_date date not null,
  event_type text null default 'event'::text,
  description text null,
  class_name text null default 'All'::text,
  created_at timestamp with time zone null default now(),
  constraint school_events_pkey primary key (id),
  constraint school_events_event_type_check check (
    (event_type = any (array['holiday'::text, 'event'::text, 'exam'::text, 'activity'::text]))
  )
);

-- =========================================================================
-- Patch tables from previous migration (20260810054331) to match production
-- so that the next migration (20260810082203) succeeds.
-- =========================================================================

-- Patch students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_no text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_photo_url text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_photo_url text;

-- Populate dummy columns to satisfy future NOT NULL constraints
UPDATE public.students SET roll_no = roll_number::text WHERE roll_no IS NULL;
UPDATE public.students SET class_name = class WHERE class_name IS NULL;

-- Relax constraints that differ in production
ALTER TABLE public.students ALTER COLUMN roll_number DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN class DROP NOT NULL;

-- Patch staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password text;
UPDATE public.staff SET password = 'default_password' WHERE password IS NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS role text DEFAULT 'staff';
ALTER TABLE public.staff ALTER COLUMN password_hash DROP NOT NULL;

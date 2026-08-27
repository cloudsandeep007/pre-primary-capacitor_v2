-- ============================================================
-- Migration: 20260828000002_backfill_parents_from_students.sql
-- Purpose  : Backfill the public.parents table from existing
--            students.parent_email records.
--
--            Before this migration, the parents table was only
--            populated if a parent explicitly logged in via Google
--            and the verify_and_link_parent RPC found a match.
--            Since no match existed (parents table was empty),
--            all Google logins were failing.
--
--            This migration:
--            1. Inserts a parent row for every distinct parent_email
--               found in students, using the guardian_name and
--               parent_phone from the most recent student record
--               for that email (in case of siblings).
--            2. Links each parent to their student(s) via the
--               student_parents junction table.
--            3. Marks backfilled rows with a created_via_backfill
--               flag for easy identification/rollback.
--            4. Is fully IDEMPOTENT — safe to run multiple times.
-- ============================================================

-- Step 1: Add a backfill tracking column (safe, nullable)
ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS created_via_backfill BOOLEAN DEFAULT FALSE;

-- Step 2: Insert parent records from students table
-- Uses ON CONFLICT (email) DO NOTHING so existing parents are preserved.
INSERT INTO public.parents (email, name, phone, created_via_backfill)
SELECT DISTINCT ON (LOWER(TRIM(s.parent_email)))
  LOWER(TRIM(s.parent_email))          AS email,
  COALESCE(s.guardian_name, 'Parent')  AS name,
  s.parent_phone                        AS phone,
  TRUE                                  AS created_via_backfill
FROM public.students s
WHERE
  s.parent_email IS NOT NULL
  AND TRIM(s.parent_email) <> ''
ORDER BY
  LOWER(TRIM(s.parent_email)),
  s.id DESC  -- Tie-breaker for siblings; s.id is always present
ON CONFLICT (email) DO NOTHING;

-- Step 3: Link backfilled parents to their students via student_parents
INSERT INTO public.student_parents (student_id, parent_id, relationship_type, is_primary)
SELECT
  s.id                        AS student_id,
  p.id                        AS parent_id,
  'Guardian'                  AS relationship_type,
  TRUE                        AS is_primary
FROM public.students s
JOIN public.parents p
  ON LOWER(TRIM(s.parent_email)) = p.email
WHERE
  s.parent_email IS NOT NULL
  AND TRIM(s.parent_email) <> ''
ON CONFLICT (student_id, parent_id) DO NOTHING;

-- Step 4: Log the backfill result
DO $$
DECLARE
  v_parent_count  INTEGER;
  v_link_count    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_parent_count FROM public.parents WHERE created_via_backfill = TRUE;
  SELECT COUNT(*) INTO v_link_count   FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id WHERE p.created_via_backfill = TRUE;

  RAISE NOTICE 'Parent backfill complete: % parent records seeded, % student-parent links created.',
    v_parent_count, v_link_count;
END;
$$;

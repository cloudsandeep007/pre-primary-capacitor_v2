-- Enable Row Level Security (in case it wasn't already)
ALTER TABLE public.homework_completions ENABLE ROW LEVEL SECURITY;

-- Allow reading completions
-- 1. Read access
DROP POLICY IF EXISTS "anon_read_homework_completions" ON public.homework_completions;
CREATE POLICY "anon_read_homework_completions" ON public.homework_completions
  FOR SELECT TO anon, authenticated USING (true);

-- Allow inserting completions
-- 2. Insert access
DROP POLICY IF EXISTS "anon_insert_homework_completions" ON public.homework_completions;
CREATE POLICY "anon_insert_homework_completions" ON public.homework_completions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow deleting completions
-- 3. Delete access
DROP POLICY IF EXISTS "anon_delete_homework_completions" ON public.homework_completions;
CREATE POLICY "anon_delete_homework_completions" ON public.homework_completions
  FOR DELETE TO anon, authenticated USING (true);

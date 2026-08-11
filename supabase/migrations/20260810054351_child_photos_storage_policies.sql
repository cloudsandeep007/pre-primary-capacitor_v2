/*
# Storage policies for child-photos bucket

1. Purpose
   Allow anyone (anon + authenticated) to upload and read photos in the
   'child-photos' bucket. Staff upload activity photos; parents view them.

2. Security
   - Public read: parents and staff can view photos.
   - Public write: staff upload photos via the anon-key client.
   This is a school-wide demo app with no Supabase Auth, so open policies are appropriate.
*/

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

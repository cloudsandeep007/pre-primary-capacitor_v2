import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tjmssepezaphejljrjpr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqbXNzZXBlemFwaGVqbGpyanByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMzI1MjYsImV4cCI6MjEwMTkwODUyNn0.-8Z4IxYo0EWc85nNzPkD92rwCswO6SkzVxhuaJFzbIk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

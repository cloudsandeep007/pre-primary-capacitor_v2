# 07 Database Architecture

## Overview
The application uses PostgreSQL hosted on Supabase.

## Key Characteristics
- **No Supabase Auth:** We do NOT use `auth.users`. Staff and students are stored in public tables (`staff`, `students`).
- **UUID Primary Keys:** Most tables use `id uuid not null default gen_random_uuid()`.
- **Soft Deletes:** (UNKNOWN — REQUIRES VERIFICATION) Most tables appear to use hard deletes or omit delete functionality.
- **Row Level Security (RLS):** Enabled on tables, but heavily relies on `anon` and `authenticated` roles having wide access due to the lack of Supabase Auth sessions.

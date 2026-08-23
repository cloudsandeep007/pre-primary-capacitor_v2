/*
# Create Application Errors Table

1. Purpose
   Creates a centralized table to persist application-level errors and system telemetry securely.

2. Table: application_errors
   - id (uuid, primary key)
   - error_id (uuid, optional correlation id)
   - created_at (timestamptz)
   - level (text, e.g. ERROR, WARN, INFO)
   - event_name (text, e.g. ACTIVITY_SERVICE_CREATE_FAILED)
   - error_code (text, optional domain code)
   - screen (text, optional)
   - operation (text, optional)
   - resource (text, optional)
   - user_type (text, optional)
   - user_id (text, optional)
   - app_version (text, optional)
   - environment (text, optional)
   - error_message (text)
   - technical_details (text, optional)
   - metadata (jsonb, optional, scrubbed context)
   - resolved (boolean)
   - resolution_note (text, optional)
   - resolved_at (timestamptz, optional)

3. Security
   - Enable RLS
   - Allow 'anon' to INSERT rows (so frontend can log errors)
   - Block 'anon' from SELECT, UPDATE, DELETE (only DB admins can view logs)
*/

CREATE TABLE IF NOT EXISTS public.application_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    level TEXT NOT NULL,
    event_name TEXT NOT NULL,
    error_code TEXT,
    screen TEXT,
    operation TEXT,
    resource TEXT,
    user_type TEXT,
    user_id TEXT,
    app_version TEXT,
    environment TEXT,
    error_message TEXT NOT NULL,
    technical_details TEXT,
    metadata JSONB,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_errors_created_at ON public.application_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_errors_error_code ON public.application_errors(error_code);
CREATE INDEX IF NOT EXISTS idx_application_errors_level ON public.application_errors(level);
CREATE INDEX IF NOT EXISTS idx_application_errors_resolved ON public.application_errors(resolved) WHERE resolved = false;

-- Enable RLS
ALTER TABLE public.application_errors ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (frontend logger)
DROP POLICY IF EXISTS "Allow anonymous insert of application errors" ON public.application_errors;
CREATE POLICY "Allow anonymous insert of application errors" 
ON public.application_errors 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- No SELECT, UPDATE, DELETE policies for anon are created, 
-- ensuring normal users/frontend cannot read system logs.

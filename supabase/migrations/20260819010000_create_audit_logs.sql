/*
# Create Audit Logs Table

## Purpose
  A separate audit trail for important business actions performed by actors
  (staff, admin, parents, gate staff) in the application.

  This is DISTINCT from application_errors:
  - application_errors = "Something went wrong"
  - audit_logs         = "Someone performed an important action"

## Table: audit_logs
  id            - unique record id
  created_at    - when the action occurred
  actor_type    - who performed it: 'staff' | 'admin' | 'gate_staff' | 'parent' | 'system'
  actor_id      - the staff/student/user id (never a password or PIN)
  actor_name    - display name if available (e.g. "Ms. Priya")
  action        - what was done (e.g. STUDENT_CREATED, GATE_PASS_APPROVED)
  resource_type - what was affected (student, activity, gate_pass, etc.)
  resource_id   - the UUID or identifier of the affected record
  metadata      - safe JSON context (class_name, title, etc. — never passwords/PINs)

## Security
  - RLS enabled
  - anon INSERT allowed (app writes using anon key, same as application_errors)
  - anon SELECT allowed (for Admin/Diagnostics viewer)
  - No UPDATE or DELETE policies — audit records are immutable
  - The audit.ts utility redacts sensitive fields before INSERT
*/

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type    TEXT NOT NULL,
  actor_id      TEXT,
  actor_name    TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  metadata      JSONB
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id      ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource      ON public.audit_logs(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow the frontend (anon key) to write audit records
DROP POLICY IF EXISTS "Allow anon insert of audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon insert of audit_logs"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow the Admin/Diagnostics page to read audit records
-- Safe: the audit.ts utility strips passwords/PINs/tokens before INSERT
DROP POLICY IF EXISTS "Allow anon read of audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon read of audit_logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (true);

-- No UPDATE or DELETE policies intentionally omitted.
-- Audit records must be immutable once written.

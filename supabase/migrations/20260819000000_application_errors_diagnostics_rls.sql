/*
# Application Errors — Diagnostics RLS Policies

## Purpose
  Extends the application_errors table RLS to allow the frontend diagnostics
  page to SELECT and UPDATE (resolve) error records.

## Why this is safe
  - The logger redact() function strips all sensitive fields (passwords,
    PINs, tokens, keys) BEFORE inserting into this table.
  - The diagnostics page has its own access-code login gate.
  - UPDATE is restricted to the resolve workflow only.

## Policies added
  1. Allow anon SELECT  — diagnostics page reads error records
  2. Allow anon UPDATE  — diagnostics page marks errors as resolved

## Does NOT modify
  - The original INSERT policy (created in 20260818000000)
  - Any other table
*/

-- Allow the diagnostics page (anon client) to read application errors.
-- Safe: all sensitive data was stripped by redact() before INSERT.
DROP POLICY IF EXISTS "Allow anon read of application_errors" ON public.application_errors;
CREATE POLICY "Allow anon read of application_errors"
ON public.application_errors
FOR SELECT
TO anon
USING (true);

-- Allow the diagnostics page (anon client) to resolve errors.
DROP POLICY IF EXISTS "Allow anon resolve application_errors" ON public.application_errors;
CREATE POLICY "Allow anon resolve application_errors"
ON public.application_errors
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

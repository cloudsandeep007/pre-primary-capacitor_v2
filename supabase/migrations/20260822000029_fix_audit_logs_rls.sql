-- Fix Application Errors & Audit Logs RLS Policy to allow authenticated users

-- 1. Audit Logs Insert Policy
CREATE POLICY "Allow authenticated insert of audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Audit Logs Select Policy
CREATE POLICY "Allow authenticated read of audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

-- 3. Application Errors Insert Policy
CREATE POLICY "Allow authenticated insert of application errors"
ON public.application_errors
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Application Errors Select Policy
CREATE POLICY "Allow authenticated read of application errors"
ON public.application_errors
FOR SELECT
TO authenticated
USING (true);

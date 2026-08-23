import { supabase } from '@/lib/supabase';

export interface ApplicationError {
  id: string;
  error_id: string | null;
  created_at: string;
  level: string;
  event_name: string;
  error_code: string | null;
  screen: string | null;
  operation: string | null;
  resource: string | null;
  user_type: string | null;
  user_id: string | null;
  app_version: string | null;
  environment: string | null;
  error_message: string;
  technical_details: string | null;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolution_note: string | null;
  resolved_at: string | null;
}

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'checking';
  latencyMs?: number;
  message?: string;
}

export interface DiagnosticsHealth {
  database: HealthCheckResult;
  storage: HealthCheckResult;
  realtime: HealthCheckResult;
}

export interface AuditLog {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, any> | null;
}


class DiagnosticsService {
  /**
   * Fetches recent application errors from the last N hours.
   * Requires the "Allow anon read of application_errors" RLS policy
   * from migration 20260819000000_application_errors_diagnostics_rls.sql.
   */
  async fetchRecentErrors(hours = 48): Promise<{ data: ApplicationError[]; error: string | null }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('application_errors')
        .select(
          'id, error_id, created_at, level, event_name, error_code, screen, ' +
          'operation, resource, user_type, user_id, app_version, environment, ' +
          'error_message, technical_details, metadata, resolved, resolution_note, resolved_at'
        )
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return { data: [], error: error.message };
      return { data: (data as unknown as ApplicationError[]) || [], error: null };
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Marks an application error as resolved with an optional note.
   * Uses NOW() server-side for resolved_at to avoid trusting client clocks.
   */
  async resolveError(id: string, note: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('application_errors')
        .update({
          resolved: true,
          resolution_note: note.trim() || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Checks database connectivity with a lightweight round-trip.
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const { error } = await supabase
        .from('application_errors')
        .select('id')
        .limit(1);

      const latencyMs = Math.round(performance.now() - start);
      if (error) return { status: 'error', latencyMs, message: error.message };
      return { status: 'ok', latencyMs };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Checks Supabase Storage using the regular client list() API.
   * getBucket() is an admin-only API — this uses the anon-accessible storage client instead.
   */
  async checkStorage(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      // list('') lists root of bucket — works with anon key if bucket policies allow it
      const { data, error } = await supabase.storage
        .from('child-photos')
        .list('', { limit: 1 });
      const latencyMs = Math.round(performance.now() - start);
      if (error) return { status: 'error', latencyMs, message: error.message };
      return { status: 'ok', latencyMs, message: 'Bucket accessible' };
    } catch (err) {
      return { status: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Checks Supabase Realtime by subscribing to a test channel.
   * Resolves on first meaningful status, then cleans up asynchronously
   * to avoid the CLOSED status firing inside the same callback.
   */
  async checkRealtime(): Promise<HealthCheckResult> {
    const start = performance.now();
    return new Promise((resolve) => {
      let settled = false;

      const settle = (result: HealthCheckResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        // Remove channel AFTER resolving to prevent spurious CLOSED callback
        setTimeout(() => {
          try { supabase.removeChannel(channel); } catch (_) {}
        }, 100);
        resolve(result);
      };

      const timeout = setTimeout(() => {
        settle({ status: 'error', message: 'Realtime timeout after 6s' });
      }, 6000);

      const channel = supabase.channel('__diagnostics_hc__');
      channel.subscribe((status) => {
        const latencyMs = Math.round(performance.now() - start);
        if (status === 'SUBSCRIBED') {
          settle({ status: 'ok', latencyMs });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          settle({ status: 'error', latencyMs, message: `Channel status: ${status}` });
        }
        // CLOSED is ignored here — it fires after we remove the channel
      });
    });
  }

  /**
   * Runs all three health checks in parallel and returns combined results.
   */
  async runAllHealthChecks(): Promise<DiagnosticsHealth> {
    const [database, storage, realtime] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkRealtime(),
    ]);
    return { database, storage, realtime };
  }
  /**
   * Fetches recent audit log entries from the last N hours.
   * Requires the "Allow anon read of audit_logs" RLS policy
   * from migration 20260819010000_create_audit_logs.sql.
   */
  async fetchRecentAuditLogs(hours = 48): Promise<{ data: AuditLog[]; error: string | null }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, actor_type, actor_id, actor_name, action, resource_type, resource_id, metadata')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) return { data: [], error: error.message };
      return { data: (data as AuditLog[]) || [], error: null };
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const diagnosticsService = new DiagnosticsService();

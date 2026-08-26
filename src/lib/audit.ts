import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditActorType = 'staff' | 'admin' | 'gate_staff' | 'parent' | 'system';

export type AuditAction =
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'STAFF_CREATED'
  | 'STAFF_UPDATED'
  | 'GATE_PASS_APPROVED'
  | 'GATE_PASS_COMPLETED'
  | 'ACTIVITY_CREATED'
  | 'ACTIVITY_UPDATED'
  | 'ACTIVITY_DELETED'
  | 'HOMEWORK_CREATED'
  | 'ANNOUNCEMENT_CREATED'
  | 'ADMIN_LOGIN'
  | 'CLASS_CREATED'
  | 'CLASS_DELETED'
  | 'SYSTEM_UPDATED'
  | 'SETTINGS_CHANGED'
  | 'GOOGLE_LOGIN_SUCCESS'
  | 'GOOGLE_ACCOUNT_NOT_LINKED'
  | 'PARENT_FEEDBACK_SUBMITTED'
  | 'GOOGLE_REVIEW_LINK_OPENED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_ASSIGNED'
  | 'FEE_INVOICE_PRINTED'
  | 'FEE_PAYMENT_REVERSED'
  | 'FEE_REMINDER_SENT';

export type AuditResourceType =
  | 'student'
  | 'staff'
  | 'gate_pass'
  | 'activity'
  | 'homework'
  | 'announcement'
  | 'system'
  | 'classes'
  | 'school_settings'
  | 'parent'
  | 'feedback';

export interface AuditEntry {
  actor_type: AuditActorType;
  actor_id?: string;
  actor_name?: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string;
  /** Safe context only. Never include password, pin, token, key, secret. */
  metadata?: Record<string, unknown>;
}

// ─── Sensitive field redaction ────────────────────────────────────────────────
// Belt-and-suspenders safety: strip known sensitive keys before INSERT,
// in case a caller accidentally includes them.
const SENSITIVE_KEYS = new Set([
  'password', 'pin', 'token', 'secret', 'key', 'anonKey',
  'serviceKey', 'authorization', 'auth', 'credential', 'credentials',
]);

function redactMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      safe[k] = '[REDACTED]';
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

// ─── Core audit function ──────────────────────────────────────────────────────
/**
 * Write an audit record for an important business action.
 *
 * Rules:
 * 1. Fire-and-forget — never blocks the calling UI or service.
 * 2. Never throws — logging failure must never break the main operation.
 * 3. No recursive logging — we do not call auditLog from inside auditLog.
 * 4. Metadata is redacted before INSERT.
 */
export function auditLog(entry: AuditEntry): void {
  // Run fully asynchronously — do not await
  (async () => {
    try {
      let finalActorId = entry.actor_id ?? null;
      let finalActorName = entry.actor_name ?? null;

      // Auto-enrich actor details from the active session if missing
      if (!finalActorId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          finalActorId = session.user.id;
          finalActorName = finalActorName || session.user.user_metadata?.name || session.user.email || null;
        }
      }

      const record = {
        actor_type: entry.actor_type,
        actor_id: finalActorId,
        actor_name: finalActorName,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id ?? null,
        metadata: redactMetadata(entry.metadata) ?? null,
      };

      const { error } = await supabase.from('audit_logs').insert([record]);

      if (error) {
        // Intentional: only console.warn so we know it failed without cascading
        // This is the ONE place we allow a direct console call related to audit.
        console.warn('[audit] Failed to write audit record:', error.message, { action: entry.action });
      }
    } catch (err) {
      // Catch-all: never let audit failure propagate
      console.warn('[audit] Unexpected error writing audit record:', err);
    }
  })();
}

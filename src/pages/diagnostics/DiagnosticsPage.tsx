import { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle2, XCircle, RefreshCw,
  X, ShieldAlert, Clock, Code2,
  Database, Wifi, HardDrive, Eye, CheckCheck, Lock, Terminal,
  ClipboardList, User, BookOpen,
} from 'lucide-react';
import {
  diagnosticsService,
  ApplicationError,
  DiagnosticsHealth,
  HealthCheckResult,
  AuditLog,
} from '@/services/diagnosticsService';
import { APP_VERSION, ENVIRONMENT, SUPABASE_PROJECT_ID } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { usePermissions } from '@/contexts/PermissionContext';
import { RBACManager } from '../superadmin/RBACManager';
import { StaffOnboarding } from '../staff/StaffOnboarding';
import { ParentOnboarding } from '../parent/ParentOnboarding';
import { BulkOnboardTab } from './BulkOnboardTab';

export type DiagTab = 'overview' | 'errors' | 'audit' | 'rbac' | 'onboard-child' | 'onboard-staff' | 'bulk-onboard';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatTs(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function levelColor(level: string) {
  if (level === 'ERROR') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (level === 'WARN')  return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
}
function levelDot(level: string) {
  if (level === 'ERROR') return 'bg-rose-500';
  if (level === 'WARN')  return 'bg-amber-400';
  return 'bg-sky-400';
}
function actorColor(actorType: string) {
  if (actorType === 'admin')      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
  if (actorType === 'staff')      return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  if (actorType === 'gate_staff') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (actorType === 'parent')     return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}
function actionColor(action: string) {
  if (action.includes('DELETED'))  return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (action.includes('CREATED'))  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (action.includes('APPROVED')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  if (action.includes('UPDATED'))  return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (action.includes('LOGIN'))    return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
  return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
}

// â”€â”€â”€ Health Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HealthBadge({ result }: { result: HealthCheckResult }) {
  if (result.status === 'checking') return (
    <span className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
      <RefreshCw size={13} className="animate-spin" /> Checking...
    </span>
  );
  if (result.status === 'ok') return (
    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
      <CheckCircle2 size={14} />
      OK {result.latencyMs !== undefined && <span className="font-normal text-slate-500">({result.latencyMs}ms)</span>}
      {result.message && <span className="font-normal text-slate-500 ml-1">â€” {result.message}</span>}
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
      <XCircle size={14} />
      Error {result.message && <span className="font-normal ml-1">â€” {result.message}</span>}
    </span>
  );
}

// â”€â”€â”€ Error Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ErrorDetailDrawer({ error, onClose, onResolved }: {
  error: ApplicationError; onClose: () => void; onResolved: (id: string, note: string) => void;
}) {
  const [note, setNote]     = useState(error.resolution_note || '');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const handleResolve = async () => {
    setSaving(true); setSaveErr(null);
    const { error: err } = await diagnosticsService.resolveError(error.id, note);
    setSaving(false);
    if (err) setSaveErr(err); else { onResolved(error.id, note); onClose(); }
  };
  const safeMetadata = error.metadata ? JSON.stringify(error.metadata, null, 2) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto border-l border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Error Detail</p>
            <h2 className="font-mono font-bold text-slate-800 text-sm break-all">{error.event_name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0 mt-0.5"><X size={18} /></button>
        </div>
        <div className="flex-1 px-5 py-4 space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${levelColor(error.level)}`}>{error.level}</span>
            {error.resolved
              ? <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-emerald-50 border-emerald-200 text-emerald-700 flex items-center gap-1"><CheckCheck size={12} /> Resolved</span>
              : <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-50 border-rose-200 text-rose-700">Unresolved</span>}
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              ['Timestamp',   formatTs(error.created_at)],
              ['Error Code',  error.error_code  || 'â€”'],
              ['Screen',      error.screen       || 'â€”'],
              ['Operation',   error.operation    || 'â€”'],
              ['Resource',    error.resource     || 'â€”'],
              ['App Version', error.app_version  || 'â€”'],
              ['Environment', error.environment  || 'â€”'],
              ['User Type',   error.user_type    || 'â€”'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-xs text-slate-700 font-medium break-all">{value}</span>
              </div>
            ))}
            {error.metadata?.traceId && (
              <div className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-400 w-28 flex-shrink-0 pt-0.5">Trace ID</span>
                <span className="text-xs text-slate-700 font-mono break-all">{error.metadata.traceId}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Error Message</p>
            <p className="text-sm text-slate-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2.5 font-medium">{error.error_message}</p>
          </div>
          {error.technical_details && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Technical Details</p>
              <pre className="text-xs bg-slate-900 text-emerald-300 rounded-lg px-3 py-2.5 overflow-x-auto font-mono whitespace-pre-wrap">{error.technical_details}</pre>
            </div>
          )}
          {safeMetadata && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Metadata <span className="text-slate-400 font-normal normal-case">(pre-sanitized by logger)</span></p>
              <pre className="text-xs bg-slate-900 text-sky-300 rounded-lg px-3 py-2.5 overflow-x-auto font-mono whitespace-pre-wrap">{safeMetadata}</pre>
            </div>
          )}
          {!error.resolved && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5"><CheckCheck size={14} /> Mark as Resolved</p>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note (optional)" rows={3}
                className="w-full text-xs border border-amber-300 rounded-lg px-3 py-2 outline-none focus:border-amber-500 bg-white resize-none" />
              {saveErr && <p className="text-xs text-rose-600 font-semibold">{saveErr}</p>}
              <button onClick={handleResolve} disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                {saving ? 'Saving...' : 'Mark as Resolved'}
              </button>
            </div>
          )}
          {error.resolved && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5"><CheckCheck size={14} /> Resolved</p>
              {error.resolved_at && <p className="text-xs text-slate-500">At {formatTs(error.resolved_at)}</p>}
              {error.resolution_note && <p className="text-xs text-slate-700 mt-1">{error.resolution_note}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Audit Detail Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuditDetailDrawer({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const safeMetadata = log.metadata ? JSON.stringify(log.metadata, null, 2) : null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto border-l border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Audit Detail</p>
            <h2 className="font-mono font-bold text-slate-800 text-sm break-all">{log.action}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0 mt-0.5"><X size={18} /></button>
        </div>
        <div className="flex-1 px-5 py-4 space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${actionColor(log.action)}`}>{log.action}</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${actorColor(log.actor_type)}`}>{log.actor_type}</span>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              ['Timestamp',     formatTs(log.created_at)],
              ['Actor Name',    log.actor_name    || 'â€”'],
              ['Actor ID',      log.actor_id      || 'â€”'],
              ['Actor Type',    log.actor_type],
              ['Resource Type', log.resource_type],
              ['Resource ID',   log.resource_id   || 'â€”'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-xs text-slate-700 font-medium break-all">{value}</span>
              </div>
            ))}
          </div>
          {safeMetadata && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Metadata <span className="text-slate-400 font-normal normal-case">(pre-sanitized by audit.ts)</span></p>
              <pre className="text-xs bg-slate-900 text-sky-300 rounded-lg px-3 py-2.5 overflow-x-auto font-mono whitespace-pre-wrap">{safeMetadata}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Error Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ErrorRow({ error, onView, onQuickResolve }: { error: ApplicationError; onView: () => void; onQuickResolve: () => void }) {
  return (
    <div className={`bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-opacity ${error.resolved ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 min-w-0">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${levelDot(error.level)}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${levelColor(error.level)}`}>{error.level}</span>
            <span className="font-mono font-bold text-slate-200 text-xs break-all">{error.event_name}</span>
            {error.resolved
              ? <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">âœ“ Resolved</span>
              : <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-semibold border border-rose-500/30">Unresolved</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {error.error_code && <span className="font-mono">{error.error_code}</span>}
            <span className="flex items-center gap-1"><Clock size={10} /> {formatTs(error.created_at)}</span>
            {error.screen && <span>{error.screen}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 pl-5 sm:pl-0">
        <button onClick={onView} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
          <Eye size={12} /> Details
        </button>
        {!error.resolved && (
          <button onClick={onQuickResolve} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <CheckCheck size={12} /> Resolve
          </button>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Audit Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuditRow({ log, onView }: { log: AuditLog; onView: () => void }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <ClipboardList size={14} className="text-slate-500 mt-1 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border font-mono ${actionColor(log.action)}`}>{log.action}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${actorColor(log.actor_type)}`}>{log.actor_type}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {log.actor_name && <span className="flex items-center gap-1"><User size={10} /> {log.actor_name}</span>}
            <span className="flex items-center gap-1"><BookOpen size={10} /> {log.resource_type}</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {formatTs(log.created_at)}</span>
          </div>
        </div>
      </div>
      <button onClick={onView} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex-shrink-0">
        <Eye size={12} /> Details
      </button>
    </div>
  );
}

// â”€â”€â”€ Main Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function DiagnosticsPage() {
  const { navigate } = useRouter();

  const { can, loading } = usePermissions();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<DiagTab>('overview');

  // Health
  const [health, setHealth] = useState<DiagnosticsHealth>({
    database: { status: 'checking' },
    storage:  { status: 'checking' },
    realtime: { status: 'checking' },
  });
  const [healthLoading, setHealthLoading] = useState(false);

  // Errors
  const [errors, setErrors]               = useState<ApplicationError[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsLoadErr, setErrorsLoadErr] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<ApplicationError | null>(null);
  const [filterResolved, setFilterResolved] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [filterLevel, setFilterLevel]       = useState<'all' | 'ERROR' | 'WARN' | 'INFO'>('all');
  const [errorsSearch, setErrorsSearch]     = useState('');

  // Audit
  const [auditLogs, setAuditLogs]         = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [auditLoadErr, setAuditLoadErr]   = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const [auditSearch, setAuditSearch]     = useState('');
  const [auditActorFilter, setAuditActorFilter]   = useState<'all' | 'admin' | 'staff' | 'gate_staff' | 'parent' | 'system'>('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    });
    
    setIsLoggingIn(false);
    
    if (error) {
      setLoginError(error.message);
    } else {
      // PermissionContext will automatically pick up the new session 
      // and re-evaluate can('system.read').
      setLoginPassword('');
    }
  };

  const runHealthChecks = useCallback(async () => {
    setHealthLoading(true);
    setHealth({ database: { status: 'checking' }, storage: { status: 'checking' }, realtime: { status: 'checking' } });
    const result = await diagnosticsService.runAllHealthChecks();
    setHealth(result);
    setHealthLoading(false);
  }, []);

  const loadErrors = useCallback(async () => {
    setErrorsLoading(true); setErrorsLoadErr(null);
    const { data, error } = await diagnosticsService.fetchRecentErrors(48);
    setErrorsLoading(false);
    if (error) setErrorsLoadErr(error); else setErrors(data);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true); setAuditLoadErr(null);
    const { data, error } = await diagnosticsService.fetchRecentAuditLogs(48);
    setAuditLoading(false);
    if (error) setAuditLoadErr(error); else setAuditLogs(data);
  }, []);

  useEffect(() => {
    if (!loading && can('system.read')) { runHealthChecks(); loadErrors(); loadAuditLogs(); }
  }, [loading, can('system.read'), runHealthChecks, loadErrors, loadAuditLogs]);

  const handleResolved = (id: string, note: string) =>
    setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true, resolution_note: note, resolved_at: new Date().toISOString() } : e));

  const filteredErrors = errors.filter(e => {
    if (filterResolved === 'unresolved' && e.resolved) return false;
    if (filterResolved === 'resolved' && !e.resolved) return false;
    if (filterLevel !== 'all' && e.level !== filterLevel) return false;
    if (errorsSearch) {
      const q = errorsSearch.toLowerCase();
      return e.event_name.toLowerCase().includes(q) || (e.error_code || '').toLowerCase().includes(q) ||
             (e.screen || '').toLowerCase().includes(q) || e.error_message.toLowerCase().includes(q);
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action))).sort();

  const filteredAudit = auditLogs.filter(l => {
    if (auditActorFilter !== 'all' && l.actor_type !== auditActorFilter) return false;
    if (auditActionFilter !== 'all' && l.action !== auditActionFilter) return false;
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      return l.action.toLowerCase().includes(q) || (l.actor_name || '').toLowerCase().includes(q) ||
             l.resource_type.toLowerCase().includes(q) || (l.resource_id || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto text-violet-500" />
          <p className="text-sm font-semibold tracking-wide">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!can('system.read')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 mb-6">
              <Terminal size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Super Admin Console</h1>
            <p className="text-slate-400 text-xs mt-1">Requires <code>system.manage</code> capability</p>
          </div>
          <form onSubmit={handleSuperAdminLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
              <input type="email" value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)} placeholder="superadmin@school.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-violet-500 font-mono" />
              </div>
            </div>
            {loginError && <p className="text-xs text-rose-400 font-semibold">{loginError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white text-sm font-bold rounded-xl transition-colors">
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
            <button type="button" onClick={handleSignOut} className="w-full py-2.5 bg-transparent hover:bg-slate-800 text-slate-400 text-sm font-bold rounded-xl transition-colors">
              Return to Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  const unresolvedCount = errors.filter(e => !e.resolved && e.level === 'ERROR').length;

  // â”€â”€ Authenticated Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tabs: { id: DiagTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview',   icon: <Code2 size={13} /> },
    { id: 'errors',   label: `System Logs${unresolvedCount > 0 ? ` (${unresolvedCount})` : ''}`, icon: <ShieldAlert size={13} /> },
    { id: 'audit',    label: `Audit Log${auditLogs.length > 0 ? ` (${auditLogs.length})` : ''}`, icon: <ClipboardList size={13} /> },
    { id: 'rbac',     label: 'Access Control', icon: <User size={13} /> },
    { id: 'onboard-child', label: 'Onboard Child', icon: <User size={13} /> },
    { id: 'onboard-staff', label: 'Onboard Staff', icon: <User size={13} /> },
    { id: 'bulk-onboard', label: 'Bulk Upload CSV', icon: <User size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Terminal size={15} className="text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-white tracking-tight">System Diagnostics</span>
              <span className="ml-2 text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-semibold">Developer Portal</span>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
            <X size={13} /> Sign Out
          </button>
        </div>
        {/* Tab Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-slate-800/60">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id ? 'text-violet-300 border-violet-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'overview' && (
          <>
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={15} className="text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Application</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Version',          value: `v${APP_VERSION}`,              color: 'text-violet-300' },
                  { label: 'Environment',      value: ENVIRONMENT,                    color: ENVIRONMENT === 'production' ? 'text-emerald-400' : 'text-amber-400' },
                  { label: 'Supabase Project', value: SUPABASE_PROJECT_ID,            color: 'text-sky-300' },
                  { label: 'Build Target',     value: import.meta.env.MODE || 'unknown', color: 'text-slate-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
                    <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi size={15} className="text-violet-400" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Supabase Connectivity</h2>
                </div>
                <button onClick={runHealthChecks} disabled={healthLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50">
                  <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} /> Re-run Checks
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Database',                icon: <Database size={16} />,  result: health.database },
                  { label: 'Storage (child-photos)',  icon: <HardDrive size={16} />, result: health.storage },
                  { label: 'Realtime Channel',        icon: <Activity size={16} />,  result: health.realtime },
                ].map(({ label, icon, result }) => (
                  <div key={label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-2.5">{icon}<span className="text-xs font-semibold">{label}</span></div>
                    <HealthBadge result={result} />
                  </div>
                ))}
              </div>
            </section>

            {/* Quick-jump cards */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('errors')}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left hover:border-rose-500/50 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={15} className="text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">System Logs</span>
                </div>
                <p className={`text-3xl font-extrabold ${unresolvedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{unresolvedCount}</p>
                <p className="text-xs text-slate-500 mt-1">Unresolved in last 48h â†’ <span className="text-slate-300 group-hover:text-white transition-colors">View all</span></p>
              </button>
              <button onClick={() => setActiveTab('audit')}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left hover:border-violet-500/50 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList size={15} className="text-violet-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Audit Events</span>
                </div>
                <p className="text-3xl font-extrabold text-violet-300">{auditLogs.length}</p>
                <p className="text-xs text-slate-500 mt-1">Actions recorded in last 48h â†’ <span className="text-slate-300 group-hover:text-white transition-colors">View all</span></p>
              </button>
            </div>
          </>
        )}

        {/* â”€â”€ ERRORS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'errors' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">System Logs <span className="text-slate-600">(last 48h)</span></h2>
              </div>
              <button onClick={loadErrors} disabled={errorsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50 self-start sm:self-auto">
                <RefreshCw size={12} className={errorsLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Total',      value: errors.length,                       color: 'text-slate-300' },
                { label: 'Unresolved', value: unresolvedCount,                     color: 'text-rose-400'  },
                { label: 'Resolved',   value: errors.filter(e => e.resolved).length, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <select value={filterResolved} onChange={e => setFilterResolved(e.target.value as any)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500">
                <option value="all">All Status</option><option value="unresolved">Unresolved</option><option value="resolved">Resolved</option>
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value as any)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500">
                <option value="all">All Levels</option><option value="ERROR">ERROR</option><option value="WARN">WARN</option><option value="INFO">INFO</option>
              </select>
              <input type="text" value={errorsSearch} onChange={e => setErrorsSearch(e.target.value)}
                placeholder="Search event, code, screen..."
                className="flex-1 min-w-[160px] text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500 placeholder-slate-600" />
            </div>
            {errorsLoading && <div className="text-center py-8 text-slate-500 text-sm"><RefreshCw size={20} className="animate-spin mx-auto mb-2 text-violet-400" />Loading errors...</div>}
            {errorsLoadErr && !errorsLoading && (
              <div className="bg-rose-950/50 border border-rose-800 rounded-xl p-4 text-sm text-rose-400">
                <p className="font-bold mb-1">Failed to load errors</p><p className="text-xs font-mono">{errorsLoadErr}</p>
                <p className="text-xs mt-2 text-rose-500">Ensure migration <code>20260819000000_application_errors_diagnostics_rls.sql</code> has been applied in Supabase.</p>
              </div>
            )}
            {!errorsLoading && !errorsLoadErr && filteredErrors.length === 0 && (
              <div className="text-center py-10 text-slate-600">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-slate-700" />
                <p className="text-sm font-semibold">No errors found</p>
                <p className="text-xs mt-1">{errors.length > 0 ? 'Try adjusting your filters.' : 'No errors logged in the last 48 hours.'}</p>
              </div>
            )}
            {!errorsLoading && !errorsLoadErr && filteredErrors.length > 0 && (
              <div className="space-y-2">
                {filteredErrors.map(error => (
                  <ErrorRow key={error.id} error={error} onView={() => setSelectedError(error)} onQuickResolve={() => setSelectedError(error)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* â”€â”€ AUDIT LOG TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'audit' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-violet-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Audit Log <span className="text-slate-600">(last 48h)</span></h2>
              </div>
              <button onClick={loadAuditLogs} disabled={auditLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50 self-start sm:self-auto">
                <RefreshCw size={12} className={auditLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Total Events',    value: auditLogs.length,          color: 'text-violet-300' },
                { label: 'Unique Actions',  value: uniqueActions.length,      color: 'text-sky-300'    },
                { label: 'Unique Actors',   value: new Set(auditLogs.map(l => l.actor_id).filter(Boolean)).size, color: 'text-amber-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select value={auditActorFilter} onChange={e => setAuditActorFilter(e.target.value as any)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500">
                <option value="all">All Actors</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="gate_staff">Gate Staff</option>
                <option value="parent">Parent</option>
                <option value="system">System</option>
              </select>
              <select value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500">
                <option value="all">All Actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="text" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                placeholder="Search action, actor, resource..."
                className="flex-1 min-w-[160px] text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-violet-500 placeholder-slate-600" />
            </div>
            {auditLoading && <div className="text-center py-8 text-slate-500 text-sm"><RefreshCw size={20} className="animate-spin mx-auto mb-2 text-violet-400" />Loading audit log...</div>}
            {auditLoadErr && !auditLoading && (
              <div className="bg-rose-950/50 border border-rose-800 rounded-xl p-4 text-sm text-rose-400">
                <p className="font-bold mb-1">Failed to load audit log</p><p className="text-xs font-mono">{auditLoadErr}</p>
                <p className="text-xs mt-2 text-rose-500">Ensure migration <code>20260819010000_create_audit_logs.sql</code> has been applied in Supabase.</p>
              </div>
            )}
            {!auditLoading && !auditLoadErr && filteredAudit.length === 0 && (
              <div className="text-center py-10 text-slate-600">
                <ClipboardList size={28} className="mx-auto mb-2 text-slate-700" />
                <p className="text-sm font-semibold">No audit events found</p>
                <p className="text-xs mt-1">{auditLogs.length > 0 ? 'Try adjusting your filters.' : 'No actions recorded in the last 48 hours.'}</p>
              </div>
            )}
            {!auditLoading && !auditLoadErr && filteredAudit.length > 0 && (
              <div className="space-y-2">
                {filteredAudit.map(log => (
                  <AuditRow key={log.id} log={log} onView={() => setSelectedAudit(log)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* â”€â”€ RBAC TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'rbac' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User size={18} className="text-violet-400" />
                Access Control Manager
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage roles, granular permissions, and user access across the school system.
              </p>
            </div>
            <div className="bg-slate-50 text-slate-900 rounded-xl">
              <RBACManager />
            </div>
          </section>
        )}

        {/* â”€â”€â”€ ONBOARD CHILD TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'onboard-child' && (
          <section className="bg-slate-50 text-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <ParentOnboarding />
          </section>
        )}

        {/* â”€â”€â”€ ONBOARD STAFF TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'onboard-staff' && (
          <section className="bg-slate-50 text-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <StaffOnboarding />
          </section>
        )}

        {/* â”€â”€â”€ BULK ONBOARD TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'bulk-onboard' && (
          <section className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <BulkOnboardTab />
          </section>
        )}
      </main>
      
      {/* Drawers */}
      {selectedError  && <ErrorDetailDrawer error={selectedError} onClose={() => setSelectedError(null)} onResolved={handleResolved} />}
      {selectedAudit  && <AuditDetailDrawer log={selectedAudit}   onClose={() => setSelectedAudit(null)} />}
    </div>
  );
}



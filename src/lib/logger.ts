import { APP_VERSION, ENVIRONMENT } from './env';
import { AppError } from './errors';
import { supabase } from './supabase';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Generates a consistent Request/Trace ID for correlating distributed logs.
 * Format: REQ-YYYYMMDD-HHMMSS-XXXX
 */
export const generateTraceId = (): string => {
  const dateStr = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${dateStr}-${randomStr}`;
};

// Keys that should have their values redacted to avoid leaking PII or credentials
const SENSITIVE_KEYS = [
  'password',
  'pin',
  'token',
  'key',
  'anon_key',
  'service_role_key',
  'parent_phone',
  'guardian_name',
  'phone',
  'secret',
  'authorization'
];

/**
 * Deeply redacts sensitive fields from objects before logging
 */
function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item));
  }

  const redactedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive && value !== null && value !== undefined) {
      redactedObj[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redactedObj[key] = redact(value);
    } else {
      redactedObj[key] = value;
    }
  }
  return redactedObj;
}

const formatLog = (level: LogLevel, eventName: string, metadata?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  
  // If the metadata contains an error property that is an AppError, we want to extract its details.
  let enrichedMetadata = metadata;
  if (metadata?.error instanceof AppError) {
    enrichedMetadata = {
      ...metadata,
      appError: {
        code: metadata.error.code,
        meaning: metadata.error.details.meaning,
        userMessage: metadata.error.details.userMessage,
        devMeaning: metadata.error.details.devMeaning,
        possibleCauses: metadata.error.details.possibleCauses,
        operation: metadata.error.context?.operation,
        resource: metadata.error.context?.resource,
      },
      error: metadata.error.originalError || metadata.error.message,
    };
  } else if (metadata?.error instanceof Error) {
    enrichedMetadata = {
      ...metadata,
      error: metadata.error.message,
    };
  }

  const payload = enrichedMetadata ? redact(enrichedMetadata) : undefined;
  
  return {
    timestamp,
    level,
    event: eventName,
    appVersion: APP_VERSION,
    environment: ENVIRONMENT,
    ...(payload && { metadata: payload })
  };
};

const isDev = import.meta.env.DEV;

const IMPORTANT_EVENTS = new Set([
  'LOGIN_FAILED',
  'ACTIVITY_SAVE_FAILED',
  'PHOTO_UPLOAD_FAILED',
  'GATE_PASS_APPROVAL_FAILED',
  'ATTENDANCE_SAVE_FAILED',
  'HOMEWORK_SAVE_FAILED',
  'REALTIME_SUBSCRIPTION_FAILED',
  'PUSH_NOTIFICATION_FAILED',
  'UNEXPECTED_APPLICATION_ERROR'
]);

/**
 * Asynchronously persists important logs to Supabase application_errors table.
 * It's fire-and-forget to avoid blocking the UI thread.
 */
const persistError = async (data: any) => {
  try {
    if (data.level === 'DEBUG') return;

    // Generate a correlation ID if crypto is available
    const errorId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : undefined;

    let errorCode = undefined;
    let operation = undefined;
    let resource = undefined;
    let errorMessage = '';
    let technicalDetails = undefined;

    // Extract structured data from AppError if it exists
    if (data.metadata?.appError) {
      errorCode = data.metadata.appError.code;
      operation = data.metadata.appError.operation;
      resource = data.metadata.appError.resource;
      errorMessage = data.metadata.appError.userMessage || data.metadata.appError.meaning || data.metadata.error || 'Unknown error';
      technicalDetails = data.metadata.error;
    } else {
      errorMessage = data.metadata?.error || 'Unknown error';
      technicalDetails = typeof data.metadata?.error === 'string' ? data.metadata.error : JSON.stringify(data.metadata?.error);
    }

    const payload = {
      error_id: errorId,
      level: data.level,
      event_name: data.event,
      error_code: errorCode,
      screen: data.metadata?.screen,
      operation: operation || data.metadata?.operation,
      resource: resource || data.metadata?.resource,
      user_type: data.metadata?.userType,
      user_id: data.metadata?.userId,
      app_version: data.appVersion,
      environment: data.environment,
      error_message: errorMessage,
      technical_details: technicalDetails,
      metadata: data.metadata,
    };

    await supabase.from('application_errors').insert([payload]);
  } catch (err) {
    // Fail silently in production to avoid recursive error loops
    if (isDev) {
      console.error('Failed to persist error to Supabase', err);
    }
  }
};

export const logger = {
  debug: (eventName: string, metadata?: Record<string, any>) => {
    // Only log debug messages in development
    if (isDev) {
      const data = formatLog('DEBUG', eventName, metadata);
      console.log(`[DEBUG] ${eventName}`, data);
    }
  },
  
  info: (eventName: string, metadata?: Record<string, any>) => {
    const data = formatLog('INFO', eventName, metadata);
    console.info(`[INFO] ${eventName}`, data);
    persistError(data);
  },
  
  warn: (eventName: string, metadata?: Record<string, any>) => {
    const data = formatLog('WARN', eventName, metadata);
    console.warn(`[WARN] ${eventName}`, data);
    persistError(data);
  },
  
  error: (eventName: string, metadata?: Record<string, any>) => {
    const data = formatLog('ERROR', eventName, metadata);
    console.error(`[ERROR] ${eventName}`, data);
    persistError(data);
  }
};

export interface ErrorCodeDefinition {
  code: string;
  meaning: string;
  userMessage: string;
  devMeaning: string;
  possibleCauses: string[];
}

export const ERROR_CATALOGUE: Record<string, ErrorCodeDefinition> = {
  // DB Errors
  'DB-001': {
    code: 'DB-001',
    meaning: 'Generic database connection or timeout error.',
    userMessage: 'Unable to connect to the server at this time. Please check your internet connection and try again.',
    devMeaning: 'Supabase fetch or upsert operation failed due to timeout or network unavailability.',
    possibleCauses: ['Network disconnected', 'Supabase downtime', 'Promise.race timeout triggered'],
  },
  'DB-002': {
    code: 'DB-002',
    meaning: 'Database fetch failed.',
    userMessage: 'Unable to load data. Please try again.',
    devMeaning: 'Supabase SELECT query failed.',
    possibleCauses: ['Invalid query parameters', 'RLS policy blocked access', 'Schema mismatch'],
  },

  // Auth Errors
  'AUTH-001': {
    code: 'AUTH-001',
    meaning: 'Authentication failed.',
    userMessage: 'Invalid credentials or session expired. Please log in again.',
    devMeaning: 'Supabase auth sign in or session check failed.',
    possibleCauses: ['Incorrect password', 'Invalid pin', 'Session token expired or missing'],
  },
  'AUTH-002': {
    code: 'AUTH-002',
    meaning: 'Unauthorized access.',
    userMessage: 'You do not have permission to access this resource.',
    devMeaning: 'User attempted to access a role-restricted area without valid claims.',
    possibleCauses: ['Role mismatch (e.g., parent trying to access staff pages)', 'Missing auth context'],
  },

  // Student Errors
  'STUDENT-001': {
    code: 'STUDENT-001',
    meaning: 'Student data could not be fetched.',
    userMessage: 'Unable to load student information.',
    devMeaning: 'Failed to retrieve students from the profiles table.',
    possibleCauses: ['RLS', 'Invalid class name filter', 'DB timeout'],
  },
  'STUDENT-002': {
    code: 'STUDENT-002',
    meaning: 'Student profile update failed.',
    userMessage: 'Unable to save student profile changes.',
    devMeaning: 'Failed to upsert student profile data.',
    possibleCauses: ['Missing required fields', 'RLS constraints', 'DB timeout'],
  },

  // Staff Errors
  'STAFF-001': {
    code: 'STAFF-001',
    meaning: 'Staff data could not be fetched.',
    userMessage: 'Unable to load staff information.',
    devMeaning: 'Failed to retrieve staff profiles.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'STAFF-002': {
    code: 'STAFF-002',
    meaning: 'Staff profile update failed.',
    userMessage: 'Unable to save staff profile changes.',
    devMeaning: 'Failed to upsert staff profile data.',
    possibleCauses: ['Missing required fields', 'RLS constraints', 'DB timeout'],
  },

  // Activity Errors
  'ACTIVITY-001': {
    code: 'ACTIVITY-001',
    meaning: 'Daily activities could not be loaded.',
    userMessage: 'Unable to load today\'s activities.',
    devMeaning: 'daily_logs SELECT failed.',
    possibleCauses: ['RLS', 'Invalid date filter', 'DB timeout'],
  },
  'ACTIVITY-002': {
    code: 'ACTIVITY-002',
    meaning: 'Daily activity could not be saved.',
    userMessage: 'Unable to save today\'s activity. Please try again.',
    devMeaning: 'daily_logs INSERT/UPSERT failed.',
    possibleCauses: ['RLS', 'invalid student_id', 'schema mismatch', 'network', 'Supabase unavailable'],
  },

  // Photo Errors
  'PHOTO-001': {
    code: 'PHOTO-001',
    meaning: 'Photo or media upload failed.',
    userMessage: 'Unable to upload media file.',
    devMeaning: 'Supabase storage bucket upload failed.',
    possibleCauses: ['File too large', 'Invalid mime type', 'Storage bucket missing', 'RLS on storage', 'Network timeout'],
  },

  // Gate Errors
  'GATE-001': {
    code: 'GATE-001',
    meaning: 'Gate pass list could not be loaded.',
    userMessage: 'Unable to load gate passes.',
    devMeaning: 'gate_passes SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'GATE-002': {
    code: 'GATE-002',
    meaning: 'Gate pass creation or update failed.',
    userMessage: 'Unable to process gate pass request.',
    devMeaning: 'gate_passes UPSERT failed.',
    possibleCauses: ['RLS', 'Missing required fields', 'DB timeout'],
  },

  // Grade Errors
  'GRADE-001': {
    code: 'GRADE-001',
    meaning: 'Grades could not be loaded.',
    userMessage: 'Unable to load grades.',
    devMeaning: 'daily_grades SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'GRADE-002': {
    code: 'GRADE-002',
    meaning: 'Grade update failed.',
    userMessage: 'Unable to save grade.',
    devMeaning: 'daily_grades UPSERT failed.',
    possibleCauses: ['RLS', 'Missing required fields', 'DB timeout'],
  },

  // Attendance Errors
  'ATTENDANCE-001': {
    code: 'ATTENDANCE-001',
    meaning: 'Attendance records could not be loaded.',
    userMessage: 'Unable to load attendance data.',
    devMeaning: 'attendance SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'ATTENDANCE-002': {
    code: 'ATTENDANCE-002',
    meaning: 'Attendance update failed.',
    userMessage: 'Unable to save attendance record.',
    devMeaning: 'attendance UPSERT failed.',
    possibleCauses: ['RLS', 'Schema constraint violation', 'DB timeout'],
  },

  // Homework Errors
  'HOMEWORK-001': {
    code: 'HOMEWORK-001',
    meaning: 'Homework assignments could not be loaded.',
    userMessage: 'Unable to load homework.',
    devMeaning: 'homework SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'HOMEWORK-002': {
    code: 'HOMEWORK-002',
    meaning: 'Homework creation or update failed.',
    userMessage: 'Unable to save homework.',
    devMeaning: 'homework UPSERT failed.',
    possibleCauses: ['RLS', 'Missing fields', 'DB timeout'],
  },

  // Classwork Errors
  'CLASSWORK-001': {
    code: 'CLASSWORK-001',
    meaning: 'Classwork assignments could not be loaded.',
    userMessage: 'Unable to load classwork.',
    devMeaning: 'classwork SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'CLASSWORK-002': {
    code: 'CLASSWORK-002',
    meaning: 'Classwork creation or update failed.',
    userMessage: 'Unable to save classwork.',
    devMeaning: 'classwork UPSERT failed.',
    possibleCauses: ['RLS', 'Missing fields', 'DB timeout'],
  },

  // Notification Errors
  'NOTIFICATION-001': {
    code: 'NOTIFICATION-001',
    meaning: 'Push notification registration failed.',
    userMessage: 'Unable to register device for notifications.',
    devMeaning: 'push_subscriptions UPSERT failed or permission denied.',
    possibleCauses: ['User denied permission', 'Browser unsupported', 'DB timeout'],
  },
  
  // Announcement Errors
  'ANNOUNCEMENT-001': {
    code: 'ANNOUNCEMENT-001',
    meaning: 'Announcements could not be loaded.',
    userMessage: 'Unable to load announcements.',
    devMeaning: 'announcements SELECT failed.',
    possibleCauses: ['RLS', 'Invalid query', 'DB timeout'],
  },
  'ANNOUNCEMENT-002': {
    code: 'ANNOUNCEMENT-002',
    meaning: 'Announcement creation or update failed.',
    userMessage: 'Unable to save announcement.',
    devMeaning: 'announcements UPSERT failed.',
    possibleCauses: ['RLS', 'Missing fields', 'DB timeout'],
  },

  // System Errors
  'SYSTEM-001': {
    code: 'SYSTEM-001',
    meaning: 'An unexpected application error occurred.',
    userMessage: 'Something went wrong on our end. Please restart the app.',
    devMeaning: 'An unhandled exception was caught by a global boundary or service.',
    possibleCauses: ['JavaScript runtime error', 'Malformed data', 'Component crash'],
  }
};

export class AppError extends Error {
  public code: string;
  public details: ErrorCodeDefinition;
  public originalError?: any;
  public context?: Record<string, any>;

  constructor(code: string, originalError?: any, context?: Record<string, any>) {
    const details = ERROR_CATALOGUE[code] || ERROR_CATALOGUE['SYSTEM-001'];
    super(`We're sorry, but an unexpected error occurred. (Code: ${details.code})`);
    this.name = 'AppError';
    this.code = details.code;
    this.details = details;
    this.originalError = originalError;
    this.context = context;
  }
}

/**
 * Standardizes Supabase errors, mapping technical codes to user-friendly messages.
 */
export function handleSupabaseError(
  error: any,
  fallbackErrorCode: string,
  context?: { operation: string; resource: string }
): AppError {
  const appErr = new AppError(fallbackErrorCode, error, context);
  
  if (!error) return appErr;

  // Supabase/PostgREST error codes
  const code = error.code;
  const message = (error.message || '').toLowerCase();

  if (code === '42501' || message.includes('rls') || message.includes('policy')) {
    // RLS / Insufficient Privilege
    appErr.details.userMessage = 'You do not have permission to perform this action.';
    appErr.message = appErr.details.userMessage;
  } else if (code === '42P01' || message.includes('does not exist')) {
    // Missing table / undefined table
    appErr.details.userMessage = 'The application is temporarily unavailable. Please contact the administrator.';
    appErr.message = appErr.details.userMessage;
  } else if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    // Network errors
    appErr.details.userMessage = 'Unable to connect. Please check your internet connection.';
    appErr.message = appErr.details.userMessage;
  }

  return appErr;
}

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';
import { DailyLog } from '@/lib/types';

/**
 * Service to handle Activity / Daily Logs operations.
 * Abstracts the dual-table (daily_logs vs activity_logs) fallback complexity
 * away from the UI components.
 */
export const activityService = {
  /**
   * Fetch all activity logs across the platform.
   */
  async fetchAllLogs(): Promise<DailyLog[]> {
    try {
      // Primary Attempt: daily_logs
      const { data: primaryData, error: primaryError } = await supabase
        .from('daily_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!primaryError && primaryData && primaryData.length > 0) {
        return primaryData as DailyLog[];
      }

      // Fallback Attempt: activity_logs
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return (fallbackData as DailyLog[]) || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ACTIVITY-001', { operation: 'SELECT', resource: 'daily_logs/activity_logs' });
      logger.error('ACTIVITY_SERVICE_FETCH_ALL_FAILED', { error: appErr });
      return [];
    }
  },

  /**
   * Fetch logs for a specific student on a specific date.
   */
  async fetchStudentLogs(studentId: string, date: string): Promise<DailyLog[]> {
    try {
      let res = await supabase
        .from('daily_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('log_date', date)
        .order('created_at', { ascending: true });

      if (res.error || !res.data || res.data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('student_id', studentId)
          .eq('log_date', date)
          .order('created_at', { ascending: true });
        
        if (fallbackError) throw fallbackError;
        return (fallbackData as DailyLog[]) || [];
      }

      if (!res.error && res.data) {
        return res.data as DailyLog[];
      }
      return [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ACTIVITY-001', { operation: 'SELECT', resource: 'daily_logs/activity_logs' });
      logger.error('ACTIVITY_SERVICE_FETCH_STUDENT_FAILED', { error: appErr, studentId });
      return [];
    }
  },

  /**
   * Create a new activity log entry.
   * Handles schema inconsistencies (media_items) gracefully.
   */
  async createLog(logEntry: Partial<DailyLog>, traceId?: string): Promise<void> {
    try {
      const { data: newLog, error: insertError } = await supabase
        .from('daily_logs')
        .insert(logEntry)
        .select()
        .single();
      
      if (insertError) {
        logger.warn('ACTIVITY_SERVICE_INSERT_RETRY_NO_MEDIA', { 
          error: insertError.message, 
          studentId: logEntry.student_id 
        });
        
        // Remove media_items in case the column is missing in older schemas
        const { media_items, ...rest } = logEntry as any;
        const retry1 = await supabase.from('daily_logs').insert(rest);
        
        if (retry1.error) {
          // Final fallback to older activity_logs table
          await supabase.from('activity_logs').insert(logEntry);
        }
      }
      if (!insertError && newLog) {
        // Audit: activity was successfully created
        auditLog({
          actor_type: 'staff',
          action: 'ACTIVITY_CREATED',
          resource_type: 'activity',
          resource_id: newLog.id,
          metadata: {
            student_id: logEntry.student_id,
            class_name: (logEntry as any).class_name,
            date: logEntry.log_date,
            traceId,
          },
        });
      }
      return newLog;
      } catch (err) {
      const appErr = handleSupabaseError(err, 'ACTIVITY-002', { operation: 'INSERT', resource: 'daily_logs/activity_logs' });
      logger.error('ACTIVITY_SERVICE_CREATE_FAILED', { 
        error: appErr,
        studentId: logEntry.student_id,
        traceId
      });
      throw appErr;
    }
  },

  /**
   * Update the teacher notes for an existing log.
   */
  async updateTeacherNotes(logId: string, notes: string): Promise<void> {
    try {
      await supabase.from('daily_logs').update({ teacher_notes: notes }).eq('id', logId);

      // Audit: activity notes were updated
      auditLog({
        actor_type: 'staff',
        action: 'ACTIVITY_UPDATED',
        resource_type: 'activity',
        resource_id: logId,
        metadata: { logId },
      });
    } catch (err) {
      logger.warn('ACTIVITY_SERVICE_UPDATE_FALLBACK_TRIGGERED', { logId });
    }
  },

  /**
   * Delete an existing activity log.
   */
  async deleteLog(logId: string): Promise<void> {
    try {
      // Attempt delete on both tables to ensure it's removed regardless of where it lives
      await supabase.from('daily_logs').delete().eq('id', logId);
      await supabase.from('activity_logs').delete().eq('id', logId);

      // Audit: activity was deleted
      auditLog({
        actor_type: 'staff',
        action: 'ACTIVITY_DELETED',
        resource_type: 'activity',
        resource_id: logId,
        metadata: { logId },
      });
    } catch (err) {
      logger.warn('ACTIVITY_SERVICE_DELETE_FALLBACK_TRIGGERED', { logId });
    }
  }
};

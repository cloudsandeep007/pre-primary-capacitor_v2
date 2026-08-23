import { supabase } from '@/lib/supabase';
import { Attendance } from '@/lib/types';
import { logger } from '@/lib/logger';
import { AppError, handleSupabaseError } from '@/lib/errors';

class AttendanceService {
  /**
   * Fetches attendance for a specific class and date
   */
  async fetchAttendanceByClassAndDate(className: string, date: string): Promise<Attendance[]> {
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
        
      if (className !== 'All') {
        query = query.eq('class_name', className);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ATTENDANCE-001', { operation: 'SELECT', resource: 'attendance' });
      logger.error('ATTENDANCE_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches attendance for a date range
   */
  async fetchAttendanceByDateRange(startDate: string, endDate?: string, className?: string): Promise<Attendance[]> {
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate);
      
      if (endDate) {
        query = query.lte('date', endDate);
      }

      if (className && className !== 'All') {
        query = query.eq('class_name', className);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ATTENDANCE-001', { operation: 'SELECT', resource: 'attendance' });
      logger.error('ATTENDANCE_RANGE_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches attendance for a specific student
   */
  async fetchAttendanceByStudent(studentId: string, startDate?: string): Promise<Attendance[]> {
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId);
        
      if (startDate) {
        query = query.gte('date', startDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = new AppError('ATTENDANCE-001', err);
      logger.error('ATTENDANCE_STUDENT_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Saves or updates a single attendance record
   */
  async saveAttendanceRecord(record: Partial<Attendance>, traceId?: string): Promise<{ data: any, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
      let upsertPromise;

      if (record.id && record.id !== 'temp-id') {
        upsertPromise = supabase
          .from('attendance')
          .update({ status: record.status })
          .eq('id', record.id)
          .select()
          .single();
      } else {
        upsertPromise = supabase
          .from('attendance')
          .insert([{
            student_id: record.student_id,
            class_name: record.class_name,
            date: record.date,
            status: record.status
          }])
          .select()
          .single();
      }

      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;
      
      return { data: result.data as Attendance, error: null };
    } catch (err) {
      const appErr = new AppError('ATTENDANCE-002', err);
      logger.error('ATTENDANCE_SAVE_ERROR', { error: appErr, studentId: record.student_id, traceId });
      return { data: null, error: appErr };
    }
  }
}

export const attendanceService = new AttendanceService();

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { DailyGrade } from '@/lib/types';
import { AppError, handleSupabaseError } from '@/lib/errors';

class GradeService {
  /**
   * Fetches daily grades by student ID.
   */
  async fetchGradesByStudent(studentId: string): Promise<DailyGrade[]> {
    try {
      const { data, error } = await supabase
        .from('daily_grades')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GRADE-001', { operation: 'SELECT', resource: 'daily_grades' });
      logger.error('GRADES_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches daily grades for an entire class on a specific date.
   */
  async fetchGradesByClassAndDate(className: string, date: string): Promise<DailyGrade[]> {
    try {
      const { data, error } = await supabase
        .from('daily_grades')
        .select('*')
        .eq('class_name', className)
        .eq('date', date);

      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GRADE-001', { operation: 'SELECT', resource: 'daily_grades' });
      logger.error('GRADES_CLASS_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches daily grades globally (admin analytics) or for a specific class for a specific date or date range filter (YYYY-MM).
   */
  async fetchGradesByFilter(dateFilterStr: string, isDaily: boolean, className?: string): Promise<DailyGrade[]> {
    try {
      let query = supabase.from('daily_grades').select('*');

      if (className && className !== 'All') {
        query = query.eq('class_name', className);
      }

      if (isDaily) {
        query = query.eq('date', dateFilterStr);
      } else {
        const [year, month] = dateFilterStr.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
        
        query = query
          .gte('date', startDate)
          .lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GRADE-001', { operation: 'SELECT', resource: 'daily_grades' });
      logger.error('GRADES_GLOBAL_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches daily grades between explicit start and end dates.
   */
  async fetchGradesByDateRange(startDate: string, endDate: string, className?: string): Promise<DailyGrade[]> {
    try {
      let query = supabase
        .from('daily_grades')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (className && className !== 'All') {
        query = query.eq('class_name', className);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GRADE-001', { operation: 'SELECT', resource: 'daily_grades' });
      logger.error('GRADES_RANGE_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Upserts a daily grade (for staff).
   */
  async upsertGrade(grade: Partial<DailyGrade>, traceId?: string): Promise<{ data?: DailyGrade, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
      const upsertPromise = supabase.from('daily_grades').upsert([grade], { onConflict: 'student_id,date' }).select();
      const result: any = await Promise.race([upsertPromise, timeout]);
      
      if (result.error) throw result.error;
      
      return { data: result.data as DailyGrade, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GRADE-002', { operation: 'UPSERT', resource: 'daily_grades' });
      logger.error('GRADES_UPSERT_ERROR', { error: appErr, traceId });
      return { error: appErr };
    }
  }
}

export const gradeService = new GradeService();

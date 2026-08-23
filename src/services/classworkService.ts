import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Classwork } from '@/lib/types';
import { AppError, handleSupabaseError } from '@/lib/errors';

class ClassworkService {
  /**
   * Fetches classwork for a given class.
   * Optionally filtered by date (YYYY-MM-DD).
   */
  async fetchClasswork(className: string, dateFilter?: string): Promise<Classwork[]> {
    try {
      let query = supabase
        .from('classwork')
        .select('*')
        .eq('class_name', className)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }

      // Limit to 20 for parent view, although staff view only gets today so limit 20 is fine too.
      query = query.limit(20);

      const { data, error } = await query;
      if (error) throw error;
      
      return data as Classwork[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'CLASSWORK-001', { operation: 'SELECT', resource: 'classwork' });
      logger.error('CLASSWORK_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Creates a new classwork item with a timeout fallback
   */
  async createClasswork(classwork: Partial<Classwork>, traceId?: string): Promise<{ data?: Classwork, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      const upsertPromise = supabase.from('classwork').insert(classwork).select().single();
      const result: any = await Promise.race([upsertPromise, timeout]);
      
      if (result.error) throw result.error;
      
      return { data: result.data as Classwork, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'CLASSWORK-002', { operation: 'INSERT', resource: 'classwork' });
      logger.warn('CLASSWORK_INSERT_FAILED_OR_TIMED_OUT', { error: appErr, traceId });
      return { error: appErr };
    }
  }

  async deleteClasswork(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('classwork').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('CLASSWORK_DELETE_ERROR', { error: err });
      return false;
    }
  }

  async updateClasswork(id: string, updates: Partial<Classwork>): Promise<boolean> {
    try {
      const { error } = await supabase.from('classwork').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('CLASSWORK_UPDATE_ERROR', { error: err });
      return false;
    }
  }
}

export const classworkService = new ClassworkService();

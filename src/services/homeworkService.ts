import { supabase } from '@/lib/supabase';
import { HomeworkItem, HomeworkReply } from '@/lib/types';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';

class HomeworkService {
  /**
   * Fetches homework for a given class
   */
  async fetchHomework(className: string, startDate?: string, endDate?: string): Promise<HomeworkItem[]> {
    try {
      let query = supabase
        .from('homework')
        .select('*')
        .eq('class_name', className)
        .order('due_date', { ascending: true });

      if (startDate) {
        query = query.gte('due_date', startDate);
      }
      if (endDate) {
        query = query.lte('due_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HomeworkItem[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-001', { operation: 'SELECT', resource: 'homework' });
      logger.error('HOMEWORK_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches replies for a list of homework ids
   */
  async fetchReplies(homeworkIds: string[]): Promise<Record<string, HomeworkReply[]>> {
    if (!homeworkIds || homeworkIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('homework_replies')
        .select('*')
        .in('homework_id', homeworkIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const repliesMap: Record<string, HomeworkReply[]> = {};
      data?.forEach((reply: HomeworkReply) => {
        if (!repliesMap[reply.homework_id]) {
          repliesMap[reply.homework_id] = [];
        }
        repliesMap[reply.homework_id].push(reply as HomeworkReply);
      });
      
      return repliesMap;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-001', { operation: 'SELECT', resource: 'homework_replies' });
      logger.error('HOMEWORK_REPLY_FETCH_ERROR', { error: appErr });
      return {};
    }
  }

  /**
   * Fetches completed homework IDs for a student
   */
  async fetchCompletions(studentId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('homework_completions')
        .select('homework_id')
        .eq('student_id', studentId);
        
      if (error) throw error;
      
      return new Set((data || []).map(r => r.homework_id));
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-001', { operation: 'SELECT', resource: 'homework_completions' });
      logger.error('HOMEWORK_COMPLETION_FETCH_ERROR', { error: appErr });
      return new Set();
    }
  }

  /**
   * Toggles homework completion status
   */
  async toggleCompletion(homeworkId: string, studentId: string, isCompleted: boolean): Promise<{ error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      const upsertPromise = isCompleted 
        ? supabase.from('homework_completions').delete().eq('homework_id', homeworkId).eq('student_id', studentId)
        : supabase.from('homework_completions').insert([{ homework_id: homeworkId, student_id: studentId }]);
      
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result && result.error) throw result.error;

      return { error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-002', { operation: 'UPSERT', resource: 'homework_completions' });
      logger.error('HOMEWORK_COMPLETION_TOGGLE_ERROR', { error: appErr });
      return { error: appErr };
    }
  }

  /**
   * Creates a new homework item with a timeout fallback
   */
  async createHomework(homework: Partial<HomeworkItem>, traceId?: string): Promise<{ data?: HomeworkItem, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const payload = {
        title: homework.title,
        subject: homework.subject,
        description: homework.description,
        due_date: homework.due_date,
        class_name: homework.class_name,
        staff_id: homework.staff_id,
        staff_name: homework.staff_name,
        attachment_url: homework.attachment_url,
      };
      
      const upsertPromise = supabase.from('homework').insert(payload).select().single();
      
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;

      // Audit: homework was successfully created
      auditLog({
        actor_type: 'staff',
        action: 'HOMEWORK_CREATED',
        resource_type: 'homework',
        resource_id: result.data?.id,
        metadata: {
          class_name: homework.class_name,
          title: homework.title,
          subject: homework.subject,
          traceId,
        },
      });

      return { data: result.data as HomeworkItem, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-002', { operation: 'INSERT', resource: 'homework' });
      logger.warn('HOMEWORK_INSERT_FAILED_OR_TIMED_OUT', { error: appErr, traceId });
      return { error: appErr };
    }
  }

  /**
   * Creates a new reply with a timeout fallback
   */
  async createReply(reply: Partial<HomeworkReply>, traceId?: string): Promise<{ data?: HomeworkReply, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const payload = {
        homework_id: reply.homework_id,
        sender_type: reply.sender_type,
        sender_name: reply.sender_name,
        student_id: reply.student_id,
        body: reply.body
      };
      
      const upsertPromise = supabase.from('homework_replies').insert(payload).select().single();
      
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;
      
      return { data: result.data as HomeworkReply, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'HOMEWORK-002', { operation: 'INSERT', resource: 'homework_replies' });
      logger.warn('HOMEWORK_REPLY_INSERT_FAILED_OR_TIMED_OUT', { error: appErr, traceId });
      return { error: appErr };
    }
  }

  async deleteHomework(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('HOMEWORK_DELETE_ERROR', { error: err });
      return false;
    }
  }

  async updateHomework(id: string, updates: Partial<HomeworkItem>): Promise<boolean> {
    try {
      const { error } = await supabase.from('homework').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('HOMEWORK_UPDATE_ERROR', { error: err });
      return false;
    }
  }
}

export const homeworkService = new HomeworkService();

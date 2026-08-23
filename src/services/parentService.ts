import { supabase } from '@/lib/supabase';
import { Parent, StudentParent } from '@/lib/types';
import { logger, generateTraceId } from '@/lib/logger';

export const parentService = {
  async getMyStudents(): Promise<StudentParent[]> {
    const traceId = generateTraceId();
    logger.info('FETCH_PARENT_STUDENTS_START', { traceId });
    try {
      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          *,
          student:students(*)
        `);

      if (error) throw error;
      return data as unknown as StudentParent[];
    } catch (error: any) {
      logger.error('FETCH_PARENT_STUDENTS_FAILED', { traceId, error: error.message });
      throw error;
    }
  },

  async verifyGoogleIdentity(email: string): Promise<boolean> {
    const traceId = generateTraceId();
    try {
      const { data, error } = await supabase.rpc('verify_and_link_parent');
      
      if (error) throw error;
      return !!data;
    } catch (error: any) {
      logger.error('VERIFY_GOOGLE_IDENTITY_FAILED', { traceId, error: error.message });
      return false;
    }
  }
};

import { supabase } from '@/lib/supabase';
import { SchoolFeedback } from '@/lib/types';
import { logger, generateTraceId } from '@/lib/logger';
import { auditLog } from '@/lib/audit';

export const feedbackService = {
  async submitFeedback(feedback: Partial<SchoolFeedback>): Promise<boolean> {
    const traceId = generateTraceId();
    logger.info('SUBMIT_FEEDBACK_START', { traceId, student_id: feedback.student_id });
    try {
      const { data, error } = await supabase
        .from('school_feedback')
        .insert([feedback])
        .select()
        .single();

      if (error) throw error;

      auditLog({
        actor_type: 'parent',
        action: 'PARENT_FEEDBACK_SUBMITTED',
        resource_type: 'feedback',
        resource_id: data.id,
        metadata: { traceId }
      });

      return true;
    } catch (error: any) {
      logger.error('SUBMIT_FEEDBACK_FAILED', { traceId, error: error.message });
      throw error;
    }
  },

  async getGoogleReviewUrl(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('setting_value')
        .eq('setting_key', 'google_review_url')
        .maybeSingle();

      if (error || !data) return null;
      return (data.setting_value as any)?.url || null;
    } catch {
      return null;
    }
  }
};

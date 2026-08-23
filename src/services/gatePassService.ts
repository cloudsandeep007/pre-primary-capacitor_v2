import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';
import { GatePass, Student, Staff } from '@/lib/types';

/**
 * Service to handle Gate Pass operations.
 * Abstracts the complex upsert/handover logic away from the UI components.
 */
export const gatePassService = {
  /**
   * Fetch all gate passes across the platform.
   */
  async fetchAllPasses(): Promise<GatePass[]> {
    try {
      const result = await supabase
        .from('gate_passes')
        .select('*')
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      return (result.data as GatePass[]) || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GATE-001', { operation: 'SELECT', resource: 'gate_passes' });
      logger.error('GATE_PASS_SERVICE_FETCH_ALL_FAILED', { error: appErr });
      return [];
    }
  },

  /**
   * Fetch the latest pass for a given student on a specific date.
   */
  async fetchLatestPassForStudent(studentId: string, rollNo: string, date: string): Promise<GatePass | null> {
    try {
      const result = await supabase
        .from('gate_passes')
        .select('*')
        .or(`roll_no.eq.${rollNo},student_id.eq.${studentId}`)
        .eq('pass_date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      if (result.error) throw result.error;
      
      return (result.data as GatePass[])[0] || null;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'GATE-001', { operation: 'SELECT', resource: 'gate_passes' });
      logger.error('GATE_PASS_SERVICE_FETCH_LATEST_FAILED', { error: appErr, studentId });
      return null;
    }
  },

  /**
   * Approve and complete a handover.
   * Finds an existing pass for today and updates it, or inserts a new completed pass if one doesn't exist.
   */
  async approveHandover(student: Student, staffName: string, scannedResultId?: string, traceId?: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    try {
      let existingId: string | undefined =
        scannedResultId && !scannedResultId.startsWith('pass-') ? scannedResultId : undefined;

      // If no valid ID was passed, try to fetch the latest pass for today
      if (!existingId) {
        const existingPass = await this.fetchLatestPassForStudent(student.id, student.roll_no, today);
        if (existingPass) {
          existingId = existingPass.id;
        }
      }

      const updateFields = {
        status: 'COMPLETED',
        approved_by_staff: staffName,
        pickup_time: nowIso,
      };

      let upsertPromise;
      if (existingId) {
        // Strict UPDATE
        upsertPromise = supabase
          .from('gate_passes')
          .update(updateFields)
          .eq('id', existingId);
      } else {
        // First scan of the day - INSERT a completed record
        upsertPromise = supabase.from('gate_passes').insert({
          student_id: student.id,
          roll_no: student.roll_no,
          student_name: student.name,
          class_name: student.class_name,
          pass_date: today,
          ...updateFields,
        });
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), 5000)
      );
        
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;

      // Audit: gate pass handover was approved
      auditLog({
        actor_type: 'gate_staff',
        actor_name: staffName,
        action: 'GATE_PASS_APPROVED',
        resource_type: 'gate_pass',
        resource_id: existingId,
        metadata: {
          student_id: student.id,
          student_name: student.name,
          roll_no: student.roll_no,
          class_name: student.class_name,
          traceId,
        },
      });

    } catch (err) {
      const appErr = handleSupabaseError(err, 'GATE-002', { operation: 'UPSERT', resource: 'gate_passes' });
      logger.error('GATE_PASS_SERVICE_APPROVE_FAILED', { 
        error: appErr,
        studentId: student.id,
        traceId
      });
      throw appErr;
    }
  },

  async deletePass(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('gate_passes').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('GATE_PASS_DELETE_ERROR', { error: err });
      return false;
    }
  }
};

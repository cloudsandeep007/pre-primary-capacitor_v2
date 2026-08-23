import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { handleSupabaseError } from '@/lib/errors';

export interface FeeCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface FeeStructure {
  id: string;
  academic_year: string;
  class_name: string;
  fee_category: string; // Legacy fallback
  category_id?: string;
  amount: number;
  frequency: string;
  due_date?: string;
  category?: FeeCategory;
}

export interface StudentFee {
  id: string;
  student_id: string;
  academic_year: string;
  fee_structure_id: string;
  discount_amount: number;
  total_due: number;
  amount_paid: number;
  status: string;
  student?: {
    name: string;
    class_name: string;
  };
  structure?: FeeStructure;
}

export interface FeePayment {
  id?: string;
  student_fee_id: string;
  amount: number;
  payment_mode: string;
  payment_date?: string;
  reference_number?: string;
  receipt_number: string;
  remarks?: string;
}

class FeeService {
  async fetchFeeCategories(): Promise<FeeCategory[]> {
    try {
      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FeeCategory[];
    } catch (err) {
      logger.error('FEE_FETCH_CATEGORIES_ERROR', { error: err });
      return [];
    }
  }

  async createFeeCategory(payload: Partial<FeeCategory>): Promise<boolean> {
    try {
      const { error } = await supabase.from('fee_categories').insert([payload]);
      if (error) throw error;
      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_CATEGORY_CREATED', name: payload.name },
      });
      return true;
    } catch (err) {
      logger.error('FEE_CREATE_CATEGORY_ERROR', { error: err });
      return false;
    }
  }

  async fetchFeeStructures(academicYear: string): Promise<FeeStructure[]> {
    try {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*, category:fee_categories(*)')
        .eq('academic_year', academicYear);
      if (error) throw error;
      return data as FeeStructure[];
    } catch (err) {
      logger.error('FEE_FETCH_STRUCTURES_ERROR', { error: err });
      return [];
    }
  }

  async fetchStudentFees(academicYear: string): Promise<StudentFee[]> {
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          *,
          student:students (name, class_name),
          structure:fee_structures (*, category:fee_categories(*))
        `)
        .eq('academic_year', academicYear);
      if (error) throw error;
      return data as unknown as StudentFee[];
    } catch (err) {
      logger.error('FEE_FETCH_STUDENT_FEES_ERROR', { error: err });
      return [];
    }
  }

  async createFeeStructure(payload: Partial<FeeStructure>): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('fee_structures').insert([payload]).select().single();
      if (error) throw error;
      
      auditLog({
        actor_type: 'staff',
        action: 'FEE_STRUCTURE_CREATED' as any,
        resource_type: 'system',
        resource_id: data.id,
        metadata: { category: payload.fee_category, amount: payload.amount },
      });
      return true;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'FEE-001', { operation: 'INSERT', resource: 'fee_structures' });
      logger.error('FEE_CREATE_STRUCTURE_ERROR', { error: appErr });
      return false;
    }
  }

  async updateFeeStructure(id: string, payload: Partial<FeeStructure>): Promise<boolean> {
    try {
      const { error } = await supabase.from('fee_structures').update(payload).eq('id', id);
      if (error) throw error;
      
      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        resource_id: id,
        metadata: { action: 'FEE_STRUCTURE_UPDATED', updates: payload },
      });
      return true;
    } catch (err) {
      logger.error('FEE_UPDATE_STRUCTURE_ERROR', { error: err });
      return false;
    }
  }

  async assignFeeToClass(structure: FeeStructure): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const { data: students, error: studentErr } = await supabase
        .from('students')
        .select('id')
        .eq('class_name', structure.class_name);
      
      if (studentErr) throw studentErr;
      if (!students || students.length === 0) {
        return { success: false, message: 'No students found in this class.', count: 0 };
      }

      const { data: existing, error: existingErr } = await supabase
        .from('student_fees')
        .select('student_id')
        .eq('fee_structure_id', structure.id);

      if (existingErr) throw existingErr;
      
      const existingIds = new Set(existing?.map(e => e.student_id) || []);
      const newStudents = students.filter(s => !existingIds.has(s.id));

      if (newStudents.length === 0) {
        return { success: true, message: 'All students in this class already have this fee assigned.', count: 0 };
      }

      const payloads = newStudents.map(student => ({
        student_id: student.id,
        academic_year: structure.academic_year,
        fee_structure_id: structure.id,
        total_due: structure.amount,
        amount_paid: 0,
        status: 'Pending'
      }));

      const { error: insertErr } = await supabase.from('student_fees').insert(payloads);
      if (insertErr) throw insertErr;

      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_BULK_ASSIGNED', structure_id: structure.id, count: payloads.length },
      });

      return { success: true, message: `Successfully assigned fee to ${payloads.length} students.`, count: payloads.length };
    } catch (err) {
      logger.error('FEE_ASSIGN_CLASS_ERROR', { error: err });
      return { success: false, message: 'An error occurred while assigning fees.', count: 0 };
    }
  }

  async recordPayment(payload: FeePayment): Promise<{ success: boolean; message: string; receipt?: string }> {
    try {
      const { data, error } = await supabase.from('fee_payments').insert([payload]).select().single();
      if (error) throw error;

      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_PAYMENT_RECORDED', receipt: payload.receipt_number, amount: payload.amount },
      });

      return { success: true, message: 'Payment recorded successfully', receipt: payload.receipt_number };
    } catch (err) {
      logger.error('FEE_RECORD_PAYMENT_ERROR', { error: err });
      return { success: false, message: 'Failed to record payment' };
    }
  }

  async fetchFeePayments(studentFeeId: string): Promise<FeePayment[]> {
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_fee_id', studentFeeId)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data as FeePayment[];
    } catch (err) {
      logger.error('FEE_FETCH_PAYMENTS_ERROR', { error: err });
      return [];
    }
  }
  async applyDiscount(studentFeeId: string, originalAmount: number, discountAmount: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      if (discountAmount < 0 || discountAmount > originalAmount) {
        return { success: false, message: 'Invalid discount amount' };
      }
      
      const newTotal = originalAmount - discountAmount;
      
      const { error } = await supabase
        .from('student_fees')
        .update({ 
          discount_amount: discountAmount,
          total_due: newTotal
        })
        .eq('id', studentFeeId);

      if (error) throw error;

      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_DISCOUNT_APPLIED', student_fee_id: studentFeeId, discount: discountAmount, reason },
      });

      return { success: true, message: 'Discount applied successfully' };
    } catch (err) {
      logger.error('FEE_APPLY_DISCOUNT_ERROR', { error: err });
      return { success: false, message: 'Failed to apply discount' };
    }
  }

  async waiveFee(studentFeeId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('student_fees')
        .update({ status: 'Waived' })
        .eq('id', studentFeeId);

      if (error) throw error;

      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_WAIVED', student_fee_id: studentFeeId, reason },
      });

      return { success: true, message: 'Fee waived successfully' };
    } catch (err) {
      logger.error('FEE_WAIVE_ERROR', { error: err });
      return { success: false, message: 'Failed to waive fee' };
    }
  }
}

export const feeService = new FeeService();

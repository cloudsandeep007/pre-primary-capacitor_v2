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
  category_id?: string;
  due_date?: string;
  fee_period?: string;
  discount_amount: number;
  total_due: number;
  amount_paid: number;
  status: string;
  student?: {
    name: string;
    class_name: string;
  };
  structure?: FeeStructure;
  category?: {
    name: string;
  };
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
  category_name?: string; // For UI display
  status?: string;        // 'Completed' | 'Refunded' | 'Pending' | 'Failed'
  reversal_note?: string;
  reversed_at?: string;
  reversed_by?: string;
  period_type?: string;
  period_value?: string;
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
          structure:fee_structures (*, category:fee_categories(*)),
          category:fee_categories(name)
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

  async deleteFeeStructure(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) throw error;
      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'FEE_STRUCTURE_DELETED', id }
      });
      return true;
    } catch (err) {
      logger.error('FEE_DELETE_STRUCTURE_ERROR', { error: err });
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
        category_id: structure.category_id || null,
        due_date: structure.due_date || null,
        fee_period: structure.frequency,
        total_due: structure.amount,
        amount_paid: 0,
        discount_amount: 0,
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
        metadata: { action: 'FEE_PAYMENT_RECORDED', receipt: payload.receipt_number, amount: payload.amount, period: payload.period_value },
      });

      return { success: true, message: 'Payment recorded successfully', receipt: payload.receipt_number };
    } catch (err) {
      logger.error('FEE_RECORD_PAYMENT_ERROR', { error: err });
      return { success: false, message: 'Failed to record payment' };
    }
  }

  async recordAdhocPayment(
    studentId: string,
    academicYear: string,
    categoryId: string,
    amount: number,
    paymentMode: string,
    referenceNumber?: string,
    remarks?: string
  ): Promise<{ success: boolean; message: string; receipt?: string }> {
    try {
      // 1. Create student_fees record first
      const feePayload = {
        student_id: studentId,
        academic_year: academicYear,
        category_id: categoryId,
        total_due: amount,
        amount_paid: amount,
        status: 'Paid'
      };

      const { data: feeData, error: feeErr } = await supabase
        .from('student_fees')
        .insert([feePayload])
        .select()
        .single();
      
      if (feeErr) throw feeErr;

      // 2. Create the payment record
      const receiptNo = `RCPT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const paymentPayload: FeePayment = {
        student_fee_id: feeData.id,
        amount,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        receipt_number: receiptNo,
        remarks: remarks || 'Ad-hoc Payment'
      };

      const { error: payErr } = await supabase.from('fee_payments').insert([paymentPayload]);
      if (payErr) throw payErr;

      auditLog({
        actor_type: 'staff',
        action: 'SYSTEM_UPDATED' as any,
        resource_type: 'system',
        metadata: { action: 'ADHOC_FEE_PAYMENT_RECORDED', receipt: receiptNo, amount },
      });

      return { success: true, message: 'Ad-hoc Payment recorded', receipt: receiptNo };
    } catch (err) {
      logger.error('FEE_ADHOC_PAYMENT_ERROR', { error: err });
      return { success: false, message: 'Failed to record ad-hoc payment' };
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

  async fetchPaymentsForStudent(studentId: string, academicYear: string): Promise<FeePayment[]> {
    try {
      const { data: ledgers, error: ledgerErr } = await supabase
        .from('student_fees')
        .select('id, category:fee_categories(name), structure:fee_structures(category:fee_categories(name))')
        .eq('student_id', studentId)
        .eq('academic_year', academicYear);
      
      if (ledgerErr) throw ledgerErr;
      if (!ledgers || ledgers.length === 0) return [];

      const ledgerIds = ledgers.map(l => l.id);
      
      const { data: payments, error: payErr } = await supabase
        .from('fee_payments')
        .select('*')
        .in('student_fee_id', ledgerIds)
        .order('payment_date', { ascending: false });
        
      if (payErr) throw payErr;
      
      // Inject category name into payment for UI display
      return (payments || []).map(p => {
        const ledger: any = ledgers.find(l => l.id === p.student_fee_id);
        const catName = ledger?.category?.name || ledger?.structure?.category?.name || 'Fee';
        return { ...p, category_name: catName };
      }) as FeePayment[];
    } catch (err) {
      logger.error('FEE_FETCH_STUDENT_PAYMENTS_ERROR', { error: err });
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

  /**
   * Safely reverse a recorded payment.
   * Sets fee_payments.status = 'Refunded' and adjusts the parent ledger's amount_paid.
   * Does NOT delete the row — the record is preserved for audit.
   * The DB trigger only fires on INSERT/DELETE, so we manually adjust student_fees here.
   */
  async reversePayment(
    paymentId: string,
    studentFeeId: string,
    amount: number,
    note: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Mark the payment as Refunded
      const { error: payErr } = await supabase
        .from('fee_payments')
        .update({
          status: 'Refunded',
          reversal_note: note,
          reversed_by: session?.user.id ?? null,
          reversed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (payErr) throw payErr;

      // 2. Fetch current ledger to recalculate status
      const { data: ledger, error: ledgerFetchErr } = await supabase
        .from('student_fees')
        .select('amount_paid, total_due')
        .eq('id', studentFeeId)
        .single();

      if (ledgerFetchErr) throw ledgerFetchErr;

      const newAmountPaid = Math.max(0, (ledger.amount_paid || 0) - amount);
      const newStatus =
        newAmountPaid >= ledger.total_due ? 'Paid'
        : newAmountPaid > 0 ? 'Partially Paid'
        : 'Pending';

      // 3. Adjust parent ledger
      const { error: ledgerErr } = await supabase
        .from('student_fees')
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq('id', studentFeeId);

      if (ledgerErr) throw ledgerErr;

      auditLog({
        actor_type: 'admin',
        action: 'FEE_PAYMENT_REVERSED',
        resource_type: 'system',
        metadata: { payment_id: paymentId, amount_reversed: amount, reason: note },
      });

      return { success: true, message: `Payment of ₹${amount.toLocaleString()} reversed successfully.` };
    } catch (err) {
      logger.error('FEE_REVERSE_PAYMENT_ERROR', { error: err });
      return { success: false, message: 'Failed to reverse payment.' };
    }
  }
}

export const feeService = new FeeService();

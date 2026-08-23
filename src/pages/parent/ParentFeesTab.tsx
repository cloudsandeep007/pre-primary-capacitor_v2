import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { StudentFee, FeePayment } from '@/services/feeService';
import { showToast } from '@/components/Toast';
import { generateFeeReceiptHtml, printReceipt } from '@/lib/receiptUtils';

interface Props {
  student: Student;
}

export function ParentFeesTab({ student }: Props) {
  const [ledgers, setLedgers] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<Record<string, FeePayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLedger, setExpandedLedger] = useState<string | null>(null);

  useEffect(() => {
    loadFees();
  }, [student.id]);

  const loadFees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          *,
          structure:fee_structures (*, category:fee_categories(*))
        `)
        .eq('student_id', student.id);
      
      if (error) throw error;
      setLedgers(data as unknown as StudentFee[]);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load fee information');
    }
    setLoading(false);
  };

  const loadPayments = async (ledgerId: string) => {
    if (payments[ledgerId]) {
      setExpandedLedger(expandedLedger === ledgerId ? null : ledgerId);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('student_fee_id', ledgerId)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      
      setPayments(prev => ({ ...prev, [ledgerId]: data as FeePayment[] }));
      setExpandedLedger(ledgerId);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintReceipt = (pay: FeePayment, ledger: StudentFee) => {
    const html = generateFeeReceiptHtml(student.name, student.class_name, pay, ledger);
    printReceipt(html);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading fee records...</div>;
  }

  const totalExpected = ledgers.reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const totalCollected = ledgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalPending = totalExpected - totalCollected;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in pb-24">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm">
          <div className="flex items-center gap-2 text-teal-600 mb-1">
            <CheckCircle size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Paid</h3>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">₹{totalCollected.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <AlertCircle size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Due</h3>
          </div>
          <p className="text-2xl font-extrabold text-rose-700">₹{totalPending.toLocaleString()}</p>
        </div>
      </div>

      {/* Ledgers */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <DollarSign size={18} className="text-teal-500" /> Fee Details
        </h3>
        
        {ledgers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
            <Clock className="mx-auto text-slate-300 mb-3" size={32} />
            <p className="text-slate-500 font-medium">No fee structures assigned yet.</p>
          </div>
        ) : (
          ledgers.map(ledger => (
            <div key={ledger.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div 
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => loadPayments(ledger.id!)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{ledger.structure?.category?.name || ledger.structure?.fee_category}</h4>
                    <p className="text-xs text-slate-500">{ledger.academic_year}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    ledger.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                    ledger.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {ledger.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Total Amount</p>
                    <p className="text-sm font-bold text-slate-700">₹{ledger.total_due.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Pending</p>
                    <p className="text-sm font-bold text-rose-600">₹{(ledger.total_due - ledger.amount_paid).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {expandedLedger === ledger.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-5">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment History</h5>
                  
                  {(!payments[ledger.id] || payments[ledger.id].length === 0) ? (
                    <p className="text-sm text-slate-500 italic">No payments recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {payments[ledger.id].map(pay => (
                        <div key={pay.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{new Date(pay.payment_date || '').toLocaleDateString('en-IN')}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pay.receipt_number}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">₹{pay.amount.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400">{pay.payment_mode}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintReceipt(pay, ledger);
                              }}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                              title="Download Receipt"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

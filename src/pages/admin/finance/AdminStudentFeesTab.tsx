import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, CreditCard, FileText, Percent, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { feeService, StudentFee, FeePayment } from '@/services/feeService';
import { showToast } from '@/components/Toast';
import { generateFeeReceiptHtml, printReceipt } from '@/lib/receiptUtils';

interface Props {
  student: Student;
}

export function AdminStudentFeesTab({ student }: Props) {
  const [ledgers, setLedgers] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Collection State
  const [paymentTarget, setPaymentTarget] = useState<StudentFee | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // History State
  const [historyTarget, setHistoryTarget] = useState<StudentFee | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([]);

  // Adjustments State
  const [discountTarget, setDiscountTarget] = useState<StudentFee | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);

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
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLedgers(data as unknown as StudentFee[]);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load fee information');
    }
    setLoading(false);
  };

  const handleOpenPayment = (ledger: StudentFee) => {
    const pendingAmount = ledger.total_due - ledger.amount_paid;
    setPayAmount(pendingAmount.toString());
    setPayMode('Cash');
    setPayRef('');
    setPayRemarks('');
    setPaymentTarget(ledger);
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return showToast('error', 'Valid amount is required');
    if (['UPI', 'Cheque', 'Bank Transfer'].includes(payMode) && !payRef) {
      return showToast('error', `Reference number is required for ${payMode}`);
    }

    setIsPaying(true);
    const receiptNo = `RCPT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const payload: FeePayment = {
      student_fee_id: paymentTarget.id,
      amount,
      payment_mode: payMode,
      reference_number: payRef || undefined,
      receipt_number: receiptNo,
      remarks: payRemarks || undefined
    };

    const result = await feeService.recordPayment(payload);
    if (result.success) {
      showToast('success', `Payment recorded. Receipt: ${result.receipt}`);
      setPaymentTarget(null);
      loadFees(); // Refresh
    } else {
      showToast('error', result.message);
    }
    setIsPaying(false);
  };

  const handleViewHistory = async (ledger: StudentFee) => {
    setHistoryTarget(ledger);
    const history = await feeService.fetchFeePayments(ledger.id!);
    setPaymentHistory(history);
  };

  const handleApplyDiscount = async () => {
    if (!discountTarget) return;
    const amount = Number(discountAmount);
    if (isNaN(amount) || amount < 0) return showToast('error', 'Valid amount is required');
    if (!discountReason) return showToast('error', 'Reason is required');
    
    setIsApplyingAdjustment(true);
    const originalAmount = discountTarget.structure?.amount || discountTarget.total_due + discountTarget.discount_amount;
    const result = await feeService.applyDiscount(discountTarget.id, originalAmount, amount, discountReason);
    if (result.success) {
      showToast('success', result.message);
      setDiscountTarget(null);
      loadFees();
    } else {
      showToast('error', result.message);
    }
    setIsApplyingAdjustment(false);
  };

  const handleWaiveFee = async (ledger: StudentFee) => {
    if (!confirm(`Are you sure you want to waive the fee for ${ledger.structure?.fee_category}?`)) return;
    
    const reason = prompt('Please provide a reason for waiving this fee:');
    if (!reason) return;

    setIsApplyingAdjustment(true);
    const result = await feeService.waiveFee(ledger.id, reason);
    if (result.success) {
      showToast('success', result.message);
      loadFees();
    } else {
      showToast('error', result.message);
    }
    setIsApplyingAdjustment(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading fee records...</div>;
  }

  return (
    <div className="space-y-4">
      {ledgers.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
          <p className="text-slate-500 font-medium text-sm">No fee structures assigned yet.</p>
        </div>
      ) : (
        ledgers.map(ledger => (
          <div key={ledger.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{ledger.structure?.category?.name || ledger.structure?.fee_category}</h4>
                <p className="text-[10px] text-slate-500 font-semibold">{ledger.academic_year}</p>
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                ledger.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                ledger.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {ledger.status}
              </span>
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Amount Due</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-700">₹{ledger.total_due.toLocaleString()}</p>
                  {ledger.discount_amount > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                      -₹{ledger.discount_amount}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pending</p>
                <p className="text-sm font-bold text-rose-600">₹{(ledger.total_due - ledger.amount_paid).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex justify-end gap-2 flex-wrap">
              <button 
                onClick={() => handleViewHistory(ledger)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <FileText size={12} /> History
              </button>
              
              {ledger.status !== 'Paid' && ledger.status !== 'Waived' && (
                <>
                  <button 
                    onClick={() => {
                      setDiscountTarget(ledger);
                      setDiscountAmount(ledger.discount_amount?.toString() || '0');
                      setDiscountReason('');
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Percent size={12} /> Discount
                  </button>
                  <button 
                    onClick={() => handleWaiveFee(ledger)}
                    disabled={isApplyingAdjustment}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <XCircle size={12} /> Waive
                  </button>
                  <button 
                    onClick={() => handleOpenPayment(ledger)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <CreditCard size={12} /> Collect
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Discount Modal inside Drawer */}
      {discountTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoom-in">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Apply Discount</h2>
              <p className="text-xs text-slate-500 mt-0.5">Adjusting fee for {student.name}</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Discount Amount (₹)</label>
                <input 
                  type="number" 
                  value={discountAmount} 
                  onChange={e => setDiscountAmount(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Reason *</label>
                <input 
                  type="text" 
                  value={discountReason} 
                  onChange={e => setDiscountReason(e.target.value)} 
                  placeholder="e.g. Sibling Discount"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => setDiscountTarget(null)}
                disabled={isApplyingAdjustment}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyDiscount}
                disabled={isApplyingAdjustment}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isApplyingAdjustment ? 'Applying...' : 'Apply Discount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal inside Drawer */}
      {paymentTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoom-in">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Record Payment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Collecting fee for {student.name}</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Amount (₹)</label>
                <input 
                  type="number" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Payment Mode</label>
                <select 
                  value={payMode} 
                  onChange={e => setPayMode(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {['UPI', 'Cheque', 'Bank Transfer'].includes(payMode) && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Reference Number *</label>
                  <input 
                    type="text" 
                    value={payRef} 
                    onChange={e => setPayRef(e.target.value)} 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => setPaymentTarget(null)}
                disabled={isPaying}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleRecordPayment}
                disabled={isPaying}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isPaying ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal inside Drawer */}
      {historyTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-zoom-in">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Payment History</h2>
                <p className="text-xs text-slate-500">{historyTarget.structure?.category?.name || historyTarget.structure?.fee_category}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">✕</button>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-3">
              {historyTarget.status === 'Waived' && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-rose-800">Fee Waived</p>
                    <p className="text-[10px] text-rose-600 font-mono mt-0.5">ADJUSTMENT</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">WAIVED</p>
                  </div>
                </div>
              )}
              {historyTarget.discount_amount > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-amber-800">Discount Applied</p>
                    <p className="text-[10px] text-amber-600 font-mono mt-0.5">ADJUSTMENT</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">-₹{historyTarget.discount_amount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {paymentHistory.length === 0 && !historyTarget.discount_amount && historyTarget.status !== 'Waived' ? (
                <p className="text-center text-sm text-slate-500 py-4">No payments or adjustments recorded.</p>
              ) : (
                paymentHistory.map(pay => (
                  <div key={pay.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{new Date(pay.payment_date || '').toLocaleDateString('en-IN')}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{pay.receipt_number}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">₹{pay.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{pay.payment_mode}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const html = generateFeeReceiptHtml(student.name, student.class_name, pay, historyTarget);
                          printReceipt(html);
                        }}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors"
                        title="Print Receipt"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

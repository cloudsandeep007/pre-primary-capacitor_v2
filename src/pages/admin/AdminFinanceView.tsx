import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, FileText, CheckCircle, AlertCircle, Clock, Settings, CreditCard, Percent, XCircle, Download } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { feeService, FeeStructure, StudentFee, FeePayment } from '@/services/feeService';
import { settingsService } from '@/services/settingsService';
import { FeeConfigurationTab } from './finance/FeeConfigurationTab';
import { downloadFile } from '@/lib/plugins/filesystem';
import { generateFeeReceiptHtml, printReceipt } from '@/lib/receiptUtils';

export function AdminFinanceView() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [ledgers, setLedgers] = useState<StudentFee[]>([]);
  const [activeYear, setActiveYear] = useState<string>('2026-2027');
  const [activeTab, setActiveTab] = useState<'overview' | 'config'>('overview');

  // Payment Modal State
  const [paymentTarget, setPaymentTarget] = useState<StudentFee | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // History Modal State
  const [historyTarget, setHistoryTarget] = useState<StudentFee | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([]);

  useEffect(() => {
    loadData();
  }, [activeYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const settings = await settingsService.fetchAllSettings();
      const yearSetting = settings.find(s => s.setting_key === 'academic_year');
      const year = yearSetting ? String(yearSetting.setting_value).replace(/"/g, '') : '2026-2027';
      setActiveYear(year);

      const [strData, ledData] = await Promise.all([
        feeService.fetchFeeStructures(year),
        feeService.fetchStudentFees(year)
      ]);
      setStructures(strData);
      setLedgers(ledData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewHistory = async (ledger: StudentFee) => {
    setHistoryTarget(ledger);
    const history = await feeService.fetchFeePayments(ledger.id!);
    setPaymentHistory(history);
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
      loadData(); // Refresh ledger
    } else {
      showToast('error', result.message);
    }
    setIsPaying(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading financial records...</div>;
  }

  const totalExpected = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const totalCollected = ledgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalPending = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due - curr.amount_paid), 0);
  const totalDiscounts = ledgers.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);
  const totalWaivedCount = ledgers.filter(l => l.status === 'Waived').length;

  const handleExportCSV = async () => {
    const headers = ['Student Name', 'Class', 'Fee Category', 'Original Fee', 'Discount', 'Adjusted Due', 'Amount Paid', 'Pending', 'Status'];
    const csvContent = ledgers.map(l => {
      const original = (l.total_due + (l.discount_amount || 0));
      const pending = l.total_due - l.amount_paid;
      return [
        `"${l.student?.name || ''}"`,
        `"${l.student?.class_name || ''}"`,
        `"${l.structure?.category?.name || l.structure?.fee_category || ''}"`,
        original,
        l.discount_amount || 0,
        l.total_due,
        l.amount_paid,
        l.status === 'Waived' ? 0 : pending,
        `"${l.status}"`
      ].join(',');
    });
    
    const csvData = [headers.join(','), ...csvContent].join('\n');
    await downloadFile(`fee_ledgers_${activeYear}.csv`, csvData, 'text/csv', false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Fee Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">Manage fee structures and student ledgers for {activeYear}</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <DollarSign size={16} /> Ledger Overview
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'config'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Settings size={16} /> Configurations
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <FeeConfigurationTab activeYear={activeYear} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1.5">
                <FileText size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Total Expected</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">₹{totalExpected.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
                <CheckCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Collected</h3>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">₹{totalCollected.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 mb-1.5">
                <AlertCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Pending Dues</h3>
              </div>
              <p className="text-2xl font-extrabold text-rose-700">₹{totalPending.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-1.5">
                <Percent size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Discounts</h3>
              </div>
              <p className="text-2xl font-extrabold text-amber-700">₹{totalDiscounts.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 mb-1.5">
                <XCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Waived Fees</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-700">{totalWaivedCount} <span className="text-sm font-normal text-slate-500">students</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Student Fee Ledger</h2>
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
            
            {ledgers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Clock className="text-slate-300 mb-3" size={48} />
                <h3 className="text-lg font-bold text-slate-700">No Ledgers Active</h3>
                <p className="text-slate-500 max-w-md mt-1">There are no fee ledgers generated for {activeYear} yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Student</th>
                      <th className="p-4 font-semibold">Fee Category</th>
                      <th className="p-4 font-semibold">Total Due</th>
                      <th className="p-4 font-semibold">Paid</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgers.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{l.student?.name}</p>
                          <p className="text-xs text-slate-500">{l.student?.class_name}</p>
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-700">{l.structure?.category?.name || l.structure?.fee_category}</td>
                        <td className="p-4 font-bold text-slate-800">₹{l.total_due.toLocaleString()}</td>
                        <td className="p-4 font-bold text-emerald-600">₹{l.amount_paid.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            l.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleViewHistory(l)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                              title="View Receipts"
                            >
                              <FileText size={14} /> History
                            </button>
                            {l.status !== 'Paid' && (
                              <button 
                                onClick={() => handleOpenPayment(l)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                              >
                                <CreditCard size={14} /> Collect
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment History Modal */}
      {historyTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
                <p className="text-sm text-slate-500 mt-1">{historyTarget.student?.name} • {historyTarget.structure?.category?.name || historyTarget.structure?.fee_category}</p>
              </div>
              <button 
                onClick={() => setHistoryTarget(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              {paymentHistory.length === 0 && !historyTarget.discount_amount && historyTarget.status !== 'Waived' ? (
                <div className="p-12 text-center text-slate-500">
                  No payments or adjustments recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0">
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Receipt/Ref</th>
                      <th className="p-4 font-semibold">Mode</th>
                      <th className="p-4 font-semibold">Reference</th>
                      <th className="p-4 font-semibold text-right">Amount</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyTarget.status === 'Waived' && (
                      <tr className="bg-rose-50/50">
                        <td className="p-4 text-sm font-medium text-rose-800">
                          -
                        </td>
                        <td className="p-4 text-sm font-mono text-rose-500">ADJUSTMENT</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold uppercase">
                            WAIVED
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">-</td>
                        <td className="p-4 text-sm font-bold text-rose-600 text-right">
                          WAIVED
                        </td>
                        <td className="p-4 text-right"></td>
                      </tr>
                    )}
                    {historyTarget.discount_amount > 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="p-4 text-sm font-medium text-amber-800">
                          -
                        </td>
                        <td className="p-4 text-sm font-mono text-amber-500">ADJUSTMENT</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase">
                            DISCOUNT
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">-</td>
                        <td className="p-4 text-sm font-bold text-amber-600 text-right">
                          -₹{historyTarget.discount_amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-right"></td>
                      </tr>
                    )}
                    {paymentHistory.map(pay => (
                      <tr key={pay.id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm font-medium text-slate-800">
                          {new Date(pay.payment_date || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-sm font-mono text-slate-500">{pay.receipt_number}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">
                            {pay.payment_mode}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{pay.reference_number || '-'}</td>
                        <td className="p-4 text-sm font-bold text-emerald-600 text-right">
                          ₹{pay.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => {
                              const html = generateFeeReceiptHtml(
                                historyTarget.student?.name || '',
                                historyTarget.student?.class_name || '',
                                pay,
                                historyTarget
                              );
                              printReceipt(html);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Print Receipt"
                          >
                            <FileText size={16} /> <span className="text-xs font-bold uppercase">Print</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setHistoryTarget(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Record Payment</h2>
              <p className="text-sm text-slate-500 mt-1">Collecting fee for {paymentTarget.student?.name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Balance</p>
                  <p className="text-2xl font-extrabold text-slate-800">₹{(paymentTarget.total_due - paymentTarget.amount_paid).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fee Type</p>
                  <p className="text-sm font-bold text-indigo-600">{paymentTarget.structure?.category?.name || paymentTarget.structure?.fee_category}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Amount Received (₹)</label>
                <input 
                  type="number" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Payment Mode</label>
                <select 
                  value={payMode} 
                  onChange={e => setPayMode(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {['UPI', 'Cheque', 'Bank Transfer'].includes(payMode) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Reference Number *</label>
                  <input 
                    type="text" 
                    value={payRef} 
                    onChange={e => setPayRef(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Transaction ID or Cheque No."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={payRemarks} 
                  onChange={e => setPayRemarks(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setPaymentTarget(null)}
                disabled={isPaying}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleRecordPayment}
                disabled={isPaying}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isPaying ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

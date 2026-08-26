import React from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { FeePayment, StudentFee } from '@/services/feeService';
import { generateFeeReceiptHtml } from '@/lib/receiptUtils';

interface HistoryModalProps {
  historyTarget: StudentFee | null;
  paymentHistory: FeePayment[];
  onClose: () => void;
  onPrintInvoice: () => void;
  onPrintReceipt: (html: string) => void;
  onReversePayment: (pay: FeePayment) => void;
  canDelete: boolean;
}

export function HistoryModal({
  historyTarget,
  paymentHistory,
  onClose,
  onPrintInvoice,
  onPrintReceipt,
  onReversePayment,
  canDelete,
}: HistoryModalProps) {
  if (!historyTarget) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Payment History</h2>
            <p className="text-sm text-slate-500 mt-1">
              {historyTarget.student?.name} • {historyTarget.structure?.category?.name || historyTarget.structure?.fee_category}
            </p>
          </div>
          <button
            onClick={onPrintInvoice}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors inline-flex items-center gap-2"
          >
            <FileText size={16} /> Print Full Invoice
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {paymentHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No payments recorded for this ledger yet.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Receipt No.</th>
                  <th className="pb-3 font-semibold">Mode / Ref</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paymentHistory.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-700">
                      {new Date(pay.payment_date || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-800">
                      {pay.receipt_number}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700">{pay.payment_mode}</p>
                      {pay.reference_number && <p className="text-xs text-slate-400">{pay.reference_number}</p>}
                      {pay.period_type && pay.period_type !== 'Unspecified' && (
                        <p className="text-[10px] font-bold text-indigo-500 mt-0.5 uppercase tracking-wider">{pay.period_value} ({pay.period_type})</p>
                      )}
                    </td>
                    <td className="p-4 text-sm font-bold text-emerald-600 text-right">
                      ₹{pay.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      {pay.status === 'Refunded' ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-md">REVERSED</span>
                          {pay.reversal_note && (
                            <span className="text-[10px] text-slate-400 max-w-[120px] text-right">{pay.reversal_note}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const html = generateFeeReceiptHtml(
                                historyTarget.student?.name || '',
                                historyTarget.student?.class_name || '',
                                pay,
                                historyTarget
                              );
                              onPrintReceipt(html);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Print Receipt"
                          >
                            <FileText size={16} /> <span className="text-xs font-bold uppercase">Print</span>
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => onReversePayment(pay)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Reverse this payment"
                            >
                              <RotateCcw size={16} /> <span className="text-xs font-bold uppercase">Reverse</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

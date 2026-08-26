import React from 'react';
import { StudentFee } from '@/services/feeService';

interface RecordPaymentModalProps {
  paymentTarget: StudentFee | null;
  payAmount: string;
  setPayAmount: (val: string) => void;
  payMode: string;
  setPayMode: (val: string) => void;
  payRef: string;
  setPayRef: (val: string) => void;
  payRemarks: string;
  setPayRemarks: (val: string) => void;
  payPeriodType: string;
  setPayPeriodType: (val: string) => void;
  payPeriodValue: string;
  setPayPeriodValue: (val: string) => void;
  isPaying: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RecordPaymentModal({
  paymentTarget,
  payAmount,
  setPayAmount,
  payMode,
  setPayMode,
  payRef,
  setPayRef,
  payRemarks,
  setPayRemarks,
  payPeriodType,
  setPayPeriodType,
  payPeriodValue,
  setPayPeriodValue,
  isPaying,
  onClose,
  onConfirm,
}: RecordPaymentModalProps) {
  if (!paymentTarget) return null;

  return (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Payment Period</label>
              <select
                value={payPeriodType}
                onChange={e => { setPayPeriodType(e.target.value); setPayPeriodValue(''); }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Unspecified">Unspecified</option>
                <option value="Monthly">Monthly</option>
                <option value="Term">Termly</option>
                <option value="Yearly">Yearly</option>
                <option value="One-time">One-time</option>
              </select>
            </div>
            
            {payPeriodType !== 'Unspecified' && payPeriodType !== 'One-time' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  {payPeriodType === 'Monthly' ? 'Month' : payPeriodType === 'Term' ? 'Term Name' : 'Year'} *
                </label>
                <input
                  type={payPeriodType === 'Monthly' ? 'month' : 'text'}
                  value={payPeriodValue}
                  onChange={e => setPayPeriodValue(e.target.value)}
                  placeholder={payPeriodType === 'Term' ? 'e.g. Term 1' : payPeriodType === 'Yearly' ? 'e.g. 2026-27' : ''}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

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
            onClick={onClose}
            disabled={isPaying}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPaying}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isPaying ? 'Processing...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

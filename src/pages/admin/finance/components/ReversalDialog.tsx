import React from 'react';
import { RotateCcw } from 'lucide-react';
import { FeePayment } from '@/services/feeService';

interface ReversalDialogProps {
  reversalTarget: FeePayment | null;
  reversalNote: string;
  setReversalNote: (note: string) => void;
  isReversing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReversalDialog({
  reversalTarget,
  reversalNote,
  setReversalNote,
  isReversing,
  onClose,
  onConfirm,
}: ReversalDialogProps) {
  if (!reversalTarget) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-rose-100 bg-rose-50">
          <div className="flex items-center gap-3">
            <RotateCcw size={20} className="text-rose-600" />
            <h2 className="text-lg font-bold text-rose-800">Reverse Payment</h2>
          </div>
          <p className="text-sm text-rose-600 mt-1">
            ₹{reversalTarget.amount.toLocaleString()} • {reversalTarget.receipt_number}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            ⚠️ This will mark the payment as <strong>Refunded</strong> and reduce the student's paid amount. The record is preserved for audit.
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Reason for Reversal *</label>
            <textarea
              value={reversalNote}
              onChange={e => setReversalNote(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none h-20"
              placeholder="e.g. Cheque bounced, duplicate entry..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isReversing}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isReversing || !reversalNote.trim()}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} /> {isReversing ? 'Reversing...' : 'Confirm Reversal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

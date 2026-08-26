import React from 'react';
import { CreditCard, CheckCircle, Bell, Clock } from 'lucide-react';
import { StudentFee } from '@/services/feeService';

interface DefaultersTableProps {
  defaulters: StudentFee[];
  remindedIds: Set<string>;
  onCollect: (ledger: StudentFee) => void;
  onRemind: (ledger: StudentFee) => void;
  getAgingBucket: (dueDate?: string) => { label: string; color: string };
}

export function DefaultersTable({
  defaulters,
  remindedIds,
  onCollect,
  onRemind,
  getAgingBucket
}: DefaultersTableProps) {
  if (defaulters.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center">
        <CheckCircle className="text-emerald-400 mb-3" size={48} />
        <h3 className="text-lg font-bold text-slate-700">All Clear!</h3>
        <p className="text-slate-500 max-w-md mt-1">There are no overdue payments. Great job on collections!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="p-4 font-semibold">Student</th>
            <th className="p-4 font-semibold">Fee Category</th>
            <th className="p-4 font-semibold">Aging</th>
            <th className="p-4 font-semibold text-right">Pending Amount</th>
            <th className="p-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {defaulters.map(l => {
            const pending = (l.total_due || 0) - (l.amount_paid || 0);
            const aging = getAgingBucket(l.due_date);
            return (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <p className="font-bold text-slate-800">{l.student?.name}</p>
                  <p className="text-xs text-slate-500">{l.student?.class_name}</p>
                </td>
                <td className="p-4 text-sm font-medium text-slate-700">{l.structure?.category?.name || l.structure?.fee_category}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 w-max ${aging.color}`}>
                    <Clock size={12} /> {aging.label}
                  </span>
                </td>
                <td className="p-4 text-right font-extrabold text-rose-600 text-base">₹{pending.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onCollect(l)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <CreditCard size={13} /> Collect
                    </button>
                    {remindedIds.has(l.id!) ? (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                        <CheckCircle size={13} /> Reminded
                      </span>
                    ) : (
                      <button
                        onClick={() => onRemind(l)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                        title="Log a reminder for this student"
                      >
                        <Bell size={13} /> Remind
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

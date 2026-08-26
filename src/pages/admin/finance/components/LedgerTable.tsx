import React, { useState } from 'react';
import { CreditCard, FileText, Clock, X, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentFee } from '@/services/feeService';

export interface StudentGroup {
  studentId: string;
  studentName: string;
  className: string;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  globalOutstanding: number;
  ledgers: StudentFee[];
}

interface LedgerTableProps {
  groups: StudentGroup[];
  activeYear: string;
  onViewHistory: (ledger: StudentFee) => void;
  onCollect: (ledger: StudentFee) => void;
}

export function LedgerTable({
  groups,
  activeYear,
  onViewHistory,
  onCollect,
}: LedgerTableProps) {
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = groups.find(g => g.studentId === selectedStudentId);

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <Clock className="text-slate-300 mb-3" size={48} />
        <h3 className="text-lg font-bold text-slate-700">No Match Found</h3>
        <p className="text-slate-500 max-w-md mt-1">There are no students matching the current filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* MASTER TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
              <th className="p-4 font-bold">Student</th>
              <th className="p-4 font-bold">Total Expected</th>
              <th className="p-4 font-bold">Collected</th>
              <th className="p-4 font-bold">Outstanding</th>
              <th className="p-4 font-bold text-center">Status</th>
              <th className="p-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map(group => {
              const isPaid = group.globalOutstanding <= 0;
              return (
                <tr key={group.studentId} className="hover:bg-indigo-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudentId(group.studentId)}>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{group.studentName}</p>
                    <p className="text-xs text-slate-500">{group.className}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-700">₹{group.totalDue.toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-emerald-600">₹{group.totalPaid.toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className={`font-bold ${isPaid ? 'text-slate-400' : 'text-rose-600'}`}>
                      ₹{group.outstanding.toLocaleString()}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                        <CheckCircle2 size={12} /> Clear
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-1 rounded-md">
                        <AlertCircle size={12} /> Dues
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedStudentId(group.studentId); }}
                      className="text-indigo-600 font-semibold text-sm hover:text-indigo-700 flex items-center justify-end gap-1 w-full"
                    >
                      Breakup <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DETAIL SLIDE-OVER (Breakdown Panel) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedStudentId(null)}
          />
          
          {/* Panel */}
          <div className="absolute top-0 right-0 bottom-0 w-full md:w-[500px] bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col transform transition-transform animate-slide-in-right">
            
            {/* Panel Header */}
            <div className="bg-white p-5 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedStudent.studentName}</h2>
                <p className="text-sm text-slate-500">{selectedStudent.className} • {activeYear}</p>
              </div>
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Panel KPIs */}
            <div className="bg-white px-5 py-4 border-b border-slate-200 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expected</p>
                <p className="font-bold text-slate-800">₹{selectedStudent.totalDue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Collected</p>
                <p className="font-bold text-emerald-600">₹{selectedStudent.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Outstanding</p>
                <p className={`font-bold ${selectedStudent.outstanding <= 0 ? 'text-emerald-500' : 'text-rose-600'}`}>
                  ₹{selectedStudent.outstanding.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Panel Body (Categories) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fee Breakup</h4>
              
              {selectedStudent.ledgers.map(l => {
                const categoryName = l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'General Fee';
                const isPaid = l.status === 'Paid' || l.status === 'Waived';
                
                return (
                  <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 hover:border-indigo-200 transition-colors shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm">{categoryName}</h5>
                        {l.structure && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {l.structure.frequency} • Due: {l.due_date ? new Date(l.due_date).toLocaleDateString('en-IN', {month: 'short', year: 'numeric'}) : 'N/A'}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        l.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        l.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {l.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Due</p>
                        <p className="font-semibold text-slate-700">₹{Number(l.total_due).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Paid</p>
                        <p className="font-semibold text-emerald-600">₹{Number(l.amount_paid).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wide">Balance</p>
                        <p className="font-bold text-slate-800">₹{(Number(l.total_due) - Number(l.amount_paid)).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => onViewHistory(l)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-slate-200"
                      >
                        <FileText size={13} /> History
                      </button>
                      <button
                        onClick={() => onCollect(l)}
                        disabled={isPaid}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm ${
                          isPaid ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <CreditCard size={13} /> Collect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

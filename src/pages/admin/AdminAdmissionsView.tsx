import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { operationsService, Admission } from '@/services/operationsService';

export function AdminAdmissionsView() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setAdmissions(await operationsService.fetchAdmissions());
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading admissions...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admissions Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">Manage new student applications</p>
        </div>
        {can('admissions.write') && (
          <button onClick={() => showToast('info', 'New Application coming soon')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors">
            + New Application
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {admissions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <UserPlus className="text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No Applications</h3>
            <p className="text-slate-500 mt-1">The admissions pipeline is currently empty.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Applicant</th>
                <th className="p-4 font-semibold">Applied Class</th>
                <th className="p-4 font-semibold">Parent Contact</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{a.applicant_name}</td>
                  <td className="p-4 text-sm text-slate-600">{a.applied_class}</td>
                  <td className="p-4 text-sm text-slate-500">{a.parent_name} <br/> <span className="text-xs">{a.contact_phone}</span></td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

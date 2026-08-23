import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { operationsService, Complaint } from '@/services/operationsService';

export function AdminComplaintsView() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setComplaints(await operationsService.fetchComplaints());
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading complaints...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Complaints & Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Manage feedback from staff and parents</p>
        </div>
        {can('complaints.write') && (
          <button onClick={() => showToast('info', 'New Ticket coming soon')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors">
            + New Ticket
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {complaints.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <MessageSquare className="text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No Active Tickets</h3>
            <p className="text-slate-500 mt-1">Everything is running smoothly.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Subject</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{c.subject}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{c.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">{c.status}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

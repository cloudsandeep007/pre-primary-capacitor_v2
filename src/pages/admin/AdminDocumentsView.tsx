import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { operationsService, DocumentMeta } from '@/services/operationsService';

export function AdminDocumentsView() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setDocuments(await operationsService.fetchDocuments());
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading documents...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">School Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage policies, forms, and curriculum documents</p>
        </div>
        {can('documents.write') && (
          <button onClick={() => showToast('info', 'Upload coming soon')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors">
            + Upload Document
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FileText className="text-slate-300 mb-3" size={48} />
            <h3 className="text-lg font-bold text-slate-700">No Documents</h3>
            <p className="text-slate-500 mt-1">Upload files to share with staff or parents.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Visibility</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{d.title}</td>
                  <td className="p-4 text-sm text-slate-600">{d.category}</td>
                  <td className="p-4">
                    {d.is_public ? (
                      <span className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">PUBLIC</span>
                    ) : (
                      <span className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-700">INTERNAL</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Download size={16} />
                    </button>
                    {can('documents.delete') && (
                      <button className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2">
                        <Trash2 size={16} />
                      </button>
                    )}
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

import React, { useState } from 'react';
import { Staff } from '@/lib/types';
import { X, Search, UserCheck, ShieldAlert, BookOpen, Download, Trash2, Edit2 } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { staffService } from '@/services/staffService';

interface StaffDetailsDrawerProps {
  staff: Staff;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function StaffDetailsDrawer({ staff, onClose, onDelete }: StaffDetailsDrawerProps) {
  const { can } = usePermissions();
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right" 
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-800">Staff Profile</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0 text-3xl font-bold text-amber-500">
              {staff.photo_url ? (
                <img src={staff.photo_url} alt={staff.name} className="w-full h-full object-cover" />
              ) : staff.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{staff.name}</h1>
              <p className="text-sm text-slate-500">{staff.email}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Security</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 font-medium">Status</span>
                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1"><UserCheck size={14}/> Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto flex gap-3">
          {can("staff.write") && (
            <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 font-bold shadow-sm transition-colors" onClick={() => showToast("info", "Edit coming soon")}>
              <Edit2 size={18} /> Edit Profile
            </button>
          )}
          {can("staff.delete") && (
            <button className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 py-2.5 rounded-xl font-bold transition-colors" onClick={() => onDelete(staff.id)}>
              <Trash2 size={18} /> Delete Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AdminStaffListProps {
  staff: Staff[];
  onAddStaff: () => void;
}

export function AdminStaffList({ staff: initialStaff, onAddStaff }: AdminStaffListProps) {
  const { can } = usePermissions();
  const [staff, setStaff] = useState(initialStaff);
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this staff record? This action cannot be undone.')) return;
    const success = await staffService.deleteStaff(id);
    if (success) {
      setStaff(staff.filter(s => s.id !== id));
      setSelectedStaff(null);
      showToast('success', 'Staff record deleted successfully.');
    } else {
      showToast('error', 'Failed to delete staff record.');
    }
  };

  const filtered = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teachers & Staff</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all {staff.length} staff members and their roles</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button 
            onClick={onAddStaff}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            + Add New Staff
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Staff Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Assigned Class</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(st => (
                <tr key={st.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedStaff(st)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-sm overflow-hidden">
                        {st.photo_url ? <img src={st.photo_url} className="w-full h-full object-cover" /> : st.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-500">{st.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {st.role === 'admin' && <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-1 rounded-md">ADMIN</span>}
                    {st.role === 'gate_staff' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">GATE</span>}
                    {(st.role !== 'admin' && st.role !== 'gate_staff') && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">TEACHER</span>}
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700">
                    {st.assigned_class || <span className="text-slate-400 font-normal">All Classes</span>}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedStaff(st); }}
                      className="px-3 py-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No staff found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStaff && (
        <StaffDetailsDrawer staff={selectedStaff} onClose={() => setSelectedStaff(null)} onDelete={handleDelete} />
      )}
    </div>
  );
}

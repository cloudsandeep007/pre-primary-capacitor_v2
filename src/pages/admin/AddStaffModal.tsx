import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { staffService } from '@/services/staffService';
import { X, UserPlus, Shield, Key } from 'lucide-react';
import { showToast } from '@/components/Toast';
import { logger } from '@/lib/logger';

export function AddStaffModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [assignedClass, setAssignedClass] = useState('All');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await staffService.createStaff({
      name,
      email,
      password,
      role,
      assigned_class: assignedClass
    });

    setLoading(false);
    if (error) {
      logger.error('ERROR', { error: error instanceof Error ? error.message : String(error) });
      showToast('error', 'Error adding staff: ' + error.message);
    } else {
      showToast('success', 'Staff added successfully!');
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <UserPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Onboard Staff</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white transition-colors" placeholder="e.g. Rahul Sharma" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white transition-colors" placeholder="rahul@samsidh.com" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white transition-colors" placeholder="Secret password" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">System Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setRole('staff')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${role === 'staff' ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                Teacher
              </button>
              <button type="button" onClick={() => setRole('gate_staff')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${role === 'gate_staff' ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <Shield size={14} /> Guard
              </button>
              <button type="button" onClick={() => setRole('admin')} className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${role === 'admin' ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                Admin
              </button>
            </div>
          </div>

          {role === 'staff' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Assigned Class</label>
              <select value={assignedClass} onChange={e => setAssignedClass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white transition-colors cursor-pointer">
                <option value="All">All Classes</option>
                <option value="Pre-Nursery">Pre-Nursery</option>
                <option value="Nursery">Nursery</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
              </select>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md">
              {loading ? 'Saving...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

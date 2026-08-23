import React, { useEffect, useState } from 'react';
import { rbacService, Role, Permission, RolePermission } from '@/services/rbacService';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/contexts/PermissionContext';

export function RoleMatrixTab() {
  const { refreshPermissions } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrix, setMatrix] = useState<Set<string>>(new Set());

  // Modals state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedRoles, fetchedPerms, fetchedMatrix] = await Promise.all([
      rbacService.fetchRoles(),
      rbacService.fetchPermissions(),
      rbacService.fetchRolePermissions()
    ]);
    
    setRoles(fetchedRoles);
    setPermissions(fetchedPerms);
    
    const initialMatrix = new Set<string>();
    fetchedMatrix.forEach(rp => initialMatrix.add(`${rp.role_id}-${rp.permission_id}`));
    setMatrix(initialMatrix);
    setLoading(false);
  };

  const handleToggle = async (roleId: string, permId: string, currentStatus: boolean) => {
    // Guard: verify the superadmin session is still active before writing
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('error', 'Session expired. Please log in to the Super Admin Console again.');
      return;
    }

    const key = `${roleId}-${permId}`;
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    const newMatrix = new Set(matrix);
    if (newStatus) newMatrix.add(key); else newMatrix.delete(key);
    setMatrix(newMatrix);

    const success = await rbacService.toggleRolePermission(roleId, permId, currentStatus);
    if (!success) {
      showToast('error', 'Failed to update permission. Check your session or try again.');
      // Revert optimistic update
      const revertedMatrix = new Set(newMatrix);
      if (currentStatus) revertedMatrix.add(key); else revertedMatrix.delete(key);
      setMatrix(revertedMatrix);
    } else {
      // Refresh permissions in context so changes take effect immediately
      // for the currently logged-in user (useful when superadmin tests as self)
      await refreshPermissions();
    }
  };


  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await rbacService.createRole(newItemName, newItemDesc);
    setIsSubmitting(false);
    if (success) {
      showToast('success', 'Role created successfully');
      setShowRoleModal(false); setNewItemName(''); setNewItemDesc('');
      loadData();
    } else {
      showToast('error', 'Failed to create role');
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await rbacService.createPermission(newItemName, newItemDesc);
    setIsSubmitting(false);
    if (success) {
      showToast('success', 'Permission created successfully');
      setShowPermModal(false); setNewItemName(''); setNewItemDesc('');
      loadData();
    } else {
      showToast('error', 'Failed to create permission');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;
  }

  const groupedPerms = permissions.reduce((acc, p) => {
    const cat = p.name.split('.')[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-base font-bold text-slate-800">Permission Matrix</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRoleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg transition-colors border border-indigo-200">
            <Plus size={14} /> Add Role
          </button>
          <button onClick={() => setShowPermModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-semibold rounded-lg transition-colors border border-sky-200">
            <Plus size={14} /> Add Permission
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-4 font-semibold text-slate-700 rounded-tl-xl bg-slate-100 border-r border-slate-200">Permission / Scope</th>
              {roles.map(role => (
                <th key={role.id} className="p-4 font-semibold text-slate-700 text-center">
                  {role.name}
                  {role.is_system && <span className="block text-[10px] text-slate-400 font-normal">System</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(groupedPerms).map(([category, perms]) => (
              <React.Fragment key={category}>
                <tr className="bg-slate-50/50">
                  <td colSpan={roles.length + 1} className="p-2 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                    Scope: {category}
                  </td>
                </tr>
                {perms.map(perm => (
                  <tr key={perm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 border-r border-slate-100">
                      <div className="font-medium text-slate-700">{perm.name}</div>
                      <div className="text-xs text-slate-400">{perm.description}</div>
                    </td>
                    {roles.map(role => {
                      const hasPerm = matrix.has(`${role.id}-${perm.id}`);
                      return (
                        <td key={role.id} className="p-4 text-center">
                          <input 
                            type="checkbox"
                            checked={hasPerm}
                            disabled={role.name === 'super_admin' || role.name === 'admin'}
                            onChange={() => handleToggle(role.id, perm.id, hasPerm)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {(showRoleModal || showPermModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Create New {showRoleModal ? 'Role' : 'Permission'}</h3>
              <button onClick={() => { setShowRoleModal(false); setShowPermModal(false); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={showRoleModal ? handleCreateRole : handleCreatePermission} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name / Identifier</label>
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} required placeholder={showRoleModal ? 'e.g. librarian' : 'e.g. library.write'} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm" />
                {showPermModal && <p className="text-xs text-slate-500 mt-1">Use dot-notation for scopes (e.g. students.edit).</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (optional)</label>
                <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setShowRoleModal(false); setShowPermModal(false); }} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors">{isSubmitting ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

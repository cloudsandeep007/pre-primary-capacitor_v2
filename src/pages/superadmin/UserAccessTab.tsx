import { useEffect, useState } from 'react';
import { rbacService, UserProfileWithRole, Role } from '@/services/rbacService';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { Search, User, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  principal:   'bg-purple-100 text-purple-700 border-purple-200',
  teacher:     'bg-sky-100 text-sky-700 border-sky-200',
  gate:        'bg-amber-100 text-amber-700 border-amber-200',
  parent:      'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export function UserAccessTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // userId being saved
  const [users, setUsers] = useState<UserProfileWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedUsers, fetchedRoles] = await Promise.all([
      rbacService.fetchUsersWithRoles(),
      rbacService.fetchRoles()
    ]);
    setUsers(fetchedUsers);
    setRoles(fetchedRoles);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    // Guard: verify superadmin session is active
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('error', 'Session expired. Please log in to the Super Admin Console again.');
      return;
    }

    setSaving(userId);
    const success = await rbacService.assignUserRole(userId, newRoleId || null);
    setSaving(null);

    if (success) {
      const newRoleName = roles.find(r => r.id === newRoleId)?.name || null;
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, role_id: newRoleId || null, role_name: newRoleName }
            : u
        )
      );
      showToast('success', `Role updated to "${newRoleName || 'None'}"`);
    } else {
      showToast('error', 'Failed to update role. Make sure you are logged in as Super Admin.');
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    // Guard: verify superadmin session is active
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('error', 'Session expired. Please log in to the Super Admin Console again.');
      return;
    }

    setSaving(userId);
    const success = await rbacService.updateUserStatus(userId, isActive);
    setSaving(null);

    if (success) {
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, is_active: isActive }
            : u
        )
      );
      showToast('success', `User account ${isActive ? 'activated' : 'deactivated'}`);
    } else {
      showToast('error', 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-800">User Role Assignment</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign a role to each staff member. Their permissions will update immediately on next login.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          {users.length} staff members
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-slate-50"
        />
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roles.map(role => (
          <span
            key={role.id}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${ROLE_COLORS[role.name] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
          >
            <Shield size={10} />
            {role.name}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Staff Member</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Current Role</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Change Role</th>
              <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider w-16 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                {/* Staff info */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user.name?.charAt(0).toUpperCase() || <User size={14} />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Current role badge */}
                <td className="p-4">
                  {user.role_name ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLORS[user.role_name] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      <Shield size={10} />
                      {user.role_name}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No role assigned</span>
                  )}
                </td>

                {/* Role selector */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role_id || ''}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      disabled={saving === user.id}
                      className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-60 disabled:cursor-wait min-w-[140px]"
                    >
                      <option value="">-- No Role --</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    {saving === user.id && <Spinner size={16} />}
                  </div>
                </td>

                {/* Account status toggle */}
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleStatusChange(user.id, !user.is_active)}
                    disabled={saving === user.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      user.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        user.is_active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                    {user.is_active ? 'Active' : 'Inactive'}
                  </div>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-400 text-sm">
                  <User size={32} className="mx-auto mb-2 text-slate-200" />
                  No staff members found{search ? ` matching "${search}"` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        * Role and status changes take effect for the user immediately on their next action.
      </p>
    </div>
  );
}

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface UserProfileWithRole {
  id: string;
  email: string;
  name: string;
  role_id: string | null;
  role_name: string | null;
  is_active: boolean;
}

export const rbacService = {
  async fetchRoles(): Promise<Role[]> {
    const { data, error } = await supabase.from('roles').select('*').order('name');
    if (error) {
      logger.error('RBAC_FETCH_ROLES', { error: error.message });
      return [];
    }
    return data || [];
  },

  async fetchPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase.from('permissions').select('*').order('name');
    if (error) {
      logger.error('RBAC_FETCH_PERMISSIONS', { error: error.message });
      return [];
    }
    return data || [];
  },

  async fetchRolePermissions(): Promise<RolePermission[]> {
    const { data, error } = await supabase.from('role_permissions').select('role_id, permission_id');
    if (error) {
      logger.error('RBAC_FETCH_ROLE_PERMS', { error: error.message });
      return [];
    }
    return data || [];
  },

  async toggleRolePermission(roleId: string, permissionId: string, granted: boolean): Promise<boolean> {
    try {
      if (!granted) {
        // granted=false: permission does NOT exist yet → user is granting it → INSERT
        const { error } = await supabase.from('role_permissions').insert({ role_id: roleId, permission_id: permissionId });
        if (error) throw error;
      } else {
        // granted=true: permission ALREADY exists → user is revoking it → DELETE
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .match({ role_id: roleId, permission_id: permissionId });
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      logger.error('RBAC_TOGGLE_PERM', { error: err.message });
      return false;
    }
  },


  async fetchUsersWithRoles(): Promise<UserProfileWithRole[]> {
    // Read staff list (which has name, email, auth_user_id)
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, auth_user_id, is_active')
      .order('name');

    if (staffError) {
      logger.error('RBAC_FETCH_USERS_STAFF', { error: staffError.message });
      return [{ id: 'error', name: `ERROR: ${staffError.message}`, email: '', role_id: null, role_name: null, is_active: true }];
    }

    if (!staffData || staffData.length === 0) {
       return [{ id: 'error', name: `ERROR: staffData is empty. Session valid?`, email: '', role_id: null, role_name: null, is_active: true }];
    }

    // Now get all user_roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role_id, roles(name)');

    if (roleError) {
       logger.error('RBAC_FETCH_USERS_ROLES', { error: roleError.message });
       // We can still return staff data without roles
    }

    return staffData.map(staff => {
      // Find the user's role mapping (using auth_user_id)
      const userRole = roleData?.find(r => r.user_id === staff.auth_user_id);
      
      return {
        id: staff.auth_user_id || staff.id, // Fallback to staff id if no auth_user_id
        name: staff.name,
        email: staff.email,
        role_id: userRole?.role_id || null,
        role_name: (userRole?.roles as any)?.name || 'No Role',
        is_active: staff.is_active ?? true
      };
    });
  },

  async updateUserStatus(staffId: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('staff')
      .update({ is_active: isActive })
      .eq('id', staffId);

    if (error) {
      logger.error('RBAC_UPDATE_USER_STATUS', { staffId, error: error.message });
      return false;
    }
    return true;
  },


  async assignUserRole(userId: string, roleId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: userId,
        target_role_id: roleId
      });
      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('RBAC_ASSIGN_ROLE', { error: err.message });
      return false;
    }
  },

  async createRole(name: string, description: string): Promise<boolean> {
    const { error } = await supabase.from('roles').insert({ name, description, is_system: false });
    if (error) { logger.error('RBAC_CREATE_ROLE', { error: error.message }); return false; }
    return true;
  },

  async createPermission(name: string, description: string): Promise<boolean> {
    const { error } = await supabase.from('permissions').insert({ name, description });
    if (error) { logger.error('RBAC_CREATE_PERM', { error: error.message }); return false; }
    return true;
  },

  async deleteRole(id: string): Promise<boolean> {
    const { error } = await supabase.from('roles').delete().match({ id, is_system: false });
    return !error;
  },

  async deletePermission(id: string): Promise<boolean> {
    const { error } = await supabase.from('permissions').delete().match({ id });
    return !error;
  }
};

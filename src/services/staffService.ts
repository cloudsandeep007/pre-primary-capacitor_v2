import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';
import { DEMO_STAFF } from '@/lib/mockData';

class StaffService {
  /**
   * Fetches all staff and normalizes schema differences
   */
  async fetchAllStaff(): Promise<Staff[]> {
    try {
      const { data, error } = await supabase.from('staff').select('*');
      
      if (error) throw error;
      if (!data || data.length === 0) return DEMO_STAFF;

      return data.map((d: any) => ({
        id: d.id,
        email: d.email,
        password: d.password || d.password_hash || '',
        name: d.name || d.email.split('@')[0],
        assigned_class: d.assigned_class || 'All',
        photo_url: d.photo_url,
        role: d.role || 'staff',
      })) as Staff[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'STAFF-001', { operation: 'SELECT', resource: 'staff' });
      logger.error('STAFF_SERVICE_FETCH_ERROR', { error: appErr });
      return DEMO_STAFF;
    }
  }

  /**
   * Creates a new staff member
   */
  async createStaff(payload: any, traceId?: string): Promise<{ data: any, error: any }> {
    try {
      const upsertPromise = supabase.from('staff').insert([{
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        assigned_class: payload.assigned_class
      }]).select();

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;

      const createdStaff = result.data?.[0];

      // Audit: staff member was successfully created
      auditLog({
        actor_type: 'staff',
        actor_id: createdStaff?.id,
        actor_name: payload.name,
        action: 'STAFF_CREATED',
        resource_type: 'staff',
        resource_id: createdStaff?.id,
        metadata: {
          role: payload.role,
          assigned_class: payload.assigned_class,
          traceId,
        },
      });

      return { data: result.data as Staff, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'STAFF-002', { operation: 'INSERT', resource: 'staff' });
      logger.error('STAFF_SERVICE_UPSERT_ERROR', { error: appErr, traceId });
      return { data: null, error: appErr };
    }
  }

  async deleteStaff(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('STAFF_DELETE_ERROR', { error: err });
      return false;
    }
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<boolean> {
    try {
      const { error } = await supabase.from('staff').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('STAFF_UPDATE_ERROR', { error: err });
      return false;
    }
  }
}

export const staffService = new StaffService();

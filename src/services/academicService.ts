import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { handleSupabaseError } from '@/lib/errors';

export interface SchoolClass {
  id: string;
  name: string;
  section: string;
  class_teacher_id?: string;
  room_number?: string;
  capacity: number;
}

class AcademicService {
  async fetchAllClasses(): Promise<SchoolClass[]> {
    try {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as SchoolClass[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ACADEMIC-001', { operation: 'SELECT', resource: 'classes' });
      logger.error('ACADEMIC_SERVICE_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  async createClass(payload: Partial<SchoolClass>): Promise<SchoolClass | null> {
    try {
      const { data, error } = await supabase.from('classes').insert([payload]).select().single();
      if (error) throw error;

      auditLog({
        actor_type: 'staff',
        action: 'CLASS_CREATED',
        resource_type: 'classes',
        resource_id: data.id,
        metadata: { name: data.name, section: data.section },
      });

      return data as SchoolClass;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ACADEMIC-002', { operation: 'INSERT', resource: 'classes' });
      logger.error('ACADEMIC_SERVICE_CREATE_ERROR', { error: appErr });
      return null;
    }
  }

  async deleteClass(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;

      auditLog({
        actor_type: 'staff',
        action: 'CLASS_DELETED',
        resource_type: 'classes',
        resource_id: id,
        metadata: {},
      });

      return true;
    } catch (err) {
      logger.error('CLASS_DELETE_ERROR', { error: err });
      return false;
    }
  }
}

export const academicService = new AcademicService();

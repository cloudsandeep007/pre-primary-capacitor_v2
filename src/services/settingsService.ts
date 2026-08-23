import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';

export interface SchoolSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
}

class SettingsService {
  /**
   * Fetches all school settings
   */
  async fetchAllSettings(): Promise<SchoolSetting[]> {
    try {
      const { data, error } = await supabase.from('school_settings').select('*');
      
      if (error) throw error;
      return data as SchoolSetting[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'SETTINGS-001', { operation: 'SELECT', resource: 'school_settings' });
      logger.error('SETTINGS_SERVICE_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Updates a setting
   */
  async updateSetting(key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('school_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);

      if (error) throw error;

      auditLog({
        actor_type: 'staff', // Since it's admin doing it
        action: 'SETTINGS_CHANGED',
        resource_type: 'school_settings',
        metadata: {
          key,
          value,
        },
      });

      return true;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'SETTINGS-002', { operation: 'UPDATE', resource: 'school_settings' });
      logger.error('SETTINGS_SERVICE_UPDATE_ERROR', { error: appErr });
      return false;
    }
  }
}

export const settingsService = new SettingsService();

import { supabase } from '@/lib/supabase';
import { SchoolEvent } from '@/lib/types';
import { logger } from '@/lib/logger';
import { handleSupabaseError } from '@/lib/errors';

class EventService {
  /**
   * Fetches upcoming school events from today onwards
   */
  async fetchUpcomingEvents(): Promise<SchoolEvent[]> {
    try {
      const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('school_events')
        .select('*')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(10);
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'EVENT-001', { operation: 'SELECT', resource: 'school_events' });
      logger.error('EVENT_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Mock fallback if database table is missing or fails
   */
  getMockEvents(): SchoolEvent[] {
    const today = new Date();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return [
      {
        id: 'mock-evt-1',
        title: 'PTA Meeting - Term 1',
        event_date: tomorrow.toISOString().split('T')[0],
        event_type: 'event',
        description: 'Main Hall • 09:00 AM - 12:00 PM',
        class_name: 'All',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-evt-2',
        title: 'Mid-Term Exams Begin',
        event_date: nextWeek.toISOString().split('T')[0],
        event_type: 'exam',
        description: 'All Grades • Schedule Attached',
        class_name: 'All',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-evt-3',
        title: 'Labor Day Holiday',
        event_date: '2026-05-01', // Example fixed date
        event_type: 'holiday',
        description: 'School Closed • Public Holiday',
        class_name: 'All',
        created_at: new Date().toISOString()
      }
    ];
  }
}

export const eventService = new EventService();

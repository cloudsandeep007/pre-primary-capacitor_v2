import { supabase } from '@/lib/supabase';
import { Announcement, AnnouncementReply } from '@/lib/types';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { AppError, handleSupabaseError } from '@/lib/errors';

class AnnouncementService {
  /**
   * Fetches announcements for a given class
   */
  async fetchAnnouncements(className: string): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('class_name', className)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ANNOUNCEMENT-001', { operation: 'SELECT', resource: 'announcements' });
      logger.error('ANNOUNCEMENT_FETCH_ERROR', { error: appErr });
      return [];
    }
  }

  /**
   * Fetches replies for a list of announcements
   */
  async fetchReplies(announcementIds: string[]): Promise<Record<string, AnnouncementReply[]>> {
    if (!announcementIds || announcementIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('announcement_replies')
        .select('*')
        .in('announcement_id', announcementIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const repliesMap: Record<string, AnnouncementReply[]> = {};
      if (data) {
        data.forEach(reply => {
          if (!repliesMap[reply.announcement_id]) {
            repliesMap[reply.announcement_id] = [];
          }
          repliesMap[reply.announcement_id].push(reply as AnnouncementReply);
        });
      }
      
      return repliesMap;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ANNOUNCEMENT-001', { operation: 'SELECT', resource: 'announcement_replies' });
      logger.error('ANNOUNCEMENT_REPLY_FETCH_ERROR', { error: appErr });
      return {};
    }
  }

  /**
   * Creates a new announcement with a timeout fallback
   */
  async createAnnouncement(announcement: Partial<Announcement>, traceId?: string): Promise<{ data?: Announcement, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const payload = {
        title: announcement.title,
        body: announcement.body,
        image_url: announcement.image_url,
        class_name: announcement.class_name,
        staff_id: announcement.staff_id,
        staff_name: announcement.staff_name,
      };
      
      const upsertPromise = supabase.from('announcements').insert(payload).select().single();
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;

      // Audit: announcement was successfully created
      auditLog({
        actor_type: 'staff',
        action: 'ANNOUNCEMENT_CREATED',
        resource_type: 'announcement',
        resource_id: result.data?.id,
        metadata: {
          class_name: announcement.class_name,
          title: announcement.title,
          traceId,
        },
      });

      return { data: result.data as Announcement, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'ANNOUNCEMENT-002', { operation: 'INSERT', resource: 'announcements' });
      logger.warn('ANNOUNCEMENT_INSERT_FAILED_OR_TIMED_OUT', { error: appErr, traceId });
      return { error: appErr };
    }
  }

  /**
   * Creates a new reply with a timeout fallback
   */
  async createReply(reply: Partial<AnnouncementReply>, traceId?: string): Promise<{ data?: AnnouncementReply, error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      
      const payload = {
        announcement_id: reply.announcement_id,
        sender_type: reply.sender_type,
        sender_name: reply.sender_name,
        student_id: reply.student_id,
        body: reply.body
      };
      
      const upsertPromise = supabase.from('announcement_replies').insert(payload).select().single();
      const result: any = await Promise.race([upsertPromise, timeout]);
      if (result.error) throw result.error;
      
      return { data: result.data as AnnouncementReply, error: null };
    } catch (err) {
      const appErr = new AppError('ANNOUNCEMENT-002', err);
      logger.warn('ANNOUNCEMENT_REPLY_INSERT_FAILED_OR_TIMED_OUT', { error: appErr, traceId });
      return { error: appErr };
    }
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('ANNOUNCEMENT_DELETE_ERROR', { error: err });
      return false;
    }
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<boolean> {
    try {
      const { error } = await supabase.from('announcements').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('ANNOUNCEMENT_UPDATE_ERROR', { error: err });
      return false;
    }
  }
}

export const announcementService = new AnnouncementService();

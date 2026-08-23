import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { handleSupabaseError } from '@/lib/errors';

export interface Admission {
  id: string;
  applicant_name: string;
  parent_name: string;
  contact_email: string;
  contact_phone: string;
  applied_class: string;
  status: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  author_id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  category: string;
  is_public: boolean;
  created_at: string;
}

class OperationsService {
  async fetchAdmissions(): Promise<Admission[]> {
    try {
      const { data, error } = await supabase.from('admissions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Admission[];
    } catch (err) {
      logger.error('FETCH_ADMISSIONS_ERROR', { error: err });
      return [];
    }
  }

  async fetchComplaints(): Promise<Complaint[]> {
    try {
      const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Complaint[];
    } catch (err) {
      logger.error('FETCH_COMPLAINTS_ERROR', { error: err });
      return [];
    }
  }

  async fetchDocuments(): Promise<DocumentMeta[]> {
    try {
      const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DocumentMeta[];
    } catch (err) {
      logger.error('FETCH_DOCUMENTS_ERROR', { error: err });
      return [];
    }
  }
}

export const operationsService = new OperationsService();

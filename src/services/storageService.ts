import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { AppError, handleSupabaseError } from '@/lib/errors';

export type StorageBucket = 'media' | 'child-photos' | 'avatars';

class StorageService {
  /**
   * Uploads a file to the specified bucket and returns its public URL.
   * Uses a timeout to prevent hanging UI on slow connections.
   */
  async uploadFile(bucket: StorageBucket, file: File, traceId?: string): Promise<{ url: string | null; error: any }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      const result: any = await Promise.race([uploadPromise, timeout]);

      if (result.error) throw result.error;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'PHOTO-001', { operation: 'UPLOAD', resource: bucket });
      logger.error('STORAGE_UPLOAD_ERROR', { bucket, error: appErr, traceId });
      return { url: null, error: appErr };
    }
  }

  /**
   * Generates a safe file name using the current timestamp.
   * Useful when we want deterministic naming before uploading.
   */
  generateFileName(originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `upload-${Date.now()}-${safeName}`;
  }

  /**
   * Uploads a file with a specific name.
   */
  async uploadFileWithName(bucket: StorageBucket, fileName: string, file: File, traceId?: string): Promise<{ url: string | null; error: any }> {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      const result: any = await Promise.race([uploadPromise, timeout]);

      if (result.error) throw result.error;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
      const appErr = handleSupabaseError(err, 'PHOTO-001', { operation: 'UPLOAD', resource: bucket });
      logger.error('STORAGE_UPLOAD_ERROR', { bucket, error: appErr, traceId });
      return { url: null, error: appErr };
    }
  }
}

export const storageService = new StorageService();

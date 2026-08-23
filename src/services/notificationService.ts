import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { AppError, handleSupabaseError } from '@/lib/errors';

const PUBLIC_VAPID_KEY = 'BOKWWCbYJIEMSkRAc63auU1z5y_oemU3yextsLZxhuhAwdV8DMeRiYZOsZMbKyqBvfLoPtxUkMkuCdzHuMa9Rf8';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

class NotificationService {
  /**
   * Sets up push notifications for a specific student.
   * Prompts the user for permission, registers the service worker, and saves the subscription to Supabase.
   */
  async setupPushNotifications(studentId: string, traceId?: string): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported by browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notification permission denied.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Convert the subscription to JSON so we can extract the keys
      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys) return;

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
      const upsertPromise = supabase.from('push_subscriptions').upsert(
        {
          student_id: studentId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        { onConflict: 'endpoint' } // Prevent duplicates for the same browser
      );

      const result: any = await Promise.race([upsertPromise, timeout]);
      const { error } = result;
      if (error) throw error;
      logger.info('PUSH_NOTIFICATION_REGISTERED', { studentId, traceId });

    } catch (err) {
      const appErr = handleSupabaseError(err, 'NOTIFICATION-001', { operation: 'UPSERT', resource: 'push_subscriptions' });
      logger.error('ERROR_SETTING_UP_PUSH_NOTIFICATIONS', { error: appErr, traceId });
    }
  }
}

export const notificationService = new NotificationService();

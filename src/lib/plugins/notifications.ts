import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabase';

export async function initializePushNotifications(userId: string, role: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
      }

      // Register with Apple / Google to receive token
      await PushNotifications.register();

      // Listeners
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Save token to Supabase for this user
        // We assume a `user_push_tokens` table or similar exists, or just log it for now
        try {
          await supabase.from('user_push_tokens').upsert({
            user_id: userId,
            token: token.value,
            platform: Capacitor.getPlatform(),
            role: role
          });
        } catch (dbError) {
          console.warn('Could not save push token to db', dbError);
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on push registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
        // You could trigger a local React toast here
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        // Handle navigation based on push payload
      });

    } catch (e) {
      console.error('Error initializing push notifications:', e);
    }
  } else {
    // Web Push Notification Fallback (Service Worker)
    console.log('Web Push Notifications would be initialized here');
  }
}

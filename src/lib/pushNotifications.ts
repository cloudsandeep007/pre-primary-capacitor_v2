import { supabase } from './supabase';

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

// You must generate a VAPID key pair and put the PUBLIC key here.
// You can generate them via `npx web-push generate-vapid-keys`
const PUBLIC_VAPID_KEY = 'BOKWWCbYJIEMSkRAc63auU1z5y_oemU3yextsLZxhuhAwdV8DMeRiYZOsZMbKyqBvfLoPtxUkMkuCdzHuMa9Rf8';

export async function setupPushNotifications(studentId: string) {
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

    // Save to Supabase
    await supabase.from('push_subscriptions').upsert(
      {
        student_id: studentId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      { onConflict: 'endpoint' } // Prevent duplicates for the same browser
    );

    console.log('Successfully registered for push notifications!');
  } catch (err) {
    console.error('Error setting up push notifications:', err);
  }
}

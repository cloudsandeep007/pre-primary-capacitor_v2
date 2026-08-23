import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Returns a base64 string or data URL of a captured photo.
 * If native, it uses the Capacitor Camera plugin to launch the native camera.
 * If web, it returns null and lets the web app handle its own webcam logic.
 */
export async function capturePhotoNative(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: true, // Allows crop to square
        resultType: CameraResultType.DataUrl, // Gets the base64 data url directly
        source: CameraSource.Prompt // Prompts user to choose Camera or Photos
      });

      if (image.dataUrl) {
        return image.dataUrl;
      }
      return null;
    } catch (error) {
      console.warn('Native camera capture cancelled or failed', error);
      return null;
    }
  }
  
  // Return null if on web, signaling the component to use its own web fallback modal
  return null;
}

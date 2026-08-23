import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

/**
 * Attempts to launch the native barcode scanner.
 * Returns the scanned string if successful.
 * Returns null if the user cancels, or if it's running on the Web (fallback needed).
 */
export async function startNativeScanner(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Request permissions first
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        throw new Error('Camera permission not granted');
      }

      // Hide web view background to show native camera behind it if needed,
      // but MLKit BarcodeScanning provides a full screen UI by default when we call scan().
      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      if (result.barcodes && result.barcodes.length > 0) {
        return result.barcodes[0].rawValue;
      }
      return null;
    } catch (error) {
      console.warn('Native barcode scanning failed or cancelled', error);
      return null;
    }
  }

  // Web fallback - let the React component use html5-qrcode
  return null;
}

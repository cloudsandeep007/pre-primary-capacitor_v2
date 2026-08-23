import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Safely downloads a file. Uses standard browser APIs on the web,
 * and uses native Filesystem + Share APIs on mobile.
 * 
 * @param filename Name of the file with extension (e.g. 'report.pdf')
 * @param data The file content. Can be raw text (CSV) or Base64 string (PDF/Images)
 * @param mimeType The mime type (e.g. 'text/csv', 'application/pdf', 'image/jpeg')
 * @param isBase64 True if the data is a base64 encoded string
 */
export async function downloadFile(
  filename: string,
  data: string,
  mimeType: string,
  isBase64: boolean = false
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      // On mobile, save the file using Capacitor Filesystem
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: data,
        directory: Directory.Documents,
        // If it's a CSV (not base64), write as UTF8 by default
      });

      // Prompt the user to share or open the downloaded file natively
      await Share.share({
        title: filename,
        url: savedFile.uri,
      });
    } catch (error) {
      console.error('Error saving file natively:', error);
      throw error;
    }
  } else {
    // On the web, use the standard anchor tag download approach
    let url: string;
    
    if (isBase64) {
      // Data is already base64, construct a data URI or blob
      // If it contains the 'data:image/jpeg;base64,' prefix, strip it if we just want the raw data,
      // but wait, we can just fetch it as a blob.
      const base64Data = data.includes(',') ? data.split(',')[1] : data;
      const response = await fetch(`data:${mimeType};base64,${base64Data}`);
      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
    } else {
      // Raw string data (like CSV)
      const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
      url = window.URL.createObjectURL(blob);
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (url.startsWith('blob:')) {
      window.URL.revokeObjectURL(url);
    }
  }
}

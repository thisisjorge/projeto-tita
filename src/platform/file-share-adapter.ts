import { Share } from '@capacitor/share';
import { isNativePlatform } from './platform-detector.js';
import type { ShareFileOptions } from './types.js';

export class FileShareAdapter {
  async shareFile(
    options: ShareFileOptions,
  ): Promise<{ shared: boolean; method: 'native-share' | 'web-share' | 'download' }> {
    // 1. Native Capacitor Share
    if (isNativePlatform()) {
      try {
        await Share.share({
          title: options.fileName,
          text: options.text ?? options.fileName,
          dialogTitle: 'Compartilhar Backup Titã',
        });
        return { shared: true, method: 'native-share' };
      } catch {
        // Fall back to web/download
      }
    }

    // 2. Web Share API with files if supported
    if (typeof navigator !== 'undefined' && navigator.share && options.blob) {
      try {
        const file = new File([options.blob], options.fileName, {
          type: options.mimeType ?? 'application/json',
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: options.fileName,
            files: [file],
          });
          return { shared: true, method: 'web-share' };
        }
      } catch {
        // Fallback to download
      }
    }

    // 3. Fallback: browser download anchor
    if (typeof document !== 'undefined' && options.blob) {
      const url = URL.createObjectURL(options.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { shared: true, method: 'download' };
    }

    return { shared: false, method: 'download' };
  }
}

export const fileShareAdapter = new FileShareAdapter();

import { registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { getPlatform, isNativePlatform } from './platform-detector.js';
import type { ShareFileOptions } from './types.js';

interface TitaFileSharePlugin {
  shareFile(options: {
    fileName: string;
    content: string;
    mimeType?: string;
    text?: string;
  }): Promise<void>;
}

const TitaFileShare = registerPlugin<TitaFileSharePlugin>('TitaFileShare');

export class FileShareAdapter {
  async shareFile(
    options: ShareFileOptions,
  ): Promise<{ shared: boolean; method: 'native-share' | 'web-share' | 'download' }> {
    const platform = getPlatform();

    // Android WebView does not implement the Web Share API. Persist the payload in the
    // app cache and expose it through FileProvider so WhatsApp and other apps receive a
    // real JSON document instead of only the share title/text.
    if (platform === 'android' && options.blob) {
      try {
        await TitaFileShare.shareFile({
          fileName: options.fileName,
          content: await options.blob.text(),
          mimeType: options.mimeType ?? options.blob.type ?? 'application/json',
          text: options.text,
        });
        return { shared: true, method: 'native-share' };
      } catch {
        // Continue to the generic fallbacks below.
      }
    }

    // Web Share API Level 2 works in supporting browsers and modern WKWebView versions.
    if (typeof navigator !== 'undefined' && navigator.share && options.blob) {
      try {
        const file = new File([options.blob], options.fileName, {
          type: options.mimeType ?? options.blob.type ?? 'application/json',
        });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: options.fileName,
            files: [file],
          });
          return { shared: true, method: 'web-share' };
        }
      } catch {
        // Continue to native text share / download fallback.
      }
    }

    // Native text-only share remains useful for callers that do not provide a file payload.
    if (isNativePlatform() && !options.blob) {
      try {
        await Share.share({
          title: options.fileName,
          text: options.text ?? options.fileName,
          dialogTitle: 'Compartilhar Projeto Titã',
        });
        return { shared: true, method: 'native-share' };
      } catch {
        // Fall back to download.
      }
    }

    // Browser download fallback. We intentionally do not report a text-only native share
    // as success when a file was requested, because that would recreate the Android bug.
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

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface PendingNativeFile {
  present: boolean;
  id?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  text?: string;
  error?: string;
  source?: 'android-share' | 'android-open';
}

interface IncomingJsonPlugin {
  getPendingSharedFile(): Promise<PendingNativeFile>;
  acknowledgeSharedFile(options: { id: string }): Promise<void>;
  addListener(event: 'sharedFileReceived', listener: () => void): Promise<PluginListenerHandle>;
}

const plugin = registerPlugin<IncomingJsonPlugin>('TitaIncomingJson');

export const isAndroidApk = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function hasNativeIncomingJson(): Promise<boolean> {
  return isAndroidApk() && (await plugin.getPendingSharedFile()).present;
}

export async function takeNativeIncomingJson(): Promise<PendingNativeFile | null> {
  if (!isAndroidApk()) return null;
  const pending = await plugin.getPendingSharedFile();
  if (!pending.present || !pending.id) return null;
  await plugin.acknowledgeSharedFile({ id: pending.id });
  return pending;
}

export async function onNativeIncomingJson(
  listener: () => void,
): Promise<PluginListenerHandle | null> {
  if (!isAndroidApk()) return null;
  return plugin.addListener('sharedFileReceived', listener);
}

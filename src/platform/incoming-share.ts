export interface IncomingShare {
  name: string;
  text: string;
}

export async function takeIncomingShare(): Promise<IncomingShare | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tita-incoming-share', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      const read = store.get('pending');
      read.onsuccess = () => {
        const incoming = (read.result ?? null) as IncomingShare | null;
        if (incoming) store.delete('pending');
        transaction.oncomplete = () => {
          db.close();
          resolve(incoming);
        };
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

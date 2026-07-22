// IndexedDB Cache Utility for Wakeely Pro Offline Storage

const DB_NAME = 'WakeelyProLegalCacheDB';
const DB_VERSION = 1;

export const STORES = {
  MATTERS: 'matters',
  DOCUMENTS: 'documents',
  TASKS: 'tasks',
  TIME_ENTRIES: 'timeEntries',
  INVOICES: 'invoices'
} as const;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they do not exist
      if (!db.objectStoreNames.contains(STORES.MATTERS)) {
        db.createObjectStore(STORES.MATTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('matterId', 'matterId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        taskStore.createIndex('matterId', 'matterId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.TIME_ENTRIES)) {
        const timeStore = db.createObjectStore(STORES.TIME_ENTRIES, { keyPath: 'id' });
        timeStore.createIndex('matterId', 'matterId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const invStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
        invStore.createIndex('matterId', 'matterId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an array or single item to an IndexedDB store
 */
export async function saveItemsToOfflineStore<T extends { id: string }>(
  storeName: string,
  items: T | T[]
): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const itemsArray = Array.isArray(items) ? items : [items];
    for (const item of itemsArray) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[Offline Cache Write Error] Store: ${storeName}`, err);
  }
}

/**
 * Get all items from an IndexedDB store
 */
export async function getAllFromOfflineStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[Offline Cache Read Error] Store: ${storeName}`, err);
    return [];
  }
}

/**
 * Get items by index (e.g., matterId)
 */
export async function getByMatterIdFromOfflineStore<T>(
  storeName: string,
  matterId: string
): Promise<T[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (!store.indexNames.contains('matterId')) {
      const all = await getAllFromOfflineStore<T & { matterId?: string }>(storeName);
      return all.filter(item => item.matterId === matterId) as T[];
    }

    const index = store.index('matterId');
    const request = index.getAll(matterId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as T[]) || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[Offline Cache Read Error] Store: ${storeName} by matterId: ${matterId}`, err);
    return [];
  }
}

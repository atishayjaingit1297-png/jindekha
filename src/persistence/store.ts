/** Minimal async key-value store. IndexedDB in the browser; a native client can supply its own. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

const DB_NAME = 'jindekha';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

export function createIdbStore(): KeyValueStore {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => (dbPromise ??= openDb());
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const d = await db();
    return new Promise<T>((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };
  return {
    get: <T,>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    set: async (key, value) => {
      await tx('readwrite', (s) => s.put(value, key));
    },
    remove: async (key) => {
      await tx('readwrite', (s) => s.delete(key));
    },
  };
}

export function createMemoryStore(): KeyValueStore {
  const m = new Map<string, unknown>();
  return {
    get: async <T,>(k: string) => m.get(k) as T | undefined,
    set: async (k, v) => void m.set(k, structuredClone(v)),
    remove: async (k) => void m.delete(k),
  };
}

/** IndexedDB when it works (it can be unavailable in some private modes); otherwise in-memory. */
export async function createDefaultStore(): Promise<KeyValueStore> {
  if (typeof indexedDB === 'undefined') return createMemoryStore();
  try {
    const s = createIdbStore();
    await s.get('__probe__');
    return s;
  } catch {
    return createMemoryStore();
  }
}

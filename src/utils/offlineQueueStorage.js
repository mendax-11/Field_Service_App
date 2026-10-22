const DB_NAME = 'timberflow_offline_queue';
const STORE_NAME = 'commands';

export function createMemoryQueueStorage() {
  let commands = [];
  return {
    async list() { return commands; },
    async replace(nextCommands) { commands = [...nextCommands]; },
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDbQueueStorage() {
  if (typeof indexedDB === 'undefined') return createMemoryQueueStorage();

  return {
    async list() {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    async replace(commands) {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        commands.forEach(command => store.put(command));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    },
  };
}

export const offlineQueueStorage = createIndexedDbQueueStorage();

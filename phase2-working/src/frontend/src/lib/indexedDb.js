// Client-Side IndexedDB Storage manager for local memory caching and search
const DB_NAME = 'thought_gps_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'memories';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveLocalMemories(memories) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    memories.forEach(mem => {
      // Standardize schema
      const record = {
        id: mem.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: mem.content || mem.value || '',
        category: mem.category || 'general',
        cognitive_load: mem.cognitive_load || mem.cognitiveLoad || 'medium',
        brain_area: mem.brain_area || mem.brainArea || '',
        created_at: mem.created_at || mem.createdAt || new Date().toISOString(),
      };
      store.put(record);
    });

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function searchLocalMemories(query, limit = 5) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      if (!query) {
        resolve(all.slice(0, limit));
        return;
      }
      const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      if (terms.length === 0) {
        resolve(all.slice(0, limit));
        return;
      }

      // Filter and score by term matches
      const scored = all.map(mem => {
        const text = (mem.content || '').toLowerCase();
        let score = 0;
        terms.forEach(term => {
          if (text.includes(term)) score += 1;
        });
        return { mem, score };
      }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || new Date(b.mem.created_at) - new Date(a.mem.created_at));

      resolve(scored.map(item => item.mem).slice(0, limit));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getAllLocalMemories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      resolve(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalMemory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

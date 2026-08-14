;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  const DB_NAME = 'kcbapp';
  const DB_VERSION = 2;

  const STORES = [
    { name: 'notes', keyPath: 'id' },
    { name: 'tasks', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }, { name: 'period', keyPath: 'period' }] },
    { name: 'review', keyPath: 'date' },
    { name: 'topics', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }, { name: 'planDate', keyPath: 'planDate' }] },
    { name: 'projects', keyPath: 'id' },
    { name: 'dev_tasks', keyPath: 'id', indexes: [{ name: 'projectId', keyPath: 'projectId' }, { name: 'status', keyPath: 'status' }] },
    { name: 'snippets', keyPath: 'id', indexes: [{ name: 'projectId', keyPath: 'projectId' }] },
    { name: 'issues', keyPath: 'id', indexes: [{ name: 'projectId', keyPath: 'projectId' }] },
    { name: 'courses', keyPath: 'id', indexes: [{ name: 'weekday', keyPath: 'weekday' }, { name: 'semester', keyPath: 'semester' }] },
    { name: 'workout_templates', keyPath: 'id', indexes: [{ name: 'weekday', keyPath: 'weekday' }] },
    { name: 'workout_logs', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
    { name: 'body_metrics', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
    { name: 'meals', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }, { name: 'mealType', keyPath: 'mealType' }] },
    { name: 'water', keyPath: 'date' },
    { name: 'restrictions', keyPath: 'id' },
    { name: 'games', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }] },
    { name: 'entertainment', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
    { name: 'settings', keyPath: 'id' }
  ];

  let dbInstance = null;

  function open() {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
      const req = root.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        STORES.forEach(function (s) {
          if (!db.objectStoreNames.contains(s.name)) {
            const store = db.createObjectStore(s.name, { keyPath: s.keyPath });
            if (s.indexes) {
              s.indexes.forEach(function (idx) {
                store.createIndex(idx.name, idx.keyPath, { unique: false });
              });
            }
          }
        });
      };
      req.onsuccess = function (e) {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  function close() {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }

  function getDb() {
    return dbInstance;
  }

  KCBAPP.db = { open, close, getDb, DB_NAME, DB_VERSION, STORES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KCBAPP;
  }
})(typeof window !== 'undefined' ? window : globalThis);

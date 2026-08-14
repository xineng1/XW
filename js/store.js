;(function (root) {
  const KCBAPP = root.KCBAPP || (root.KCBAPP = {});

  function getDb() {
    return KCBAPP.db.open();
  }

  function add(storeName, data) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).add(data);
        tx.oncomplete = function () { resolve(data); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function get(storeName, id) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getAll(storeName) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function update(storeName, data) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = function () { resolve(data); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function remove(storeName, id) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function queryByIndex(storeName, indexName, value) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const idx = store.index(indexName);
        const req = idx.getAll(value);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function clear(storeName) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function count(storeName) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  KCBAPP.store = { add, get, getAll, update, remove, queryByIndex, clear, count };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KCBAPP;
  }
})(typeof window !== 'undefined' ? window : globalThis);

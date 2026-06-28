const DB_NAME = "home-euth-offline";
const DB_VERSION = 1;
const RECORDS_STORE = "records";
const QUEUE_STORE = "syncQueue";
const META_STORE = "meta";

let databasePromise;

function requireIndexedDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("Offline storage is not available in this browser.");
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Offline database transaction aborted."));
  });
}

function openDatabase() {
  requireIndexedDb();
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RECORDS_STORE)) {
          const records = db.createObjectStore(RECORDS_STORE, { keyPath: "key" });
          records.createIndex("scopeTable", "scopeTable", { unique: false });
          records.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          const queue = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
          queue.createIndex("userId", "userId", { unique: false });
          queue.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
}

function recordKey(userId, table, id) {
  return `${userId}:${table}:${String(id)}`;
}

function scopeTable(userId, table) {
  return `${userId}:${table}`;
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-data-changed"));
  }
}

export function createOfflineId() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `offline_${random}`;
}

export function isOfflineId(value) {
  return typeof value === "string" && value.startsWith("offline_");
}

export async function getCachedRecords(userId, table) {
  if (!userId) return [];
  const db = await openDatabase();
  const transaction = db.transaction(RECORDS_STORE, "readonly");
  const index = transaction.objectStore(RECORDS_STORE).index("scopeTable");
  const rows = await requestResult(index.getAll(IDBKeyRange.only(scopeTable(userId, table))));
  await transactionDone(transaction);
  return rows;
}

export async function cacheRecords(userId, table, rows, { replace = false } = {}) {
  if (!userId) return;
  const incoming = (Array.isArray(rows) ? rows : [rows]).filter((row) => row && row.id !== undefined && row.id !== null);
  const existing = await getCachedRecords(userId, table);
  const existingById = new Map(existing.map((row) => [String(row.id), row]));
  const incomingIds = new Set(incoming.map((row) => String(row.id)));
  const db = await openDatabase();
  const transaction = db.transaction(RECORDS_STORE, "readwrite");
  const store = transaction.objectStore(RECORDS_STORE);
  const now = new Date().toISOString();

  if (replace) {
    for (const oldRecord of existing) {
      if (!incomingIds.has(String(oldRecord.id)) && !oldRecord.dirty) {
        store.delete(oldRecord.key);
      }
    }
  }

  for (const data of incoming) {
    const oldRecord = existingById.get(String(data.id));
    if (oldRecord?.dirty) continue;
    const mergedData = oldRecord ? { ...oldRecord.data, ...data } : data;
    store.put({
      key: recordKey(userId, table, data.id),
      scopeTable: scopeTable(userId, table),
      userId,
      table,
      id: data.id,
      data: mergedData,
      updatedAt: data.updated_at || oldRecord?.updatedAt || null,
      cachedAt: now,
      dirty: false,
      deleted: false,
    });
  }
  await transactionDone(transaction);
  emitChange();
}

export async function insertLocalRecords(userId, table, rows) {
  const db = await openDatabase();
  const transaction = db.transaction(RECORDS_STORE, "readwrite");
  const store = transaction.objectStore(RECORDS_STORE);
  const now = new Date().toISOString();
  for (const data of rows) {
    store.put({
      key: recordKey(userId, table, data.id),
      scopeTable: scopeTable(userId, table),
      userId,
      table,
      id: data.id,
      data,
      updatedAt: data.updated_at || null,
      cachedAt: now,
      dirty: true,
      deleted: false,
    });
  }
  await transactionDone(transaction);
  emitChange();
}

export async function updateLocalRecords(userId, table, predicate, patch, { dirty = true } = {}) {
  const records = await getCachedRecords(userId, table);
  const matches = records.filter((record) => predicate(record.data));
  const db = await openDatabase();
  const transaction = db.transaction(RECORDS_STORE, "readwrite");
  const store = transaction.objectStore(RECORDS_STORE);
  const now = new Date().toISOString();
  for (const record of matches) {
    const data = { ...record.data, ...patch };
    store.put({
      ...record,
      data,
      updatedAt: data.updated_at || record.updatedAt || null,
      cachedAt: now,
      dirty,
      deleted: false,
    });
  }
  await transactionDone(transaction);
  if (matches.length) emitChange();
  return matches;
}

export async function removeLocalRecords(userId, table, predicate) {
  const records = await getCachedRecords(userId, table);
  const matches = records.filter((record) => predicate(record.data));
  const db = await openDatabase();
  const transaction = db.transaction(RECORDS_STORE, "readwrite");
  const store = transaction.objectStore(RECORDS_STORE);
  for (const record of matches) store.delete(record.key);
  await transactionDone(transaction);
  if (matches.length) emitChange();
}

export async function enqueueMutation(item) {
  const existing = await getQueueItems(item.userId);
  const pendingInsert = existing.find((queued) =>
    queued.table === item.table &&
    String(queued.recordId) === String(item.recordId) &&
    queued.operation === "insert" &&
    queued.status === "pending"
  );
  const pendingUpdate = existing.find((queued) =>
    queued.table === item.table &&
    String(queued.recordId) === String(item.recordId) &&
    queued.operation === "update" &&
    queued.status === "pending"
  );

  let queueItem = item;
  if (item.operation === "update" && pendingInsert) {
    queueItem = { ...pendingInsert, payload: { ...pendingInsert.payload, ...item.payload }, updatedAt: new Date().toISOString() };
  } else if (item.operation === "update" && pendingUpdate) {
    queueItem = { ...pendingUpdate, payload: { ...pendingUpdate.payload, ...item.payload }, updatedAt: new Date().toISOString() };
  } else {
    queueItem = {
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
      ...item,
      id: item.id || createOfflineId(),
    };
  }

  const db = await openDatabase();
  const transaction = db.transaction(QUEUE_STORE, "readwrite");
  transaction.objectStore(QUEUE_STORE).put(queueItem);
  await transactionDone(transaction);
  emitChange();
  return queueItem;
}

export async function enqueueReview(item) {
  const existing = await getQueueItems(item.userId);
  if (item.dedupeKey && existing.some((queued) => queued.dedupeKey === item.dedupeKey)) return;
  await enqueueMutation({ ...item, operation: item.operation || "review", status: "conflict" });
}

export async function getQueueItems(userId) {
  if (!userId) return [];
  const db = await openDatabase();
  const transaction = db.transaction(QUEUE_STORE, "readonly");
  const index = transaction.objectStore(QUEUE_STORE).index("userId");
  const rows = await requestResult(index.getAll(IDBKeyRange.only(userId)));
  await transactionDone(transaction);
  return rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function getQueueItem(id) {
  const db = await openDatabase();
  const transaction = db.transaction(QUEUE_STORE, "readonly");
  const item = await requestResult(transaction.objectStore(QUEUE_STORE).get(id));
  await transactionDone(transaction);
  return item;
}

export async function updateQueueItem(id, patch) {
  const item = await getQueueItem(id);
  if (!item) return;
  const db = await openDatabase();
  const transaction = db.transaction(QUEUE_STORE, "readwrite");
  transaction.objectStore(QUEUE_STORE).put({ ...item, ...patch, updatedAt: new Date().toISOString() });
  await transactionDone(transaction);
  emitChange();
}

export async function removeQueueItem(id) {
  const db = await openDatabase();
  const transaction = db.transaction(QUEUE_STORE, "readwrite");
  transaction.objectStore(QUEUE_STORE).delete(id);
  await transactionDone(transaction);
  emitChange();
}

function replaceValue(value, oldId, newId) {
  if (String(value) === String(oldId)) return newId;
  if (Array.isArray(value)) return value.map((entry) => replaceValue(entry, oldId, newId));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceValue(entry, oldId, newId)]));
  }
  return value;
}

export async function reconcileOfflineId(userId, table, oldId, remoteRecord) {
  const db = await openDatabase();
  const transaction = db.transaction([RECORDS_STORE, QUEUE_STORE], "readwrite");
  const recordsStore = transaction.objectStore(RECORDS_STORE);
  const queueStore = transaction.objectStore(QUEUE_STORE);
  const records = await requestResult(recordsStore.index("userId").getAll(IDBKeyRange.only(userId)));
  const queue = await requestResult(queueStore.index("userId").getAll(IDBKeyRange.only(userId)));
  const now = new Date().toISOString();

  for (const record of records) {
    const isInsertedRecord = record.table === table && String(record.id) === String(oldId);
    const data = isInsertedRecord ? remoteRecord : replaceValue(record.data, oldId, remoteRecord.id);
    const nextId = isInsertedRecord ? remoteRecord.id : record.id;
    const nextRecord = {
      ...record,
      key: recordKey(userId, record.table, nextId),
      id: nextId,
      data,
      dirty: isInsertedRecord ? false : record.dirty,
      cachedAt: now,
      updatedAt: isInsertedRecord ? remoteRecord.updated_at || null : record.updatedAt,
    };
    if (nextRecord.key !== record.key) recordsStore.delete(record.key);
    recordsStore.put(nextRecord);
  }

  for (const queued of queue) {
    queueStore.put({
      ...queued,
      recordId: String(queued.recordId) === String(oldId) ? remoteRecord.id : queued.recordId,
      payload: replaceValue(queued.payload, oldId, remoteRecord.id),
      baseData: replaceValue(queued.baseData, oldId, remoteRecord.id),
    });
  }

  await transactionDone(transaction);
  emitChange();
}

export async function setMeta(userId, name, value) {
  if (!userId) return;
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put({ key: `${userId}:${name}`, userId, name, value });
  await transactionDone(transaction);
  emitChange();
}

export async function getMeta(userId, name) {
  if (!userId) return null;
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readonly");
  const item = await requestResult(transaction.objectStore(META_STORE).get(`${userId}:${name}`));
  await transactionDone(transaction);
  return item?.value ?? null;
}

export async function getOfflineStatus(userId) {
  const queue = await getQueueItems(userId);
  return {
    lastSyncedAt: await getMeta(userId, "lastSyncedAt"),
    pendingCount: queue.filter((item) => item.status === "pending" || item.status === "pushing").length,
    conflictCount: queue.filter((item) => item.status === "conflict").length,
  };
}


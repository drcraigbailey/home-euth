import { rawSupabase } from "../supabase";
import {
  cacheRecords,
  getOfflineStatus,
  getQueueItem,
  getQueueItems,
  isOfflineId,
  reconcileOfflineId,
  removeQueueItem,
  setMeta,
  updateQueueItem,
} from "./offlineDb";
import { isNetworkOnline } from "./networkStatus";

const SYNC_TABLES = [
  { table: "clients", select: "*" },
  { table: "patients", select: "*, clients(*)" },
  { table: "sedation_records", select: "*" },
  { table: "consent_records", select: "*" },
  { table: "patient_procedures", select: "*" },
  { table: "diary_entries", select: "*" },
  { table: "products", select: "*" },
  { table: "stock", select: "*" },
  { table: "protocols", select: "*, protocol_drugs(*)" },
  { table: "protocol_drugs", select: "*" },
  { table: "email_templates", select: "*" },
  { table: "company_documents", select: "*" },
];

const INSERT_ORDER = {
  clients: 10,
  patients: 20,
  consent_records: 30,
  sedation_records: 30,
  patient_procedures: 30,
  diary_entries: 30,
};

let activeSync = null;
let syncState = { isSyncing: false, lastError: "" };
const listeners = new Set();

function publish(patch) {
  syncState = { ...syncState, ...patch };
  for (const listener of listeners) listener(syncState);
}

export function subscribeToSyncState(listener) {
  listeners.add(listener);
  listener(syncState);
  return () => listeners.delete(listener);
}

function stripLocalId(payload) {
  if (!payload) return payload;
  const copy = { ...payload };
  if (isOfflineId(copy.id)) delete copy.id;
  return copy;
}

function comparable(value) {
  if (value === undefined) return "__undefined__";
  return JSON.stringify(value);
}

function remoteMatchesBase(remote, baseData, baseUpdatedAt) {
  if (!remote || !baseData) return false;
  if (baseUpdatedAt && remote.updated_at) return String(baseUpdatedAt) === String(remote.updated_at);
  return Object.entries(baseData).every(([key, value]) => {
    if (key === "updated_at" || (value && !Array.isArray(value) && typeof value === "object")) return true;
    return comparable(remote[key]) === comparable(value);
  });
}

async function markConflict(item, reason) {
  await updateQueueItem(item.id, {
    status: "conflict",
    reason,
    attempts: (item.attempts || 0) + 1,
  });
}

async function syncInsert(item) {
  await updateQueueItem(item.id, { status: "pushing", attempts: (item.attempts || 0) + 1 });
  const payload = stripLocalId(item.payload);
  let result;
  try {
    result = await rawSupabase.from(item.table).insert([payload]).select().single();
  } catch (error) {
    await markConflict(item, `The create request had an uncertain outcome (${error.message}). Review it before retrying to avoid a duplicate.`);
    return;
  }
  if (result.error || !result.data) {
    await markConflict(item, `Unable to create the remote record: ${result.error?.message || "No record was returned."}`);
    return;
  }
  await reconcileOfflineId(item.userId, item.table, item.recordId, result.data);
  await removeQueueItem(item.id);
}

async function syncUpdate(item) {
  const { data: remote, error: readError } = await rawSupabase.from(item.table).select("*").eq("id", item.recordId).maybeSingle();
  if (readError) {
    await updateQueueItem(item.id, { status: "pending", reason: readError.message, attempts: (item.attempts || 0) + 1 });
    return;
  }
  if (!remoteMatchesBase(remote, item.baseData, item.baseUpdatedAt)) {
    await markConflict(item, "The remote record changed after it was cached. Review both versions before applying this edit.");
    return;
  }
  const { data, error } = await rawSupabase.from(item.table).update(item.payload).eq("id", item.recordId).select().single();
  if (error) {
    await updateQueueItem(item.id, { status: "pending", reason: error.message, attempts: (item.attempts || 0) + 1 });
    return;
  }
  await cacheRecords(item.userId, item.table, data);
  await removeQueueItem(item.id);
}

async function pushPendingQueue(userId) {
  const initial = await getQueueItems(userId);
  for (const item of initial.filter((queued) => queued.status === "pushing")) {
    await markConflict(item, "A previous create sync was interrupted after it started. Review it before retrying to avoid a duplicate.");
  }

  const pendingIds = (await getQueueItems(userId))
    .filter((item) => item.status === "pending")
    .sort((left, right) => {
      const tableOrder = (INSERT_ORDER[left.table] || 100) - (INSERT_ORDER[right.table] || 100);
      return tableOrder || new Date(left.createdAt) - new Date(right.createdAt);
    })
    .map((item) => item.id);

  for (const id of pendingIds) {
    if (!isNetworkOnline()) break;
    const item = await getQueueItem(id);
    if (!item || item.status !== "pending") continue;
    if (item.operation === "insert") await syncInsert(item);
    if (item.operation === "update") await syncUpdate(item);
  }
}

async function pullLatest(userId) {
  const results = await Promise.all(SYNC_TABLES.map(async ({ table, select }) => {
    const { data, error } = await rawSupabase.from(table).select(select);
    if (error) throw new Error(`${table}: ${error.message}`);
    await cacheRecords(userId, table, data || [], { replace: true });
    return table;
  }));

  const { data: profile, error: profileError } = await rawSupabase.from("profiles").select("*").eq("id", userId).single();
  if (profileError) throw new Error(`profiles: ${profileError.message}`);
  await cacheRecords(userId, "profiles", profile, { replace: true });
  return results;
}

async function performSync() {
  if (!isNetworkOnline()) throw new Error("The device is offline.");
  const { data, error } = await rawSupabase.auth.getSession();
  if (error || !data?.session?.user) throw new Error("A signed-in session is required before syncing.");
  const userId = data.session.user.id;
  await pushPendingQueue(userId);
  await pullLatest(userId);
  const syncedAt = new Date().toISOString();
  await setMeta(userId, "lastSyncedAt", syncedAt);
  return { userId, syncedAt, ...(await getOfflineStatus(userId)) };
}

export function synchronizeOfflineData() {
  if (activeSync) return activeSync;
  publish({ isSyncing: true, lastError: "" });
  activeSync = performSync()
    .then((result) => {
      publish({ isSyncing: false, lastError: "" });
      return result;
    })
    .catch((error) => {
      publish({ isSyncing: false, lastError: error.message });
      throw error;
    })
    .finally(() => {
      activeSync = null;
    });
  return activeSync;
}


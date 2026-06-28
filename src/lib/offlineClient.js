import {
  cacheRecords,
  createOfflineId,
  enqueueMutation,
  enqueueReview,
  getCachedRecords,
  insertLocalRecords,
  removeLocalRecords,
  updateLocalRecords,
} from "./offlineDb";
import { isNetworkOnline } from "./networkStatus";

const OFFLINE_WRITE_TABLES = new Set([
  "clients",
  "patients",
  "sedation_records",
  "consent_records",
  "patient_procedures",
  "diary_entries",
]);

const REMOTE_READ_TIMEOUT_MS = 3500;
const BACKGROUND_REFRESH_TIMEOUT_MS = 6000;
const BACKGROUND_REFRESH_COOLDOWN_MS = 30000;
const backgroundRefreshTimes = new Map();

function offlineError(message, code = "OFFLINE_UNAVAILABLE") {
  return { message, code, details: "", hint: "" };
}

function timeoutError(timeoutMs) {
  return offlineError(`The remote request took longer than ${Math.round(timeoutMs / 1000)} seconds, so cached data was used instead.`, "REMOTE_TIMEOUT");
}

function isAbortError(error) {
  return error?.name === "AbortError" || `${error?.message || ""}`.toLowerCase().includes("abort");
}

function isNetworkError(error) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return !isNetworkOnline() || ["failed to fetch", "fetch failed", "network", "timeout", "load failed", "abort"].some((text) => message.includes(text));
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function awaitRemoteWithTimeout(builder, timeoutMs) {
  if (typeof AbortController === "undefined" || typeof builder?.abortSignal !== "function") {
    return Promise.race([
      builder,
      new Promise((_, reject) => setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs)),
    ]);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await builder.abortSignal(controller.signal);
  } catch (error) {
    if (isAbortError(error)) throw timeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function currentUserId(client) {
  const { data } = await client.auth.getSession();
  return data?.session?.user?.id || null;
}

function valuesEqual(left, right) {
  if (left === null || right === null || left === undefined || right === undefined) return left === right;
  return String(left) === String(right);
}

function matchesFilters(data, filters) {
  return filters.every(({ method, args }) => {
    const [column, value] = args;
    const actual = data?.[column];
    if (method === "eq") return valuesEqual(actual, value);
    if (method === "neq") return !valuesEqual(actual, value);
    if (method === "is") return actual === value;
    if (method === "in") return Array.isArray(value) && value.some((entry) => valuesEqual(actual, entry));
    if (method === "gt") return actual > value;
    if (method === "gte") return actual >= value;
    if (method === "lt") return actual < value;
    if (method === "lte") return actual <= value;
    if (method === "match") return Object.entries(column || {}).every(([key, expected]) => valuesEqual(data?.[key], expected));
    if (method === "like" || method === "ilike") {
      const pattern = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("%", ".*");
      return new RegExp(`^${pattern}$`, method === "ilike" ? "i" : "").test(String(actual ?? ""));
    }
    return true;
  });
}

function applyLocalQuery(records, filters, orders, range, limit) {
  let data = records.filter((record) => !record.deleted).map((record) => record.data);
  data = data.filter((row) => matchesFilters(row, filters));
  for (const order of [...orders].reverse()) {
    const [column, options = {}] = order;
    const direction = options.ascending === false ? -1 : 1;
    data.sort((left, right) => {
      const a = left?.[column];
      const b = right?.[column];
      if (a === b) return 0;
      if (a === null || a === undefined) return options.nullsFirst ? -1 : 1;
      if (b === null || b === undefined) return options.nullsFirst ? 1 : -1;
      return (a > b ? 1 : -1) * direction;
    });
  }
  if (range) data = data.slice(range[0], range[1] + 1);
  if (typeof limit === "number") data = data.slice(0, limit);
  return data;
}

class OfflineQueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.remoteBuilder = client.from(table);
    this.operation = "select";
    this.payload = null;
    this.filters = [];
    this.orders = [];
    this.rangeValue = null;
    this.limitValue = null;
    this.singleMode = null;
    this.returning = false;
    this.execution = null;
  }

  select(...args) {
    if (this.operation !== "select") this.returning = true;
    this.remoteBuilder = this.remoteBuilder.select(...args);
    return this;
  }

  insert(payload, ...args) {
    this.operation = "insert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.remoteBuilder = this.remoteBuilder.insert(payload, ...args);
    return this;
  }

  upsert(payload, ...args) {
    this.operation = "insert";
    this.payload = Array.isArray(payload) ? payload : [payload];
    this.remoteBuilder = this.remoteBuilder.upsert(payload, ...args);
    return this;
  }

  update(payload, ...args) {
    this.operation = "update";
    this.payload = payload;
    this.remoteBuilder = this.remoteBuilder.update(payload, ...args);
    return this;
  }

  delete(...args) {
    this.operation = "delete";
    this.remoteBuilder = this.remoteBuilder.delete(...args);
    return this;
  }

  eq(...args) { return this.addFilter("eq", args); }
  neq(...args) { return this.addFilter("neq", args); }
  is(...args) { return this.addFilter("is", args); }
  in(...args) { return this.addFilter("in", args); }
  gt(...args) { return this.addFilter("gt", args); }
  gte(...args) { return this.addFilter("gte", args); }
  lt(...args) { return this.addFilter("lt", args); }
  lte(...args) { return this.addFilter("lte", args); }
  like(...args) { return this.addFilter("like", args); }
  ilike(...args) { return this.addFilter("ilike", args); }
  match(...args) { return this.addFilter("match", args); }

  addFilter(method, args) {
    this.filters.push({ method, args });
    this.remoteBuilder = this.remoteBuilder[method](...args);
    return this;
  }

  not(...args) {
    this.remoteBuilder = this.remoteBuilder.not(...args);
    return this;
  }

  or(...args) {
    this.remoteBuilder = this.remoteBuilder.or(...args);
    return this;
  }

  filter(...args) {
    this.remoteBuilder = this.remoteBuilder.filter(...args);
    return this;
  }

  order(...args) {
    this.orders.push(args);
    this.remoteBuilder = this.remoteBuilder.order(...args);
    return this;
  }

  limit(value, ...args) {
    this.limitValue = value;
    this.remoteBuilder = this.remoteBuilder.limit(value, ...args);
    return this;
  }

  range(from, to, ...args) {
    this.rangeValue = [from, to];
    this.remoteBuilder = this.remoteBuilder.range(from, to, ...args);
    return this;
  }

  single() {
    this.singleMode = "single";
    this.remoteBuilder = this.remoteBuilder.single();
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    this.remoteBuilder = this.remoteBuilder.maybeSingle();
    return this;
  }

  abortSignal(...args) {
    this.remoteBuilder = this.remoteBuilder.abortSignal(...args);
    return this;
  }

  then(onFulfilled, onRejected) {
    if (!this.execution) this.execution = this.execute();
    return this.execution.then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    if (!this.execution) this.execution = this.execute();
    return this.execution.catch(onRejected);
  }

  finally(onFinally) {
    if (!this.execution) this.execution = this.execute();
    return this.execution.finally(onFinally);
  }

  async execute() {
    if (this.operation === "select") return this.executeSelect();
    if (isNetworkOnline()) {
      try {
        const result = await awaitRemoteWithTimeout(this.remoteBuilder, REMOTE_READ_TIMEOUT_MS);
        if (!result.error) {
          await this.handleRemoteSuccess(result).catch(() => {});
          return result;
        }
        if (!isNetworkError(result.error)) return result;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }
    return this.executeOffline();
  }

  async executeSelect() {
    const userId = await currentUserId(this.client);
    if (userId) {
      const cachedRecords = await getCachedRecords(userId, this.table).catch(() => []);
      if (cachedRecords.length > 0) {
        const cachedResult = await this.readOffline(userId, cachedRecords);
        if (!cachedResult.error || cachedResult.error.code === "OFFLINE_RECORD_NOT_FOUND") {
          this.refreshRemoteInBackground();
          return { ...cachedResult, cacheFirst: true };
        }
      }
    }

    if (isNetworkOnline()) {
      try {
        const result = await awaitRemoteWithTimeout(this.remoteBuilder, REMOTE_READ_TIMEOUT_MS);
        if (!result.error) {
          await this.handleRemoteSuccess(result).catch(() => {});
          return result;
        }
        if (!isNetworkError(result.error)) return result;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }
    return this.executeOffline();
  }

  backgroundRefreshKey() {
    return `${this.table}:${safeJson({ filters: this.filters, orders: this.orders, range: this.rangeValue, limit: this.limitValue, singleMode: this.singleMode })}`;
  }

  refreshRemoteInBackground() {
    if (!isNetworkOnline()) return;
    const key = this.backgroundRefreshKey();
    const now = Date.now();
    const lastRefresh = backgroundRefreshTimes.get(key) || 0;
    if (now - lastRefresh < BACKGROUND_REFRESH_COOLDOWN_MS) return;
    backgroundRefreshTimes.set(key, now);

    setTimeout(async () => {
      try {
        const result = await awaitRemoteWithTimeout(this.remoteBuilder, BACKGROUND_REFRESH_TIMEOUT_MS);
        if (!result.error) await this.handleRemoteSuccess(result).catch(() => {});
      } catch {
        // Cache-first reads should stay quick. The status banner/background sync reports wider sync issues.
      }
    }, 0);
  }

  async handleRemoteSuccess(result) {
    const userId = await currentUserId(this.client);
    if (!userId) return;
    if (this.operation === "select") {
      let data = result.data;
      const idFilter = this.filters.find((filter) => filter.method === "eq" && filter.args[0] === "id");
      if (data && !Array.isArray(data) && data.id === undefined && idFilter) data = { ...data, id: idFilter.args[1] };
      await cacheRecords(userId, this.table, data || []);
      return;
    }
    if (result.data) await cacheRecords(userId, this.table, result.data);
    if (this.operation === "update") {
      await updateLocalRecords(userId, this.table, (row) => matchesFilters(row, this.filters), this.payload, { dirty: false });
    }
    if (this.operation === "delete") {
      await removeLocalRecords(userId, this.table, (row) => matchesFilters(row, this.filters));
    }
  }

  async executeOffline() {
    const userId = await currentUserId(this.client);
    if (!userId) {
      return { data: null, error: offlineError("No saved session is available. Connect to the internet to sign in."), count: null };
    }
    if (this.operation === "select") return this.readOffline(userId);
    if (this.operation === "delete") {
      return { data: null, error: offlineError("Deleting records requires an internet connection so related records remain consistent.", "OFFLINE_DELETE_BLOCKED"), count: null };
    }
    if (!OFFLINE_WRITE_TABLES.has(this.table)) {
      if (this.table === "stock") {
        const id = this.filters.find((filter) => filter.method === "eq" && filter.args[0] === "id")?.args?.[1] || "unknown";
        await enqueueReview({
          userId,
          table: this.table,
          recordId: id,
          payload: this.payload,
          reason: "Stock changed while offline. Review the remote stock level before applying any adjustment.",
          dedupeKey: `stock:${id}:${JSON.stringify(this.payload)}`,
        });
      }
      return { data: null, error: offlineError("This change is safety-sensitive and has been held for review until the app is online.", "OFFLINE_REVIEW_REQUIRED"), count: null };
    }
    return this.queueOfflineMutation(userId);
  }

  async readOffline(userId, providedRecords = null) {
    try {
      const records = providedRecords || await getCachedRecords(userId, this.table);
      const matches = applyLocalQuery(records, this.filters, this.orders, this.rangeValue, this.limitValue);
      if (this.singleMode === "single") {
        if (matches.length !== 1) {
          return { data: null, error: offlineError("The requested saved record is unavailable offline.", "OFFLINE_RECORD_NOT_FOUND"), count: null, offline: true };
        }
        return { data: matches[0], error: null, count: null, offline: true };
      }
      if (this.singleMode === "maybeSingle") {
        return { data: matches[0] || null, error: null, count: null, offline: true };
      }
      return { data: matches, error: null, count: matches.length, offline: true };
    } catch (error) {
      return { data: null, error: offlineError(error.message, "OFFLINE_STORAGE_ERROR"), count: null };
    }
  }

  async queueOfflineMutation(userId) {
    if (this.operation === "insert") {
      const localRows = this.payload.map((row) => ({ ...row, id: row.id ?? createOfflineId() }));
      await insertLocalRecords(userId, this.table, localRows);
      for (const row of localRows) {
        await enqueueMutation({ userId, table: this.table, operation: "insert", recordId: row.id, payload: row });
        if (this.table === "sedation_records" && row.results?.some((result) => result.batchId)) {
          await enqueueReview({
            userId,
            table: "stock",
            operation: "review",
            recordId: row.id,
            payload: { sedationRecordId: row.id, results: row.results },
            reason: "A sedation record was saved offline. Its stock deductions must be checked and applied once.",
            dedupeKey: `sedation-stock:${row.id}`,
          });
        }
      }
      const data = this.returning ? (this.singleMode ? localRows[0] : localRows) : null;
      return { data, error: null, count: localRows.length, offline: true };
    }

    const records = await getCachedRecords(userId, this.table);
    const matches = records.filter((record) => matchesFilters(record.data, this.filters));
    if (!matches.length) {
      return { data: null, error: offlineError("The saved record could not be found, so the edit was not queued.", "OFFLINE_RECORD_NOT_FOUND"), count: null };
    }
    await updateLocalRecords(userId, this.table, (row) => matchesFilters(row, this.filters), this.payload, { dirty: true });
    for (const record of matches) {
      await enqueueMutation({
        userId,
        table: this.table,
        operation: "update",
        recordId: record.id,
        payload: this.payload,
        baseData: record.data,
        baseUpdatedAt: record.updatedAt,
      });
    }
    const updated = matches.map((record) => ({ ...record.data, ...this.payload }));
    const data = this.returning ? (this.singleMode ? updated[0] : updated) : null;
    return { data, error: null, count: updated.length, offline: true };
  }
}

export function createOfflineSupabaseClient(client) {
  return new Proxy(client, {
    get(target, property) {
      if (property === "from") return (table) => new OfflineQueryBuilder(target, table);
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { rawSupabase } from "../supabase";
import { getOfflineStatus } from "../lib/offlineDb";
import { isNetworkOnline, subscribeToNetworkStatus } from "../lib/networkStatus";
import { subscribeToSyncState, synchronizeOfflineData } from "../lib/offlineSync";

function formatSyncTime(value) {
  if (!value) return "Not yet synced";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not yet synced" : date.toLocaleString();
}

export default function OfflineStatusBanner() {
  const location = useLocation();
  const [online, setOnline] = useState(isNetworkOnline());
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState({ lastSyncedAt: null, pendingCount: 0, conflictCount: 0 });
  const [syncState, setSyncState] = useState({ isSyncing: false, lastError: "" });

  const refreshStatus = useCallback(async (knownUserId) => {
    const id = knownUserId || userId;
    if (id) setStatus(await getOfflineStatus(id));
  }, [userId]);

  const syncNow = useCallback(async () => {
    if (!isNetworkOnline() || !userId) return;
    try {
      await synchronizeOfflineData();
    } catch {
      // The shared sync state supplies a concise, non-blocking error below.
    }
    await refreshStatus(userId);
  }, [refreshStatus, userId]);

  useEffect(() => subscribeToNetworkStatus((nextOnline) => {
    setOnline(nextOnline);
    if (nextOnline && userId) syncNow();
  }), [syncNow, userId]);

  useEffect(() => subscribeToSyncState(setSyncState), []);

  useEffect(() => {
    let cancelled = false;
    rawSupabase.auth.getSession().then(({ data }) => {
      const id = data?.session?.user?.id || null;
      if (cancelled) return;
      setUserId(id);
      if (id) {
        refreshStatus(id);
        if (isNetworkOnline()) synchronizeOfflineData().catch(() => {});
      }
    });
    const { data: authListener } = rawSupabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id || null;
      setUserId(id);
      if (id) refreshStatus(id);
    });
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [refreshStatus]);

  useEffect(() => {
    const refresh = () => refreshStatus();
    window.addEventListener("offline-data-changed", refresh);
    return () => window.removeEventListener("offline-data-changed", refresh);
  }, [refreshStatus]);

  if (location.pathname === "/login" || !userId) return null;

  const background = online ? "#eef6fb" : "#fff7df";
  const color = online ? "#3f6f93" : "#8a6518";
  return (
    <div role="status" aria-live="polite" style={{ background, color, borderBottom: `1px solid ${online ? "#c9dfed" : "#ead59b"}`, padding: "7px 16px", fontSize: "12px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "8px 14px" }}>
        <strong>{online ? "Online" : "Offline mode: showing saved data"}</strong>
        {!online && <span>Changes will sync when back online.</span>}
        <span>Last synced: {formatSyncTime(status.lastSyncedAt)}</span>
        <span>Pending: {status.pendingCount}</span>
        {status.conflictCount > 0 && <strong style={{ color: "#b45309" }}>Needs review: {status.conflictCount}</strong>}
        {syncState.lastError && online && <span title={syncState.lastError}>Sync incomplete</span>}
        {online && (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncState.isSyncing}
            style={{ background: "#5b8fb9", color: "white", border: 0, borderRadius: "6px", padding: "5px 10px", fontWeight: "bold", cursor: syncState.isSyncing ? "default" : "pointer", opacity: syncState.isSyncing ? 0.65 : 1 }}
          >
            {syncState.isSyncing ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>
    </div>
  );
}


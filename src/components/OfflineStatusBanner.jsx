import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { rawSupabase } from "../supabase";
import { getOfflineStatus } from "../lib/offlineDb";
import { isNetworkOnline, subscribeToNetworkStatus } from "../lib/networkStatus";
import { subscribeToSyncState, synchronizeOfflineData } from "../lib/offlineSync";

const syncButtonBaseStyle = {
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  padding: "8px 14px",
  fontSize: "12px",
  boxSizing: "border-box",
  display: "inline-block",
  textAlign: "center",
  minWidth: "100px",
  width: "auto",
  color: "white",
  transition: "background 160ms ease, opacity 160ms ease, transform 160ms ease",
};

function formatSyncTime(value) {
  if (!value) return "Not yet synced";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not yet synced" : date.toLocaleString();
}

function getSyncButtonState({ online, status, syncState }) {
  const pendingCount = Number(status?.pendingCount || 0);
  const conflictCount = Number(status?.conflictCount || 0);
  const hasLocalWork = pendingCount > 0 || conflictCount > 0;

  if (hasLocalWork || syncState.lastError) {
    return {
      label: "Needs sync",
      background: "#c62828",
      title: "New offline data or sync conflicts need syncing/reviewing.",
    };
  }

  if (syncState.isSyncing) {
    return {
      label: "Syncing…",
      background: "#f9a825",
      color: "#1f2933",
      title: "Sync currently in progress.",
    };
  }

  if (!online) {
    return {
      label: "Offline",
      background: "#f9a825",
      color: "#1f2933",
      title: "Offline. Saved changes will sync when back online.",
    };
  }

  if (!status.lastSyncedAt) {
    return {
      label: "Sync now",
      background: "#f9a825",
      color: "#1f2933",
      title: "This device has not synced yet.",
    };
  }

  return {
    label: "Up to date",
    background: "#2e7d32",
    title: "Local data is up to date.",
  };
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

  const syncNow = useCallback(async ({ forceFull = false } = {}) => {
    if (!isNetworkOnline() || !userId) return;
    try {
      await synchronizeOfflineData({ forceFull });
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

  const buttonState = getSyncButtonState({ online, status, syncState });
  const background = online ? "#eef6fb" : "#fff7df";
  const color = online ? "#3f6f93" : "#8a6518";
  const syncButtonDisabled = syncState.isSyncing || !online;

  return (
    <div role="status" aria-live="polite" style={{ background, color, borderBottom: `1px solid ${online ? "#c9dfed" : "#ead59b"}`, padding: "7px 16px", fontSize: "12px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "8px 14px" }}>
        <strong>{online ? "Online" : "Offline mode: showing saved data"}</strong>
        {!online && <span>Changes will sync when back online.</span>}
        <span>Last synced: {formatSyncTime(status.lastSyncedAt)}</span>
        <span>Pending: {status.pendingCount}</span>
        {status.conflictCount > 0 && <strong style={{ color: "#b45309" }}>Needs review: {status.conflictCount}</strong>}
        {syncState.lastError && online && <span title={syncState.lastError}>Sync incomplete</span>}
        <button
          type="button"
          onClick={() => syncNow({ forceFull: true })}
          disabled={syncButtonDisabled}
          title={buttonState.title}
          style={{
            ...syncButtonBaseStyle,
            background: buttonState.background,
            color: buttonState.color || "white",
            cursor: syncButtonDisabled ? "default" : "pointer",
            opacity: syncButtonDisabled ? 0.8 : 1,
          }}
        >
          {buttonState.label}
        </button>
      </div>
    </div>
  );
}

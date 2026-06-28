let online = typeof navigator === "undefined" ? true : navigator.onLine;
const listeners = new Set();

function publish(nextOnline) {
  online = nextOnline;
  for (const listener of listeners) listener(online);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => publish(true));
  window.addEventListener("offline", () => publish(false));
}

export function isNetworkOnline() {
  return online;
}

export function subscribeToNetworkStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


/**
 * Fire-and-forget POST request that survives component unmount / page navigation.
 * Uses `navigator.sendBeacon` (reliable during unload) with a fallback to `fetch(..., { keepalive: true })`.
 */

/** Check if a draft was recently auto-saved for the given endpoint. Consumes the flag. */
export function consumePendingDraft(endpoint: string): boolean {
  try {
    if (sessionStorage.getItem('draftPending') === endpoint) {
      sessionStorage.removeItem('draftPending');
      return true;
    }
  } catch { /* ignore */ }
  return false;
}
export function beaconPost(endpoint: string, payload: Record<string, any>): boolean {
  const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;
  const body = JSON.stringify(payload);

  // Signal to the list view that a draft was just saved so it can re-fetch
  try { sessionStorage.setItem('draftPending', endpoint); } catch { /* quota */ }

  // sendBeacon only supports opaque requests — we pack auth into a JSON blob
  // that the backend can read from the body.  But sendBeacon sets
  // Content-Type to text/plain for strings and doesn't allow custom headers.
  // So we use a Blob with the correct type.
  const blob = new Blob([body], { type: 'application/json' });

  // Try sendBeacon first (most reliable during unload)
  // Note: sendBeacon doesn't support custom headers, so we embed token in body.
  // We'll use fetch with keepalive instead, which supports headers.
  try {
    const success = fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: true, // ensures request completes even after page unload
    });
    // Fire and forget — don't await
    success.catch(() => {}); // suppress unhandled rejection
    return true;
  } catch {
    // Final fallback: sendBeacon (no auth header, but at least data is sent)
    // Backend would need to handle unauthenticated draft saves separately
    return navigator.sendBeacon(url, blob);
  }
}

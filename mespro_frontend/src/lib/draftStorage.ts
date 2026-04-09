const PREFIX = 'mespro_draft_';

export function saveDraft(module: string, data: Record<string, any>): void {
  try { localStorage.setItem(PREFIX + module, JSON.stringify(data)); } catch { /* quota */ }
}

export function loadDraft<T = Record<string, any>>(module: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + module);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraft(module: string): void {
  try { localStorage.removeItem(PREFIX + module); } catch {}
}

export function hasDraft(module: string): boolean {
  try { return !!localStorage.getItem(PREFIX + module); } catch { return false; }
}

// localStorage wrapper that never throws (private mode, blocked storage, etc.).
// If accounts are added later, swap this module's implementation (e.g. sync to Supabase)
// and the rest of the app doesn't change.
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

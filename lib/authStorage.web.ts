// lib/authStorage.web.ts
// Minimal AsyncStorage-like adapter backed by window.localStorage
const local: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
} = {
  getItem: async (k) => {
    try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; }
  },
  setItem: async (k, v) => {
    try { globalThis.localStorage?.setItem(k, v); } catch {}
  },
  removeItem: async (k) => {
    try { globalThis.localStorage?.removeItem(k); } catch {}
  },
};

export default local;

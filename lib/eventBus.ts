// lib/eventBus.ts
// Works on web + iOS/Android (Hermes) without polyfills.

export type Events =
  | 'items:changed'      // e.g. after delisting
  | 'wishlist:changed';  // e.g. after toggling wishlist

type Handler = () => void;

const listeners = new Map<Events, Set<Handler>>();

export function emit(type: Events) {
  const set = listeners.get(type);
  if (!set) return;
  // Copy to avoid mutation during iteration
  [...set].forEach((fn) => {
    try { fn(); } catch (e) { console.error('[eventBus handler error]', e); }
  });
}

export function on(type: Events, handler: Handler) {
  let set = listeners.get(type);
  if (!set) {
    set = new Set<Handler>();
    listeners.set(type, set);
  }
  set.add(handler);
  // return unsubscribe
  return () => {
    const s = listeners.get(type);
    if (!s) return;
    s.delete(handler);
    if (s.size === 0) listeners.delete(type);
  };
}

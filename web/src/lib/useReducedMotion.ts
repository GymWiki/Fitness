import { useSyncExternalStore } from 'react';

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function subscribe(callback: () => void) {
  if (!query) return () => {};
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getSnapshot() {
  return query?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

/**
 * Tracks the OS/browser "reduce motion" preference so animated components
 * can skip or shorten transitions. Ported from the Expo app's
 * `AccessibilityInfo`-based hook — the web analog is the
 * `prefers-reduced-motion` media query, read via `useSyncExternalStore`
 * (the React-recommended way to subscribe to external browser state without
 * the set-state-in-effect footgun of reading it inside a plain effect).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

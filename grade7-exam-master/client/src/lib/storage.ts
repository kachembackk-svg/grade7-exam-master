// Profile-aware localStorage wrapper. Every new feature's schema should read
// and write through this module (rather than calling localStorage directly)
// so it's already scoped to the active profile once multiple local profiles
// exist. Until then, everything lives under the single 'default' profile.
const ACTIVE_PROFILE_KEY = 'g7ecz_active_profile_v1';

export function activeProfileId(): string {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? 'default';
  } catch {
    return 'default';
  }
}

function namespacedKey(key: string): string {
  return `g7ecz:${activeProfileId()}:${key}`;
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(namespacedKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(namespacedKey(key), JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — the write simply doesn't persist.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(namespacedKey(key));
  } catch {
    // ignore
  }
}

import { migrateLegacyProgress } from './progress';
import { activeProfileId, setActiveProfileId } from './storage';

// Deliberately unnamespaced: this is the index of all profiles, not data
// belonging to any single profile — namespacing it would be circular.
const PROFILES_KEY = 'g7ecz_profiles_v1';
const MAX_PROFILES = 4;

export const AVAILABLE_AVATARS = ['🎓', '🦁', '🐯', '🦋', '🚀', '⭐', '🎨', '⚽', '📚', '🐶', '🐱', '🌟'];

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
}

function readProfilesRaw(): Profile[] | null {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

// Returns the full profile list, creating the very first profile (and
// migrating any pre-profiles single-user progress into it) the first time
// this is ever called. Idempotent thereafter — the check and the write are
// both synchronous, so there's no gap for a second caller to race into.
export function listProfiles(): Profile[] {
  const existing = readProfilesRaw();
  if (existing) return existing;
  const first: Profile = { id: 'default', name: 'Player 1', avatar: AVAILABLE_AVATARS[0], createdAt: Date.now() };
  migrateLegacyProgress(first.id);
  writeProfiles([first]);
  return [first];
}

export function getActiveProfile(): Profile {
  const profiles = listProfiles();
  return profiles.find((p) => p.id === activeProfileId()) ?? profiles[0];
}

export function createProfile(name: string, avatar: string): Profile | null {
  const profiles = listProfiles();
  if (profiles.length >= MAX_PROFILES) return null;
  const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const profile: Profile = {
    id,
    name: name.trim() || `Player ${profiles.length + 1}`,
    avatar,
    createdAt: Date.now(),
  };
  writeProfiles([...profiles, profile]);
  return profile;
}

// Only updates the active-profile pointer — the caller is responsible for
// reloading the page, matching progress.ts's resetProgress() convention of
// not self-reloading.
export function switchProfile(id: string): void {
  setActiveProfileId(id);
}

// Progress tracking in browser localStorage. No backend needed for V1.
import type { OptionKey, Question } from './database';
import { markWrong } from './mistakeBank';
import { keyFor, loadJSON, removeKey, saveJSON } from './storage';

export type Mode = 'practice' | 'mock' | 'quiz';

export interface AttemptRecord {
  questionId: string;
  subjectId: string;
  paperId: string;
  chosen: OptionKey;
  correct: boolean;
  mode: Mode;
  at: number; // epoch ms
}

export interface LastSession {
  mode: Mode;
  subjectId?: string;
  paperId?: string;
  topic?: string;
  at: number;
}

interface Store {
  attempts: AttemptRecord[];
  lastSession?: LastSession;
}

const KEY = 'progress_v1'; // namespaced per-profile via lib/storage.ts
const LEGACY_KEY = 'g7ecz_progress_v1'; // pre-profiles unnamespaced key
const MAX_ATTEMPTS = 5000;

function read(): Store {
  const store = loadJSON<Store>(KEY, { attempts: [] });
  if (!Array.isArray(store.attempts)) return { attempts: [] };
  return store;
}

function write(store: Store) {
  if (store.attempts.length > MAX_ATTEMPTS) {
    store.attempts = store.attempts.slice(-MAX_ATTEMPTS);
  }
  saveJSON(KEY, store);
}

// One-time migration for anyone who used the app before Sibling Profiles
// existed. Called by lib/profiles.ts, which passes in the id of the very
// first profile it just created — this function targets that id explicitly
// (via storage.ts's keyFor) rather than assuming it knows the id itself, so
// it stays correct even if the first-profile id scheme ever changes.
export function migrateLegacyProgress(targetProfileId: string): void {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return;
    const newKey = keyFor(targetProfileId, KEY);
    if (localStorage.getItem(newKey)) return; // already migrated
    localStorage.setItem(newKey, legacyRaw);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}

export function recordAnswer(q: Question, chosen: OptionKey, mode: Mode) {
  const correct = q.correctAnswer === chosen;
  const store = read();
  store.attempts.push({
    questionId: q.id,
    subjectId: q.subjectId,
    paperId: q.paperId,
    chosen,
    correct,
    mode,
    at: Date.now(),
  });
  write(store);
  // Every wrong answer, in any mode, enters (or resets) the mistake bank's
  // review queue. Guarded on a non-null correctAnswer so a data-quality gap
  // (an unresolved answer key) can't loop a question into the bank forever.
  if (q.correctAnswer != null && !correct) markWrong(q.id);
}

export function saveLastSession(s: LastSession) {
  const store = read();
  store.lastSession = s;
  write(store);
}

export function getLastSession(): LastSession | undefined {
  return read().lastSession;
}

export function getAttempts(): AttemptRecord[] {
  return read().attempts;
}

export function resetProgress() {
  removeKey(KEY);
}

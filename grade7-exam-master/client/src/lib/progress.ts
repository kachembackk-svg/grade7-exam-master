// Progress tracking in browser localStorage. No backend needed for V1.
import type { OptionKey, Question } from './database';
import { markWrong } from './mistakeBank';

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

const KEY = 'g7ecz_progress_v1';
const MAX_ATTEMPTS = 5000;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.attempts)) return { attempts: [] };
    return parsed;
  } catch {
    return { attempts: [] };
  }
}

function write(store: Store) {
  try {
    if (store.attempts.length > MAX_ATTEMPTS) {
      store.attempts = store.attempts.slice(-MAX_ATTEMPTS);
    }
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // localStorage full or unavailable — progress simply isn't saved.
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
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

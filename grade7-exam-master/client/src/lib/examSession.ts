import type { OptionKey } from './database';
import { loadJSON, saveJSON, removeKey } from './storage';

const KEY = 'exam_session_v1';

export interface ExamSession {
  subjectId: string;
  paperId?: string;
  questionIds: string[]; // preserves original question order
  answers: Record<string, OptionKey>;
  idx: number;
  startedAt: number; // epoch ms
  endsAt: number; // startedAt + totalSeconds*1000, stored directly to avoid drift
}

export function saveExamSession(session: ExamSession): void {
  saveJSON(KEY, session);
}

export function loadExamSession(): ExamSession | undefined {
  return loadJSON<ExamSession | undefined>(KEY, undefined);
}

export function clearExamSession(): void {
  removeKey(KEY);
}

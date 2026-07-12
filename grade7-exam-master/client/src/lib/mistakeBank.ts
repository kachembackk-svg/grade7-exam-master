import type { MasterDB, Question } from './database';
import { loadJSON, saveJSON } from './storage';

const KEY = 'mistake_bank_v1';
const INTERVALS_DAYS = [1, 3, 7];
const DAILY_CAP = 20;

export interface MistakeBankEntry {
  questionId: string;
  intervalIndex: number; // 0..2, indexes INTERVALS_DAYS
  dueAt: number; // epoch ms — start of the calendar day it becomes due
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function dueDateInDays(days: number): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function loadBank(): MistakeBankEntry[] {
  return loadJSON<MistakeBankEntry[]>(KEY, []);
}

function saveBank(entries: MistakeBankEntry[]): void {
  saveJSON(KEY, entries);
}

export function markWrong(questionId: string): void {
  const bank = loadBank();
  const idx = bank.findIndex((e) => e.questionId === questionId);
  const entry: MistakeBankEntry = { questionId, intervalIndex: 0, dueAt: dueDateInDays(INTERVALS_DAYS[0]) };
  if (idx === -1) bank.push(entry);
  else bank[idx] = entry;
  saveBank(bank);
}

// Only called when a question is answered correctly WITHIN a deliberate
// Review session — an incidental correct answer elsewhere (e.g. ordinary
// Practice) doesn't advance or graduate it. This matches standard
// spaced-repetition semantics (Anki/Leitner): only a scheduled review
// reschedules a card.
export function advanceOrGraduate(questionId: string): void {
  const bank = loadBank();
  const idx = bank.findIndex((e) => e.questionId === questionId);
  if (idx === -1) return;
  const entry = bank[idx];
  if (entry.intervalIndex >= INTERVALS_DAYS.length - 1) {
    bank.splice(idx, 1); // passed the 7-day review — graduated out of the bank
  } else {
    const nextIndex = entry.intervalIndex + 1;
    bank[idx] = { questionId, intervalIndex: nextIndex, dueAt: dueDateInDays(INTERVALS_DAYS[nextIndex]) };
  }
  saveBank(bank);
}

// Resolves bank entries against the live database, pruning (and persisting
// the prune of) any that no longer resolve — e.g. after a database rebuild
// changes ids — so a phantom entry can't inflate the due count forever.
function resolveAndPrune(db: MasterDB): { entry: MistakeBankEntry; question: Question }[] {
  const bank = loadBank();
  const byId = new Map(db.questions.map((q) => [q.id, q]));
  const resolved: { entry: MistakeBankEntry; question: Question }[] = [];
  const kept: MistakeBankEntry[] = [];
  for (const entry of bank) {
    const question = byId.get(entry.questionId);
    if (question) {
      kept.push(entry);
      resolved.push({ entry, question });
    }
  }
  if (kept.length !== bank.length) saveBank(kept);
  return resolved;
}

export function getDueCount(db: MasterDB): number {
  const today = startOfDay(new Date());
  return resolveAndPrune(db).filter(({ entry }) => entry.dueAt <= today).length;
}

export function getDueQuestions(db: MasterDB, limit = DAILY_CAP): Question[] {
  const today = startOfDay(new Date());
  return resolveAndPrune(db)
    .filter(({ entry }) => entry.dueAt <= today)
    .sort((a, b) => a.entry.dueAt - b.entry.dueAt)
    .slice(0, limit)
    .map(({ question }) => question);
}

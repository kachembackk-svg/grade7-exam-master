import type { MasterDB } from './database';
import type { AttemptRecord } from './progress';

export interface SubjectStat {
  subjectId: string;
  subjectName: string;
  attempted: number;
  correct: number;
  wrong: number;
  percent: number; // 0-100
}

export interface DashboardStats {
  attempted: number;
  correct: number;
  wrong: number;
  percent: number;
  uniqueQuestions: number;
  bySubject: SubjectStat[];
  bestSubject?: SubjectStat;
  weakestSubject?: SubjectStat;
}

export function pct(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
}

export function computeStats(db: MasterDB, attempts: AttemptRecord[]): DashboardStats {
  const bySubject = new Map<string, { attempted: number; correct: number }>();
  const unique = new Set<string>();
  let correct = 0;

  for (const a of attempts) {
    unique.add(a.questionId);
    if (a.correct) correct++;
    const s = bySubject.get(a.subjectId) ?? { attempted: 0, correct: 0 };
    s.attempted++;
    if (a.correct) s.correct++;
    bySubject.set(a.subjectId, s);
  }

  const subjectStats: SubjectStat[] = db.subjects.map((s) => {
    const rec = bySubject.get(s.id) ?? { attempted: 0, correct: 0 };
    return {
      subjectId: s.id,
      subjectName: s.name,
      attempted: rec.attempted,
      correct: rec.correct,
      wrong: rec.attempted - rec.correct,
      percent: pct(rec.correct, rec.attempted),
    };
  });

  const attemptedSubjects = subjectStats.filter((s) => s.attempted > 0);
  const best = attemptedSubjects.slice().sort((a, b) => b.percent - a.percent || b.attempted - a.attempted)[0];
  const weakest = attemptedSubjects.slice().sort((a, b) => a.percent - b.percent || b.attempted - a.attempted)[0];

  return {
    attempted: attempts.length,
    correct,
    wrong: attempts.length - correct,
    percent: pct(correct, attempts.length),
    uniqueQuestions: unique.size,
    bySubject: subjectStats,
    bestSubject: best,
    weakestSubject: attemptedSubjects.length > 1 ? weakest : undefined,
  };
}

export function gradeLabel(percent: number): string {
  if (percent >= 80) return 'Excellent';
  if (percent >= 65) return 'Very good';
  if (percent >= 50) return 'Good — keep practising';
  if (percent >= 35) return 'Needs more practice';
  return 'Keep going — practice makes progress';
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

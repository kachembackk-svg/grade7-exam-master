import type { MasterDB, Question } from './database';
import { questionsFor, sampleQuestions, shuffle } from './database';
import type { AttemptRecord } from './progress';
import { pct } from './scoring';

const MIN_ATTEMPTS_FOR_RADAR = 3;

export interface TopicStat {
  topic: string;
  attempted: number;
  correct: number;
  percent: number;
}

// Attempts don't carry a topic — join back to the question database by id.
// Shared by computeTopicStats (Weak-Topic Radar) and lib/readiness.ts
// (Readiness Score), which need the same per-topic aggregation but different
// filtering: this returns every topic with at least one attempt, unfiltered.
export function topicAccuracyMap(
  db: MasterDB,
  attempts: AttemptRecord[],
  subjectId: string,
): Map<string, { attempted: number; correct: number }> {
  const topicOf = new Map(db.questions.map((q) => [q.id, q.topic]));
  const byTopic = new Map<string, { attempted: number; correct: number }>();

  for (const a of attempts) {
    if (a.subjectId !== subjectId) continue;
    const topic = topicOf.get(a.questionId);
    if (!topic) continue;
    const s = byTopic.get(topic) ?? { attempted: 0, correct: 0 };
    s.attempted++;
    if (a.correct) s.correct++;
    byTopic.set(topic, s);
  }

  return byTopic;
}

// Only topics with enough attempts to be meaningful are surfaced, sorted
// weakest (lowest accuracy) first.
export function computeTopicStats(db: MasterDB, attempts: AttemptRecord[], subjectId: string): TopicStat[] {
  const byTopic = topicAccuracyMap(db, attempts, subjectId);

  return Array.from(byTopic.entries())
    .filter(([, s]) => s.attempted >= MIN_ATTEMPTS_FOR_RADAR)
    .map(([topic, s]) => ({ topic, attempted: s.attempted, correct: s.correct, percent: pct(s.correct, s.attempted) }))
    .sort((a, b) => a.percent - b.percent || b.attempted - a.attempted);
}

// Builds a quiz weighted toward the subject's weakest topics. Falls back to
// a plain random sample if there isn't enough attempt history yet to know
// which topics are weak.
export function buildWeakTopicQuiz(
  db: MasterDB,
  attempts: AttemptRecord[],
  subjectId: string,
  size = 15,
): Question[] {
  const stats = computeTopicStats(db, attempts, subjectId);
  const pool = questionsFor(db, { subjectId, activeOnly: true });
  if (stats.length === 0) return sampleQuestions(pool, size);

  // Weaker topics get a higher weight (up to 100, for a 0%-accuracy topic);
  // topics without enough attempt history aren't drawn from directly, but
  // their questions can still appear via the fallback top-up below.
  const weightByTopic = new Map(stats.map((s) => [s.topic, 101 - s.percent]));
  const eligible = shuffle(pool.filter((q) => weightByTopic.has(q.topic)));

  const picked: Question[] = [];
  const pickedIds = new Set<string>();
  const remaining = eligible.slice();
  while (picked.length < size && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, q) => sum + weightByTopic.get(q.topic)!, 0);
    let r = Math.random() * totalWeight;
    let index = 0;
    for (; index < remaining.length; index++) {
      r -= weightByTopic.get(remaining[index].topic)!;
      if (r <= 0) break;
    }
    const [chosen] = remaining.splice(Math.min(index, remaining.length - 1), 1);
    picked.push(chosen);
    pickedIds.add(chosen.id);
  }

  if (picked.length < size) {
    const rest = pool.filter((q) => !pickedIds.has(q.id));
    picked.push(...sampleQuestions(rest, size - picked.length));
  }

  return shuffle(picked);
}

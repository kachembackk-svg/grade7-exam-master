import type { MasterDB } from './database';
import { topicsFor } from './database';
import type { AttemptRecord } from './progress';
import { pct } from './scoring';
import { topicAccuracyMap } from './topicStats';

// Below this many total attempts for a subject, a numeric score isn't shown
// at all — a handful of lucky early answers with no mock-exam history yet
// would otherwise get 100% of the blend weight on just topic coverage and
// recent accuracy, which can render a misleadingly high "ready" score for a
// subject the student has barely touched.
const MIN_TOTAL_ATTEMPTS_FOR_SCORE = 5;

// How many of the subject's most recent attempts feed "recent accuracy".
const RECENT_WINDOW = 50;

// Tunable blend weights (must sum to 1) — the primary knobs to adjust if the
// score feels off. If a component has no underlying data (most commonly:
// no mock exams taken yet), its weight is redistributed proportionally
// across the remaining components rather than treated as a phantom 0%.
const WEIGHT_TOPIC_COVERAGE = 0.3;
const WEIGHT_RECENT_ACCURACY = 0.45;
const WEIGHT_EXAM_PERFORMANCE = 0.25;

interface ScoredComponent {
  value: number; // 0-100
  weight: number;
}

export interface ReadinessBreakdown {
  status: 'ready' | 'insufficient-data';
  score: number | null; // 0-100, null when status is 'insufficient-data'
  totalAttempts: number;
  topicCoverage: (ScoredComponent & { topicsAttempted: number; totalTopics: number }) | null;
  recentAccuracy: (ScoredComponent & { sampleSize: number }) | null;
  examPerformance: (ScoredComponent & { sampleSize: number }) | null;
}

export function computeReadiness(db: MasterDB, attempts: AttemptRecord[], subjectId: string): ReadinessBreakdown {
  const subjectAttempts = attempts.filter((a) => a.subjectId === subjectId).sort((a, b) => a.at - b.at);

  const totalTopics = topicsFor(db, subjectId).length;
  const topicMap = topicAccuracyMap(db, attempts, subjectId);
  const topicCoverage =
    totalTopics > 0
      ? {
          value: pct(topicMap.size, totalTopics),
          topicsAttempted: topicMap.size,
          totalTopics,
          weight: WEIGHT_TOPIC_COVERAGE,
        }
      : null;

  if (subjectAttempts.length < MIN_TOTAL_ATTEMPTS_FOR_SCORE) {
    return {
      status: 'insufficient-data',
      score: null,
      totalAttempts: subjectAttempts.length,
      topicCoverage,
      recentAccuracy: null,
      examPerformance: null,
    };
  }

  // Recent accuracy: a linear (not exponential — the simplest scheme that
  // satisfies "weighted higher", with one obvious knob to tune) recency
  // weighting over the last RECENT_WINDOW attempts. The i-th attempt in the
  // window (oldest-first) gets weight i+1, so the most recent counts most.
  const recent = subjectAttempts.slice(-RECENT_WINDOW);
  let weightedCorrect = 0;
  let totalWeight = 0;
  recent.forEach((a, i) => {
    const w = i + 1;
    totalWeight += w;
    if (a.correct) weightedCorrect += w;
  });
  const recentAccuracy = {
    value: Math.round((weightedCorrect / totalWeight) * 1000) / 10,
    sampleSize: recent.length,
    weight: WEIGHT_RECENT_ACCURACY,
  };

  const examAttempts = subjectAttempts.filter((a) => a.mode === 'mock');
  const examPerformance =
    examAttempts.length > 0
      ? {
          value: pct(examAttempts.filter((a) => a.correct).length, examAttempts.length),
          sampleSize: examAttempts.length,
          weight: WEIGHT_EXAM_PERFORMANCE,
        }
      : null;

  const components = [topicCoverage, recentAccuracy, examPerformance].filter(
    (c): c is NonNullable<typeof c> => c !== null,
  );
  const totalComponentWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score =
    totalComponentWeight > 0
      ? Math.round(components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalComponentWeight)
      : 0;

  return {
    status: 'ready',
    score,
    totalAttempts: subjectAttempts.length,
    topicCoverage,
    recentAccuracy,
    examPerformance,
  };
}

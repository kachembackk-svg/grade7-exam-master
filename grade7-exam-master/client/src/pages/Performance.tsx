import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { buildWeakTopicQuiz, computeTopicStats } from '../lib/topicStats';
import type { OptionKey, Question } from '../lib/database';
import { getAttempts, recordAnswer, saveLastSession } from '../lib/progress';

type Phase = 'radar' | 'running' | 'done';

export default function Performance() {
  const { db } = useDB();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get('subject') ?? '';
  const [phase, setPhase] = useState<Phase>('radar');
  const [attempts, setAttempts] = useState(() => getAttempts());
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  const stats = useMemo(
    () => (db && subjectId ? computeTopicStats(db, attempts, subjectId) : []),
    [db, attempts, subjectId],
  );

  if (!db) return null;

  function startWeakTopicQuiz() {
    if (!db || !subjectId) return;
    const qs = buildWeakTopicQuiz(db, attempts, subjectId, 15);
    setQuiz(qs);
    setIdx(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setCardKey((k) => k + 1);
    setPhase('running');
    saveLastSession({ mode: 'quiz', subjectId, at: Date.now() });
  }

  function backToRadar() {
    setAttempts(getAttempts());
    setPhase('radar');
  }

  const q = quiz[idx];
  const onLast = idx >= quiz.length - 1;

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Performance</h1>

      {phase === 'radar' && (
        <>
          <div className="card p-4 grid gap-3 max-w-lg">
            <label className="grid gap-1 text-sm font-semibold">
              Subject
              <select
                value={subjectId}
                onChange={(e) => setParams(e.target.value ? { subject: e.target.value } : {})}
              >
                <option value="">Choose a subject…</option>
                {db.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {subjectId && (
            <div className="card overflow-hidden">
              <div className="paper-strip">Topic accuracy — weakest first</div>
              {stats.length === 0 ? (
                <p className="p-4 text-sm text-ink/70">
                  Answer at least 3 questions in a topic (via Practice or Quiz) to see it here.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {stats.map((t) => (
                    <div key={t.topic} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold">{t.topic}</span>
                        <span className="font-mono text-ink/60">
                          {t.correct}/{t.attempted} · {t.percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
                        <div className="h-full rounded-full bg-flagred" style={{ width: `${t.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-4 border-t border-line">
                <button type="button" className="btn-copper" onClick={startWeakTopicQuiz}>
                  Practice weak topics
                </button>
                <p className="text-xs text-ink/60 mt-2">
                  Builds a 15-question quiz weighted toward your lowest-accuracy topics
                  {stats.length === 0 ? ' (falls back to a random mix until you have enough history)' : ''}.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'running' && q && (
        <>
          <QuestionCard
            key={`${q.id}-${cardKey}`}
            question={q}
            index={idx + 1}
            total={quiz.length}
            revealAnswer
            onAnswered={(k: OptionKey, correct) => {
              recordAnswer(q, k, 'quiz');
              setAnsweredCount((n) => n + 1);
              if (correct) setCorrectCount((n) => n + 1);
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (onLast) {
                  setPhase('done');
                } else {
                  setIdx((i) => i + 1);
                  setCardKey((k) => k + 1);
                  window.scrollTo({ top: 0 });
                }
              }}
            >
              {onLast ? 'Finish quiz' : 'Next question →'}
            </button>
            <span className="font-mono text-sm text-ink/60">
              {correctCount}/{answeredCount} correct
            </span>
          </div>
        </>
      )}

      {phase === 'done' && (
        <ScoreSummary correct={correctCount} total={quiz.length} title="Weak-topic practice complete">
          <button type="button" className="btn-primary" onClick={backToRadar}>
            Back to performance
          </button>
        </ScoreSummary>
      )}
    </div>
  );
}

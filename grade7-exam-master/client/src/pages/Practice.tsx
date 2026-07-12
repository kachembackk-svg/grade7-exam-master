import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { questionsFor, topicsFor } from '../lib/database';
import type { OptionKey, Question } from '../lib/database';
import { recordAnswer, saveLastSession } from '../lib/progress';

export default function Practice() {
  const { db } = useDB();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get('subject') ?? '';
  const paperId = params.get('paper') ?? '';
  const topic = params.get('topic') ?? '';

  const [idx, setIdx] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [cardKey, setCardKey] = useState(0); // forces QuestionCard remount on Next

  const pool: Question[] = useMemo(() => {
    if (!db || !subjectId) return [];
    return questionsFor(db, {
      subjectId,
      paperId: paperId || undefined,
      topic: topic || undefined,
      activeOnly: true,
    });
  }, [db, subjectId, paperId, topic]);

  const topics = useMemo(
    () => (db && subjectId ? topicsFor(db, subjectId, paperId || undefined) : []),
    [db, subjectId, paperId],
  );

  // reset run when the selection changes
  useEffect(() => {
    setIdx(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setCardKey((k) => k + 1);
  }, [subjectId, paperId, topic]);

  useEffect(() => {
    if (subjectId) {
      saveLastSession({ mode: 'practice', subjectId, paperId: paperId || undefined, topic: topic || undefined, at: Date.now() });
    }
  }, [subjectId, paperId, topic]);

  if (!db) return null;
  const subject = db.subjects.find((s) => s.id === subjectId);
  const q = pool[idx];
  const finished = subjectId && pool.length > 0 && idx >= pool.length;

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'subject') {
      next.delete('paper');
      next.delete('topic');
    }
    setParams(next, { replace: true });
  }

  function handleAnswered(qq: Question, k: OptionKey, correct: boolean) {
    recordAnswer(qq, k, 'practice');
    setAnsweredCount((n) => n + 1);
    if (correct) setCorrectCount((n) => n + 1);
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Practice mode</h1>

      <div className="card p-4 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">
          Subject
          <select value={subjectId} onChange={(e) => setParam('subject', e.target.value)}>
            <option value="">Choose a subject…</option>
            {db.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Year
          <select value={paperId} onChange={(e) => setParam('paper', e.target.value)} disabled={!subject}>
            <option value="">All years</option>
            {subject?.years.map((y) => (
              <option key={y.paperId} value={y.paperId}>
                {y.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Topic
          <select value={topic} onChange={(e) => setParam('topic', e.target.value)} disabled={!subject}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!subjectId && (
        <div className="card p-6 text-center text-ink/70">
          Choose a subject above to start practising. Each question shows the correct answer and an explanation as
          soon as you answer.
        </div>
      )}

      {subjectId && pool.length === 0 && (
        <div className="card p-6 text-center text-ink/70">No questions match this selection.</div>
      )}

      {q && !finished && (
        <>
          <QuestionCard
            key={`${q.id}-${cardKey}`}
            question={q}
            index={idx + 1}
            total={pool.length}
            revealAnswer
            onAnswered={(k, correct) => handleAnswered(q, k, correct)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setIdx((i) => i + 1);
                setCardKey((k) => k + 1);
                window.scrollTo({ top: 0 });
              }}
            >
              Next question →
            </button>
            <span className="font-mono text-sm text-ink/60">
              {correctCount}/{answeredCount} correct so far
            </span>
          </div>
        </>
      )}

      {finished && (
        <ScoreSummary correct={correctCount} total={answeredCount} title="Practice run complete">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setIdx(0);
              setAnsweredCount(0);
              setCorrectCount(0);
              setCardKey((k) => k + 1);
            }}
          >
            Practise again
          </button>
        </ScoreSummary>
      )}
    </div>
  );
}

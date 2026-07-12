import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../App';
import AssetViewer from '../components/AssetViewer';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { questionsFor } from '../lib/database';
import type { Question } from '../lib/database';
import { recordAnswer } from '../lib/progress';

export default function Flashcards() {
  const { db } = useDB();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get('subject') ?? '';

  const [idx, setIdx] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const pool: Question[] = useMemo(() => {
    if (!db) return [];
    return questionsFor(db, { subjectId: subjectId || undefined, activeOnly: true }).filter((q) => q.assetId);
  }, [db, subjectId]);

  // reset the run whenever the subject filter changes
  useEffect(() => {
    setIdx(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setCardKey((k) => k + 1);
    setRevealed(false);
  }, [subjectId]);

  if (!db) return null;
  const q = pool[idx];
  const finished = pool.length > 0 && idx >= pool.length;

  function next() {
    setIdx((i) => i + 1);
    setCardKey((k) => k + 1);
    setRevealed(false);
    window.scrollTo({ top: 0 });
  }

  function restart() {
    setIdx(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setCardKey((k) => k + 1);
    setRevealed(false);
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Figure flashcards</h1>

      <div className="card p-4 grid gap-3 max-w-sm">
        <label className="grid gap-1 text-sm font-semibold">
          Subject
          <select
            value={subjectId}
            onChange={(e) => setParams(e.target.value ? { subject: e.target.value } : {})}
          >
            <option value="">All subjects</option>
            {db.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink/60">
          {pool.length.toLocaleString()} questions have a figure. Study the image, then reveal to answer — this
          builds visual recognition of diagrams from the real papers.
        </p>
      </div>

      {pool.length === 0 && (
        <div className="card p-6 text-center text-ink/70">No questions with figures match this selection.</div>
      )}

      {q && !finished && (
        <>
          {!revealed ? (
            <div className="card overflow-hidden">
              <div className="paper-strip flex items-center justify-between">
                <span>ECZ · G7 · {q.subject}</span>
                <span className="normal-case text-ink/50">
                  {idx + 1} / {pool.length}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <AssetViewer assetId={q.assetId} />
                <button type="button" className="btn-primary mt-4" onClick={() => setRevealed(true)}>
                  Reveal question
                </button>
              </div>
            </div>
          ) : (
            <QuestionCard
              key={`${q.id}-${cardKey}`}
              question={q}
              index={idx + 1}
              total={pool.length}
              revealAnswer
              onAnswered={(k, correct) => {
                recordAnswer(q, k, 'practice');
                setAnsweredCount((n) => n + 1);
                if (correct) setCorrectCount((n) => n + 1);
              }}
            />
          )}

          {revealed && (
            <div className="flex items-center gap-3">
              <button type="button" className="btn-primary" onClick={next}>
                Next flashcard →
              </button>
              <span className="font-mono text-sm text-ink/60">
                {correctCount}/{answeredCount} correct so far
              </span>
            </div>
          )}
        </>
      )}

      {finished && (
        <ScoreSummary correct={correctCount} total={answeredCount} title="Flashcard run complete">
          <button type="button" className="btn-primary" onClick={restart}>
            Start again
          </button>
        </ScoreSummary>
      )}
    </div>
  );
}

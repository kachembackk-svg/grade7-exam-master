import { useState } from 'react';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { advanceOrGraduate, getDueCount, getDueQuestions } from '../lib/mistakeBank';
import type { OptionKey, Question } from '../lib/database';
import { recordAnswer } from '../lib/progress';

type Phase = 'setup' | 'running' | 'done';

export default function Review() {
  const { db } = useDB();
  const [phase, setPhase] = useState<Phase>('setup');
  const [dueCount, setDueCount] = useState(() => (db ? getDueCount(db) : 0));
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  if (!db) return null;

  function start() {
    if (!db) return;
    const qs = getDueQuestions(db, 20);
    setQuiz(qs);
    setIdx(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setCardKey((k) => k + 1);
    setPhase('running');
  }

  function backToSetup() {
    if (db) setDueCount(getDueCount(db));
    setPhase('setup');
  }

  const q = quiz[idx];
  const onLast = idx >= quiz.length - 1;

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Review</h1>

      {phase === 'setup' && (
        <div className="card p-4 grid gap-3 max-w-lg">
          {dueCount === 0 ? (
            <p className="text-sm text-ink/70">
              Nothing due for review today. Questions you get wrong in Practice, Quiz, or Mock Exam land here,
              due for review the next day.
            </p>
          ) : (
            <>
              <p className="text-sm">
                <strong className="font-display text-xl">{dueCount}</strong> question{dueCount === 1 ? '' : 's'}{' '}
                due today.
                {dueCount > 20 && ' Reviewing the 20 most overdue first.'}
              </p>
              <button type="button" className="btn-copper" onClick={start}>
                Start review
              </button>
            </>
          )}
        </div>
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
              if (correct) advanceOrGraduate(q.id);
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
              {onLast ? 'Finish review' : 'Next question →'}
            </button>
            <span className="font-mono text-sm text-ink/60">
              {correctCount}/{answeredCount} correct
            </span>
          </div>
        </>
      )}

      {phase === 'done' && (
        <ScoreSummary correct={correctCount} total={quiz.length} title="Review complete">
          <button type="button" className="btn-primary" onClick={backToSetup}>
            Back to review
          </button>
        </ScoreSummary>
      )}
    </div>
  );
}

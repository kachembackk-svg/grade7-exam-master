import { useMemo, useState } from 'react';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { activeQuestions, questionsFor, sampleQuestions } from '../lib/database';
import type { OptionKey, Question } from '../lib/database';
import { recordAnswer, saveLastSession } from '../lib/progress';

const SIZES = [5, 10, 20, 30];

export default function RandomQuiz() {
  const { db } = useDB();
  const [subjectId, setSubjectId] = useState('');
  const [size, setSize] = useState(10);
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  const poolSize = useMemo(() => {
    if (!db) return 0;
    return subjectId
      ? questionsFor(db, { subjectId, activeOnly: true }).length
      : activeQuestions(db).length;
  }, [db, subjectId]);

  if (!db) return null;

  function start() {
    if (!db) return;
    const pool = subjectId ? questionsFor(db, { subjectId, activeOnly: true }) : activeQuestions(db);
    setQuiz(sampleQuestions(pool, size));
    setIdx(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setCardKey((k) => k + 1);
    setPhase('running');
    saveLastSession({ mode: 'quiz', subjectId: subjectId || undefined, at: Date.now() });
  }

  const q = quiz[idx];
  const onLast = idx >= quiz.length - 1;

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Random quiz</h1>

      {phase === 'setup' && (
        <div className="card p-4 grid gap-3 max-w-lg">
          <label className="grid gap-1 text-sm font-semibold">
            Subject
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All subjects (mixed)</option>
              {db.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1 text-sm font-semibold">
            Number of questions
            <div className="flex gap-2">
              {SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSize(n)}
                  className={`px-4 py-2 rounded-lg border font-mono ${
                    size === n ? 'bg-eagle text-white border-eagle' : 'bg-white border-line'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink/60">
            {poolSize.toLocaleString()} questions available in this pool. Each question reveals the answer and
            explanation as soon as you answer it.
          </p>
          <button type="button" className="btn-primary" onClick={start}>
            Start quiz
          </button>
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
        <ScoreSummary correct={correctCount} total={quiz.length} title="Quiz complete">
          <button type="button" className="btn-primary" onClick={() => setPhase('setup')}>
            New quiz
          </button>
        </ScoreSummary>
      )}
    </div>
  );
}

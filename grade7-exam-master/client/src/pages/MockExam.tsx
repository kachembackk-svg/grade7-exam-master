import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { questionsFor, sampleQuestions } from '../lib/database';
import type { OptionKey, Question } from '../lib/database';
import { formatTime } from '../lib/scoring';
import { recordAnswer, saveLastSession } from '../lib/progress';

type Phase = 'setup' | 'running' | 'done';

export default function MockExam() {
  const { db } = useDB();
  const [params] = useSearchParams();
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '');
  const [paperId, setPaperId] = useState(params.get('paper') ?? '');
  const [phase, setPhase] = useState<Phase>('setup');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const subject = db?.subjects.find((s) => s.id === subjectId);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => stopTimer, []);

  function startExam() {
    if (!db || !subjectId) return;
    let qs: Question[];
    if (paperId) {
      // Full paper in its original order — gap placeholders excluded.
      qs = questionsFor(db, { subjectId, paperId, activeOnly: true }).slice();
      qs.sort((a, b) => a.questionNumber - b.questionNumber);
    } else {
      // Mixed years: random 60 across the subject.
      qs = sampleQuestions(questionsFor(db, { subjectId, activeOnly: true }), 60);
    }
    if (qs.length === 0) return;
    const paper = paperId ? db.papers.find((p) => p.paperId === paperId) : undefined;
    const minutes = paper?.durationMinutes ?? 90;
    const secs = Math.max(60, Math.round((minutes * 60 * qs.length) / Math.max(qs.length, 60)));
    setExamQuestions(qs);
    setAnswers({});
    setIdx(0);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setPhase('running');
    saveLastSession({ mode: 'mock', subjectId, paperId: paperId || undefined, at: Date.now() });
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finishExam();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function finishExam() {
    stopTimer();
    setPhase('done');
  }

  // record attempts once, when exam completes
  const recordedRef = useRef(false);
  useEffect(() => {
    if (phase === 'done' && !recordedRef.current) {
      recordedRef.current = true;
      for (const q of examQuestions) {
        const a = answers[q.id];
        if (a) recordAnswer(q, a, 'mock');
      }
    }
    if (phase !== 'done') recordedRef.current = false;
  }, [phase, examQuestions, answers]);

  const score = useMemo(
    () => examQuestions.filter((q) => answers[q.id] && answers[q.id] === q.correctAnswer).length,
    [examQuestions, answers],
  );

  if (!db) return null;

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Mock exam</h1>

      {phase === 'setup' && (
        <div className="card p-4 grid gap-3 max-w-lg">
          <label className="grid gap-1 text-sm font-semibold">
            Subject
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPaperId(''); }}>
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
            <select value={paperId} onChange={(e) => setPaperId(e.target.value)} disabled={!subject}>
              <option value="">Mixed years (random 60 questions)</option>
              {subject?.years.map((y) => (
                <option key={y.paperId} value={y.paperId}>
                  {y.label} — full paper ({y.activeQuestionCount} questions)
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink/60">
            Timed at 90 minutes, like the real composite paper. No answers are shown until you finish. Gap
            placeholder questions from incomplete source scans are automatically excluded.
          </p>
          <button type="button" className="btn-copper" disabled={!subjectId} onClick={startExam}>
            Start exam
          </button>
        </div>
      )}

      {phase === 'running' && examQuestions[idx] && (
        <>
          <div className="card px-4 py-2.5 flex items-center gap-4 sticky top-[104px] z-10">
            <span
              className={`font-mono font-bold text-lg ${secondsLeft <= 300 ? 'text-flagred' : 'text-eagle-dark'}`}
              aria-live="polite"
            >
              ⏱ {formatTime(secondsLeft)}
            </span>
            <span className="font-mono text-sm text-ink/60">
              {Object.keys(answers).length}/{examQuestions.length} answered
            </span>
            <button type="button" className="btn-ghost ml-auto !py-1.5 text-sm" onClick={finishExam}>
              Submit exam
            </button>
          </div>

          <QuestionCard
            question={examQuestions[idx]}
            index={idx + 1}
            total={examQuestions.length}
            selected={answers[examQuestions[idx].id] ?? null}
            onSelect={(k) => setAnswers((a) => ({ ...a, [examQuestions[idx].id]: k }))}
            revealAnswer={false}
          />

          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
              ← Previous
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={idx >= examQuestions.length - 1}
              onClick={() => {
                setIdx((i) => i + 1);
                window.scrollTo({ top: 0 });
              }}
            >
              Next →
            </button>
          </div>

          <div className="card p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/60 mb-2">Question navigator</p>
            <div className="flex flex-wrap gap-1.5">
              {examQuestions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`w-8 h-8 rounded font-mono text-xs border ${
                    i === idx
                      ? 'border-eagle bg-eagle text-white'
                      : answers[q.id]
                        ? 'border-eagle bg-eagle-pale text-eagle-dark'
                        : 'border-line bg-white'
                  }`}
                  aria-label={`Go to question ${i + 1}${answers[q.id] ? ' (answered)' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          <ScoreSummary
            correct={score}
            total={examQuestions.length}
            title={`Mock exam result — ${subject?.name ?? ''}${paperId ? ` ${paperId.replace(/\D+/g, '')}` : ' (mixed years)'}`}
            timeUsed={formatTime(totalSeconds - secondsLeft)}
          >
            <button type="button" className="btn-copper" onClick={() => setPhase('setup')}>
              New mock exam
            </button>
          </ScoreSummary>

          <h2 className="font-display font-bold text-xl mt-2">Review your answers</h2>
          <div className="grid gap-4">
            {examQuestions.map((q, i) => (
              <ReviewCard key={q.id} q={q} chosen={answers[q.id] ?? null} n={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCard({ q, chosen, n }: { q: Question; chosen: OptionKey | null; n: number }) {
  const correct = chosen === q.correctAnswer;
  return (
    <div className={`card overflow-hidden border-l-4 ${correct ? 'border-l-eagle' : 'border-l-flagred'}`}>
      <div className="p-4">
        <p className="font-mono text-xs text-ink/50 mb-1">
          #{n} · {q.paperId} Q{q.questionNumber} · {q.topic}
        </p>
        <p className="font-semibold whitespace-pre-line">{q.question}</p>
        <p className="text-sm mt-2">
          Your answer:{' '}
          <strong className={correct ? 'text-eagle-dark' : 'text-flagred'}>
            {chosen ? `${chosen} — ${q.options[chosen]}` : 'Not answered'}
          </strong>
        </p>
        {!correct && q.correctAnswer && (
          <p className="text-sm">
            Correct answer:{' '}
            <strong className="text-eagle-dark">
              {q.correctAnswer} — {q.options[q.correctAnswer]}
            </strong>
          </p>
        )}
        {q.explanation && <p className="text-sm text-ink/70 mt-1">{q.explanation}</p>}
      </div>
    </div>
  );
}

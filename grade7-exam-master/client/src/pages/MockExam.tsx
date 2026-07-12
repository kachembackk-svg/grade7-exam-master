import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import ScoreSummary from '../components/ScoreSummary';
import { questionsFor, sampleQuestions } from '../lib/database';
import type { OptionKey, Question } from '../lib/database';
import { formatTime } from '../lib/scoring';
import { recordAnswer, saveLastSession } from '../lib/progress';
import { saveExamSession, loadExamSession, clearExamSession } from '../lib/examSession';

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
  const [startedAt, setStartedAt] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [expiredWhileAway, setExpiredWhileAway] = useState(false);
  const timerRef = useRef<number | null>(null);
  const resumeCheckedRef = useRef(false);

  const subject = db?.subjects.find((s) => s.id === subjectId);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => stopTimer, []);

  function startTicking(ends: number) {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((ends - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) finishExam();
    }, 1000);
  }

  // Resume a persisted in-progress exam once the database is available.
  useEffect(() => {
    if (!db || resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    const session = loadExamSession();
    if (!session) return;

    const byId = new Map(db.questions.map((q) => [q.id, q]));
    const qs = session.questionIds.map((id) => byId.get(id)).filter((q): q is Question => !!q);
    if (qs.length === 0) {
      clearExamSession();
      return;
    }

    setSubjectId(session.subjectId);
    setPaperId(session.paperId ?? '');
    setExamQuestions(qs);
    setAnswers(session.answers);
    setIdx(Math.min(session.idx, qs.length - 1));
    setStartedAt(session.startedAt);
    setEndsAt(session.endsAt);
    setTotalSeconds(Math.round((session.endsAt - session.startedAt) / 1000));

    const remaining = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
    if (remaining <= 0) {
      setSecondsLeft(0);
      setExpiredWhileAway(true);
      setPhase('done');
      clearExamSession();
    } else {
      setSecondsLeft(remaining);
      setPhase('running');
      startTicking(session.endsAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  function persistProgress(currentAnswers: Record<string, OptionKey>, currentIdx: number, qs: Question[]) {
    if (!subjectId || qs.length === 0 || endsAt === 0) return;
    saveExamSession({
      subjectId,
      paperId: paperId || undefined,
      questionIds: qs.map((q) => q.id),
      answers: currentAnswers,
      idx: currentIdx,
      startedAt,
      endsAt,
    });
  }

  function selectAnswer(questionId: string, k: OptionKey) {
    const next = { ...answers, [questionId]: k };
    setAnswers(next);
    persistProgress(next, idx, examQuestions);
  }

  function goToIndex(i: number) {
    setIdx(i);
    persistProgress(answers, i, examQuestions);
  }

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
    // A full paper always gets its own real duration, regardless of question
    // count; only the synthetic mixed-years mode has no "real" duration.
    const secs = paper ? paper.durationMinutes * 60 : 90 * 60;
    const now = Date.now();
    const ends = now + secs * 1000;

    setExamQuestions(qs);
    setAnswers({});
    setIdx(0);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setStartedAt(now);
    setEndsAt(ends);
    setExpiredWhileAway(false);
    setPhase('running');
    saveLastSession({ mode: 'mock', subjectId, paperId: paperId || undefined, at: now });
    saveExamSession({
      subjectId,
      paperId: paperId || undefined,
      questionIds: qs.map((q) => q.id),
      answers: {},
      idx: 0,
      startedAt: now,
      endsAt: ends,
    });
    startTicking(ends);
  }

  function finishExam() {
    stopTimer();
    setPhase('done');
    clearExamSession();
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
            A full paper is timed at that paper&apos;s real duration (90 minutes), regardless of how many
            questions are active in it. Mixed-year quizzes default to 90 minutes too. No answers are shown
            until you finish. Gap placeholder questions from incomplete source scans are automatically
            excluded. If you refresh mid-exam, it resumes right where you left off, with the clock adjusted
            for time that passed.
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
            onSelect={(k) => selectAnswer(examQuestions[idx].id, k)}
            revealAnswer={false}
          />

          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" disabled={idx === 0} onClick={() => goToIndex(idx - 1)}>
              ← Previous
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={idx >= examQuestions.length - 1}
              onClick={() => {
                goToIndex(idx + 1);
                window.scrollTo({ top: 0 });
              }}
            >
              Next →
            </button>
          </div>

          <div className="card p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/60 mb-2">Answer sheet</p>
            <div className="flex flex-wrap gap-1.5">
              {examQuestions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToIndex(i)}
                  className={`w-8 h-9 rounded font-mono text-xs border flex flex-col items-center justify-center leading-none gap-0.5 ${
                    i === idx
                      ? 'border-eagle bg-eagle text-white'
                      : answers[q.id]
                        ? 'border-eagle bg-eagle-pale text-eagle-dark'
                        : 'border-line bg-white'
                  }`}
                  aria-label={`Go to question ${i + 1}${answers[q.id] ? ` (answered ${answers[q.id]})` : ''}`}
                >
                  <span>{i + 1}</span>
                  <span className="text-[9px] font-bold">{answers[q.id] ?? ''}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          {expiredWhileAway && (
            <div className="card p-4 border-l-4 border-l-copper bg-copper-pale text-sm">
              <p className="font-bold text-copper">Your exam time ran out while you were away.</p>
              <p className="mt-1">Here are your results, based on the answers you had saved before time ran out.</p>
            </div>
          )}

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

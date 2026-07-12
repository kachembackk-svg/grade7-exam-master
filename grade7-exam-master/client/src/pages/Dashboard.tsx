import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../App';
import { computeStats, gradeLabel } from '../lib/scoring';
import { getAttempts, resetProgress } from '../lib/progress';

export default function Dashboard() {
  const { db } = useDB();
  const [, setTick] = useState(0);
  const attempts = useMemo(() => getAttempts(), []);
  const stats = useMemo(() => (db ? computeStats(db, attempts) : null), [db, attempts]);

  if (!db || !stats) return null;

  const hasData = stats.attempted > 0;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-extrabold text-2xl">Your dashboard</h1>
        {hasData && (
          <button
            type="button"
            className="btn-ghost text-sm !py-1.5"
            onClick={() => {
              if (confirm('Reset all your saved progress on this device? This cannot be undone.')) {
                resetProgress();
                setTick((t) => t + 1);
                location.reload();
              }
            }}
          >
            Reset progress
          </button>
        )}
      </div>

      {!hasData && (
        <div className="card p-6 text-center text-ink/70">
          You haven&apos;t answered any questions yet. Head to{' '}
          <Link to="/practice" className="text-eagle-dark font-semibold hover:underline">
            Practice
          </Link>{' '}
          or take a{' '}
          <Link to="/quiz" className="text-eagle-dark font-semibold hover:underline">
            Random quiz
          </Link>{' '}
          and your results will show up here.
        </div>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Answered', stats.attempted],
              ['Correct', stats.correct],
              ['Wrong', stats.wrong],
              ['Accuracy', `${stats.percent}%`],
            ].map(([label, val]) => (
              <div key={String(label)} className="card p-4 text-center">
                <p className="font-display font-extrabold text-2xl">{val}</p>
                <p className="text-[11px] uppercase tracking-wider text-ink/60">{label}</p>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <p className="text-sm">
              Overall: <strong>{gradeLabel(stats.percent)}</strong> · {stats.uniqueQuestions.toLocaleString()} unique
              questions attempted.
            </p>
            {stats.bestSubject && (
              <p className="text-sm mt-1">
                Strongest subject: <strong className="text-eagle-dark">{stats.bestSubject.subjectName}</strong> (
                {stats.bestSubject.percent}%)
                {stats.weakestSubject && (
                  <>
                    {' · '}Focus next on{' '}
                    <strong className="text-copper">{stats.weakestSubject.subjectName}</strong> (
                    {stats.weakestSubject.percent}%)
                  </>
                )}
              </p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="paper-strip">By subject</div>
            <div className="divide-y divide-line">
              {stats.bySubject.map((s) => {
                const subject = db.subjects.find((x) => x.id === s.subjectId);
                return (
                  <div key={s.subjectId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">{s.subjectName}</span>
                      <span className="font-mono text-ink/60">
                        {s.attempted > 0 ? `${s.correct}/${s.attempted} · ${s.percent}%` : 'Not started'}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.percent}%`,
                          backgroundColor: subject?.color ?? '#1E7A46',
                        }}
                      />
                    </div>
                    {s.attempted > 0 && (
                      <Link
                        to={`/practice?subject=${s.subjectId}`}
                        className="text-xs text-eagle-dark font-semibold hover:underline mt-1 inline-block"
                      >
                        Practise {s.subjectName} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

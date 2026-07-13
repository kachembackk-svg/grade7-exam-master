import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../App';
import type { SubjectInfo } from '../lib/database';
import { getAttempts } from '../lib/progress';
import { computeReadiness } from '../lib/readiness';

export default function SubjectCard({ subject }: { subject: SubjectInfo }) {
  const years = subject.years.map((y) => y.label).join(' · ');
  return (
    <div
      className="card p-4 flex flex-col gap-2 hover:shadow-md hover:border-eagle transition-all"
      style={{ borderTopColor: subject.color, borderTopWidth: 4 }}
    >
      <Link to={`/practice?subject=${subject.id}`} className="flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-lg leading-tight">{subject.name}</h3>
          <span className="stamp" style={{ color: subject.color }}>
            {subject.code}
          </span>
        </div>
        <p className="font-mono text-xs text-ink/60 tracking-wide">{years}</p>
        <div className="mt-auto flex gap-4 text-sm">
          <span>
            <strong className="font-display">{subject.activeQuestionCount}</strong> questions
          </span>
          <span>
            <strong className="font-display">{subject.paperCount}</strong> papers
          </span>
        </div>
      </Link>
      {/* Sibling of the Link above, not nested inside it — a <summary> inside
          an <a> is invalid HTML and would fight the card's own navigation. */}
      <ReadinessBadge subject={subject} />
    </div>
  );
}

function ReadinessBadge({ subject }: { subject: SubjectInfo }) {
  const { db } = useDB();
  const attempts = useMemo(() => getAttempts(), []);
  const readiness = useMemo(
    () => (db ? computeReadiness(db, attempts, subject.id) : null),
    [db, attempts, subject.id],
  );

  if (!readiness) return null;

  return (
    <details className="mt-1">
      <summary
        className="cursor-pointer list-none inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-bold"
        style={{ borderColor: subject.color, color: subject.color }}
        aria-label={`Readiness score breakdown for ${subject.name}`}
      >
        {readiness.status === 'ready' ? `Readiness ${readiness.score}%` : 'Readiness: not enough data yet'}
      </summary>
      <div className="mt-2 grid gap-1 border-t border-line pt-2 text-xs text-ink/70">
        {readiness.status === 'insufficient-data' && (
          <p>Answer at least 5 questions in this subject to see your readiness score.</p>
        )}
        {readiness.topicCoverage && (
          <p>
            Topic coverage: <strong>{readiness.topicCoverage.value}%</strong> (
            {readiness.topicCoverage.topicsAttempted}/{readiness.topicCoverage.totalTopics} topics attempted)
          </p>
        )}
        {readiness.recentAccuracy && (
          <p>
            Recent accuracy: <strong>{readiness.recentAccuracy.value}%</strong> (last{' '}
            {readiness.recentAccuracy.sampleSize} answers, weighted toward the most recent)
          </p>
        )}
        {readiness.examPerformance && (
          <p>
            Mock exam performance: <strong>{readiness.examPerformance.value}%</strong> (
            {readiness.examPerformance.sampleSize} exam answers)
          </p>
        )}
        {readiness.status === 'ready' && !readiness.examPerformance && (
          <p className="text-ink/50">No mock exams taken yet — take one to add exam performance to your score.</p>
        )}
      </div>
    </details>
  );
}

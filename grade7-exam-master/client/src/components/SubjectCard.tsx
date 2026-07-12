import { Link } from 'react-router-dom';
import type { SubjectInfo } from '../lib/database';

export default function SubjectCard({ subject }: { subject: SubjectInfo }) {
  const years = subject.years.map((y) => y.label).join(' · ');
  return (
    <Link
      to={`/practice?subject=${subject.id}`}
      className="card p-4 flex flex-col gap-2 hover:shadow-md hover:border-eagle transition-all"
      style={{ borderTopColor: subject.color, borderTopWidth: 4 }}
    >
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
  );
}

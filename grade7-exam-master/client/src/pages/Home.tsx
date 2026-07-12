import { Link } from 'react-router-dom';
import { useDB } from '../App';
import SubjectCard from '../components/SubjectCard';
import { getLastSession } from '../lib/progress';

export default function Home() {
  const { db } = useDB();
  if (!db) return null;
  const last = getLastSession();
  const continueTo = last
    ? last.mode === 'mock'
      ? '/mock-exam'
      : last.mode === 'quiz'
        ? '/quiz'
        : `/practice?subject=${last.subjectId ?? ''}${last.paperId ? `&paper=${last.paperId}` : ''}${last.topic ? `&topic=${encodeURIComponent(last.topic)}` : ''}`
    : '/practice';

  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <div className="paper-strip">Examinations Council of Zambia · Grade Seven Composite Examination</div>
        <div className="p-5 sm:p-8">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
            Grade 7 ECZ Revision
          </h1>
          <p className="mt-2 text-ink/70 max-w-xl">
            Practise real past-paper questions from five subjects, with answers, explanations, mock exams under
            timed conditions, and progress tracking on your own device.
          </p>
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="font-display font-extrabold text-3xl">{db.metadata.totalActiveQuestions.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-wider text-ink/60">Total questions</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-3xl">{db.metadata.totalPapers}</p>
              <p className="text-xs uppercase tracking-wider text-ink/60">Total papers</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-3xl">{db.metadata.subjects}</p>
              <p className="text-xs uppercase tracking-wider text-ink/60">Subjects</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={continueTo} className="btn-primary">
              {last ? 'Continue practice' : 'Start practising'}
            </Link>
            <Link to="/mock-exam" className="btn-copper">
              Take a mock exam
            </Link>
            <Link to="/quiz" className="btn-ghost">
              Random quiz
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Subjects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

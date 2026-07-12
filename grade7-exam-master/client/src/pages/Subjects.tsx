import { Link } from 'react-router-dom';
import { useDB } from '../App';

export default function Subjects() {
  const { db } = useDB();
  if (!db) return null;

  return (
    <div className="grid gap-6">
      <h1 className="font-display font-extrabold text-2xl">All subjects &amp; years</h1>
      {db.subjects.map((s) => (
        <section key={s.id} className="card overflow-hidden">
          <div className="paper-strip flex items-center justify-between">
            <span>{s.name}</span>
            <span className="normal-case text-ink/50">
              {s.activeQuestionCount} questions · {s.paperCount} papers
            </span>
          </div>
          <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.years.map((y) => (
              <div key={y.paperId} className="border border-line rounded-lg p-3 flex items-center gap-3 bg-white">
                <span className="stamp" style={{ color: s.color }}>
                  {y.label}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {y.activeQuestionCount} questions
                    {y.activeQuestionCount !== y.questionCount && (
                      <span className="text-ink/50 font-normal"> ({y.questionCount - y.activeQuestionCount} missing in source)</span>
                    )}
                  </p>
                  <div className="flex gap-3 text-xs mt-0.5">
                    <Link className="text-eagle-dark font-semibold hover:underline" to={`/practice?subject=${s.id}&paper=${y.paperId}`}>
                      Practise
                    </Link>
                    <Link className="text-copper font-semibold hover:underline" to={`/mock-exam?subject=${s.id}&paper=${y.paperId}`}>
                      Mock exam
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useDB } from '../App';
import QuestionCard from '../components/QuestionCard';
import { topicsFor } from '../lib/database';
import type { Question } from '../lib/database';

const PAGE = 20;

export default function Search() {
  const { db } = useDB();
  const [q, setQ] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [paperId, setPaperId] = useState('');
  const [topic, setTopic] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const subject = db?.subjects.find((s) => s.id === subjectId);
  const topics = useMemo(
    () => (db && subjectId ? topicsFor(db, subjectId, paperId || undefined) : []),
    [db, subjectId, paperId],
  );

  const results: Question[] = useMemo(() => {
    if (!db) return [];
    const needle = q.trim().toLowerCase();
    return db.questions.filter((question) => {
      if (question.isGapPlaceholder) return false;
      if (subjectId && question.subjectId !== subjectId) return false;
      if (paperId && question.paperId !== paperId) return false;
      if (topic && question.topic !== topic) return false;
      if (!needle) return true;
      const hay = `${question.question} ${Object.values(question.options).join(' ')} ${question.topic} ${question.explanation}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [db, q, subjectId, paperId, topic]);

  if (!db) return null;
  const shown = results.slice(0, limit);

  return (
    <div className="grid gap-4">
      <h1 className="font-display font-extrabold text-2xl">Search questions</h1>

      <div className="card p-4 grid gap-3">
        <input
          type="search"
          placeholder="Search question text, options, topics, explanations…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Search questions"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold">
            Subject
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPaperId('');
                setTopic('');
                setLimit(PAGE);
              }}
            >
              <option value="">All subjects</option>
              {db.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Year
            <select
              value={paperId}
              onChange={(e) => {
                setPaperId(e.target.value);
                setTopic('');
                setLimit(PAGE);
              }}
              disabled={!subject}
            >
              <option value="">All years</option>
              {subject?.years.map((y) => (
                <option key={y.paperId} value={y.paperId}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Topic
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setLimit(PAGE);
              }}
              disabled={!subject}
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="font-mono text-sm text-ink/60">
        {results.length.toLocaleString()} {results.length === 1 ? 'match' : 'matches'}
        {results.length > shown.length && ` · showing first ${shown.length}`}
      </p>

      <div className="grid gap-4">
        {shown.map((question) => (
          <QuestionCard key={question.id} question={question} revealAnswer />
        ))}
      </div>

      {results.length > shown.length && (
        <button type="button" className="btn-ghost mx-auto" onClick={() => setLimit((l) => l + PAGE)}>
          Show more
        </button>
      )}

      {results.length === 0 && (
        <div className="card p-6 text-center text-ink/70">No questions match your search. Try different keywords.</div>
      )}
    </div>
  );
}

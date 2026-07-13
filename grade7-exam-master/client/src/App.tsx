import { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import type { MasterDB } from './lib/database';
import { loadDatabase } from './lib/database';
import ProfileSwitcher from './components/ProfileSwitcher';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import Practice from './pages/Practice';
import MockExam from './pages/MockExam';
import RandomQuiz from './pages/RandomQuiz';
import Search from './pages/Search';
import Flashcards from './pages/Flashcards';
import Performance from './pages/Performance';
import Review from './pages/Review';
import Dashboard from './pages/Dashboard';
import Diagnostics from './pages/Diagnostics';
import Admin from './pages/Admin';

interface DBContextValue {
  db: MasterDB | null;
  loading: boolean;
  error: string | null;
}

const DBContext = createContext<DBContextValue>({ db: null, loading: true, error: null });
export function useDB() {
  return useContext(DBContext);
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/subjects', label: 'Subjects' },
  { to: '/practice', label: 'Practice' },
  { to: '/mock-exam', label: 'Mock Exam' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/search', label: 'Search' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/performance', label: 'Performance' },
  { to: '/review', label: 'Review' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/diagnostics', label: 'Diagnostics' },
  { to: '/admin', label: 'Data' },
];

export default function App() {
  const [db, setDb] = useState<MasterDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatabase()
      .then((d) => setDb(d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DBContext.Provider value={{ db, loading, error }}>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          <header className="bg-eagle-dark text-white sticky top-0 z-20 shadow">
            <div className="max-w-5xl mx-auto px-4">
              <div className="flex items-center gap-3 py-3">
                <span className="stamp text-sun">ECZ · G7</span>
                <span className="font-display font-bold text-lg leading-none">Grade 7 Revision</span>
                <span className="hidden sm:inline font-mono text-[11px] tracking-widest uppercase text-white/60">
                  Zambia · Composite Examination
                </span>
                <ProfileSwitcher />
              </div>
              <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1" aria-label="Main navigation">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                        isActive ? 'bg-white text-eagle-dark' : 'text-white/85 hover:bg-white/15'
                      }`
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
            {loading && (
              <div className="card p-8 text-center">
                <p className="font-display font-bold text-lg">Loading question database…</p>
                <p className="text-sm text-ink/60 mt-1">1,800+ past-paper questions on the way.</p>
              </div>
            )}
            {error && (
              <div className="card p-6 border-flagred/50">
                <p className="font-bold text-flagred">Could not load the database.</p>
                <p className="text-sm mt-1 font-mono break-all">{error}</p>
                <p className="text-sm mt-2">
                  Check that <code className="font-mono">client/public/data/grade7_master_database.json</code> exists.
                </p>
              </div>
            )}
            {!loading && !error && (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/mock-exam" element={<MockExam />} />
                <Route path="/quiz" element={<RandomQuiz />} />
                <Route path="/search" element={<Search />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/review" element={<Review />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Home />} />
              </Routes>
            )}
          </main>

          <footer className="border-t border-line bg-white">
            <div className="max-w-5xl mx-auto px-4 py-4 text-xs text-ink/60 flex flex-wrap gap-x-4 gap-y-1">
              <span>Grade 7 Zambia ECZ Revision — past papers practice.</span>
              <span className="font-mono">
                {db
                  ? `${db.metadata.totalActiveQuestions} active questions · ${db.metadata.totalPapers} papers · ${db.metadata.subjects} subjects`
                  : ''}
              </span>
            </div>
          </footer>
        </div>
      </HashRouter>
    </DBContext.Provider>
  );
}

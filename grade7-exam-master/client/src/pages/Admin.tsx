import { useEffect, useState } from 'react';
import { useDB } from '../App';
import { SUBJECT_FILES } from '../lib/database';
import { checkImageFiles } from '../lib/validation';
import type { ImageCheckResult } from '../lib/validation';

interface FileStatus {
  name: string;
  url: string;
  ok: boolean;
  count?: number;
  error?: string;
}

export default function Admin() {
  const { db } = useDB();
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [imgResults, setImgResults] = useState<ImageCheckResult[] | null>(null);
  const [imgProgress, setImgProgress] = useState<{ done: number; total: number } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const entries: { name: string; url: string }[] = [
      { name: 'grade7_master_database.json', url: '/data/grade7_master_database.json' },
      ...Object.entries(SUBJECT_FILES).map(([sid, url]) => ({ name: `${sid}_master.json`, url })),
      { name: 'database_health_check.json', url: '/data/database_health_check.json' },
    ];
    Promise.all(
      entries.map(async (e): Promise<FileStatus> => {
        try {
          const res = await fetch(e.url);
          if (!res.ok) return { ...e, ok: false, error: `HTTP ${res.status}` };
          const json = await res.json();
          const count = Array.isArray(json.questions) ? json.questions.length : undefined;
          return { ...e, ok: true, count };
        } catch (err) {
          return { ...e, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    ).then(setFiles);
  }, []);

  if (!db) return null;

  async function runImageCheck() {
    if (!db) return;
    setChecking(true);
    setImgResults(null);
    setImgProgress({ done: 0, total: db.assets.length });
    const results = await checkImageFiles(db, (done, total) => setImgProgress({ done, total }));
    setImgResults(results);
    setChecking(false);
  }

  const present = imgResults?.filter((r) => r.exists).length ?? 0;
  const absent = imgResults?.filter((r) => !r.exists) ?? [];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display font-extrabold text-2xl">Data &amp; files</h1>
        <p className="text-sm text-ink/60 mt-1">
          Confirms which data files loaded, the totals inside them, and — on demand — which asset image files
          actually exist on the server.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="paper-strip">Loaded data files</div>
        <div className="divide-y divide-line">
          {files.map((f) => (
            <div key={f.name} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <span className={`font-mono font-bold ${f.ok ? 'text-eagle' : 'text-flagred'}`}>
                {f.ok ? 'OK' : 'FAIL'}
              </span>
              <span className="font-mono">{f.name}</span>
              <span className="ml-auto text-ink/60 font-mono text-xs">
                {f.ok ? (f.count !== undefined ? `${f.count} questions` : 'loaded') : f.error}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-display font-bold text-lg mb-2">Database totals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Total label="Subjects" value={db.metadata.subjects} />
          <Total label="Papers" value={db.metadata.totalPapers} />
          <Total label="Total questions" value={db.metadata.totalQuestions} />
          <Total label="Active questions" value={db.metadata.totalActiveQuestions} />
          <Total label="Assets" value={db.metadata.totalAssets} />
          <Total label="Passages" value={db.metadata.totalPassages} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-bold text-lg">Image file check</h2>
            <p className="text-sm text-ink/60">
              Sends a request for every one of the {db.assets.length} asset files and reports which are actually
              present.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={runImageCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Run image check'}
          </button>
        </div>

        {imgProgress && !imgResults && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div
                className="h-full bg-eagle rounded-full transition-all"
                style={{ width: `${(imgProgress.done / imgProgress.total) * 100}%` }}
              />
            </div>
            <p className="font-mono text-xs text-ink/60 mt-1">
              {imgProgress.done} / {imgProgress.total}
            </p>
          </div>
        )}

        {imgResults && (
          <div className="mt-3 text-sm">
            <p>
              <strong className="text-eagle-dark font-mono">{present}</strong> present ·{' '}
              <strong className="text-flagred font-mono">{absent.length}</strong> missing
            </p>
            {absent.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold">Show missing asset files</summary>
                <div className="font-mono text-xs bg-paper border border-line rounded p-2 mt-2 max-h-64 overflow-auto">
                  {absent.map((r) => (
                    <div key={r.assetId} className="break-all">
                      {r.assetId} → {r.path}
                    </div>
                  ))}
                </div>
              </details>
            )}
            <p className="text-xs text-ink/60 mt-2">
              To fill missing images, drop the original files into{' '}
              <code className="font-mono">client/public/data/assets/</code> using the exact filenames listed in
              MISSING_IMAGES.md, then re-run this check.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper border border-line rounded-lg p-3 text-center">
      <p className="font-display font-extrabold text-xl">{value.toLocaleString()}</p>
      <p className="text-[11px] uppercase tracking-wider text-ink/60">{label}</p>
    </div>
  );
}

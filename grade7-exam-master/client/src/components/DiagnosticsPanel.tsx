import { useMemo, useState } from 'react';
import { useDB } from '../App';
import { validateRuntime } from '../lib/validation';

function StatusRow({ label, ids, okWhenEmpty = true }: { label: string; ids: string[]; okWhenEmpty?: boolean }) {
  const [open, setOpen] = useState(false);
  const ok = okWhenEmpty ? ids.length === 0 : ids.length > 0;
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        className="w-full flex items-center gap-3 py-2.5 px-3 text-left hover:bg-paper"
        onClick={() => setOpen((o) => !o)}
        disabled={ids.length === 0}
      >
        <span className={`font-mono text-sm font-bold ${ok ? 'text-eagle' : 'text-flagred'}`}>
          {ok ? 'PASS' : 'FLAG'}
        </span>
        <span className="text-sm">{label}</span>
        <span className="ml-auto font-mono text-sm">{ids.length}</span>
      </button>
      {open && ids.length > 0 && (
        <div className="px-3 pb-3">
          <div className="font-mono text-xs bg-paper border border-line rounded p-2 max-h-48 overflow-auto break-all">
            {ids.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPanel() {
  const { db } = useDB();
  const health = useMemo(() => (db ? validateRuntime(db) : null), [db]);
  if (!db || !health) return null;
  const d = db.diagnostics;

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <h3 className="font-display font-bold text-lg mb-2">Database totals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Subjects', health.totalSubjects],
            ['Papers', health.totalPapers],
            ['Questions', health.totalQuestions],
            ['Active questions', health.totalActiveQuestions],
            ['Gap placeholders', health.gapPlaceholders.length],
            ['Assets', health.totalAssets],
            ['Passages', health.totalPassages],
            ['Structural health', `${d.structuralHealthScore}%`],
          ].map(([label, val]) => (
            <div key={String(label)} className="bg-paper border border-line rounded-lg p-2">
              <p className="font-display font-extrabold text-xl">{val}</p>
              <p className="text-[11px] uppercase tracking-wider text-ink/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="paper-strip">Structural checks (recomputed live from the loaded JSON)</div>
        <StatusRow label="Duplicate question IDs" ids={health.duplicateQuestionIds} />
        <StatusRow label="Duplicate asset IDs" ids={health.duplicateAssetIds} />
        <StatusRow label="Broken asset links (question → missing asset)" ids={health.brokenAssetLinks} />
        <StatusRow label="Broken passage links (question → missing passage)" ids={health.brokenPassageLinks} />
        <StatusRow label="Active questions missing question text" ids={health.missingQuestionText} />
        <StatusRow label="Active questions missing options" ids={health.missingOptions} />
        <StatusRow label="Active questions missing correct answer" ids={health.missingAnswers} />
        <StatusRow label="Active questions missing explanation" ids={health.missingExplanations} />
      </div>

      <div className="card overflow-hidden">
        <div className="paper-strip">Known content gaps &amp; flags (preserved from source papers)</div>
        <StatusRow label="Gap placeholder questions (excluded from quizzes and exams)" ids={health.gapPlaceholders} />
        <StatusRow label="Answer-key discrepancies (CTS 2020 handwritten source)" ids={d.answerKeyDiscrepancies} />
      </div>

      <div className="card overflow-hidden">
        <div className="paper-strip">Image files</div>
        <div className="px-3 py-2.5 text-sm flex gap-4 border-b border-line">
          <span>
            Present: <strong className="font-mono">{d.imagesPresentCount}</strong>
          </span>
          <span>
            Missing: <strong className="font-mono text-flagred">{d.missingImageCount}</strong>
          </span>
        </div>
        <StatusRow
          label="Assets flagged missingImage (original file not recovered yet)"
          ids={health.assetsFlaggedMissingImage}
        />
        <p className="px-3 py-2.5 text-xs text-ink/60">
          Drop the original image files into <code className="font-mono">client/public/data/assets/</code> using the
          exact fileName shown for each asset (see MISSING_IMAGES.md in the project root), and they will display
          automatically — no code changes needed.
        </p>
      </div>

      {d.notes.length > 0 && (
        <div className="card p-4">
          <h3 className="font-display font-bold text-lg mb-2">Source-data notes</h3>
          <ul className="list-disc pl-5 text-sm space-y-1 text-ink/80">
            {d.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

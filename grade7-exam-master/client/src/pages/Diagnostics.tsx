import DiagnosticsPanel from '../components/DiagnosticsPanel';

export default function Diagnostics() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display font-extrabold text-2xl">Database diagnostics</h1>
        <p className="text-sm text-ink/60 mt-1">
          A live health report on the question database — structural integrity, known content gaps, and image
          coverage. All checks are recomputed in the browser from the loaded data.
        </p>
      </div>
      <DiagnosticsPanel />
    </div>
  );
}

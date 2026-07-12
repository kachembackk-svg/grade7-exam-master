import { gradeLabel, pct } from '../lib/scoring';

interface Props {
  correct: number;
  total: number;
  title?: string;
  timeUsed?: string;
  children?: React.ReactNode;
}

export default function ScoreSummary({ correct, total, title = 'Your score', timeUsed, children }: Props) {
  const percent = pct(correct, total);
  return (
    <div className="card p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/60">{title}</p>
      <p className="font-display text-5xl font-extrabold mt-2">
        {correct}
        <span className="text-2xl text-ink/50"> / {total}</span>
      </p>
      <p className="font-display text-xl font-bold mt-1 text-eagle-dark">{percent}%</p>
      <p className="text-sm text-ink/70 mt-1">{gradeLabel(percent)}</p>
      {timeUsed && (
        <p className="font-mono text-xs text-ink/50 mt-2">Time used: {timeUsed}</p>
      )}
      {children && <div className="mt-4 flex flex-wrap gap-2 justify-center">{children}</div>}
    </div>
  );
}

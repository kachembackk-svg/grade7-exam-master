import { useState } from 'react';
import type { OptionKey, Question } from '../lib/database';
import { getPassage } from '../lib/database';
import { useDB } from '../App';
import AssetViewer from './AssetViewer';

const LETTERS: OptionKey[] = ['A', 'B', 'C', 'D'];

interface Props {
  question: Question;
  index?: number; // position in current set (1-based)
  total?: number;
  // Controlled mode (mock exam): selection only, no reveal
  selected?: OptionKey | null;
  onSelect?: (k: OptionKey) => void;
  revealAnswer?: boolean; // practice/quiz: show correct/incorrect + explanation once answered
  onAnswered?: (k: OptionKey, correct: boolean) => void;
  showMeta?: boolean;
}

export default function QuestionCard({
  question: q,
  index,
  total,
  selected,
  onSelect,
  revealAnswer = true,
  onAnswered,
  showMeta = true,
}: Props) {
  const { db } = useDB();
  const [localChoice, setLocalChoice] = useState<OptionKey | null>(null);
  const choice = onSelect ? (selected ?? null) : localChoice;
  const answered = revealAnswer && choice !== null;
  const passage = db ? getPassage(db, q.passageId) : undefined;

  function pick(k: OptionKey) {
    if (onSelect) {
      onSelect(k);
      return;
    }
    if (localChoice !== null) return; // one submission per question in reveal mode
    setLocalChoice(k);
    onAnswered?.(k, q.correctAnswer === k);
  }

  function optionClasses(k: OptionKey): string {
    if (!answered) {
      return choice === k ? 'option-btn border-eagle bg-eagle-pale ring-1 ring-eagle' : 'option-btn';
    }
    if (k === q.correctAnswer) return 'option-btn border-eagle bg-eagle-pale ring-1 ring-eagle';
    if (k === choice) return 'option-btn border-flagred bg-red-50 ring-1 ring-flagred';
    return 'option-btn opacity-60';
  }

  return (
    <div className="card overflow-hidden">
      <div className="paper-strip flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>ECZ · G7 · {q.subject}</span>
        <span>· {q.year}</span>
        <span>· Q{q.questionNumber}</span>
        {index !== undefined && total !== undefined && (
          <span className="ml-auto normal-case text-ink/50">
            {index} / {total}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {showMeta && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider bg-paper border border-line rounded px-2 py-0.5">
              {q.topic}
            </span>
            {q.section && (
              <span className="text-[11px] font-mono uppercase tracking-wider bg-paper border border-line rounded px-2 py-0.5">
                Section {q.section}
              </span>
            )}
          </div>
        )}

        {passage && (
          <details className="mb-3 border border-line rounded-lg bg-paper" open>
            <summary className="cursor-pointer px-3 py-2 font-semibold text-sm text-eagle-dark">
              Reading passage: {passage.title}
            </summary>
            <div className="px-3 pb-3 text-sm whitespace-pre-line leading-relaxed">{passage.text}</div>
          </details>
        )}

        <AssetViewer assetId={q.assetId} />

        <p className="font-semibold text-base sm:text-lg leading-snug whitespace-pre-line">{q.question}</p>

        <div className="mt-4 grid gap-2">
          {LETTERS.map((k) => (
            <button
              key={k}
              type="button"
              className={optionClasses(k)}
              disabled={answered}
              onClick={() => pick(k)}
              aria-pressed={choice === k}
            >
              <span className="option-letter">{k}</span>
              <span className="pt-0.5">{q.options[k]}</span>
              {answered && k === q.correctAnswer && (
                <span className="ml-auto text-eagle font-bold" aria-label="correct">
                  ✓
                </span>
              )}
              {answered && k === choice && k !== q.correctAnswer && (
                <span className="ml-auto text-flagred font-bold" aria-label="your answer, incorrect">
                  ✗
                </span>
              )}
            </button>
          ))}
        </div>

        {answered && (
          <div
            className={`mt-4 rounded-lg border p-3 text-sm ${
              choice === q.correctAnswer
                ? 'border-eagle bg-eagle-pale text-eagle-dark'
                : 'border-flagred/50 bg-red-50 text-ink'
            }`}
          >
            <p className="font-bold">
              {choice === q.correctAnswer ? 'Correct!' : `Not quite — the correct answer is ${q.correctAnswer}.`}
            </p>
            {q.explanation && <p className="mt-1 leading-relaxed">{q.explanation}</p>}
            {q.sourceAnswerKeyNote && (
              <p className="mt-2 text-xs text-copper border-l-4 border-copper pl-2">
                Source note: {q.sourceAnswerKeyNote}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

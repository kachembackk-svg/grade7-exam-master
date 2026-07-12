// Runtime validation: recomputes database health directly from the loaded
// JSON (independent of the build-time report), plus an image-file checker
// that verifies asset files actually exist on the server.
import type { MasterDB } from './database';

export interface RuntimeHealth {
  totalSubjects: number;
  totalPapers: number;
  totalQuestions: number;
  totalActiveQuestions: number;
  gapPlaceholders: string[];
  totalAssets: number;
  totalPassages: number;
  duplicateQuestionIds: string[];
  duplicateAssetIds: string[];
  brokenAssetLinks: string[];
  brokenPassageLinks: string[];
  missingAnswers: string[];
  missingExplanations: string[];
  missingQuestionText: string[];
  missingOptions: string[];
  assetsFlaggedMissingImage: string[];
}

export function validateRuntime(db: MasterDB): RuntimeHealth {
  const qIds = new Map<string, number>();
  const aIds = new Map<string, number>();
  for (const q of db.questions) qIds.set(q.id, (qIds.get(q.id) ?? 0) + 1);
  for (const a of db.assets) aIds.set(a.id, (aIds.get(a.id) ?? 0) + 1);

  const assetSet = new Set(db.assets.map((a) => a.id));
  const passageSet = new Set(db.passages.map((p) => p.id));
  const active = db.questions.filter((q) => !q.isGapPlaceholder);

  return {
    totalSubjects: db.subjects.length,
    totalPapers: db.papers.length,
    totalQuestions: db.questions.length,
    totalActiveQuestions: active.length,
    gapPlaceholders: db.questions.filter((q) => q.isGapPlaceholder).map((q) => q.id),
    totalAssets: db.assets.length,
    totalPassages: db.passages.length,
    duplicateQuestionIds: [...qIds.entries()].filter(([, n]) => n > 1).map(([id]) => id),
    duplicateAssetIds: [...aIds.entries()].filter(([, n]) => n > 1).map(([id]) => id),
    brokenAssetLinks: db.questions.filter((q) => q.assetId && !assetSet.has(q.assetId)).map((q) => q.id),
    brokenPassageLinks: db.questions.filter((q) => q.passageId && !passageSet.has(q.passageId)).map((q) => q.id),
    missingAnswers: active.filter((q) => !q.correctAnswer || !'ABCD'.includes(q.correctAnswer)).map((q) => q.id),
    missingExplanations: active.filter((q) => !(q.explanation ?? '').trim()).map((q) => q.id),
    missingQuestionText: active.filter((q) => !(q.question ?? '').trim()).map((q) => q.id),
    missingOptions: active
      .filter((q) => !q.options || (['A', 'B', 'C', 'D'] as const).some((k) => !String(q.options[k] ?? '').trim()))
      .map((q) => q.id),
    assetsFlaggedMissingImage: db.assets.filter((a) => a.missingImage).map((a) => a.id),
  };
}

export interface ImageCheckResult {
  assetId: string;
  path: string;
  exists: boolean;
}

// Checks which asset image files actually exist by issuing HEAD requests
// with limited concurrency. onProgress is called after each check.
export async function checkImageFiles(
  db: MasterDB,
  onProgress?: (done: number, total: number) => void,
): Promise<ImageCheckResult[]> {
  const results: ImageCheckResult[] = [];
  const queue = db.assets.slice();
  const total = queue.length;
  let done = 0;
  const CONCURRENCY = 8;

  async function worker() {
    while (queue.length > 0) {
      const asset = queue.shift();
      if (!asset) break;
      let exists = false;
      try {
        const res = await fetch(asset.path, { method: 'HEAD' });
        exists = res.ok;
      } catch {
        exists = false;
      }
      results.push({ assetId: asset.id, path: asset.path, exists });
      done++;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  results.sort((a, b) => a.assetId.localeCompare(b.assetId));
  return results;
}

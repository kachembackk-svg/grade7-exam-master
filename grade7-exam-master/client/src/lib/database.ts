// Central database types + loader for the Grade 7 ECZ Revision app.
// The whole database ships as static JSON in /public/data and is fetched once.

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  paperId: string;
  subject: string;
  subjectId: string;
  year: number;
  grade: number;
  section: string | null;
  part: number | string | null;
  topic: string;
  questionNumber: number;
  question: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey | null;
  explanation: string;
  assetId: string | null;
  passageId: string | null;
  isGapPlaceholder: boolean;
  confidence?: string | null;
  sourceAnswerKeyNote?: string | null;
}

export interface Asset {
  id: string;
  subject: string;
  subjectId: string;
  year: number;
  paperId: string;
  type: string;
  title: string;
  description: string;
  fileName: string;
  path: string;
  linkedQuestionIds: string[];
  missingImage: boolean;
  reason?: string;
  originalImageFilename?: string;
  pdfPageNumber?: number | null;
}

export interface Passage {
  id: string;
  subject: string;
  subjectId: string;
  year: number;
  paperId: string;
  title: string;
  text: string;
  linkedQuestionIds: string[];
}

export interface Paper {
  paperId: string;
  subjectId: string;
  subject: string;
  year: number;
  label: string;
  questionCount: number;
  activeQuestionCount: number;
  gapPlaceholderCount: number;
  assetCount: number;
  passageCount: number;
  durationMinutes: number;
  paperCode?: string | null;
}

export interface SubjectInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  questionCount: number;
  activeQuestionCount: number;
  paperCount: number;
  assetCount: number;
  passageCount: number;
  years: { year: number; paperId: string; label: string; questionCount: number; activeQuestionCount: number }[];
}

export interface Diagnostics {
  generatedOn: string;
  totalSubjects: number;
  totalPapers: number;
  totalQuestions: number;
  totalActiveQuestions: number;
  totalGapPlaceholders: number;
  gapPlaceholderIds: string[];
  totalAssets: number;
  totalPassages: number;
  duplicateQuestionIds: string[];
  duplicateAssetIds: string[];
  duplicatePassageIds: string[];
  brokenAssetLinks: string[];
  brokenPassageLinks: string[];
  brokenAssetBacklinks: string[];
  missingQuestionText: string[];
  missingOptions: string[];
  missingAnswers: string[];
  missingExplanations: string[];
  missingImages: { assetId: string; fileName: string; originalImageFilename: string; reason: string }[];
  missingImageCount: number;
  imagesPresentCount: number;
  answerKeyDiscrepancies: string[];
  structuralHealthScore: number;
  notes: string[];
}

export interface MasterDB {
  metadata: {
    title: string;
    grade: number;
    country: string;
    examBoard: string;
    subjects: number;
    totalPapers: number;
    totalQuestions: number;
    totalActiveQuestions: number;
    totalAssets: number;
    totalPassages: number;
    generatedOn: string;
    sourceFiles: string[];
  };
  subjects: SubjectInfo[];
  papers: Paper[];
  questions: Question[];
  assets: Asset[];
  passages: Passage[];
  diagnostics: Diagnostics;
}

export const DB_URL = '/data/grade7_master_database.json';

export const SUBJECT_FILES: Record<string, string> = {
  english: '/data/english_master.json',
  mathematics: '/data/mathematics_master.json',
  science: '/data/science_master.json',
  socialstudies: '/data/socialstudies_master.json',
  cts: '/data/cts_master.json',
};

// The database JSON and every asset path inside it are absolute (leading
// "/"), so they need to be resolved against Vite's base path (which is
// non-root when deployed under a GitHub Pages project subpath).
export function withBase(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

let cached: MasterDB | null = null;

export async function loadDatabase(): Promise<MasterDB> {
  if (cached) return cached;
  const url = withBase(DB_URL);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load database (${res.status}) from ${url}`);
  const db = (await res.json()) as MasterDB;
  cached = db;
  return db;
}

// ---------- Query helpers ----------

export function activeQuestions(db: MasterDB): Question[] {
  return db.questions.filter((q) => !q.isGapPlaceholder);
}

export function questionsFor(
  db: MasterDB,
  opts: { subjectId?: string; paperId?: string; year?: number; topic?: string; activeOnly?: boolean },
): Question[] {
  return db.questions.filter((q) => {
    if (opts.activeOnly && q.isGapPlaceholder) return false;
    if (opts.subjectId && q.subjectId !== opts.subjectId) return false;
    if (opts.paperId && q.paperId !== opts.paperId) return false;
    if (opts.year !== undefined && q.year !== opts.year) return false;
    if (opts.topic && q.topic !== opts.topic) return false;
    return true;
  });
}

export function topicsFor(db: MasterDB, subjectId?: string, paperId?: string): string[] {
  const set = new Set<string>();
  for (const q of db.questions) {
    if (q.isGapPlaceholder) continue;
    if (subjectId && q.subjectId !== subjectId) continue;
    if (paperId && q.paperId !== paperId) continue;
    set.add(q.topic);
  }
  return Array.from(set).sort();
}

export function getAsset(db: MasterDB, assetId: string | null | undefined): Asset | undefined {
  if (!assetId) return undefined;
  return db.assets.find((a) => a.id === assetId);
}

export function getPassage(db: MasterDB, passageId: string | null | undefined): Passage | undefined {
  if (!passageId) return undefined;
  return db.passages.find((p) => p.id === passageId);
}

export function getSubject(db: MasterDB, subjectId: string): SubjectInfo | undefined {
  return db.subjects.find((s) => s.id === subjectId);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleQuestions(pool: Question[], n: number): Question[] {
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

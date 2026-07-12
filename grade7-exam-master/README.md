# Grade 7 Zambia ECZ Revision Exam App

A self-contained revision app for the Zambian **Examinations Council of Zambia (ECZ) Grade 7 Composite Examination**. It bundles **1,835 real past-paper questions** across five subjects with answers, explanations, timed mock exams, a random quiz, full-text search, progress tracking, and a live database health report.

Everything runs from static JSON in the browser — **no database, no server, no accounts**. Progress is saved on the learner's own device via `localStorage`.

## What's inside

| Subject | Active questions | Papers |
|---|---|---|
| English | 360 | 2010 (Specimen), 2016–2019, 2021 |
| Mathematics | 420 | 2014–2017, 2019–2021 |
| Integrated Science | 350 | 2016–2021, 2023 |
| Social Studies | 353 | 2016–2021 |
| Creative & Technology Studies | 352 | 2016, 2018–2021, 2023 |
| **Total** | **1,835** | **32 papers** |

Plus 246 asset records, 13 English reading passages, and a full diagnostics report. See `DATABASE_HEALTH_CHECK_REPORT.md`.

## Pages

- **Home** — totals, subject cards, and a "continue where you left off" button.
- **Subjects** — every subject broken down by year, with question counts.
- **Practice** — pick a subject, year and/or topic; answer one question at a time and see the correct answer and explanation immediately.
- **Mock Exam** — a full paper in its original order, or a random 60-question mix, under a 90-minute timer with a question navigator and end-of-exam review.
- **Quiz** — a quick random set (5/10/20/30) from one subject or all.
- **Search** — keyword search across question text, options, topics and explanations, with filters.
- **Dashboard** — your accuracy overall and per subject, strongest and weakest subjects.
- **Diagnostics** — live structural health, known content gaps, and image coverage.
- **Data** — confirms which files loaded, database totals, and an on-demand image-file existence check.

## Run it on Replit

1. Create a new Repl → **Import** → upload this project's ZIP (or drag the unzipped folder in).
2. Press **Run**. On the first run it installs dependencies, then starts the dev server; this takes a minute or two.
3. The app opens in the Repl's web preview.

The `.replit` file already sets the run command, so you don't need to configure anything. If you ever need to start it manually, the command is:

```bash
bash start.sh
```

which is equivalent to:

```bash
cd client && npm install && npm run dev -- --host 0.0.0.0 --port 3000
```

## Run it locally

Requires **Node.js 20+**.

```bash
cd client
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:3000`).

To build a static production bundle:

```bash
cd client
npm run build      # output in client/dist
npm run preview    # serve the built bundle
```

## Project structure

```
grade7-exam-master/
├── .replit, replit.nix, start.sh     # Replit run configuration
├── package.json                      # root launcher scripts
├── README.md
├── DATABASE_HEALTH_CHECK_REPORT.md   # full validation report
├── MISSING_IMAGES.md                 # drop-in file names for missing images
└── client/
    ├── index.html
    ├── package.json, vite.config.ts, tsconfig.json
    ├── tailwind.config.js, postcss.config.js
    └── src/
        ├── main.tsx, App.tsx
        ├── lib/         # database, progress, scoring, validation
        ├── components/  # QuestionCard, AssetViewer, etc.
        ├── pages/       # the nine pages above
        └── public/data/
            ├── grade7_master_database.json   # the unified database
            ├── <subject>_master.json         # per-subject copies
            ├── database_health_check.json
            └── assets/                        # image files
```

## Images

**All 246 asset images are included — 0 missing.** The 5 English visual assets and all 77 Mathematics figures are re-rendered cleanly and watermark-free. Integrated Science (76 figures), Social Studies (9 figures), and Creative & Technology Studies (79 figures) are likewise complete, extracted from the original ECZ scanned papers. See `DATABASE_HEALTH_CHECK_REPORT.md` for the per-subject breakdown.

If a source PDF for a future paper is supplied later, adding its images is a drop-in operation: place each original image in `client/public/data/assets/` using the exact file name from `MISSING_IMAGES.md`'s naming convention, and it appears automatically. Questions with a missing image still show their full text, options, answer, and explanation, plus a written description of the figure.

## Data integrity

No question text, option, correct answer, or explanation was altered. The build only performed structural normalisation (unified field names, consistent IDs, paper grouping) and preserved every known gap and source-answer-key note from the original papers. Full details are in `DATABASE_HEALTH_CHECK_REPORT.md`.

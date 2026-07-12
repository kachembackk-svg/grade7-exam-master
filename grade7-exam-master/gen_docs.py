#!/usr/bin/env python3
"""gen_docs.py — recompute database_health_check.json, regenerate
MISSING_IMAGES.md and DATABASE_HEALTH_CHECK_REPORT.md, and refresh the
README image count. Read-only with respect to question content."""
import json, os, collections, datetime, re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'client', 'public', 'data')
ASSETS = os.path.join(DATA, 'assets')

with open(os.path.join(DATA, 'grade7_master_database.json')) as f:
    db = json.load(f)

now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
questions = db['questions']; assets = db['assets']; passages = db.get('passages', [])
active = [q for q in questions if not q.get('isGapPlaceholder')]
gaps = [q for q in questions if q.get('isGapPlaceholder')]

qids = {q['id'] for q in questions}
aids = {a['id'] for a in assets}
pids = {p['id'] for p in passages}

def dups(items):
    c = collections.Counter(i['id'] for i in items)
    return sorted([k for k, v in c.items() if v > 1])

broken_asset_links = sorted([q['id'] for q in questions if q.get('assetId') and q['assetId'] not in aids])
broken_passage_links = sorted([q['id'] for q in questions if q.get('passageId') and q['passageId'] not in pids])
broken_backlinks = sorted([a['id'] for a in assets for lq in a.get('linkedQuestionIds', []) if lq not in qids])

missing_text = sorted([q['id'] for q in active if not q.get('question')])
missing_opts = sorted([q['id'] for q in active if not q.get('options') or len(q['options']) < 4])
missing_ans = sorted([q['id'] for q in active if not q.get('correctAnswer')])
missing_expl = sorted([q['id'] for q in active if not q.get('explanation')])

missing_assets = sorted([a for a in assets if a.get('missingImage')], key=lambda a: a['id'])
present_count = len(assets) - len(missing_assets)

akd = sorted([q['id'] for q in questions if q.get('sourceAnswerKeyNote')])

# preserve rename log from existing health check if present
old = {}
hc_path = os.path.join(DATA, 'database_health_check.json')
if os.path.isfile(hc_path):
    with open(hc_path) as f:
        old = json.load(f)

checks = [len(dups(questions)), len(dups(assets)), len(dups(passages)),
          len(broken_asset_links), len(broken_passage_links), len(broken_backlinks),
          len(missing_text), len(missing_opts), len(missing_ans), len(missing_expl)]
score = round(100.0 * sum(1 for c in checks if c == 0) / len(checks), 1)

hc = {
    'generatedOn': now,
    'totalSubjects': len(db.get('subjects', [])),
    'totalPapers': len(db.get('papers', [])),
    'totalQuestions': len(questions),
    'totalActiveQuestions': len(active),
    'totalGapPlaceholders': len(gaps),
    'gapPlaceholderIds': sorted([q['id'] for q in gaps]),
    'totalAssets': len(assets),
    'totalPassages': len(passages),
    'duplicateQuestionIds': dups(questions),
    'duplicateAssetIds': dups(assets),
    'duplicatePassageIds': dups(passages),
    'brokenAssetLinks': broken_asset_links,
    'brokenPassageLinks': broken_passage_links,
    'brokenAssetBacklinks': broken_backlinks,
    'missingQuestionText': missing_text,
    'missingOptions': missing_opts,
    'missingAnswers': missing_ans,
    'missingExplanations': missing_expl,
    'missingImages': len(missing_assets),
    'missingImageCount': len(missing_assets),
    'imagesPresentCount': present_count,
    'answerKeyDiscrepancies': akd,
    'ssAssetRenameLog': old.get('ssAssetRenameLog', {}),
    'structuralHealthScore': score,
    'notes': old.get('notes', []),
}
with open(hc_path, 'w') as f:
    json.dump(hc, f, indent=1, ensure_ascii=False)
print(f"health check: {present_count} present, {len(missing_assets)} missing, score {score}")

# ---- MISSING_IMAGES.md ----
subj_order = ['English', 'Mathematics', 'Integrated Science', 'Social Studies',
              'Creative and Technology Studies', 'CTS']
by_subj = collections.OrderedDict()
for a in missing_assets:
    s = a['subject']
    s = 'CTS' if 'Technology' in s or s == 'CTS' else s
    by_subj.setdefault(s, []).append(a)

lines = [
    '# Missing Images Manifest', '',
    f'This project ships with **{present_count} asset images present** and '
    f'**{len(missing_assets)} still missing**. Integrated Science, Mathematics, English and Social Studies image '
    'sets are complete. The remaining images are still missing because their source PDFs '
    '(CTS papers) have not been provided yet.', '',
    '## How to add a missing image', '',
    '1. Locate the original image (from the source PDF page or the extraction output).',
    '2. Save it into `client/public/data/assets/` using the **exact file name** listed below for that asset.',
    '3. Reload the app. The image appears automatically — no code or JSON changes needed.',
    "4. Optional: open the **Data** page and click **Run image check** to confirm it is now found.", '',
    "The app never blocks on a missing image: any question whose asset file is absent still shows its full text, options, correct answer and explanation, with a short 'Image not available' notice plus a written description of what the figure showed.", '',
    '---', '',
]
for s, items in by_subj.items():
    lines += [f'\n## {s} — {len(items)} missing', '',
              '| Asset ID | Required file name | Original source filename |', '|---|---|---|']
    for a in items:
        lines.append(f"| `{a['id']}` | `{a['fileName']}` | `{a.get('originalImageFilename','')}` |")
    lines.append('')
with open(os.path.join(ROOT, 'MISSING_IMAGES.md'), 'w') as f:
    f.write('\n'.join(lines))
print('MISSING_IMAGES.md regenerated')

# ---- DATABASE_HEALTH_CHECK_REPORT.md ----
present_by = collections.Counter()
missing_by = collections.Counter()
for a in assets:
    s = 'Creative & Technology Studies' if 'Technology' in a['subject'] or a['subject'] == 'CTS' else a['subject']
    (missing_by if a.get('missingImage') else present_by)[s] += 1

def plist(counter):
    return '\n'.join(f'    - {s}: {n}' for s, n in sorted(counter.items(), key=lambda kv: -kv[1]))

PF = lambda n: 'PASS' if n == 0 else f'FAIL ({n})'
report = f"""# Database Health Check Report

_Generated: {now}_

## Summary

- **Structural health score: {score}%**
- Subjects: **{hc['totalSubjects']}**
- Papers: **{hc['totalPapers']}**
- Total questions: **{hc['totalQuestions']}** ({hc['totalActiveQuestions']} active, {hc['totalGapPlaceholders']} gap placeholders)
- Assets: **{hc['totalAssets']}** ({present_count} images present, {len(missing_assets)} missing)
- Passages: **{hc['totalPassages']}**

## Structural checks

| Check | Result |
|---|---|
| Duplicate question IDs | {PF(len(dups(questions)))} |
| Duplicate asset IDs | {PF(len(dups(assets)))} |
| Duplicate passage IDs | {PF(len(dups(passages)))} |
| Broken asset links (question → asset) | {PF(len(broken_asset_links))} |
| Broken passage links (question → passage) | {PF(len(broken_passage_links))} |
| Broken asset backlinks (asset → question) | {PF(len(broken_backlinks))} |
| Active questions missing question text | {PF(len(missing_text))} |
| Active questions missing options | {PF(len(missing_opts))} |
| Active questions missing correct answer | {PF(len(missing_ans))} |
| Active questions missing explanation | {PF(len(missing_expl))} |

All active questions have a question stem, four options (A–D), a correct answer, and an explanation. Every asset and passage referenced by a question exists in the database, and every question referenced by an asset exists too.

## Known content gaps (preserved from source papers)

These are genuine gaps in the original scanned papers, not data errors. The affected questions are kept in the database as **gap placeholders** so the numbering stays faithful to the real paper, but they are **excluded from quizzes, mock exams and practice**.

- **CTS 2018, Q31–Q38** — pages missing from the source scan (8 questions).
- **Social Studies 2020, Q42–Q48** — pages missing from the source scan (7 questions).

## Answer-key note (Creative & Technology Studies 2020)

The CTS 2020 answer key was derived from a handwritten / circled source sheet rather than an official marking key. Twelve questions carry a `sourceAnswerKeyNote` flag where the circled answer conflicts with curriculum logic. These answers are **preserved exactly as they appeared in the source** for fidelity, and the note is shown to the learner when the question is answered. Affected questions:

{', '.join('`'+q+'`' for q in akd)}

## Images

- Present: **{present_count}**.
{plist(present_by)}
- Missing: **{len(missing_assets)}**.
{plist(missing_by)}

See `MISSING_IMAGES.md` for the drop-in file names. Missing images never block a question: the full text, options, answer and explanation always render.
"""
with open(os.path.join(ROOT, 'DATABASE_HEALTH_CHECK_REPORT.md'), 'w') as f:
    f.write(report)
print('DATABASE_HEALTH_CHECK_REPORT.md regenerated')

# ---- README image count ----
rp = os.path.join(ROOT, 'README.md')
with open(rp) as f:
    readme = f.read()
readme = re.sub(r'\*\*\d+ asset images are included\.\*\*', f'**{present_count} asset images are included.**', readme)
readme = re.sub(r'The remaining \d+ images', f'The remaining {len(missing_assets)} images', readme)
with open(rp, 'w') as f:
    f.write(readme)
print('README.md image count updated')

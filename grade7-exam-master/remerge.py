#!/usr/bin/env python3
"""remerge.py — sync missingImage/imageSource flags across the unified database
and per-subject masters based on which asset files actually exist on disk.
Non-destructive: never touches question text, options, answers, or explanations.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'client', 'public', 'data')
ASSETS = os.path.join(DATA, 'assets')

MASTERS = [
    'grade7_master_database.json',
    'english_master.json',
    'mathematics_master.json',
    'science_master.json',
    'socialstudies_master.json',
    'cts_master.json',
]

def sync(path):
    with open(path) as f:
        db = json.load(f)
    flipped = []
    for a in db.get('assets', []):
        exists = os.path.isfile(os.path.join(ASSETS, a['fileName']))
        if exists and a.get('missingImage'):
            a['missingImage'] = False
            a['imageSource'] = 'Extracted from original ECZ scanned paper'
            a.pop('reason', None)
            flipped.append(a['id'])
        elif not exists and not a.get('missingImage'):
            # file vanished — flag back as missing (defensive)
            a['missingImage'] = True
            a['reason'] = 'Original image not available in uploaded files'
            flipped.append(a['id'] + ' (re-flagged missing)')
    with open(path, 'w') as f:
        json.dump(db, f, indent=1, ensure_ascii=False)
    return flipped

if __name__ == '__main__':
    for m in MASTERS:
        p = os.path.join(DATA, m)
        if os.path.isfile(p):
            flipped = sync(p)
            if flipped:
                print(f"{m}: flipped {len(flipped)} -> {flipped}")
            else:
                print(f"{m}: no changes")

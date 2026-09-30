"""Apply individually checked CAC first-stage result rows."""
import json
from pathlib import Path

from apply_sieve_score_guard import score_is_impossible

REVIEW_PATH = Path(__file__).with_name('official_sieve_reviews_20260930.json')


def load_reviews():
    return json.loads(REVIEW_PATH.read_text(encoding='utf-8'))


def apply_review(record, review):
    source = review.get('sourceUrl', '')
    if not source.startswith('https://www.cac.edu.tw/'):
        raise ValueError(f"Review has no official CAC image: {record.get('id')}")
    rows = review.get('rankedItems') or []
    if not rows or any(score_is_impossible(item) for item in rows):
        raise ValueError(f"Review has impossible or missing rows: {record.get('id')}")
    for row in rows:
        if not row.get('subjects') or row.get('label') != '+'.join(row['subjects']) + (str(row.get('score')) if row.get('score') else '待補'):
            raise ValueError(f"Review row label mismatch: {record.get('id')}")
    result = record.setdefault('applySieveResult', {})
    result['rankedItems'] = [dict(item) for item in rows]
    result['sieveResultItems'] = [
        {'type': 'combined' if len(item['subjects']) > 1 else 'single',
         'subjects': item['subjects'], 'score': str(item['score']), 'label': item['label']}
        for item in rows if item.get('score')
    ]
    result['sieveResultStandard'] = '、'.join(item['label'] for item in rows if item.get('score'))
    result['sourceImageUrl'] = source
    result['verification'] = {'method': 'official-image-visual-review', 'sourceUrl': source, 'reviewedAt': '2026-09-30'}
    result.pop('scoreReviewPending', None)
    return True

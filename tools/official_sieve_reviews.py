"""Apply individually checked CAC first-stage result rows."""
import json
from pathlib import Path

from apply_sieve_score_guard import score_is_impossible

REVIEW_PATH = Path(__file__).with_name('official_sieve_reviews_20260930.json')


def load_reviews():
    reviews = json.loads(REVIEW_PATH.read_text(encoding='utf-8'))
    reviews.update(json.loads(REVIEW_PATH.with_name('official_sieve_reviews_20261008.json').read_text(encoding='utf-8')))
    return reviews


def apply_detail_reviews(records):
    details = json.loads(REVIEW_PATH.with_name('official_apply_details_20261008.json').read_text(encoding='utf-8'))
    for record in records:
        if record.get('year') == 115 and record.get('channelKey') == 'personal_application' and record.get('programCode') in details:
            record['cacDetail'] = details[record['programCode']]
            record['officialDetailStatus'] = 'parsed'


def apply_review(record, review):
    source = review.get('sourceUrl', '')
    if not source.startswith('https://www.cac.edu.tw/'):
        raise ValueError(f"Review has no official CAC image: {record.get('id')}")
    rows = review.get('rankedItems') or []
    all_rows = rows + [item for specialization in review.get('specializations', []) for item in specialization['rankedItems']]
    if (not all_rows and review.get('publishedStatus') != 'not-published') or any(score_is_impossible(item) for item in all_rows):
        raise ValueError(f"Review has impossible or missing rows: {record.get('id')}")
    for row in all_rows:
        if not row.get('subjects') or row.get('label') != '+'.join(row['subjects']) + (str(row.get('score')) if row.get('score') else '待補'):
            raise ValueError(f"Review row label mismatch: {record.get('id')}")
    result = record.get('applySieveResult') or {}
    record['applySieveResult'] = result
    result['rankedItems'] = [dict(item) for item in rows]
    result['sieveResultItems'] = [
        {'type': 'combined' if len(item['subjects']) > 1 else 'single',
         'subjects': item['subjects'], 'score': str(item['score']), 'label': item['label']}
        for item in rows if item.get('score')
    ]
    result['sieveResultStandard'] = '、'.join(item['label'] for item in rows if item.get('score'))
    result['sourceImageUrl'] = source
    result['verification'] = {'method': 'official-image-visual-review', 'sourceUrl': source, 'reviewedAt': review.get('reviewedAt', '2026-09-30')}
    if review.get('sourceSha256'):
        result['verification']['sourceSha256'] = review['sourceSha256']
    for key in ('specializations', 'publishedStatus', 'excessScreening'):
        if key in review:
            result[key] = review[key]
    result.pop('scoreReviewPending', None)
    return True

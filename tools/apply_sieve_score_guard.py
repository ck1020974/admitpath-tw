"""Keep impossible OCR scores out of published application results."""
import json
from pathlib import Path


# Reported by the site owner; the official image still needs a visual review.
OWNER_CORRECTIONS = {
    ('115-personal_application-002092-115_apply', 2, '43'): '13',
}


def score_is_impossible(item):
    score = item.get('score')
    if score in ('', None):
        return False
    subjects = item.get('subjects') or []
    if not subjects:
        return False
    try:
        number = float(score)
    except (TypeError, ValueError):
        return True
    maximum = sum(5 if subject.startswith('APCS') else 15 for subject in subjects)
    return not (0 <= number <= maximum)


def sanitize_record(record):
    result = record.get('applySieveResult')
    if not result:
        return False
    changed = False
    pending = []
    for item in result.get('rankedItems') or []:
        key = (record.get('id'), item.get('rank'), str(item.get('score')))
        correction = OWNER_CORRECTIONS.get(key)
        if correction is not None and len(item.get('subjects') or []) == 1:
            item['score'] = correction
            item['label'] = '+'.join(item['subjects']) + correction
            changed = True
        elif score_is_impossible(item):
            pending.append({'rank': item.get('rank'), 'subjects': item['subjects'], 'ocrScore': item['score']})
            item['score'] = ''
            item['label'] = '+'.join(item['subjects']) + '待核對'
            changed = True

    items = result.get('sieveResultItems') or []
    valid_items = [item for item in items if not score_is_impossible(item)]
    if len(valid_items) != len(items):
        for item in items:
            if score_is_impossible(item) and not any(row['subjects'] == item['subjects'] and row['ocrScore'] == item['score'] for row in pending):
                pending.append({'rank': None, 'subjects': item['subjects'], 'ocrScore': item['score']})
        result['sieveResultItems'] = valid_items
        changed = True

    if changed:
        ranked = result.get('rankedItems') or []
        display = ranked if ranked else valid_items
        result['sieveResultStandard'] = '、'.join(item['label'] for item in display if item.get('score'))
        if pending:
            result['scoreReviewPending'] = pending
            if record.get('admissionAudit'):
                record['admissionAudit']['resultStatus'] = 'pending'
    return changed


def main():
    path = Path(__file__).resolve().parents[1] / 'site/data/admissions_records.json'
    records = json.loads(path.read_text(encoding='utf-8'))
    changed = [record['id'] for record in records if sanitize_record(record)]
    path.write_text(json.dumps(records, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'changedRecords': len(changed), 'ids': changed}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

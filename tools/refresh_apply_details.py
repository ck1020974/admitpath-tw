"""Refresh official HTML with cached evidence; never treat OCR presence as verification."""
import argparse
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from lxml import html
from scrape_cac_detail_pages import fetch, all_rows, parse_apply_detail, find_label_value
from prepare_site_data import normalize_cac_detail

ROOT = Path(__file__).resolve().parents[1]


def refresh(record, cache):
    path = cache / f"{record['year']}_{record['programCode']}.html"
    meta_path = path.with_suffix(".json")
    if not path.exists():
        for attempt in range(3):
            try:
                page = fetch(record['detailUrl'], record['sourceUrl'])
                if record['programCode'] not in page or '校系代碼' not in page:
                    raise ValueError('Response is not a program detail page')
                path.write_text(page, encoding='utf-8')
                meta_path.write_text(json.dumps({'fetchedAt': datetime.now(timezone.utc).isoformat(), 'url': record['detailUrl']}), encoding='utf-8')
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(attempt + 1)
    page = path.read_text(encoding='utf-8')
    tree = html.fromstring(page)
    rows = all_rows(tree)
    actual_code = find_label_value(rows, {'校系代碼'})
    actual_dept = ''.join(tree.xpath("//*[contains(@class,'gsdname')]/text()" )).strip()
    if actual_code != record['programCode'] or actual_dept != record['departmentName']:
        raise ValueError(f'Official identity mismatch: {actual_code} {actual_dept}')
    detail = normalize_cac_detail(parse_apply_detail(tree, rows))
    detail['detailUrl'] = record['detailUrl']
    meta = json.loads(meta_path.read_text(encoding='utf-8')) if meta_path.exists() else {'fetchedAt': None}
    detail['provenance'] = dict(meta, sha256=hashlib.sha256(page.encode()).hexdigest(), parserVersion='2.0.0')
    basic = {key: find_label_value(rows, {label}) for key, label in {
        'quota': '招生名額', 'expectedSecondStageCount': '預計甄試人數', 'screeningFee': '指定項目甄試費',
    }.items()}
    basic['screeningDate'] = detail['importantDates'].get('screening_date', record.get('screeningDate', ''))
    return detail, basic


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, default=115)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    path = ROOT / 'site/data/admissions_records.json'
    records = json.loads(path.read_text(encoding='utf-8'))
    cache = ROOT / 'work/official_apply'
    cache.mkdir(parents=True, exist_ok=True)
    targets = [r for r in records if r['year'] == args.year and r['channelKey'] == 'personal_application']
    errors, changes = [], []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending = {pool.submit(refresh, r, cache): r for r in targets}
        for count, future in enumerate(as_completed(pending), 1):
            r = pending[future]
            try:
                detail, basic = future.result()
                before = r.get('cacDetail') or {}
                changed = [key for key in detail if key != 'provenance' and detail[key] != before.get(key)]
                changes.append({'id': r['id'], 'fields': changed})
                r['cacDetail'] = detail
                r.update(basic)
                r['officialDetailStatus'] = 'parsed'
            except Exception as exc:
                r['officialDetailStatus'] = 'pending'
                errors.append({'id': r['id'], 'sourceUrl': r['detailUrl'], 'error': str(exc)})
            if count % 100 == 0:
                print(f'{count}/{len(targets)} official pages processed; {len(errors)} need review', flush=True)
    path.write_text(json.dumps(records, ensure_ascii=False), encoding='utf-8')
    report = {'year': args.year, 'total': len(targets), 'parsed': len(targets)-len(errors), 'errors': errors, 'changes': changes}
    (ROOT / f'site/data/apply{args.year}_detail_refresh.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('changes','errors')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

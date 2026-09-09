"""Deterministic audit and evidence-backed corrections, run after every data build."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWN = {'國文', '英文', '數A', '數B', '社會', '自然', 'APCS識讀', 'APCS實作'}


def subject(v):
    return v.replace('數學', '數').replace('程式', 'APCS')


def subjects(v):
    v = subject(v)
    if v in KNOWN:
        return [v]
    tokens = re.findall(r'數[AB]|國|英|社|自', v)
    if ''.join(tokens) != v:
        return []
    return [{'國': '國文', '英': '英文', '社': '社會', '自': '自然'}.get(t, t) for t in tokens]


def number(v):
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def inspect_record(r, standards):
    d = r.get('cacDetail') or {}
    issues = []
    if d.get('parserVersion') != '2.0.0' or r.get('officialDetailStatus') != 'parsed':
        issues.append('官方分則尚未完成重新解析')
    percentages = [d.get('academicPercentage')] + [i.get('percentage') for i in d.get('secondStageItems', [])]
    if d.get('artPercentage') not in (None, '', '--'):
        percentages.append(d['artPercentage'])
    rates = [number(str(p).replace('%', '')) for p in percentages]
    if not rates or None in rates or abs(sum(rates)-100) > 0.01:
        issues.append('甄選總成績占比未能確認合計100%')
    if 'APCS' in r['departmentName'] and not d.get('apcsSubjects'):
        issues.append('APCS欄位缺漏')
    if d.get('layout') == 'art' and r.get('examRequired') == '是':
        issues.append('術科及主修規則須依官方分則另行核對')
    expected = {}
    for item in d.get('screeningSubjects', []) + d.get('apcsSubjects', []):
        multiplier = number(item.get('screening_multiplier'))
        ss = subjects(item['subject'])
        if multiplier is not None and multiplier > 0:
            if not ss:
                issues.append('含尚未支援的倍率篩選科目')
            expected.setdefault(multiplier, []).extend(ss)
    observed = (r.get('applySieveResult') or {}).get('rankedItems', [])
    anomalies = []
    for row in observed:
        ss = [subject(s) for s in row.get('subjects', [])]
        n = number(row.get('score'))
        if n is None:
            continue
        if not ss or any(s not in KNOWN for s in ss) or n < 0 or n > sum(5 if s.startswith('APCS') else 15 for s in ss):
            anomalies.append('篩選級分或科目超出合法範圍')
        # Independent check against minimum implied by the declared examinations.
        mins = []
        for s in ss:
            item = next((i for i in d.get('screeningSubjects', []) if subject(i['subject']) == s), {})
            key = {'數A':'數學A', '數B':'數學B'}.get(s,s)
            mins.append(standards.get(str(r['year']), {}).get(key, {}).get(item.get('standard'), 0))
        if len(ss) > 1 and n < sum(mins):
            anomalies.append('合計篩選級分低於檢定最低總和')
    actual = [(number(i.get('multiplier')), sorted(subject(s) for s in i.get('subjects', []))) for i in observed]
    wanted = [(m, sorted(set(ss))) for m, ss in sorted(expected.items(), reverse=True)]
    if actual != wanted:
        anomalies.append('篩選順序、科目或倍率與簡章不一致')
    return list(dict.fromkeys(issues)), list(dict.fromkeys(anomalies)), wanted


def audit_records(records, standards, corrections):
    queue, summary, changed = [], Counter(), []
    ids = set()
    for r in records:
        if r['channelKey'] != 'personal_application':
            continue
        if r['id'] in ids:
            raise ValueError('Duplicate record identity: ' + r['id'])
        ids.add(r['id'])
        d = r.get('cacDetail') or {}
        review = corrections.get(str(r['year']), {}).get(r['programCode'])
        gender_review = (r.get('applySieveResult') or {}).get('verification', {}).get('method') == 'official_gender_row'
        if review:
            result = r.setdefault('applySieveResult', {})
            if not result.get('sourceImageUrl', '').startswith('https://www.cac.edu.tw/'):
                raise ValueError('Verified result requires official image URL')
            rows = [{'rank':i+1, 'multiplier':str(m), 'subjects':ss, 'score':str(n), 'label':'+'.join(ss)+str(n)} for i,(m,ss,n) in enumerate(review['rows'])]
            if result.get('rankedItems') != rows:
                changed.append({'id':r['id'], 'before':result.get('rankedItems'), 'after':rows})
            result['rankedItems'] = rows
            result['sieveResultItems'] = [{'type':'combined' if len(i['subjects'])>1 else 'single', **{k:i[k] for k in ('subjects','score','label')}} for i in rows]
            result['sieveResultStandard'] = '、'.join(i['label'] for i in rows)
            result['verification'] = {k:v for k,v in review.items() if k != 'rows'} | {'sourceUrl':result['sourceImageUrl']}
        issues, anomalies, wanted = inspect_record(r, standards)
        # OCR rows without an official image review are provisional. Keep
        # them pending instead of reporting every provisional mismatch as a
        # confirmed anomaly.
        if not review:
            anomalies = []
        if review and anomalies:
            raise ValueError(f"Reviewed result contradicts current official detail: {r['id']} {anomalies}")
        r['admissionAudit'] = {
            'schemaVersion':2, 'detailStatus':'parsed' if r.get('officialDetailStatus') == 'parsed' else 'pending',
            'resultStatus':'verified' if review or gender_review else 'pending', 'issues':issues, 'resultIssues':anomalies,
            'resultScope':'一般招生名額之倍率篩選；不含未公開超額篩選最低級分',
            'detailSourceUrl':r.get('detailUrl'),
        }
        summary[f"{r['year']}_total"] += 1
        summary[f"{r['year']}_details_parsed"] += r['admissionAudit']['detailStatus'] == 'parsed'
        summary[f"{r['year']}_results_verified"] += bool(review or gender_review)
        summary[f"{r['year']}_math_either"] += len([i for i in d.get('screeningSubjects', []) if subject(i['subject']) in ('數A','數B') and i.get('standard') not in ('','--',None)]) == 2
        summary[f"{r['year']}_apcs"] += bool(d.get('apcsSubjects'))
        summary[f"{r['year']}_anomalies"] += bool(anomalies)
        if issues or not review and not gender_review:
            queue.append({'id':r['id'], 'school':r['schoolName'], 'department':r['departmentName'], 'issues':issues+anomalies+([] if review else ['一階圖片級分尚未逐列核對']), 'detailUrl':r['detailUrl'], 'resultUrl':(r.get('applySieveResult') or {}).get('sourceImageUrl')})
    return {'summary': dict(summary), 'corrections':changed, 'reviewQueue':queue}


def main():
    path = ROOT / 'site/data/admissions_records.json'
    records = json.loads(path.read_text(encoding='utf-8'))
    standards = json.loads((ROOT / 'site/data/ceec_gsat_five_standard_scores.json').read_text(encoding='utf-8'))
    corrections = json.loads((ROOT / 'tools/apply_verified_results.json').read_text(encoding='utf-8'))
    report = audit_records(records, standards, corrections)
    path.write_text(json.dumps(records, ensure_ascii=False), encoding='utf-8')
    (ROOT / 'site/data/application_audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

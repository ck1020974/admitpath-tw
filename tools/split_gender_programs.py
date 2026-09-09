"""Split CAC rows that share a code but have separate male/female quotas."""
import json,re,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from compare_official_result_cells import clean, parsed_cell, CACHE

def parse_gender(value):
    s=str(value or '')
    if s == '女': return []
    m=re.fullmatch(r'男(\d+)女(\d+)',s)
    return [('男',m.group(1)),('女',m.group(2))] if m else []

def sheet_rows(year,school):
    stem=CACHE/f'{year}_{school}'
    image=np.array(Image.open(stem.with_suffix('.png')).convert('RGB'))
    words=[w for l in json.loads(stem.with_suffix('.ocr.json').read_text(encoding='utf-8-sig')) for w in l['words']]
    codes=json.loads((stem.with_suffix('.codes.json')).read_text(encoding='utf8'))
    dark=(image.max(2)<80).sum(0)
    xs=np.flatnonzero(dark>image.shape[0]*.15)
    lines=[int(x) for i,x in enumerate(xs) if i==0 or x-xs[i-1]>2]
    result_edges=lines[-8:]
    rows=[]
    for code in codes:
        y=code['y']+code['height']/2
        color=image[min(image.shape[0]-1,int(y)),min(image.shape[1]-1,100)]
        gender='男' if abs(int(color[2])-255)<20 and abs(int(color[1])-204)<35 else '女' if abs(int(color[0])-255)<20 and abs(int(color[1])-153)<35 else None
        cells=[]
        for left,right in zip(result_edges[:6],result_edges[1:7]):
            ws=[w for w in words if left<w['x']+w['width']/2<right and y-12<w['y']+w['height']/2<y+12]
            cells.append(clean(''.join(w['text'] for w in sorted(ws,key=lambda w:w['x']))) .strip('-—_|丨'))
        rows.append({'code':code['text'],'gender':gender,'cells':cells,'y':y})
    return rows

def main():
    path=ROOT/'site/data/admissions_records.json'
    records=json.loads(path.read_text(encoding='utf8'))
    # Make the command idempotent when the repository already contains a
    # previous split run.
    collapsed=[]; seen=set()
    for r in records:
        base=re.sub(r'-(男|女)$','',r['id'])
        if base in seen: continue
        seen.add(base)
        if r['id'] != base:
            sibling=next((x for x in records if x['id']==base),None)
            if sibling: collapsed.append(sibling)
            else:
                clone=json.loads(json.dumps(r)); clone['id']=base; clone['departmentName']=re.sub(r'\((男|女)\)$','',clone['departmentName']); collapsed.append(clone)
        else: collapsed.append(r)
    records=collapsed
    grouped={}
    for r in records:
        genders=parse_gender(r.get('genderRequirement'))
        if genders: grouped.setdefault((r['year'],r['schoolCode'],r['programCode']),[]).append(r)
    output=[]; split_report=[]
    for r in records:
        genders=parse_gender(r.get('genderRequirement'))
        if not genders:
            output.append(r); continue
        key=(r['year'],r['schoolCode'],r['programCode'])
        rows=[x for x in sheet_rows(r['year'],r['schoolCode']) if x['code']==r['programCode']]
        for idx,(gender,quota) in enumerate(genders):
            clone=json.loads(json.dumps(r))
            clone['id']=f"{r['id']}-{gender}"
            clone['departmentName']=f"{r['departmentName']}({gender})"
            clone['genderGroup']=gender
            clone['genderRequirement']=gender
            if quota: clone['quota']=quota
            row=next((x for x in rows if x['gender']==gender), rows[idx] if idx<len(rows) else None)
            if row:
                ranked=[]
                original=(r.get('applySieveResult') or {}).get('rankedItems',[])
                for rank,raw in enumerate(row['cells'],1):
                    p=parsed_cell(raw)
                    if not p or 'subjects' not in p: continue
                    multiplier=original[rank-1].get('multiplier','') if rank-1<len(original) else ''
                    ranked.append({'rank':rank,'multiplier':multiplier,'subjects':p['subjects'],'score':str(int(p['score']) if p['score'].is_integer() else p['score']),'label':'+'.join(p['subjects'])+str(int(p['score']) if p['score'].is_integer() else p['score'])})
                if ranked:
                    clone.setdefault('applySieveResult',{})['rankedItems']=ranked
                    clone['applySieveResult']['sieveResultStandard']='、'.join(i['label'] for i in ranked)
                    clone['applySieveResult']['verification']={'sourceUrl':clone['applySieveResult'].get('sourceImageUrl'),'method':'official_gender_row'}
                    clone['admissionAudit']={'schemaVersion':2,'detailStatus':clone.get('officialDetailStatus','pending'),'resultStatus':'verified','resultScope':'官方結果表性別列','detailSourceUrl':clone.get('detailUrl')}
            output.append(clone)
            split_report.append({'original':r['id'],'new':clone['id'],'gender':gender,'row':row})
    path.write_text(json.dumps(output,ensure_ascii=False),encoding='utf8')
    (ROOT/'site/data/gender_split_audit.json').write_text(json.dumps({'count':len(split_report),'items':split_report},ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'recordsBefore':len(records),'recordsAfter':len(output),'splitRows':len(split_report)},ensure_ascii=False))

if __name__=='__main__': main()

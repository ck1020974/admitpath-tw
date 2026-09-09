"""Promote high-confidence independent OCR rows to official result evidence."""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def parsed_cell(value):
    s=re.sub(r'\s+','',str(value or '')).replace('數學','數').replace('程式','APCS')
    s=s.translate(str.maketrans('国数学识读实观题会','國數學識讀實觀題會'))
    s=s.replace('APCS觀念題','APCS識讀').replace('APCS實作題','APCS實作').strip('-—_|丨')
    if not s or re.fullmatch(r'[-—_]*',s): return None
    m=re.fullmatch(r'(.+?)[)）]?([0-9]+(?:\.[0-9]+)?)',s)
    if not m: return False
    names=m[1].replace('(','').replace(')','').replace('+','')
    tokens=re.findall(r'APCS識讀|APCS實作|國文|英文|數[AB]|社會|自然|國|英|社|自',names)
    tokens=[{'國':'國文','英':'英文','社':'社會','自':'自然'}.get(t,t) for t in tokens]
    if ''.join(tokens)!=names or len(tokens)!=len(set(tokens)): return False
    return {'subjects':sorted(tokens),'score':float(m[2])}

def main():
    path=ROOT/'site/data/admissions_records.json'
    records=json.loads(path.read_text(encoding='utf8'))
    rapid={r['id']:r for r in json.loads((ROOT/'work/result_audit/rapid_comparison.json').read_text(encoding='utf8'))['records']}
    changed=0; verified=0; rejected=0
    for r in records:
        if r.get('channelKey')!='personal_application': continue
        x=rapid.get(r['id'])
        if not x:
            # Gender rows were extracted separately from the official image.
            if (r.get('applySieveResult') or {}).get('verification',{}).get('method')=='official_gender_row':
                verified+=1
            continue
        cells=x.get('cells') or []
        parsed=[]; valid=True
        original=(r.get('applySieveResult') or {}).get('rankedItems') or []
        for idx,raw in enumerate(cells):
            p=parsed_cell(raw)
            if p is False:
                # Empty/dash cells are fine; unparseable visible text is not.
                if str(raw).strip('-—_|丨 '): valid=False; break
                continue
            if p:
                score=int(p['score']) if p['score'].is_integer() else p['score']
                multiplier=original[idx].get('multiplier','') if idx<len(original) else ''
                parsed.append({'rank':idx+1,'multiplier':multiplier,'subjects':p['subjects'],'score':str(score),'label':'+'.join(p['subjects'])+str(score)})
        nonempty=[c for c in cells if str(c).strip('-—_|丨 ')]
        conf=[float(v) for v,c in zip(x.get('confidence') or [],cells) if str(c).strip('-—_|丨 ')]
        if not valid or not parsed or (conf and min(conf)<0.80):
            rejected+=1; continue
        result=r.get('applySieveResult') or {}
        r['applySieveResult']=result
        if result.get('rankedItems')!=parsed: changed+=1
        result['rankedItems']=parsed
        result['sieveResultItems']=[{'type':'combined' if len(i['subjects'])>1 else 'single','subjects':i['subjects'],'score':i['score'],'label':i['label']} for i in parsed]
        result['sieveResultStandard']='、'.join(i['label'] for i in parsed)
        result['verification']={'method':'official_rapidocr','sourceUrl':result.get('sourceImageUrl'),'confidence':min(conf) if conf else None}
        verified+=1
    path.write_text(json.dumps(records,ensure_ascii=False),encoding='utf8')
    print(json.dumps({'changed':changed,'verified':verified,'rejected':rejected},ensure_ascii=False))

if __name__=='__main__': main()

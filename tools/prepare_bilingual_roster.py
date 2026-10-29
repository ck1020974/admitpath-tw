"""Read current bilingual G11/G12 sheets into ignored private import data."""
import argparse
from collections import Counter
from decimal import Decimal
import json
from pathlib import Path
import posixpath
import re
import sys
import uuid
import xml.etree.ElementTree as ET
import zipfile

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
GROUPS = {'11理主', '11文主', '11理A', '11文H', '12理主', '12文主', '12理A', '12文H'}

def read_bilingual_roster(source):
    students, seen = [], set()
    with zipfile.ZipFile(source) as book:
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))}
        strings = []
        if 'xl/sharedStrings.xml' in book.namelist():
            for _, item in ET.iterparse(book.open('xl/sharedStrings.xml'), events=['end']):
                if item.tag.endswith('}si'):
                    strings.append(''.join(t.text or '' for t in item.findall('.//m:t', NS)))
                    item.clear()
        styles = ET.fromstring(book.read('xl/styles.xml'))
        formats = {int(f.attrib['numFmtId']): f.attrib.get('formatCode', '') for f in styles.findall('m:numFmts/m:numFmt', NS)}
        xfs = list(styles.find('m:cellXfs', NS))
        found = set()
        for sheet in ET.fromstring(book.read('xl/workbook.xml')).find('m:sheets', NS):
            title = sheet.attrib['name']
            if title not in ('雙G11', '雙G12'):
                continue
            found.add(title)
            rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = rels[rid]
            member = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            header = {}
            for _, row in ET.iterparse(book.open(member), events=['end']):
                if not row.tag.endswith('}row'):
                    continue
                number = int(row.attrib.get('r', 0))
                values = {}
                for cell in row:
                    col = re.sub(r'\d', '', cell.attrib['r'])
                    if col not in ('A', 'B', 'D', 'E', 'F', 'G', 'N', 'Z'):
                        continue
                    value = cell.find('m:v', NS)
                    value = value.text if value is not None else ''.join(t.text or '' for t in cell.findall('.//m:t', NS))
                    if cell.attrib.get('t') == 's' and value is not None:
                        value = strings[int(value)]
                    value = str(value or '').strip()
                    if number > 1 and col in ('D', 'E') and value:
                        numeric = Decimal(value)
                        if numeric != numeric.to_integral_value():
                            raise ValueError(f'Non-integer class/seat: {title}, row {number}')
                        value = str(int(numeric))
                        style = int(cell.attrib.get('s', 0))
                        fmt = formats.get(int(xfs[style].attrib.get('numFmtId', 0)), '')
                        if re.fullmatch('0+', fmt):
                            value = value.zfill(len(fmt))
                    values[col] = value
                if number == 1:
                    header = values
                    if not all(label in header.get(col, '') for col, label in [('A', '學號'), ('B', '姓名'), ('D', '座號'), ('E', '母班')]):
                        raise ValueError(f'Unexpected roster headers: {title}')
                    row.clear()
                    continue
                sid = values.get('A', '')
                if not sid:
                    if values.get('B') and values.get('E'):
                        raise ValueError(f'Missing student ID: {title}, row {number}')
                    row.clear()
                    continue
                if not re.fullmatch('[A-Za-z]{2}[0-9]{5}', sid) or sid.upper() in seen:
                    raise ValueError(f'Invalid or repeated student ID: {title}, row {number}')
                name, original = values.get('B', ''), values.get('E', '')
                expected = ('1101', '1102') if title == '雙G11' else ('1201', '1202')
                if not name or original not in expected or not values.get('D'):
                    raise ValueError(f'Missing or unexpected basic details: {title}, row {number}')
                if title == '雙G11':
                    group = values.get('N', '')  # 社會分組：文主／理主／理A／文H
                elif values.get('G') == '12文':
                    group = values.get('Z', '')  # 選修社會分組：文主／文H
                elif values.get('G') == '12理':
                    group = '12理A' if values.get('F') == '12理A' else '12理主'
                else:
                    raise ValueError(f'Unknown track: {title}, row {number}')
                if group not in GROUPS or not group.startswith(title[-2:]):
                    raise ValueError(f'Unknown class group: {title}, row {number}')
                seen.add(sid.upper())
                students.append({'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'yuhsin-single-school:' + sid.casefold())), 'studentId': sid, 'name': name, 'teachingGroup': group, 'originalClass': original, 'originalSeatNumber': values['D'], 'active': True})
                row.clear()
        if found != {'雙G11', '雙G12'}:
            raise ValueError('Current bilingual G11/G12 worksheets not found')
    return {'schemaVersion': 1, 'students': students}

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    private = Path(__file__).resolve().parents[1] / 'work' / 'student-login'
    target = args.output.resolve()
    if private not in target.parents or target.suffix != '.json' or target.exists():
        parser.error('Choose a new JSON path inside work/student-login/')
    roster = read_bilingual_roster(args.source)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(roster, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'students': len(roster['students']), 'groups': dict(Counter(s['teachingGroup'] for s in roster['students'])), 'original_classes': dict(Counter(s['originalClass'] for s in roster['students']))}, ensure_ascii=False))

if __name__ == '__main__':
    main()

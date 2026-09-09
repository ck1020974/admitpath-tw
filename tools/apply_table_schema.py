"""Read CAC merged table headers before interpreting admission columns."""
import re


def text(cell):
    return "\n".join(t.strip() for t in cell.itertext() if t.strip())


def compact(value):
    return re.sub(r"\s+", "", value)


def table_grid(table):
    grid = {}
    for y, tr in enumerate(table.xpath("./tr|./tbody/tr")):
        x = 0
        for cell in tr.xpath("./td|./th"):
            while (y, x) in grid:
                x += 1
            width = int(cell.get("colspan", 1))
            height = int(cell.get("rowspan", 1))
            for dy in range(height):
                for dx in range(width):
                    grid[y + dy, x + dx] = cell
            x += width
    return grid


def parse_columns(tree):
    table = tree.xpath("//td[normalize-space()='校系代碼']/ancestor::table[1]")[0]
    grid = table_grid(table)
    y = next(y for (y, x), c in grid.items() if x == 0 and compact(text(c)) == "校系代碼")
    cols = []
    seen = set()
    for x in sorted(x for row, x in grid if row == y):
        cell = grid[y, x]
        if cell in seen:
            continue
        seen.add(cell)
        headers = list(dict.fromkeys(compact(text(grid[h, x])) for h in range(y) if (h, x) in grid))
        cols.append((headers, text(cell).splitlines()))

    def values(group, leaf, occurrence=0):
        candidates = [v for h, v in cols if any(group in t for t in h) and h[-1] == leaf]
        return candidates[occurrence] if len(candidates) > occurrence else []

    def field(group, leaf, occurrence=0):
        return "\n".join(values(group, leaf, occurrence))

    def items(group, name):
        names = values(group, name)
        standards = values(group, "檢定")
        multipliers = values(group, "篩選倍率")
        if not names or len(names) != len(standards) or len(names) != len(multipliers):
            raise ValueError(f"Unsupported or misaligned {group} columns")
        return [dict(subject=n, standard=s, screening_multiplier=m) for n, s, m in zip(names, standards, multipliers)]

    academic = items("學測、英聽篩選方式", "科目")
    weights = values("甄選總成績採計方式", "學測成績採計方式")
    if len(weights) != len(academic):
        raise ValueError("Academic weight columns do not align")
    for item, weight in zip(academic, weights):
        item["score_weight"] = weight
    stage_names = values("甄選總成績採計方式", "指定項目")
    stage_standards = values("甄選總成績採計方式", "檢定")
    stage_rates = values("甄選總成績採計方式", "佔甄選總成績比例", 1)
    if not stage_names or not (len(stage_names) == len(stage_standards) == len(stage_rates)):
        raise ValueError("Second stage columns do not align")
    has_apcs = any(any("APCS篩選方式" in t for t in h) for h, _ in cols)
    has_art = any(any("術科考試篩選" in t for t in h) for h, _ in cols)
    art = []
    if has_art:
        names = values("術科考試篩選", "術科項目")
        checks = values("術科考試篩選", "檢定")
        multiples = values("術科考試篩選", "篩選倍率")
        weights_art = values("術科考試篩選", "術科成績採計方式")
        if not (len(names) == len(checks) == len(multiples) == len(weights_art)):
            raise ValueError('Art columns do not align')
        art = [dict(subject=n, standard=s, screening_multiplier=m, score_weight=w) for n,s,m,w in zip(names, checks, multiples, weights_art)]
    same_score = next((v for h, v in cols if any("甄選總成績同分參酌" in t for t in h)), [])
    return {
        "screening_subjects": academic,
        "academic_percentage": field("甄選總成績採計方式", "佔甄選總成績比例"),
        "second_stage_items": [dict(item=n, standard=s, percentage=p) for n, s, p in zip(stage_names, stage_standards, stage_rates)],
        "same_score_order": same_score,
        "apcs_subjects": items("APCS篩選方式", "科目") if has_apcs else [],
        "art_subjects": art,
        "art_percentage": field("術科考試篩選", "佔甄選總成績比例") if has_art else "",
        "layout": "art" if has_art else "apcs" if has_apcs else "general",
        "parser_version": "2.0.0",
    }

from pathlib import Path
import pdfplumber

pdf_path = Path("outputs/admissions_data/uac_114_recruit.pdf")
with pdfplumber.open(pdf_path) as pdf:
    print("pages", len(pdf.pages))
    for page_no in [0, 1, 10, 20, 50, 100, 150]:
        if page_no >= len(pdf.pages):
            continue
        page = pdf.pages[page_no]
        text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
        print("\n==== PAGE", page_no + 1, "====")
        print(text[:2500])
        tables = page.extract_tables()
        print("tables", len(tables), [len(t) for t in tables[:3]])
        for table in tables[:1]:
            for row in table[:5]:
                print(row)

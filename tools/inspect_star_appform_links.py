import re
import urllib.request
from urllib.parse import urljoin

for year in [115, 114]:
    url = f"https://www.cac.edu.tw/star{year}/appform_3.php"
    html = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})).read().decode("utf-8", "replace")
    print("YEAR", year)
    for m in re.finditer(r"href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", html, re.S):
        href = urljoin(url, m.group(1))
        text = re.sub("<.*?>", "", m.group(2)).strip()
        if "百分" in text or "學業" in text or "pdf" in href.lower() or "PDF" in href:
            print(text, href)
    print("contains percent", "百分" in html, html.find("百分"))

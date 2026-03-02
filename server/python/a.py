# extract_yccd_with_content.py
# Chạy: python extract_yccd_with_content.py
# Yêu cầu: pip install pdfplumber pandas

import pdfplumber
import re
import json
from collections import defaultdict

PDF = "CT_Tinhoc.pdf"   # đổi đường dẫn nếu cần

# patterns
RE_TOPIC = re.compile(r'(?i)^chủ\s*đề\s*([A-Z])\.?\s*(.+)')   # "Chủ đề A. Máy tính và cộng đồng"
RE_CLASS = re.compile(r'(?i)\bLớp\s*(\d{1,2})\b')            # "Lớp 10"
RE_TABLE_HEADERS = re.compile(r'(?i)(nội\s*dung|yêu\s*cầu|yêu cầu cần đạt|nội dung dạy)')

def normalize(s):
    return re.sub(r'\s+', ' ', s).strip()

def try_extract_table(page):
    """Trả về list rows nếu page.extract_table() có header phù hợp"""
    table = page.extract_table()
    if not table:
        return None
    # table là list of rows (each row: list of cells)
    # detect header row index and col indices for content and yccd
    header = table[0]
    header_text = " | ".join([ (c or "").strip().lower() for c in header ])
    if RE_TABLE_HEADERS.search(header_text):
        # tìm cột chứa 'nội dung' và 'yêu cầu'
        col_content = None
        col_yccd = None
        for i, h in enumerate(header):
            if not h:
                continue
            hlow = h.lower()
            if 'nội' in hlow and 'dung' in hlow:
                col_content = i
            if 'yêu' in hlow or 'y/c' in hlow or 'yêu cầu' in hlow or 'yêu cầu cần đạt' in hlow:
                col_yccd = i
        # fallback: nếu chỉ có 2 cột, map 0->content,1->yccd
        if col_content is None or col_yccd is None:
            if len(header) >= 2:
                col_content = 0
                col_yccd = 1
            else:
                return None
        # build list of dicts
        rows = []
        for row in table[1:]:
            content = row[col_content].strip() if row[col_content] else ""
            yccd = row[col_yccd].strip() if row[col_yccd] else ""
            # yccd could contain multiple bullets separated by '\n' or ';'
            rows.append({"noi_dung": normalize(content), "yccd_raw": normalize(yccd)})
        return rows
    return None

def split_bullets(text):
    """Chia yccd_raw thành list bullets bằng cách tách trên các dấu - • ; hoặc câu kết thúc."""
    if not text:
        return []
    # replace common bullet chars by newline
    # some cells might have ' - ' inside; do robust split
    parts = re.split(r'[\n\r•\u2022\-–;]\s*', text)
    parts = [normalize(p) for p in parts if p and normalize(p) != ""]
    # if still 1 long string, try split by '. ' but keep abbreviations? ok acceptable
    if len(parts) == 1 and len(parts[0]) > 180:
        parts = [normalize(p)+'.' for p in re.split(r'\.\s+', parts[0]) if p.strip()]
    return parts

# container: list of topic entries
topics = []
# We'll store a temporary map to combine rows under same detected topic on multiple pages
tmp_map = {}  # key: (topic_letter, topic_title, class) -> {"items": [ ... ] , "pages": set()}

with pdfplumber.open(PDF) as pdf:
    for i, page in enumerate(pdf.pages, start=1):
        text = page.extract_text()
        if not text:
            continue
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        # try table extraction first
        table_rows = try_extract_table(page)
        if table_rows:
            # need to find nearest preceding topic header on this page (or earlier in page)
            # search lines for topic header
            topic_letter = None
            topic_title = None
            # scan lines for "Chủ đề X." on this page
            for ln in lines:
                m = RE_TOPIC.match(ln)
                if m:
                    topic_letter = m.group(1).strip()
                    topic_title = normalize(m.group(2))
                    break
            # if not found on this page, search previous pages lightly (up to 2 pages back)
            if not topic_title:
                for back in range(max(0,i-3), i):
                    ptxt = pdf.pages[back].extract_text() or ""
                    for ln in ptxt.split('\n'):
                        ln = ln.strip()
                        m = RE_TOPIC.match(ln)
                        if m:
                            topic_letter = m.group(1).strip()
                            topic_title = normalize(m.group(2))
                            break
                    if topic_title:
                        break
            # find class mention on page (Lớp X)
            cls = None
            for ln in lines:
                mcls = RE_CLASS.search(ln)
                if mcls:
                    cls = mcls.group(1)
                    break

            key = (topic_letter, topic_title, cls)
            if key not in tmp_map:
                tmp_map[key] = {"items": [], "pages": set()}
            for r in table_rows:
                yccd_list = split_bullets(r["yccd_raw"])
                tmp_map[key]["items"].append({
                    "noi_dung": r["noi_dung"],
                    "yccd": yccd_list,
                    "page": i
                })
            tmp_map[key]["pages"].add(i)
            continue

        # if no table, use heuristic: detect topic header then use bullets and short requirement lines
        current_topic = None
        current_class = None
        for ln in lines:
            m_topic = RE_TOPIC.match(ln)
            if m_topic:
                current_topic = (m_topic.group(1).strip(), normalize(m_topic.group(2)))
                continue
            m_cls = RE_CLASS.search(ln)
            if m_cls:
                current_class = m_cls.group(1)
            # bullets
            if re.match(r'^[\-\–\•\u2022]\s*', ln):
                text_after = re.sub(r'^[\-\–\•\u2022]\s*', '', ln).strip()
                if current_topic:
                    key = (current_topic[0], current_topic[1], current_class)
                    if key not in tmp_map:
                        tmp_map[key] = {"items": [], "pages": set()}
                    # heuristic: if previous item has no noi_dung, try to attach or create new
                    tmp_map[key]["items"].append({
                        "noi_dung": "",  # unknown in this layout
                        "yccd": [normalize(text_after)],
                        "page": i
                    })
                    tmp_map[key]["pages"].add(i)
            else:
                # if line looks like a short description (<=200 chars) and not a header, treat as 'noi_dung'
                if current_topic and len(ln) < 200 and re.search(r'\b(nội dung|hoạt động|dạy|giải thích|thực hành)\b', ln, flags=re.I):
                    key = (current_topic[0], current_topic[1], current_class)
                    if key not in tmp_map:
                        tmp_map[key] = {"items": [], "pages": set()}
                    tmp_map[key]["items"].append({
                        "noi_dung": normalize(ln),
                        "yccd": [],
                        "page": i
                    })
                    tmp_map[key]["pages"].add(i)

# convert tmp_map to topics list
for (letter, title, cls), v in tmp_map.items():
    entry = {
        "chu_de_letter": letter,
        "chu_de_title": title,
        "lop": cls,
        "items": v["items"],
        "pages": sorted(list(v["pages"]))
    }
    topics.append(entry)

# Post-process: merge consecutive items where noi_dung present but yccd empty -> try to attach subsequent yccd bullets
for t in topics:
    merged = []
    i = 0
    items = t["items"]
    while i < len(items):
        it = items[i]
        if it["noi_dung"] and (i+1) < len(items) and not it["yccd"] and items[i+1]["yccd"]:
            # attach next yccd(s) to this noi_dung
            it2 = items[i+1]
            merged.append({
                "noi_dung": it["noi_dung"],
                "yccd": it2["yccd"],
                "page": list({it["page"], it2["page"]})[0]
            })
            i += 2
            continue
        merged.append(it)
        i += 1
    t["items"] = merged

# Save result
with open("yccd_by_topic_complete.json", "w", encoding="utf-8") as f:
    json.dump(topics, f, ensure_ascii=False, indent=2)

print("Hoàn tất: yccd_by_topic_complete.json (mỗi chủ đề có items với 'noi_dung' và 'yccd')")

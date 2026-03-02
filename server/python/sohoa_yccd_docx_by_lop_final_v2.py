import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')  # ⚙️ fix UnicodeEncodeError

from docx import Document
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table
import re
import json
import os


def iter_block_items(parent):
    """Duyệt tất cả paragraph và table theo thứ tự xuất hiện."""
    for child in parent.element.body:
        if isinstance(child, CT_P):
            yield ("p", Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ("t", Table(child, parent))


def is_chude_text(text):
    """Kiểm tra xem dòng này có phải là dòng Chủ đề không."""
    if not text:
        return False
    text = text.strip()
    return bool(re.match(r"^(Chủ\s*đề|CHỦ\s*ĐỀ|[A-Z]\.\s+)", text))


def normalize_text(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", s.strip())


def detect_cap_from_text(text):
    """Phát hiện cấp học dựa theo dòng mô tả 'a) ... cấp ...'"""
    text = text.lower()
    if "tiểu học" in text:
        return "TIỂU HỌC"
    if "trung học cơ sở" in text:
        return "THCS"
    if "trung học phổ thông" in text:
        return "THPT"
    return None


def extract_docx_data(doc_path, output_dir=None):
    if output_dir is None:
        output_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../outputs")
        )
    os.makedirs(output_dir, exist_ok=True)

    doc = Document(doc_path)
    blocks = list(iter_block_items(doc))

    data = []
    current_cap = None
    current_lop = None
    current_chude = None

    inside_section = False
    section_pattern = re.compile(
        r"YÊU CẦU CẦN ĐẠT VÀ NỘI DUNG GIÁO DỤC", re.IGNORECASE
    )

    # Bắt đầu sau tiêu đề chính
    for t, obj in blocks:
        if t == "p" and section_pattern.search(obj.text.strip()):
            inside_section = True
            break
    if not inside_section:
        inside_section = True  # fallback

    i = 0
    while i < len(blocks):
        t, obj = blocks[i]
        if not inside_section:
            i += 1
            continue

        if t == "p":
            text = obj.text.strip()
            if not text:
                i += 1
                continue

            # ✅ Phát hiện cấp học theo dòng kiểu a), b), c)
            cap_detected = detect_cap_from_text(text)
            if cap_detected:
                current_cap = cap_detected
                i += 1
                continue

            # ✅ Phát hiện LỚP (in hoa)
            mlop = re.match(r"^LỚP\s*(\d+)\b", text)
            if mlop:
                current_lop = mlop.group(1)
                j = i + 1

                # Quét các bảng liền kề sau đoạn "LỚP X"
                while j < len(blocks) and blocks[j][0] == "t":
                    _, tbl = blocks[j]
                    num_cols = len(tbl.columns)
                    if num_cols != 2:
                        j += 1
                        continue

                    # Kiểm tra tiêu đề cột đầu
                    header = [c.text.strip() for c in tbl.rows[0].cells]
                    start_row = (
                        1
                        if any(
                            re.search(r"yêu", h, re.IGNORECASE)
                            or re.search(r"nội dung", h, re.IGNORECASE)
                            for h in header
                        )
                        else 0
                    )

                    # Duyệt từng dòng trong bảng
                    for r in tbl.rows[start_row:]:
                        left = normalize_text(r.cells[0].text)
                        right = normalize_text(r.cells[1].text)

                        # Nếu dòng hiện là Chủ đề → cập nhật current_chude
                        if is_chude_text(left) or is_chude_text(right):
                            current_chude = normalize_text(left or right)
                            continue

                        # Nếu cả hai trống → bỏ qua
                        if not left and not right:
                            continue

                        # Ghi dòng dữ liệu
                        data.append(
                            {
                                "cap": current_cap,
                                "lop": current_lop,
                                "chuDe": current_chude,
                                "noiDung": right,
                                "yccd": left,
                            }
                        )
                    j += 1

                i = j
                continue
        i += 1

    # Xuất ra JSON
    output_path = os.path.join(output_dir, "CT_Tinhoc_YCCD_by_Lop.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"📁 Đã ghi file JSON: {output_path}")
    print(f"📊 Tổng số dòng trích xuất: {len(data)}")

    return {
        "success": True,
        "total_items": len(data),
        "output": output_path,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            json.dumps({"success": False, "error": "Thiếu đường dẫn file DOCX"})
        )
        sys.exit(1)

    doc_path = sys.argv[1]
    result = extract_docx_data(doc_path)
    print(json.dumps(result, ensure_ascii=False))

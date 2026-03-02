import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import json
import re
from docx import Document
from pdf2docx import Converter

# ============================================
#  HỖ TRỢ DOCX
# ============================================

def normalize_text(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", s.strip())

def is_chude_text(text):
    if not text:
        return False
    text = text.strip()
    return bool(re.match(r"^(Chủ\s*đề|CHỦ\s*ĐỀ|[A-Z]\.\s+)", text))

def detect_cap_from_text(text):
    """Phát hiện cấp học theo đoạn a), b), c)"""
    text = text.lower()
    if "tiểu học" in text:
        return "TIỂU HỌC"
    if "trung học cơ sở" in text:
        return "THCS"
    if "trung học phổ thông" in text:
        return "THPT"
    return None

from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.text.paragraph import Paragraph
from docx.table import Table

def iter_block_items(parent):
    """Duyệt paragraph và bảng theo thứ tự xuất hiện"""
    for child in parent.element.body:
        if isinstance(child, CT_P):
            yield ("p", Paragraph(child, parent))
        elif isinstance(child, CT_Tbl):
            yield ("t", Table(child, parent))

# ============================================
#  XỬ LÝ DOCX
# ============================================

def extract_docx_data(doc_path, output_dir):
    doc = Document(doc_path)
    blocks = list(iter_block_items(doc))

    data = []
    current_cap = None
    current_lop = None
    current_chude = None
    inside_cap_section = False
    inside_main_section = False

    main_section_pattern = re.compile(
        r"YÊU\s*CẦU\s*CẦN\s*ĐẠT\s*VÀ\s*NỘI\s*DUNG\s*(GIÁO\s*DỤC|CỐT\s*LÕI)\s*Ở\s*CÁC\s*LỚP",
        re.IGNORECASE
    )
    chapter_pattern = re.compile(r"CHƯƠNG\s|\bCHUYÊN ĐỀ\b", re.IGNORECASE)

    for t, obj in blocks:
        if t == "p":
            text = obj.text.strip()
            if not text:
                continue

            # Phát hiện cấp học
            cap_detected = detect_cap_from_text(text)
            if cap_detected:
                current_cap = cap_detected
                inside_cap_section = True
                inside_main_section = False
                current_lop = None
                current_chude = None
                continue

            # Phát hiện main section trong phạm vi cấp học
            if inside_cap_section and main_section_pattern.search(text):
                inside_main_section = True
                current_lop = None
                current_chude = None
                continue

            # Tắt main_section nếu gặp chương/chuyên đề khác
            if chapter_pattern.search(text):
                inside_main_section = False
                current_lop = None
                current_chude = None
                continue

            # Xác định lớp
            if inside_main_section:
                mlop = re.match(r"^LỚP\s*(\d+)\b", text)
                if mlop:
                    current_lop = mlop.group(1)
                    current_chude = None
                    continue

        elif t == "t" and inside_main_section:
            tbl = obj
            if len(tbl.columns) < 2:
                continue

            # Kiểm tra header
            header = [normalize_text(c.text) for c in tbl.rows[0].cells]
            start_row = 1 if any(re.search(r"yêu|nội dung", h, re.IGNORECASE) for h in header) else 0

            for r in tbl.rows[start_row:]:
                left = normalize_text(r.cells[0].text)
                # Gộp các cột còn lại làm right
                right = " ".join(normalize_text(c.text) for c in r.cells[1:])

                # Phát hiện Chủ đề
                if is_chude_text(left) or is_chude_text(right):
                    current_chude = normalize_text(left or right)
                    continue

                if not left and not right:
                    continue

                data.append({
                    "cap": current_cap,
                    "lop": current_lop,
                    "chuDe": current_chude,
                    "yccd": left,
                    "noiDung": right,
                })

    # Xuất JSON
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "CT_Tinhoc_YCCD_auto.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"📁 Đã ghi file JSON: {output_path}")
    print(f"📊 Tổng số dòng trích xuất: {len(data)}")

    return {
        "success": True,
        "total_items": len(data),
        "output": output_path,
        "items": data,
    }


# ============================================
# HÀM CHUYỂN PDF → DOCX
# ============================================

def pdf_to_docx(pdf_path):
    """Chuyển file PDF sang DOCX cùng tên"""
    base = os.path.splitext(pdf_path)[0]
    docx_path = f"{base}_converted.docx"
    print(f"🔄 Đang chuyển PDF sang Word: {os.path.basename(pdf_path)} ...")
    cv = Converter(pdf_path)
    cv.convert(docx_path, start=0, end=None)
    cv.close()
    print(f"✅ Đã tạo file Word: {docx_path}")
    return docx_path

# ============================================
# HÀM CHÍNH
# ============================================

def main(file_path):
    file_path = os.path.abspath(file_path)

    if "server\\server" in file_path or "server/server" in file_path:
        file_path = file_path.replace("server\\server", "server").replace("server/server", "server")

    # Nếu người dùng chạy thiếu "server/"
    if not os.path.exists(file_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", file_path)
        alt_path = os.path.abspath(alt_path)
        if os.path.exists(alt_path):
            file_path = alt_path

    if not os.path.exists(file_path):
        print(json.dumps({
            "success": False,
            "error": f"Không tìm thấy file: {file_path}"
        }))
        sys.exit(1)

    print(f"📂 File thực tế được đọc: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    output_dir = os.path.join(os.path.dirname(__file__), "../outputs")

    if ext == ".pdf":
        docx_path = pdf_to_docx(file_path)
        return extract_docx_data(docx_path, output_dir)
    elif ext == ".docx":
        return extract_docx_data(file_path, output_dir)
    else:
        return {
            "success": False,
            "error": "Định dạng không hợp lệ (chỉ hỗ trợ PDF hoặc DOCX)."
        }

# ============================================
#  ENTRY POINT
# ============================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Thiếu đường dẫn file PDF hoặc DOCX"
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        result = main(file_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": "Lỗi xử lý Python",
            "detail": str(e)
        }))
        sys.exit(1)

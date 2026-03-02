import pdfplumber
import re
import json
import os
import sys

def extract_section(text):
    """
    Lấy phần nội dung chính từ sau 'IV. YÊU CẦU CẦN ĐẠT'
    đến trước 'PHỤ LỤC' hoặc 'TÀI LIỆU THAM KHẢO'
    """
    start = re.search(r"IV\.\s*YÊU CẦU CẦN ĐẠT", text, re.IGNORECASE)
    if not start:
        return None
    start_idx = start.end()
    end = re.search(r"(PHỤ LỤC|TÀI LIỆU THAM KHẢO)", text[start_idx:], re.IGNORECASE)
    end_idx = start_idx + end.start() if end else len(text)
    return text[start_idx:end_idx]


def detect_cap(text):
    """Xác định cấp học hiện tại."""
    if re.search(r"cấp\s*tiểu học", text, re.IGNORECASE):
        return "TIỂU HỌC"
    if re.search(r"cấp\s*trung học cơ sở", text, re.IGNORECASE):
        return "THCS"
    if re.search(r"cấp\s*trung học phổ thông", text, re.IGNORECASE):
        return "THPT"
    return None


def parse_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])

    section = extract_section(full_text)
    if not section:
        return {"success": False, "error": "Không tìm thấy phần nội dung giáo dục"}

    lines = [l.strip() for l in section.split("\n") if l.strip()]
    data = []

    current_cap = None
    current_lop = None
    current_chude = None

    buffer_yccd = []
    buffer_noidung = []

    for line in lines:
        # phát hiện cấp học
        cap_detected = detect_cap(line)
        if cap_detected:
            current_cap = cap_detected
            continue

        # phát hiện lớp
        m_lop = re.match(r"^LỚP\s*(\d+)", line)
        if m_lop:
            current_lop = m_lop.group(1)
            continue

        # phát hiện chủ đề
        if re.match(r"^(Chủ\s*đề|CHỦ\s*ĐỀ)", line):
            # Nếu có dữ liệu cũ chưa lưu, lưu lại
            if buffer_noidung or buffer_yccd:
                data.append({
                    "cap": current_cap,
                    "lop": current_lop,
                    "chuDe": current_chude,
                    "noiDung": "\n".join(buffer_noidung).strip(),
                    "yccd": "\n".join(buffer_yccd).strip()
                })
                buffer_yccd, buffer_noidung = [], []
            current_chude = line.strip()
            continue

        # tách dòng có thể chứa "–" hoặc "-"
        if "–" in line or "-" in line:
            parts = re.split(r"–|-", line, maxsplit=1)
            left = parts[0].strip()
            right = parts[1].strip() if len(parts) > 1 else ""
            # heuristics: nếu bên trái ngắn, coi là nội dung; dài, coi là YCCD
            if len(left.split()) < 6:
                buffer_noidung.append(left)
                buffer_yccd.append(right)
            else:
                buffer_yccd.append(line)
        else:
            buffer_yccd.append(line)

    # Lưu phần cuối cùng
    if buffer_noidung or buffer_yccd:
        data.append({
            "cap": current_cap,
            "lop": current_lop,
            "chuDe": current_chude,
            "noiDung": "\n".join(buffer_noidung).strip(),
            "yccd": "\n".join(buffer_yccd).strip()
        })

    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../outputs"))
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "CT_Tinhoc_YCCD_fromPDF.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return {"success": True, "output": output_path, "total_items": len(data)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Thiếu đường dẫn file PDF"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = parse_pdf(pdf_path)
    print(json.dumps(result, ensure_ascii=False))

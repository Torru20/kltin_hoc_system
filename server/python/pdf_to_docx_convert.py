from pdf2docx import Converter
import os
import sys
import json

def pdf_to_docx(pdf_path):
    """
    Chuyển file PDF sang DOCX giữ nguyên bố cục bảng
    """
    if not os.path.exists(pdf_path):
        return {"success": False, "error": f"Không tìm thấy file: {pdf_path}"}

    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))
    os.makedirs(output_dir, exist_ok=True)

    output_docx = os.path.splitext(os.path.basename(pdf_path))[0] + "_converted.docx"
    output_path = os.path.join(output_dir, output_docx)

    try:
        print(f"🔄 Đang chuyển {pdf_path} → {output_path} ...")
        cv = Converter(pdf_path)
        cv.convert(output_path, start=0, end=None)
        cv.close()
        print(f"✅ Đã chuyển thành công: {output_path}")
        return {"success": True, "output": output_path}
    except Exception as e:
        print("⚠️ Lỗi khi chuyển:", e)
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Thiếu đường dẫn file PDF"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = pdf_to_docx(pdf_path)
    print(json.dumps(result, ensure_ascii=False))

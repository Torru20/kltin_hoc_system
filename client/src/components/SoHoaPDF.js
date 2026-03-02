// client/src/components/SoHoaPDF.js
import React, { useState } from "react";

function SoHoaPDF() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Vui lòng chọn file PDF chương trình Tin học!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("https://kltin-hoc-system.onrender.com/api/sohoa", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      alert("Lỗi khi số hóa file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-3">📘 Số hóa chương trình Tin học</h2>

      <div className="card p-4 shadow-sm">
        <p>
          Chức năng này cho phép bạn tải file PDF chương trình môn Tin học của
          Bộ GD&ĐT và tự động trích xuất: Chủ đề, Nội dung, YCCĐ, Thời lượng, Năng lực.
        </p>

        <input
          type="file"
          accept=".pdf,.docx"
          className="form-control mb-3"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          className="btn btn-primary w-100"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "⏳ Đang xử lý..." : "Bắt đầu số hóa"}
        </button>

        {data && (
          <div className="mt-4">
            <h5>
              ✅ Kết quả trích xuất ({data.total_items || 0} dòng dữ liệu)
            </h5>

            {data.items && data.items.length > 0 ? (
              <div
                style={{
                  maxHeight: "600px",
                  overflowY: "auto",
                  border: "1px solid #ccc",
                }}
              >
                <table className="table table-striped table-bordered mt-3">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: "8%" }}>Cấp</th>
                      <th style={{ width: "8%" }}>Lớp</th>
                      <th style={{ width: "20%" }}>Chủ đề</th>
                      <th style={{ width: "32%" }}>Nội dung</th>
                      <th style={{ width: "32%" }}>Yêu cầu cần đạt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row, i) => (
                      <tr key={i}>
                        <td>{row.cap}</td>
                        <td>{row.lop}</td>
                        <td>{row.chuDe}</td>
                        <td>{row.noiDung}</td>
                        <td>{row.yccd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre
                style={{
                  background: "#f9f9f9",
                  border: "1px solid #ddd",
                  padding: "10px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            )}

            {data.output && (
              <a
                href={`https://kltin-hoc-system.onrender.com/${data.output.replace(/\\/g, "/")}`}
                download
                className="btn btn-success mt-3"
              >
                ⬇️ Tải file JSON gốc
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SoHoaPDF;

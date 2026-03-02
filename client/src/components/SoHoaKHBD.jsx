import { useState } from "react";
import axios from "axios";
import { Button, Form, Alert } from "react-bootstrap";

export default function SoHoaKHBD() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    try {
      if (!file) return setError("Vui lòng chọn file .docx trước khi tải lên!");
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("http://localhost:5000/api/khbd/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
    } catch (err) {
      setError("Lỗi xử lý file KHBD. Vui lòng kiểm tra lại backend hoặc file Word.");
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-primary fw-bold mb-3">🗂️ Số hóa Kế hoạch Bài dạy (Công văn 5512)</h3>

      <Form.Group className="mb-3">
        <Form.Label>Chọn file KHBD (.docx):</Form.Label>
        <Form.Control
          type="file"
          accept=".docx"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </Form.Group>

      <Button variant="primary" onClick={handleUpload}>
        Tải lên & Phân tích
      </Button>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {result && (
        <div className="mt-4">
          <h5 className="fw-bold">Kết quả trích xuất JSON:</h5>
          <pre className="bg-light p-3 rounded" style={{ maxHeight: "400px", overflowY: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

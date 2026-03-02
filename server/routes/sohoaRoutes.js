import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const router = express.Router();

// ==== Đảm bảo các thư mục tồn tại ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repoDir là thư mục gốc của dự án (tức là KLTN-2026/kltin_hoc_system/)
const repoDir = path.resolve(__dirname, "../..");

// Đường dẫn tuyệt đối chuẩn
const uploadDir = path.join(repoDir, "server", "uploads");
const outputDir = path.join(repoDir, "server", "outputs");
const pythonScript = path.join(repoDir, "server", "python", "sohoa_auto.py");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// ==== Cấu hình multer ====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${baseName}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ==== Chọn Python command ====
const pythonCmd = process.platform === "win32" ? "py" : "python3";

// ===============================
// POST /api/sohoa
// ===============================
router.post("/", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Chưa gửi file chương trình." });
  }

  const filePath = path.resolve(req.file.path); // ✅ Đường dẫn chuẩn tuyệt đối
  console.log("📄 Nhận file:", filePath);
  console.log("🐍 Script Python:", pythonScript);

  const py = spawn(pythonCmd, [pythonScript, filePath], { windowsHide: true });

  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (data) => (stdout += data.toString()));
  py.stderr.on("data", (data) => (stderr += data.toString()));

  py.on("close", (code) => {
    console.log(`✅ Python kết thúc (mã ${code})`);
    if (stderr) console.error("⚠️ Python stderr:", stderr);
    if (stdout) console.log("📤 Python stdout:", stdout.slice(0, 400));

    try {
      const lastLine = stdout.trim().split("\n").pop();
      const json = JSON.parse(lastLine);
      res.json(json);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Không đọc được kết quả từ Python",
        exitCode: code,
        stdout: stdout,
        stderr: stderr,
      });
    }
  });
});

export default router;

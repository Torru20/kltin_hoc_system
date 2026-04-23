import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import dotenv from 'dotenv';
import mysql from 'mysql2';
import db, { pool } from './config/db.js';
// --- IMPORT CẤU HÌNH ---
//import "./config/db.js"; // Đảm bảo gọi file này để kiểm tra kết nối MySQL ngay khi start
import "./config/db.js";
import authRoutes from './routes/auth.route.js'; 
import changePassword from './routes/auth.route.js'; 
import updatePassword from './routes/auth.route.js'; 
import linkGoogleAccount from './routes/auth.route.js'; 
import sohoaRoutes from "./routes/sohoaRoutes.js";
import khbdUpload from "./routes/khbdUpload.js";

dotenv.config();
console.log("Kiểm tra DB_NAME:", process.env.DB_NAME); 
// Nếu hiện ra 'web_khbd_mtkt' là bạn đã đặt đúng chỗ.
const app = express();

// --- MIDDLEWARE HỆ THỐNG ---
app.use(cors());
app.use(express.json()); // Cực kỳ quan trọng để đọc body từ các request POST
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "server/uploads/" });
const PORT = process.env.PORT || 5000;

// --- ROUTES XÁC THỰC & NGƯỜI DÙNG ---
// Khi React gọi https://kltin-hoc-system.onrender.com/api/auth/login, nó sẽ vào đây
app.use('/api/auth', authRoutes);
app.use('/change-password', changePassword);
app.use('/update-password', updatePassword);
app.use('/link-google', linkGoogleAccount);
// --- ROUTES NGHIỆP VỤ ---
app.use("/api/khbd", khbdUpload);
app.use("/api/sohoa", sohoaRoutes);


// ----------------------------------------------------
// Tích hợp Route Nghiệp vụ (File/Python)
// ----------------------------------------------------

// ✅ Gắn route upload KHBD
app.use("/api/khbd", khbdUpload);

// ✅ Gắn route chính số hóa (Python)
app.use("/api/sohoa", sohoaRoutes);

// ✅ Route mặc định kiểm tra server
app.get("/", (req, res) => {
    res.send("✅ Server Node.js đang hoạt động!");
});

// ⚙️ (Tùy chọn) Route tạm để test trực tiếp nếu cần
app.post("/api/sohoa-test", upload.single("pdf"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Chưa chọn file PDF" });
    }

    const filePath = path.resolve(req.file.path);
    console.log(`📄 Nhận file: ${filePath}`);

    // 🔗 Gọi script mới: sohoa_auto.py
    const py = spawn("py", ["server/python/sohoa_auto.py", filePath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
        output += data.toString();
    });

    py.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    py.on("close", (code) => {
        console.log(`✅ Python xử lý xong, mã thoát ${code}`);

        try {
            const json = JSON.parse(output);
            res.json(json);
        } catch (e) {
            console.error("❌ Không đọc được JSON:", e.message);
            res.status(500).json({
                error: "Không đọc được kết quả từ Python",
                detail: errorOutput,
            });
        } finally {
            fs.unlink(filePath, () => {}); // Xóa file tạm
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server Node.js chạy tại http://localhost:${PORT}`);
});
//mySQL
//import mysql from 'mysql2'; // Hoặc const mysql = require('mysql2');

// 1. Đảm bảo đã require dotenv ở đầu file server.js
import 'dotenv/config';
//const mysql = require('mysql2'); // Nên dùng mysql2 để hỗ trợ SSL tốt hơn
// 1. Tạo pool theo kiểu truyền thống (callback)
// Sử dụng Pool để hỗ trợ cả callback lẫn promise nếu cần

//----------------------------------------------profile page----------------------------------------------


import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const SECRET_KEY = process.env.JWT_SECRET || 'torru';

// 1. API Lấy thông tin Profile (Gộp thông tin User + KHBD + MTKT)
// --- TRONG server.js ---

// API lấy Profile không cần check token để test trước
app.get('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // 1. Lấy thông tin User
        const [users] = await db.execute(
            'SELECT UserID, GoogleID, Email, Hoten, Vaitro, NgayTao FROM NGUOIDUNG WHERE UserID = ?', 
            [userId]
        );

        if (users.length === 0) {
            return res.json({ success: false, message: "Không tìm thấy User ID: " + userId });
        }

        // 2. Lấy KHBD
        const [khbd] = await db.execute('SELECT * FROM KHBD WHERE UserID = ?', [userId]);

        // 3. Lấy MTKT
        const [mtkt] = await db.execute('SELECT * FROM MTKT WHERE UserID = ?', [userId]);

        res.json({
            success: true,
            user: users[0],
            listKHBD: khbd || [],
            listMTKT: mtkt || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// 2. API Đổi mật khẩu
// 2. API Đổi mật khẩu (Bản sửa lỗi "not iterable")

//---------------------------------------------------------Chuc nang: KHBD----------------------------------------------
// Endpoint lấy danh sách cấp học
app.get('/api/caphoc', (req, res) => {
    const sql = "SELECT MaCap as id, TenCap as ten FROM CAPHOC"; // Tên cột phải khớp với CSDL của bạn
    pool.query(sql, (err, data) => {
        if (err) {
            console.error("Lỗi truy vấn MySQL:", err);
            return res.status(500).json({ error: "Lỗi hệ thống" });
        }
        res.json(data); // Trả về mảng: [{id: 'THPT', ten: 'Trung học phổ thông'}, ...]
    });
});

app.get('/api/lops', (req, res) => {
    const maCapHoc = req.query.maCap; // Nhận MaCap từ Frontend gửi về
    console.log("Dữ liệu MaCap nhận được từ React:", maCapHoc);

    if (!maCapHoc) {
        return res.json([]); 
    }

    // Truy vấn dựa trên cấu trúc MaLop, MaCap, TenLop
    const sql = "SELECT MaLop as id, TenLop as ten FROM LOP WHERE MaCap = ?";
    
    pool.query(sql, [maCapHoc], (err, results) => {
        if (err) {
            console.error("Lỗi truy vấn SQL:", err);
            return res.status(500).send(err);
        }
        console.log("Kết quả tìm thấy trong DB:", results);
        res.json(results);
    });
});
//get chu de
app.get('/api/chudes', (req, res) => {
    const maCap = req.query.maCap; // Lấy tham số truyền từ URL
    
    if (!maCap) {
        return res.json([]); 
    }

    // Truy vấn theo cấu trúc bảng CHUDE của bạn
    const sql = "SELECT MaChuDe as id, TenChuDe as ten FROM CHUDE WHERE MaCap = ?";
    
    pool.query(sql, [maCap], (err, results) => {
        if (err) {
            console.error("Lỗi SQL Chủ đề:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

//get dinh huong
app.get('/api/dinhhuong', (req, res) => {
  // Lấy chính xác tên cột từ bảng DINHHUONG
  const sql = "SELECT MaDH, TenDH FROM dinhhuong"; 
  pool.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

//get noi dung co ban
// Endpoint lấy danh sách Nội dung cơ bản theo logic định hướng
app.get('/api/noidungcoban', (req, res) => {
    // 1. Nhận đúng tên biến từ FE gửi lên
    const { maLop, maChuDe, maDH } = req.query;

    // 2. Kiểm tra log để debug xem dữ liệu có tới không
    console.log("Query nhận được:", { maLop, maChuDe, maDH });

    if (!maLop || !maChuDe || !maDH) {
        return res.json([]); 
    }

    const sql = `
        SELECT MaNDCB as id, NoiDungChiTiet as ten 
        FROM noidungcoban 
        WHERE MaLop = ? AND MaChuDe = ? AND MaDH = ?
    `;

    // 3. Truyền đúng thứ tự biến vào mảng [maLop, maChuDe, maDH]
    pool.query(sql, [maLop, maChuDe, maDH], (err, results) => {
        if (err) {
            console.error("Lỗi SQL:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});
//get bo SGK
app.get('/api/bosgk', (req, res) => {
    // Truy vấn với alias để khớp với code Frontend (id, ten)
    const sql = "SELECT MaSGK as id, TenSGK as ten FROM BOSGK";
    pool.query(sql, (err, results) => {
        if (err) {
            console.error("Lỗi truy vấn bảng BOSGK:", err);
            return res.status(500).json({ error: "Lỗi cơ sở dữ liệu" });
        }
        res.json(results);
    });
});

//phanphoi SGK
app.get('/api/tenbaihoc', (req, res) => {
    const { maSGK, maNDCB, maCap, maLop } = req.query;
    // Log để kiểm tra giá trị BE nhận được
    console.log(`Querying with: SGK=${maSGK}, NDCB=${maNDCB}, Cap=${maCap}, Lop=${maLop}`);
    // Sử dụng đúng các tên cột từ ảnh bạn gửi: MaPhanPhoi, TenBai, SoTiet
    const sql = `
        SELECT MaPhanPhoi as id, TenBai as ten, SoTiet 
        FROM phanphoiSGK 
        WHERE MaSGK = ? AND MaNDCB = ? AND MaCap = ? AND MaLop = ?
        ORDER BY ThuTuBai ASC
    `;

    pool.query(sql, [maSGK, maNDCB, maCap, maLop], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

//Lay ds muc tieu trong sgk
app.get('/api/muctieusgk', (req, res) => {
    const { maPhanPhoi } = req.query;
    
    // Sử dụng đúng tên cột NoiDungMTTP từ ảnh Database của bạn
    const sql = `
        SELECT MaMTTP as id, NoiDungMTTP as noiDung 
        FROM muctieusgk 
        WHERE MaPhanPhoi = ? 
        ORDER BY ThuTu ASC
    `;

    pool.query(sql, [maPhanPhoi], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

//-------------------------------XỬ LÝ MA TRẬN VÀ BẢN ĐẶC TẢ-------------------------------------------
//API lấy YCCD và NL theo nội dung đã chọn
// GET: /api/mapping-yccd-nl/:maYCCD
// GET: /api/yccd-by-noidung?maNDCB=...&maCap=...
app.get('/api/yccd-by-noidung', (req, res) => {
    const { maNDCB, maCap } = req.query;

    const sql = `
        SELECT 
            y.MaYCCD, 
            y.NoiDungYCCD, 
            y.MaMucDo,
            ax.MaNL,
            nl.TenNL,
            -- Sử dụng IFNULL để tránh lỗi khi chưa có biểu hiện
            IFNULL(GROUP_CONCAT(bh.NoiDungBH SEPARATOR '; '), 'Chưa có mô tả biểu hiện') as NoiDungBH
        FROM YCCD y
        LEFT JOIN YCCD_NL_ANHXA ax ON y.MaYCCD = ax.MaYCCD
        LEFT JOIN NANGLUCDACTHU nl ON ax.MaNL = nl.MaNL
        LEFT JOIN BIEUHIEN_NANGLUC bh ON nl.MaNL = bh.MaNL AND bh.MaCap = ?
        WHERE y.MaNDCB = ?
        GROUP BY y.MaYCCD, y.NoiDungYCCD, y.MaMucDo, ax.MaNL, nl.TenNL
    `;

    pool.query(sql, [maCap, maNDCB], (err, results) => {
        if (err) {
            console.error("Lỗi truy vấn YCCD:", err);
            return res.status(500).json({ error: "Lỗi hệ thống" });
        }
        res.json(results);
    });
});

// GET: /api/bieu-hien?maNL=...&maCap=...
//API lấy biểu hiện khi hover
app.get('/api/bieu-hien', (req, res) => {
    const { maNL, maCap } = req.query;
    const sql = `SELECT NoiDungBH FROM BIEUHIEN_NANGLUC WHERE MaNL = ? AND MaCap = ?`;
    pool.query(sql, [maNL, maCap], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results); 
    });
});

// ti le loai cau hoi
app.get('/api/tile-constraints', (req, res) => {
    const sql = "SELECT MaLoaiCauHoi, LoaiCauHoi, TiLeMin, TiLeMax FROM TILE_MTKT";
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

//---------------------------------------------------------------------------------------------------------




//Gemini prompt
import 'dotenv/config'; // Nạp biến môi trường ngay lập tức
import { GoogleGenerativeAI } from "@google/generative-ai";

// Kiểm tra thử xem Key đã vào chưa (Xóa dòng này sau khi test xong)
console.log("Kiểm tra API Key:", process.env.GEMINI_API_KEY ? "Đã nhận ✅" : "Chưa có ❌");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


//`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
// Route gọi Gemini AI soạn giáo án
// server.js
/*
app.post('/api/generate-lesson-plan', async (req, res) => {
    try {
        const { lessonName, objectives, lop, thoiLuong, thietBi, teacherNote } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        // Cấu trúc Prompt yêu cầu JSON cụ thể
        const prompt = `
            Bạn là giáo viên Tin học cấp THPT. Hãy soạn kế hoạch bài dạy bài: ${lessonName} chuẩn 5512.
            Mục tiêu: ${objectives}. Thiết bị: ${thietBi}. Lớp: ${lop}.
            Thời lượng: ${thoiLuong} tiết. Yêu cầu thêm: ${teacherNote}
            KHBD gồm 4 hoạt động: Khởi động, hình thành kiến thức mới, luyện tập, vận dụng
            YÊU CẦU TRẢ VỀ JSON THUẦN (KHÔNG CÓ DẤU NHÁY CODE BLOCK):
            {
              "tienTrinh": [
                { "ten": "Hoạt động 1: ...", "mucTieu": "...", "noiDung": "...", "phuongPhap": "..." }
              ],
              "activities": [
                {
                  "title": "Tên hoạt động chi tiết",
                  "noiDung": "...",
                  "sanPham": "...",
                  "steps": [
                    { "step": "Chuyển giao nhiệm vụ", "gv": "...", "hs": "..." },
                    { "step": "Thực hiện nhiệm vụ", "gv": "...", "hs": "..." },
                    { "step": "Báo cáo, thảo luận", "gv": "...", "hs": "..." },
                    { "step": "Kết luận, nhận định", "gv": "...", "hs": "..." }
                  ]
                }
              ]
            }
        `;
        console.log("------------------------------------------");
        console.log("FULL PROMPT GỬI GEMINI:");
        console.log(prompt);
        console.log("------------------------------------------");
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, // Nên dùng 1.5 flash cho ổn định
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        responseMimeType: "application/json" // Ép Gemini trả về JSON
                    }
                })
            }
        );

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            return res.json({ content: data.candidates[0].content.parts[0].text });
        } 
        res.status(500).json({ error: "AI không phản hồi" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi Server" });
    }
});
*/
app.post('/api/generate-lesson-plan', async (req, res) => {
    try {
        const { lessonName, objectives, lop, thoiLuong, thietBi, teacherNote } = req.body;
        
        // 1. Cấu hình Prompt (Đã thêm các câu lệnh "ép" độ dài mạnh hơn)
        const prompt = `
            Bạn là giáo viên Tin học chuyên về soạn thảo KHBD theo Công văn 5512. 
            DANH SÁCH MỤC TIÊU CỐ ĐỊNH:
            ${objectives}
            
            NHIỆM VỤ:
            Soạn kế hoạch bài dạy bài: "${lessonName}" cho Lớp: ${lop}, Thời lượng: ${thoiLuong} tiết.
            Thiết bị: ${thietBi}.
            Yêu cầu thêm: ${teacherNote}

            QUY TẮC VỀ CẤU TRÚC (BẮT BUỘC):
            1. SỐ LƯỢNG HÀNH ĐỘNG: Mảng "activities" PHẢI có số lượng phần tử BẰNG 100% với mảng "tienTrinh".
            2. MAPPING MỤC TIÊU: Tại trường "mucTieu", CHỈ ghi số hiệu trong ngoặc đơn. Ví dụ: "(1), (2)".
            3. QUY TẮC VIẾT CHI TIẾT (QUAN TRỌNG): 
               - Mỗi bước (step) của GIÁO VIÊN phải bao gồm: Lời giảng chi tiết, câu hỏi gợi mở cụ thể và hướng dẫn kỹ thuật.
               - Mỗi bước (step) của HỌC SINH phải bao gồm: Thao tác cụ thể trên máy tính, nội dung thảo luận hoặc sản phẩm cụ thể thu được.
               - TUYỆT ĐỐI KHÔNG viết tóm tắt kiểu "GV hướng dẫn bài". Phải viết rõ "GV đặt cây hỏi..., yêu cầu làm bài như sau:..., yêu cầu HS thực hiện lệnh Y...".
               - Mỗi Hoạt động phải đạt độ dài tối thiểu 500 chữ.
            4. Cần có tối thiểu 4 hoạt động: Khởi động, Hình thành kiến thức mới/Khám phá, Luyện tập, Vận dụng (có thể đặt tên phụ)
            5. Phải ghi chú thời gian của từng hoạt động, tổng thời lượng không vượt quá ${thoiLuong} tiết. (1 tiết = 45 phút)
            YÊU CẦU TRẢ VỀ JSON THUẦN (Nội dung phải giàu tính sư phạm):
            {
            "tienTrinh": [
                { "ten": "Hoạt động 1: Khởi động", "mucTieu": "(1)", "noiDung": "Học sinh xem video và trả lời câu hỏi gợi mở", "phuongPhap": "Trực quan, đàm thoại" }
            ],
            "activities": [
                {
                "title": "Hoạt động 1: Khởi động",
                "mucTieu": "(1)", 
                "noiDung": "Nội dung hoạt động chi tiết (viết ít nhất 5 câu mô tả ngữ cảnh)...",
                "sanPham": "Sản phẩm cụ thể mà HS phải nộp hoặc trả lời được...",
                "steps": [
                    { 
                        "step": "Chuyển giao nhiệm vụ", 
                        "gv": "GV trình chiếu slide/video về... Sau đó đặt câu hỏi: 'Các em nghĩ sao về...?'. Yêu cầu HS thảo luận cặp đôi trong 2 phút.", 
                        "hs": "HS quan sát, lắng nghe câu hỏi, ghi chép các từ khóa quan trọng và bắt đầu trao đổi với bạn bên cạnh." 
                    },
                    { 
                        "step": "Thực hiện nhiệm vụ", 
                        "gv": "GV đi xuống từng nhóm, quan sát thái độ thảo luận, gợi ý cho các nhóm đang gặp khó khăn bằng các câu hỏi phụ như...", 
                        "hs": "HS thảo luận sôi nổi, liệt kê các ý kiến ra nháp hoặc phiếu học tập cá nhân." 
                    },
                    { 
                        "step": "Báo cáo, thảo luận", 
                        "gv": "GV mời đại diện 2 nhóm bất kỳ đứng dậy trình bày. Sau khi HS trả lời, GV yêu cầu các nhóm khác nhận xét, bổ sung.", 
                        "hs": "Đại diện HS trình bày tự tin. Các HS khác chú ý lắng nghe để tìm ra điểm khác biệt trong câu trả lời của nhóm mình." 
                    },
                    { 
                        "step": "Kết luận, nhận định", 
                        "gv": "GV chốt kiến thức: 'Như vậy các em thấy rằng...'. Đánh giá tinh thần học tập và dẫn dắt sang nội dung tiếp theo.", 
                        "hs": "HS ghi nhớ kết luận của giáo viên vào vở ghi và chuẩn bị tài liệu cho hoạt động khám phá." 
                    }
                ]
                }
            ],
            "appendices": "Khung sườn Phiếu học tập & Rubric (Ngắn gọn)"
            }
        `;

        // --- CONSOLE KIỂM TRA PROMPT GỬI ĐI ---
        console.log("==================== DEBUG PROMPT GỬI ĐI ====================");
        console.log(`Bài dạy: ${lessonName} - Lớp: ${lop}`);
        console.log(`Nội dung Prompt: ${prompt.substring(0, 500)}...`); // Log 500 ký tự đầu để kiểm tra
        console.log("============================================================");

        // 1. Gom các Key Gemini vào một mảng để lặp
        const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(k => k);
        const groqKey = process.env.GROQ_API_KEY;
        const modelName = "gemini-2.5-flash"; 
        
        let lastError = null;

        // --- GIAI ĐOẠN 1: THỬ TỪNG KEY GEMINI ---
        for (let i = 0; i < geminiKeys.length; i++) {
            try {
                const currentKey = geminiKeys[i];
                console.log(`[System] Đang thử Gemini với Key ${i + 1}: ${currentKey.substring(0, 6)}...`);
                
                const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`;
                
                const response = await fetch(apiURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { 
                            responseMimeType: "application/json", 
                            temperature: 0.9,
                            maxOutputTokens: 8192
                        }
                    })
                });

                const data = await response.json();

                if (data.candidates && data.candidates[0].content) {
                    console.log(`>>> KẾT QUẢ: Thành công bằng [Gemini - Key ${i + 1}]`);
                    return res.json({ 
                        provider: `Gemini 2.5 Flash (Key ${i + 1})`,
                        content: data.candidates[0].content.parts[0].text 
                    });
                }
                
                lastError = data.error?.message || "Không có phản hồi từ Gemini";
                console.warn(`[Gemini Key ${i + 1} Thất bại]: ${lastError}`);

            } catch (err) {
                lastError = err.message;
                console.error(`[Lỗi kết nối Key ${i + 1}]:`, err.message);
            }
            // Nếu chạy đến đây mà chưa return nghĩa là Key hiện tại lỗi, vòng lặp sẽ tự nhảy sang Key tiếp theo.
        }

        // --- GIAI ĐOẠN 2: NẾU TẤT CẢ GEMINI ĐỀU TẠCH -> CHUYỂN SANG GROQ ---
        if (groqKey) {
            console.log("!!! Tất cả Gemini đều lỗi. Đang dùng Groq làm cứu cánh cuối cùng...");
            try {
                const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${groqKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: "Bạn là chuyên gia soạn giáo án 5512 chuyên nghiệp." },
                            { role: "user", content: prompt }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.9,
                        max_tokens: 4096
                    })
                });

                const groqData = await groqResponse.json();
                if (groqData.choices && groqData.choices[0].message) {
                    console.log(">>> KẾT QUẢ: Thành công bằng [Groq]");
                    return res.json({ 
                        provider: "Groq (Llama 3.3)",
                        content: groqData.choices[0].message.content 
                    });
                }
            } catch (groqErr) {
                console.error("Lỗi Groq:", groqErr.message);
                lastError = "Cả 2 Key Gemini và Groq đều không hoạt động.";
            }
        }

        return res.status(500).json({ error: "Hệ thống bận", details: lastError });

    } catch (error) {
        if (!res.headersSent) res.status(500).json({ error: "Lỗi Server" });
    }
});

//Chuc nang: Tra cuu duong lien thong tri thuc
// API Tra cứu đường liên thông tri thức (Dạng Callback an toàn)
/*app.get('/api/alignment-trace/:maNDCB', (req, res) => {
    const { maNDCB } = req.params;
    const sql = `
        SELECT nd.MaNDCB, nd.NoiDungChiTiet, nd.MaND_Truoc, l.TenLop, c.TenCap
        FROM NOIDUNGCOBAN nd
        JOIN LOP l ON nd.MaLop = l.MaLop
        JOIN CAPHOC c ON nd.MaCap = c.MaCap
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        const trace = [];
        let current = maNDCB;
        while (current) {
            const found = results.find(item => item.MaNDCB.toString() === current.toString());
            if (found) {
                trace.push(found);
                current = found.MaND_Truoc; // Lấy mã bài học cũ hơn
            } else current = null;
        }
        res.json({ success: true, data: trace });
    });
});*/
// API Tra cứu đường liên thông tri thức HAI CHIỀU (Tiến và Lùi)
app.get('/api/alignment-trace/:maNDCB', (req, res) => {
    const { maNDCB } = req.params;
    
    const sql = `
        SELECT nd.MaNDCB, nd.NoiDungChiTiet, nd.MaND_Truoc, l.TenLop, c.TenCap
        FROM NOIDUNGCOBAN nd
        JOIN LOP l ON nd.MaLop = l.MaLop
        JOIN CAPHOC c ON nd.MaCap = c.MaCap
    `;

    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);

        // --- BƯỚC 1: TRA NGƯỢC (Về quá khứ) ---
        const backwardTrace = [];
        let currentBack = maNDCB;
        while (currentBack) {
            const found = results.find(item => item.MaNDCB.toString() === currentBack.toString());
            if (found) {
                backwardTrace.push(found);
                currentBack = found.MaND_Truoc; // Tìm bài học cũ hơn
            } else {
                currentBack = null;
            }
        }
        // backwardTrace lúc này: [Hiện tại, Lớp dưới, Lớp dưới nữa...]

        // --- BƯỚC 2: TRA TIẾN (Đến tương lai/Lớp cao hơn) ---
        const forwardTrace = [];
        let currentForward = maNDCB;
        while (currentForward) {
            // Tìm bài học mà có "MaND_Truoc" bằng mã hiện tại
            const nextStep = results.find(item => 
                item.MaND_Truoc && item.MaND_Truoc.toString() === currentForward.toString()
            );
            
            if (nextStep) {
                forwardTrace.push(nextStep);
                currentForward = nextStep.MaNDCB; // Tiến lên mã bài học mới hơn
            } else {
                currentForward = null;
            }
        }
        // forwardTrace lúc này: [Lớp trên, Lớp trên nữa...]

        // --- BƯỚC 3: HỢP NHẤT DỮ LIỆU ---
        // Sắp xếp theo thứ tự thời gian: [Cũ nhất -> ... -> Hiện tại -> ... -> Mới nhất]
        const fullChain = [
            ...backwardTrace.reverse().slice(0, -1), // Đảo ngược và bỏ phần tử cuối (là cái hiện tại)
            ...backwardTrace.reverse(),              // Lấy lại cái hiện tại (do slice đã cắt)
            ...forwardTrace                          // Thêm các lớp tương lai
        ];
        
        // Cách ghép gọn hơn:
        const finalData = [...backwardTrace.reverse(), ...forwardTrace];

        res.json({ success: true, data: finalData });
    });
});

// API Tìm kiếm nội dung theo từ khóa
app.get('/api/noidungcoban/search', (req, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.json([]);

    const sql = `
        SELECT nd.MaNDCB as id, nd.NoiDungChiTiet as ten, l.TenLop, c.TenCap
        FROM NOIDUNGCOBAN nd
        JOIN LOP l ON nd.MaLop = l.MaLop
        JOIN CAPHOC c ON nd.MaCap = c.MaCap
        WHERE nd.NoiDungChiTiet LIKE ?
        LIMIT 20
    `;
    
    pool.query(sql, [`%${keyword}%`], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

//API lưu trữ MTKT
// Thêm import pool/db từ file config của bạn nếu file đó export ra
// Ví dụ: import pool from "./config/db.js"; 
// Nếu chưa có, bạn khai báo tạm pool ở đây để chạy:


app.post('/api/save-full-exam', (req, res) => {
    const { header, matrixData, questionsData } = req.body;

    // 1. Tạo mã định danh
    const shortTime = Date.now().toString(36).slice(-6); 
    const uId = header.userId;
    const maMaTranCustom = `${uId}_${shortTime}`;
    const maDacTaCustom = `DT${uId}_${shortTime}`;
    const maDeThiCustom = `D${uId}_${shortTime}`;

    // Cấu hình điểm
    const pc = header.pointConfig || {
        tn_nhieu_lc: 0.25, tn_dung_sai: 1.0, tl_ngan: 0.5,
        tu_luan_nb: 0.5, tu_luan_th: 1.0, tu_luan_vd: 1.5
    };

    const MAPPING_MUCDO = { 
        'NB': 'MucDo_01', 'TH': 'MucDo_02', 
        'VD': 'MucDo_03', 'VDC': 'MucDo_03' 
    };

    let pending = 0;
    const checkFinished = () => {
        pending--;
        if (pending === 0 && !res.headersSent) {
            console.log(">>> ✅ TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC LƯU THÀNH CÔNG <<<");
            res.json({ success: true, maMaTran: maMaTranCustom });
        }
    };

    // 2. LƯU BẢNG MTKT
    pending++;
    const sqlMTKT = `
        INSERT INTO MTKT (
            MaMaTran, MaSGK, TenMaTran, TongSoCau, TongThoiGian, UserID,
            Diem_TNKQ, Diem_DungSai, Diem_TLNgan, Diem_TuLuan_NB, Diem_TuLuan_TH, Diem_TuLuan_VD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    pool.query(sqlMTKT, [
        maMaTranCustom, header.maSGK, header.tenMaTran, header.tongSoCau, header.thoiGian, header.userId,
        pc.tn_nhieu_lc, pc.tn_dung_sai, pc.tl_ngan, pc.tu_luan_nb, pc.tu_luan_th, pc.tu_luan_vd
    ], (err) => {
        if (err) return res.status(500).json({ error: "Lỗi MTKT: " + err.message });

        // 3. LƯU BẢNG DETHI
        pending++;
        pool.query(`INSERT INTO DETHI (MaDeThi, MaMaTran, TenDeThi, NgayTao, UserID) VALUES (?, ?, ?, NOW(), ?)`,
        [maDeThiCustom, maMaTranCustom, header.tenMaTran, header.userId], (err) => {
            if (err) return res.status(500).json({ error: "Lỗi DETHI: " + err.message });
            
            // Duyệt từng Chủ đề/Nội dung
            matrixData.forEach((cd, indexCD) => {
                const maMTChiTiet = `${maMaTranCustom}_C${indexCD}`;
                pending++;
                pool.query(`INSERT INTO MT_CHITIET (MaMTChiTiet, MaMaTran, MaNDCB) VALUES (?, ?, ?)`,
                [maMTChiTiet, maMaTranCustom, cd.maNDCB], (err) => {
                    
                    // Duyệt từng Mức độ (NB, TH, VD)
                    cd.levels.forEach((lvl, indexLVL) => {
                        const maMucDoChuan = MAPPING_MUCDO[lvl.mucDo.toUpperCase()] || lvl.mucDo;
                        
                        // QUAN TRỌNG: Làm sạch MaYCCD (Lấy mã chuỗi thay vì mảng JSON)
                        const cleanMaYCCD = Array.isArray(lvl.maYCCD) ? lvl.maYCCD[0] : lvl.maYCCD;

                        // 4. LƯU BẢN ĐẶC TẢ (Lưu tại cấp độ YCCD + Mức độ)
                        if (cleanMaYCCD) {
                            const maDacTa = `${maDacTaCustom}_${indexCD}${indexLVL}`.slice(0, 20);
                            pending++;
                            pool.query(`INSERT IGNORE INTO BANDACTA (MaDacTa, MaMaTran, MaYCCD, MaNL, MaMucDo) VALUES (?, ?, ?, ?, ?)`,
                            [maDacTa, maMaTranCustom, cleanMaYCCD, lvl.maNL, maMucDoChuan], (errBD) => {
                                if (errBD) console.error("❌ Lỗi BANDACTA:", errBD.message);
                                checkFinished();
                            });
                        }

                        // Duyệt từng loại câu hỏi (TN, TL...)
                        lvl.details.forEach((detail, indexDT) => {
                            const maPhanBoCustom = `${maMTChiTiet}P${indexLVL}${indexDT}`;
                            
                            // 5. LƯU PHÂN BỔ CÂU HỎI
                            pending++;
                            pool.query(`INSERT INTO MT_YCCD_CAUHOI (MaPhanBo, MaMTChiTiet, MaYCCD, MaLoaiCauHoi, SoLuongCau, MaMucDo) VALUES (?, ?, ?, ?, ?, ?)`,
                            [maPhanBoCustom, maMTChiTiet, cleanMaYCCD, detail.type, detail.qty, maMucDoChuan], (err) => {
                                
                                // 6. LỌC VÀ LƯU CÂU HỎI CHI TIẾT
                                const filteredQues = questionsData.filter(q => 
                                    q.maMucDo?.toUpperCase() === lvl.mucDo.toUpperCase() && 
                                    q.maLoaiCauHoi === detail.type
                                );

                                filteredQues.forEach((q, indexQ) => {
                                    const maCauHoiCustom = `${maDeThiCustom}Q${indexCD}${indexLVL}${indexDT}${indexQ}`.slice(0, 20);
                                    
                                    pending++;
                                    pool.query(`INSERT INTO DETHI_CAUHOI (MaCauHoiDeThi, MaDeThi, MaPhanBo, NoiDungCauHoi, SoThuTu, Diem) VALUES (?, ?, ?, ?, ?, ?)`,
                                    [maCauHoiCustom, maDeThiCustom, maPhanBoCustom, q.noiDungCauHoi, q.soThuTu, q.diem], (errQ) => {
                                        
                                        // 7. LƯU ĐÁP ÁN CỦA CÂU HỎI
                                        if (!errQ && q.dapAn && q.dapAn.length > 0) {
                                            q.dapAn.forEach((da) => {
                                                const maDapAn = `${maCauHoiCustom}${da.kyHieu}`.slice(0, 20);
                                                pending++;
                                                pool.query(`INSERT INTO CAUHOI_DAPAN (MaDapAn, MaCauHoiDeThi, KyHieu, NoiDungDapAn, LaDapAnDung) VALUES (?, ?, ?, ?, ?)`,
                                                [maDapAn, maCauHoiCustom, da.kyHieu, da.noiDungDapAn, da.laDapAnDung ? 1 : 0], checkFinished);
                                            });
                                        }
                                        checkFinished();
                                    });
                                });
                                checkFinished(); 
                            });
                        });
                    });
                    checkFinished(); 
                });
            });
            checkFinished(); 
        });
        checkFinished(); 
    });
});

//lay list MTKT từ db
app.get('/api/get-exams', (req, res) => {
    // Lấy userId từ query params (do FE gửi lên qua axios params)
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "Thiếu mã người dùng (userId)" });
    }

    const query = `
        SELECT 
            m.MaMaTran, 
            m.TenMaTran, 
            d.MaDeThi, 
            d.NgayTao 
        FROM MTKT m
        JOIN DETHI d ON m.MaMaTran = d.MaMaTran
        WHERE m.UserID = ?
        ORDER BY d.NgayTao DESC`;

    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Lỗi SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});
// GET: Lấy chi tiết đề thi và định dạng lại cấu trúc content
/*app.get('/api/get-full-exam-detail/:maDeThi', (req, res) => {
    const { maDeThi } = req.params;

    const query = `
        SELECT 
            d.MaMaTran, d.TenDeThi,
            dc.MaCauHoiDeThi, dc.MaPhanBo, dc.NoiDungCauHoi, dc.SoThuTu, dc.Diem,
            p.MaLoaiCauHoi, p.MaMucDo,
            y.NoiDungYCCD -- Cột nội dung từ bảng YCCD
        FROM DETHI d
        JOIN DETHI_CAUHOI dc ON d.MaDeThi = dc.MaDeThi
        LEFT JOIN MT_YCCD_CAUHOI p ON dc.MaPhanBo = p.MaPhanBo
        LEFT JOIN YCCD y ON (
        REPLACE(REPLACE(REPLACE(p.MaYCCD, '[', ''), ']', ''), '"', '') = y.MaYCCD
        )
        WHERE d.MaDeThi = ?
        ORDER BY dc.SoThuTu ASC`;

    pool.query(query, [maDeThi], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Không tìm thấy đề thi" });

        const maCauHoiIds = results.map(r => r.MaCauHoiDeThi);
        
        pool.query(`SELECT * FROM CAUHOI_DAPAN WHERE MaCauHoiDeThi IN (?)`, [maCauHoiIds], (errA, answers) => {
            if (errA) return res.status(500).json({ error: errA.message });

            const questionsData = results.map(q => {
                const qAnswers = answers.filter(a => a.MaCauHoiDeThi === q.MaCauHoiDeThi);
                
                let content = { noiDung: q.NoiDungCauHoi };
                // Giữ nguyên logic đóng gói content cũ của bạn
                if (q.MaLoaiCauHoi === 'tn_nhieu_lc') {
                    content.options = qAnswers.map(a => a.NoiDungDapAn);
                    content.correct = qAnswers.findIndex(a => a.LaDapAnDung === 1);
                } else if (q.MaLoaiCauHoi === 'tn_dung_sai') {
                    content.subQuestions = qAnswers.map(a => ({
                        text: a.NoiDungDapAn, answer: a.LaDapAnDung === 1
                    }));
                } else if (q.MaLoaiCauHoi === 'tl_ngan') {
                    content.answer = qAnswers[0]?.NoiDungDapAn || "";
                } else if (q.MaLoaiCauHoi === 'tu_luan') {
                    content.guide = qAnswers[0]?.NoiDungDapAn || "";
                }

                return {
                    idTmp: q.MaCauHoiDeThi,
                    maPhanBo: q.MaPhanBo,
                    maLoaiCauHoi: q.MaLoaiCauHoi,
                    maMucDo: q.MaMucDo,
                    diem: q.Diem,
                    soThuTu: q.SoThuTu,
                    // DÙNG CỘT NoiDungYCCD VỪA LẤY ĐƯỢC
                    yccdText: q.NoiDungYCCD || "Không tìm thấy YCCĐ cho mã: " + (q.MaPhanBo || 'N/A'),
                    content: content
                };
            });

            res.json({
                header: { 
                    tenDeThi: results[0].TenDeThi || "Đề thi không tên", 
                    maMaTran: results[0].MaMaTran 
                },
                questionsData: questionsData
            });
        });
    });
});
*/
app.get('/api/get-full-exam-detail/:maDeThi', (req, res) => {
    const { maDeThi } = req.params;

    // 1. Lấy thông tin Header và Điểm chuẩn từ MTKT
    const checkQuery = `
        SELECT d.MaDeThi, d.TenDeThi, d.MaMaTran,
        m.Diem_TNKQ, m.Diem_DungSai, m.Diem_TLNgan, m.Diem_TuLuan_NB, m.Diem_TuLuan_TH, m.Diem_TuLuan_VD,
        (SELECT COUNT(*) FROM DETHI_CAUHOI WHERE MaDeThi = d.MaDeThi) as hasQuestions
        FROM DETHI d 
        LEFT JOIN MTKT m ON d.MaMaTran = m.MaMaTran
        WHERE d.MaDeThi = ?`;

    pool.query(checkQuery, [maDeThi], (err, checkRes) => {
        if (err) return res.status(500).json({ error: err.message });
        if (checkRes.length === 0) return res.status(404).json({ error: "Không tìm thấy đề thi" });

        const examInfo = checkRes[0];

        // Object chứa điểm cấu hình để FE tính toán
        const scores = {
            tnkq: examInfo.Diem_TNKQ,
            dungSai: examInfo.Diem_DungSai,
            tlNgan: examInfo.Diem_TLNgan,
            tuLuanNB: examInfo.Diem_TuLuan_NB,
            tuLuanTH: examInfo.Diem_TuLuan_TH,
            tuLuanVD: examInfo.Diem_TuLuan_VD
        };

        // TRƯỜNG HỢP 1: ĐỀ ĐÃ SOẠN CÂU HỎI
        if (examInfo.hasQuestions > 0) {
            const queryOld = `
                SELECT * FROM (
                    SELECT 
                        dc.MaCauHoiDeThi, dc.MaPhanBo, dc.NoiDungCauHoi, dc.SoThuTu, dc.Diem,
                        p.MaLoaiCauHoi, p.MaMucDo, 
                        y.NoiDungYCCD,
                        ROW_NUMBER() OVER (PARTITION BY dc.MaDeThi, dc.SoThuTu ORDER BY dc.MaCauHoiDeThi DESC) as rn
                    FROM DETHI_CAUHOI dc
                    LEFT JOIN MT_YCCD_CAUHOI p ON dc.MaPhanBo = p.MaPhanBo
                    LEFT JOIN YCCD y ON REPLACE(REPLACE(REPLACE(p.MaYCCD, '[', ''), ']', ''), '"', '') = y.MaYCCD
                    WHERE dc.MaDeThi = ?
                ) t
                WHERE rn = 1
                ORDER BY SoThuTu ASC`;

            pool.query(queryOld, [maDeThi], (err1, results) => {
                if (err1) return res.status(500).json({ error: err1.message });
                const maCauHoiIds = results.map(r => r.MaCauHoiDeThi);

                pool.query(`SELECT * FROM CAUHOI_DAPAN WHERE MaCauHoiDeThi IN (?)`, [maCauHoiIds], (errA, answers) => {
                    if (errA) return res.status(500).json({ error: errA.message });

                    const questionsData = results.map(q => {
                        const qAnswers = answers.filter(a => a.MaCauHoiDeThi === q.MaCauHoiDeThi);
                        let content = { noiDung: q.NoiDungCauHoi || "" };
                        
                        if (q.MaLoaiCauHoi === 'tn_nhieu_lc') {
                            content.options = qAnswers.map(a => a.NoiDungDapAn);
                            content.correct = qAnswers.findIndex(a => a.LaDapAnDung === 1);
                        } else if (q.MaLoaiCauHoi === 'tn_dung_sai') {
                            content.subQuestions = qAnswers.map(a => ({ text: a.NoiDungDapAn, answer: a.LaDapAnDung === 1 }));
                        } else if (q.MaLoaiCauHoi === 'tl_ngan') {
                            content.answer = qAnswers[0]?.NoiDungDapAn || "";
                        } else if (q.MaLoaiCauHoi === 'tu_luan') {
                            content.guide = qAnswers[0]?.NoiDungDapAn || "";
                        }

                        return {
                            idTmp: q.MaCauHoiDeThi, 
                            maPhanBo: q.MaPhanBo, 
                            maLoaiCauHoi: q.MaLoaiCauHoi,
                            maMucDo: q.MaMucDo, 
                            diem: q.Diem, 
                            soThuTu: q.SoThuTu,
                            yccdText: q.NoiDungYCCD || "N/A", 
                            content: content
                        };
                    });

                    res.json({
                        header: { tenDeThi: examInfo.TenDeThi, maMaTran: examInfo.MaMaTran, scores },
                        questionsData: questionsData
                    });
                });
            });
        } 
        // TRƯỜNG HỢP 2: ĐỀ CHƯA SOẠN (Lấy khung)
        else {
            const queryFrame = `
                SELECT p.MaPhanBo, p.MaLoaiCauHoi, p.MaMucDo, p.SoLuongCau, y.NoiDungYCCD
                FROM MT_YCCD_CAUHOI p
                LEFT JOIN YCCD y ON REPLACE(REPLACE(REPLACE(p.MaYCCD, '[', ''), ']', ''), '"', '') = y.MaYCCD
                WHERE p.MaMTChiTiet IN (SELECT MaMTChiTiet FROM MT_CHITIET WHERE MaMaTran = ?)`;
            
            pool.query(queryFrame, [examInfo.MaMaTran], (errF, frames) => {
                if (errF) return res.status(500).json({ error: errF.message });

                const questionsData = [];
                let stt = 1;

                frames.forEach(f => {
                    for (let i = 0; i < f.SoLuongCau; i++) {
                        let content = { noiDung: "" };
                        if (f.MaLoaiCauHoi === 'tn_nhieu_lc') { content.options = ["", "", "", ""]; content.correct = 0; }
                        else if (f.MaLoaiCauHoi === 'tn_dung_sai') { content.subQuestions = []; }
                        else if (f.MaLoaiCauHoi === 'tl_ngan') { content.answer = ""; }
                        else if (f.MaLoaiCauHoi === 'tu_luan') { content.guide = ""; }

                        questionsData.push({
                            idTmp: `NEW_${f.MaPhanBo}_${i}`,
                            maPhanBo: f.MaPhanBo,
                            maLoaiCauHoi: f.MaLoaiCauHoi,
                            maMucDo: f.MaMucDo,
                            diem: 0,
                            soThuTu: stt++,
                            yccdText: f.NoiDungYCCD || "N/A",
                            content: content
                        });
                    }
                });

                res.json({
                    header: { tenDeThi: examInfo.TenDeThi, maMaTran: examInfo.MaMaTran, scores },
                    questionsData: questionsData
                });
            });
        }
    });
});

app.post('/api/save-new-exam-version', (req, res) => {
    const { header, questionsData } = req.body;
    // Log để kiểm tra UserID gửi lên là gì
    console.log("UserID nhận được:", header.userId);
    // Kiểm tra dữ liệu đầu vào
    if (!header.maMaTran || !questionsData) {
        return res.status(400).json({ error: "Thiếu thông tin MaMaTran hoặc dữ liệu câu hỏi" });
    }

    const shortTime = Date.now().toString(36).slice(-6); 
    const uId = header.userId || '1';
    const maDeThiMoi = `D${uId}_${shortTime}`;

    let pending = 0;
    const checkFinished = () => {
        pending--;
        if (pending === 0 && !res.headersSent) {
            console.log(">>> ✅ LƯU ĐỀ TÁI BẢN THÀNH CÔNG:", maDeThiMoi);
            res.json({ success: true, maDeThi: maDeThiMoi });
        }
    };

    // 1. LƯU BẢNG DETHI
    pending++;
    pool.query(
        `INSERT INTO DETHI (MaDeThi, MaMaTran, TenDeThi, NgayTao, UserID) VALUES (?, ?, ?, NOW(), ?)`,
        [maDeThiMoi, header.maMaTran, header.tenDeThi, uId], 
        (err) => {
            if (err) {
                console.error("❌ Lỗi DETHI:", err.sqlMessage);
                return res.status(500).json({ error: "Lỗi DB DETHI: " + err.sqlMessage });
            }

            // 2. LƯU DANH SÁCH CÂU HỎI
            questionsData.forEach((q, idx) => {
                // Đảm bảo ID không quá 20 ký tự
                const maCH = `${maDeThiMoi}Q${idx}`.substring(0, 20);
                
                pending++;
                pool.query(
                    `INSERT INTO DETHI_CAUHOI (MaCauHoiDeThi, MaDeThi, MaPhanBo, NoiDungCauHoi, SoThuTu, Diem) VALUES (?, ?, ?, ?, ?, ?)`,
                    [maCH, maDeThiMoi, q.maPhanBo, q.content?.noiDung || q.noiDungCauHoi || "", q.soThuTu || (idx + 1), q.diem],
                    (errQ) => {
                        if (errQ) {
                            console.error(`❌ Lỗi Câu hỏi ${maCH}:`, errQ.sqlMessage);
                            checkFinished();
                            return;
                        }

                        // 3. LƯU ĐÁP ÁN (Sử dụng hàm bóc tách an toàn)
                        const answers = extractAnswersFromEditor(q); 
                        
                        if (answers.length > 0) {
                            answers.forEach((da) => {
                                const maDA = `${maCH}${da.kyHieu}`.substring(0, 20);
                                pending++;
                                pool.query(
                                    `INSERT INTO CAUHOI_DAPAN (MaDapAn, MaCauHoiDeThi, KyHieu, NoiDungDapAn, LaDapAnDung) VALUES (?, ?, ?, ?, ?)`,
                                    [maDA, maCH, da.kyHieu, da.noiDungDapAn, da.laDapAnDung ? 1 : 0],
                                    (errDA) => {
                                        if (errDA) console.error("❌ Lỗi Đáp án:", errDA.sqlMessage);
                                        checkFinished();
                                    }
                                );
                            });
                        }
                        checkFinished();
                    }
                );
            });
            checkFinished();
        }
    );
});

// HÀM QUAN TRỌNG: Bóc tách dữ liệu từ Editor sang format DB
function extractAnswersFromEditor(q) {
    let list = [];
    const content = q.content || {};
    
    if (q.maLoaiCauHoi === 'tn_nhieu_lc') {
        const options = content.options || [];
        options.forEach((opt, i) => {
            list.push({
                kyHieu: String.fromCharCode(65 + i),
                noiDungDapAn: opt,
                laDapAnDung: i === content.correct
            });
        });
    } else if (q.maLoaiCauHoi === 'tn_dung_sai') {
        const subQs = content.subQuestions || [];
        subQs.forEach((sub, i) => {
            list.push({
                kyHieu: (i + 1).toString(),
                noiDungDapAn: sub.text,
                laDapAnDung: sub.answer === true
            });
        });
    } else if (q.maLoaiCauHoi === 'tl_ngan') {
        if (content.answer) list.push({ kyHieu: 'TL', noiDungDapAn: content.answer, laDapAnDung: true });
    } else if (q.maLoaiCauHoi === 'tu_luan') {
        if (content.guide) list.push({ kyHieu: 'HD', noiDungDapAn: content.guide, laDapAnDung: true });
    }
    return list;
}

// Hàm bổ trợ chuyển đổi cấu trúc content sang mảng đáp án để INSERT
function extractAnswersForDB(q) {
    let list = [];
    const c = q.content;
    if (q.maLoaiCauHoi === 'tn_nhieu_lc' && c.options) {
        c.options.forEach((opt, i) => {
            list.push({ kyHieu: String.fromCharCode(65 + i), noiDungDapAn: opt, laDapAnDung: i === c.correct });
        });
    } else if (q.maLoaiCauHoi === 'tn_dung_sai' && c.subQuestions) {
        c.subQuestions.forEach((sub, i) => {
            list.push({ kyHieu: (i + 1).toString(), noiDungDapAn: sub.text, laDapAnDung: sub.answer });
        });
    } else if (q.maLoaiCauHoi === 'tl_ngan') {
        list.push({ kyHieu: 'ANS', noiDungDapAn: c.answer, laDapAnDung: true });
    } else if (q.maLoaiCauHoi === 'tu_luan') {
        list.push({ kyHieu: 'GD', noiDungDapAn: c.guide, laDapAnDung: true });
    }
    return list;
}

//hàm lấy data để xuất ma trận kiểm tra ra word

//app.get('/api/get-matrix-7991/:maMaTran', async (req, res) => {
// server.js

app.get('/api/export-matrix-word/:maMaTran', async (req, res) => {
    const { maMaTran } = req.params;
    console.log(">>> Đang lấy ma trận mã:", maMaTran); // Kiểm tra xem ID có nhận đúng không

    try {
        // Sử dụng cách viết gọn hơn và xử lý lỗi callback của mysql
        const query = (sql, params) => new Promise((rel, rej) => {
            pool.query(sql, params, (err, results) => err ? rej(err) : rel(results));
        });

        // 1. Lấy dữ liệu
        const mtktResults = await query(`SELECT * FROM MTKT WHERE MaMaTran = ?`, [maMaTran]);
        const mtktInfo = mtktResults[0];

        if (!mtktInfo) {
            console.log("X Không tìm thấy thông tin MTKT");
            return res.status(404).json({ error: "Không tìm thấy ma trận trong hệ thống" });
        }

        const rawData = await query(`
            SELECT 
                cd.TenChuDe, nd.NoiDungChiTiet, nd.MaNDCB,
                pb.MaLoaiCauHoi, pb.MaMucDo, pb.SoLuongCau
            FROM MT_CHITIET ct
            JOIN NOIDUNGCOBAN nd ON ct.MaNDCB = nd.MaNDCB
            JOIN CHUDE cd ON nd.MaChuDe = cd.MaChuDe
            LEFT JOIN MT_YCCD_CAUHOI pb ON ct.MaMTChiTiet = pb.MaMTChiTiet
            WHERE ct.MaMaTran = ?
            ORDER BY cd.MaChuDe, nd.MaNDCB`, [maMaTran]);

        console.log(">>> Số lượng dòng dữ liệu chi tiết:", rawData.length);

        // 2. Gom nhóm dữ liệu
        const matrixMap = new Map();

        rawData.forEach(row => {
            if (!matrixMap.has(row.MaNDCB)) {
                matrixMap.set(row.MaNDCB, {
                    tenChuDe: row.TenChuDe,
                    tenNoiDung: row.NoiDungChiTiet,
                    levels: {
                        nb: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
                        th: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
                        vd: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
                    }
                });
            }

            const item = matrixMap.get(row.MaNDCB);
            const soLuong = parseInt(row.SoLuongCau) || 0;

            // 1. Mapping Mức độ (Dựa trên hình ảnh của bạn: MucDo_02, MucDo_03)
            let lvl = 'nb'; 
            if (row.MaMucDo === 'MucDo_02') lvl = 'th';
            if (row.MaMucDo === 'MucDo_03') lvl = 'vd';

            // 2. Mapping Loại câu hỏi (Khớp chính xác với cột MaLoaiCauHoi trong ảnh SQL)
            const loaiCau = row.MaLoaiCauHoi;

            if (loaiCau === 'tn_nhieu_lc') item.levels[lvl].tn_nhieu_lc += soLuong;
            else if (loaiCau === 'tn_dung_sai') item.levels[lvl].tn_dung_sai += soLuong;
            else if (loaiCau === 'tl_ngan') item.levels[lvl].tl_ngan += soLuong;
            else if (loaiCau === 'tu_luan') item.levels[lvl].tu_luan += soLuong;
        });

        // 3. Phản hồi
        const finalData = {
            success: true,
            header: {
                tenMaTran: mtktInfo.TenMaTran,
                thoiGian: mtktInfo.TongThoiGian
            },
            matrixRows: Array.from(matrixMap.values()),
            // LẤY ĐIỂM TỪ CSDL THAY VÌ FIX CỨNG
            pointConfig: {
                tn_nhieu_lc: mtktInfo.Diem_TNKQ || 0.25,
                tn_dung_sai: mtktInfo.Diem_DungSai || 1.0,
                tl_ngan: mtktInfo.Diem_TLNgan || 0.5,
                tu_luan_nb: mtktInfo.Diem_TuLuan_NB || 0.5,
                tu_luan_th: mtktInfo.Diem_TuLuan_TH || 1.0,
                tu_luan_vd: mtktInfo.Diem_TuLuan_VD || 1.5
            }
        };
        
        console.log(">>> Gửi dữ liệu về FE thành công");
        res.json(finalData);

    } catch (error) {
        console.error("X Lỗi Server:", error);
        res.status(500).json({ error: "Lỗi hệ thống: " + error.message });
    }
});

// lưu khbd vào db
app.post('/api/save-khbd', async (req, res) => {
    const { header, objectives, activities, processData } = req.body; 
    const maKHBD = `KHBD_${Date.now()}`;

    try {
        // 1. Lưu vào bảng chính KHBD
        await db.query(
            `INSERT INTO KHBD (MaKHBD, MaNDCB, UserID, MaPhanPhoi, GhiChu, ThietBiGV, ThietBiHS) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                maKHBD, 
                header.maNDCB || null, 
                header.userId || null, 
                header.maPhanPhoi || null, 
                header.ghiChu || '', 
                header.thietBiGV || '', 
                header.thietBiHS || ''
            ]
        );

        // --- SỬA TẠI ĐÂY: Lưu vào bảng Tiến trình tổng quan ---
        if (processData && processData.length > 0) {
            const now = Date.now(); // Lấy timestamp hiện tại (dạng số)
            const processValues = processData.map((p, index) => [
                // TẠO ID KIỂU SỐ: Lấy 9 số cuối của timestamp + index để vừa khít kiểu INT
                parseInt((now % 1000000000) + index), 
                maKHBD, 
                p.ten || p.HoatDong || '', 
                p.mucTieu || p.MucTieu || '', 
                p.noiDung || p.NoiDung || '', 
                p.phuongPhap || p.PhuongPhap || '',
                index + 1
            ]);

            // Cú pháp đúng cho Bulk Insert: [processValues]
            await db.query(
                `INSERT INTO KHBD_TIENTRINH_TONGQUAN (MaTTTQ, MaKHBD, TenHoatDong, MucTieu, NoiDungTrongTam, PhuongPhapKyThuat, STT) VALUES ?`,
                [processValues]
            );
        }

        // 2. Lưu vào bảng KHBD_MUCTIEU
        if (objectives && objectives.length > 0) {
            let mapMucTieu = {}; 
            const objValues = objectives.map((obj, index) => {
                const maMT = `MT_${Math.random().toString(36).substr(2, 9)}_${index}`;
                mapMucTieu[index + 1] = maMT; 
                return [maMT, maKHBD, obj.type || '', obj.ref || '', obj.content || ''];
            });

            await db.query(
                `INSERT INTO KHBD_MUCTIEU (MaKHBD_MT, MaKHBD, LoaiMucTieu, MaThamChieu, NoiDungHienThi) VALUES ?`,
                [objValues]
            );

            // 3. Lưu Activities (Chỉ gọi khi có mapMucTieu)
            if (activities && activities.length > 0) {
                await saveActivitiesAsync(activities, maKHBD, mapMucTieu);
            }
        } else {
            if (activities && activities.length > 0) {
                await saveActivitiesAsync(activities, maKHBD, {});
            }
        }

        res.json({ success: true, maKHBD });

    } catch (err) {
        console.error("❌ Lỗi chi tiết tại Server:", err);
        res.status(500).json({ success: false, error: "Lỗi lưu KHBD: " + err.message });
    }

    // Hàm phụ trợ lưu Activity tuần tự
    async function saveActivitiesAsync(activities, maKHBD, mapMucTieu) {
        for (const act of activities) {
            const maHD = `HD_${Math.random().toString(36).substr(2, 9)}`;
            
            await db.query(
                `INSERT INTO KHBD_HOATDONG (MaHoatDong, MaKHBD, TenHoatDong, NoiDungHoatDong, SPDuKien) VALUES (?, ?, ?, ?, ?)`,
                [maHD, maKHBD, act.tenHoatDong || '', act.noiDungHoatDong || '', act.spDuKien || '']
            );

            if (act.mucTieuLienKet) {
                const numbers = act.mucTieuLienKet.match(/\d+/g);
                if (numbers) {
                    const lienKetValues = numbers
                        .filter(num => mapMucTieu[num])
                        .map(num => [maHD, mapMucTieu[num]]);
                    
                    if (lienKetValues.length > 0) {
                        await db.query(
                            `INSERT INTO HD_MUCTIEU_LIENKET (MaHoatDong, MaKHBD_MT) VALUES ?`,
                            [lienKetValues]
                        );
                    }
                }
            }

            if (act.steps && act.steps.length > 0) {
                const stepValues = act.steps.map(step => [
                    `TT_${Math.random().toString(36).substr(2, 9)}`,
                    maHD, step.name || '', step.gv || '', step.hs || ''
                ]);
                await db.query(
                    `INSERT INTO HD_TIENTRINH (MaTienTrinh, MaHoatDong, TenBuoc, HD_GV, HD_HS) VALUES ?`,
                    [stepValues]
                );
            }
        }
    }
});
//lấy khbd từ db
// Route lấy đầy đủ thông tin để Xuất Word từ Database
app.get('/api/get-full-khbd/:maKHBD', async (req, res) => {
    const { maKHBD } = req.params;
    try {
        // 1. Lấy thông tin bài dạy chính (Bổ sung ThietBiGV, ThietBiHS, ThoiLuong)
        // 1. Chỉ lấy dữ liệu từ bảng KHBD - Không JOIN để tránh lỗi C1, C2
        const [infoRows] = await db.query(
            `SELECT MaKHBD, GhiChu, ThietBiGV, ThietBiHS, ThoiLuong, MaPhanPhoi 
             FROM KHBD 
             WHERE MaKHBD = ?`, [maKHBD]
        );

        if (infoRows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy KHBD" });
        }

        let rawInfo = infoRows[0];
        rawInfo.TenBai = "Bài dạy mới (Cấp 1/2)"; // Giá trị mặc định
        rawInfo.TenLop = "Chưa xác định";        // Giá trị mặc định

        // 2. Chỉ khi nào có MaPhanPhoi (Cấp 3) thì mới đi lấy tên bài thật
        if (rawInfo.MaPhanPhoi) {
            const [extraData] = await db.query(
                `SELECT p.TenBai, l.TenLop 
                 FROM PHANPHOISGK p 
                 JOIN LOP l ON p.MaLop = l.MaLop 
                 WHERE p.MaPhanPhoi = ?`, [rawInfo.MaPhanPhoi]
            );
            if (extraData.length > 0) {
                rawInfo.TenBai = extraData[0].TenBai;
                rawInfo.TenLop = extraData[0].TenLop;
            }
        }

        //const rawInfo = infoRows[0];

        // 2. Lấy TOÀN BỘ mục tiêu từ bảng KHBD_MUCTIEU (Cần thiết để đánh số liên kết)
        const [objectives] = await db.query(
            `SELECT LoaiMucTieu, NoiDungHienThi, MaKHBD_MT 
             FROM KHBD_MUCTIEU 
             WHERE MaKHBD = ? 
             ORDER BY MaKHBD_MT ASC`, [maKHBD]
        );

        // 3. Lấy Tiến trình tổng quan (Mục III)
        const [processData] = await db.query(
            `SELECT TenHoatDong as ten, MucTieu as mucTieu, NoiDungTrongTam as noiDung, PhuongPhapKyThuat as phuongPhap 
             FROM KHBD_TIENTRINH_TONGQUAN 
             WHERE MaKHBD = ? 
             ORDER BY STT ASC`, [maKHBD]
        );

        // 4. Lấy Hoạt động chi tiết và các bước tổ chức
        const [dbActivities] = await db.query(
            `SELECT MaHoatDong, TenHoatDong, NoiDungHoatDong, SPDuKien 
             FROM KHBD_HOATDONG 
             WHERE MaKHBD = ?`, [maKHBD]
        );

        const stepPriority = { "Chuyển giao nhiệm vụ": 1, "Thực hiện nhiệm vụ": 2, "Báo cáo, thảo luận": 3, "Kết luận, nhận định": 4 };

        const activities = [];
        for (let act of dbActivities) {
            // Lấy các bước của từng hoạt động
            const [steps] = await db.query(
                `SELECT TenBuoc as step, HD_GV as gv, HD_HS as hs 
                 FROM HD_TIENTRINH 
                 WHERE MaHoatDong = ?`, [act.MaHoatDong]
            );
            
            // Sắp xếp bước theo quy trình 5512
            const sortedSteps = steps.sort((a, b) => (stepPriority[a.step] || 99) - (stepPriority[b.step] || 99));

            // Map mục tiêu liên kết (để hiển thị dạng (1), (2) trong Word)
            const [links] = await db.query(
                `SELECT MaKHBD_MT FROM HD_MUCTIEU_LIENKET WHERE MaHoatDong = ?`, [act.MaHoatDong]
            );
            
            const linkedNumbers = links.map(l => {
                const idx = objectives.findIndex(o => o.MaKHBD_MT === l.MaKHBD_MT);
                return idx !== -1 ? `(${idx + 1})` : null;
            }).filter(Boolean).join(", ");

            activities.push({
                title: act.TenHoatDong,
                mucTieu: linkedNumbers,
                noiDung: act.NoiDungHoatDong,
                sanPham: act.SPDuKien,
                steps: sortedSteps
            });
        }

        // 5. Xử lý tách Phụ lục từ cột Ghi chú (nếu có)
        let phuLucText = "";
        if (rawInfo.GhiChu && rawInfo.GhiChu.includes("Phụ lục:")) {
            phuLucText = rawInfo.GhiChu.split("Phụ lục:")[1].trim();
        }

        // Gộp lại thông tin header hoàn chỉnh
        const formattedInfo = {
            maKHBD: rawInfo.MaKHBD,
            baiName: rawInfo.TenBai,
            lop: rawInfo.TenLop,
            thoiLuong: rawInfo.ThoiLuong || 1,
            thietBiGV: rawInfo.ThietBiGV || "Máy tính, máy chiếu, bài giảng.",
            thietBiHS: rawInfo.ThietBiHS || "Sách giáo khoa, vở ghi.",
            phuLuc: phuLucText,
            ghiChu: rawInfo.GhiChu
        };

        // Trả dữ liệu về cho Frontend
        res.json({ 
            success: true, 
            info: formattedInfo, 
            objectives, 
            processData, 
            activities 
        });

    } catch (err) {
        console.error("Lỗi API get-full-khbd:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/get-specification/:maMaTran', async (req, res) => {
    const { maMaTran } = req.params;
    try {
        const sql = `
            SELECT 
                n.TenNDCB, 
                b.MaMucDo, 
                y.NoiDungYCCD, 
                nl.TenNangLuc,
                -- Lấy thêm số lượng câu từ bảng phân bổ để điền vào cột TN/TL trong đặc tả
                (SELECT SUM(SoLuongCau) FROM MT_YCCD_CAUHOI WHERE MaMTChiTiet IN 
                    (SELECT MaMTChiTiet FROM MT_CHITIET WHERE MaMaTran = b.MaMaTran AND MaNDCB = n.MaNDCB)
                    AND MaMucDo = b.MaMucDo AND MaLoaiCauHoi = 'tn_nhieu_lc') as soCauTN,
                (SELECT SUM(SoLuongCau) FROM MT_YCCD_CAUHOI WHERE MaMTChiTiet IN 
                    (SELECT MaMTChiTiet FROM MT_CHITIET WHERE MaMaTran = b.MaMaTran AND MaNDCB = n.MaNDCB)
                    AND MaMucDo = b.MaMucDo AND MaLoaiCauHoi = 'tu_luan') as soCauTL
            FROM BANDACTA b
            JOIN YCCD y ON b.MaYCCD = y.MaYCCD
            JOIN NANGLUC nl ON b.MaNL = nl.MaNL
            JOIN MTKT m ON b.MaMaTran = m.MaMaTran
            -- Để lấy được tên NDCB, ta phải thông qua bảng MT_CHITIET
            JOIN MT_CHITIET mc ON m.MaMaTran = mc.MaMaTran
            JOIN NDCB n ON mc.MaNDCB = n.MaNDCB
            WHERE b.MaMaTran = ?
            GROUP BY b.MaDacTa -- Tránh trùng lặp do Join
            ORDER BY n.MaNDCB, b.MaMucDo;
        `;
        
        const [rows] = await db.query(sql, [maMaTran]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route: GET /api/dacta/export/:maMaTran
app.get('/api/dacta/export/:maMaTran', async (req, res) => {
    const { maMaTran } = req.params;
    console.log(">>> Đang lấy đặc tả mã:", maMaTran);

    try {
        // Hàm query bổ trợ khớp với phong cách code của bạn
        const query = (sql, params) => new Promise((rel, rej) => {
            pool.query(sql, params, (err, results) => err ? rej(err) : rel(results));
        });

        // 1. Lấy thông tin Header và Điểm
        const mtktResults = await query(`SELECT * FROM MTKT WHERE MaMaTran = ?`, [maMaTran]);
        const mtktInfo = mtktResults[0];

        if (!mtktInfo) {
            return res.status(404).json({ error: "Không tìm thấy ma trận" });
        }

        // 2. Lấy dữ liệu chi tiết theo YCCD (Join thêm bảng YCCD)
        const rawData = await query(`
            SELECT 
                cd.TenChuDe, nd.NoiDungChiTiet, y.NoiDungYCCD, y.MaMucDo, y.MaYCCD,
                nl.MaNL, pb.MaLoaiCauHoi, pb.SoLuongCau
            FROM MT_YCCD_CAUHOI pb
            JOIN MT_CHITIET ct ON pb.MaMTChiTiet = ct.MaMTChiTiet
            JOIN NOIDUNGCOBAN nd ON ct.MaNDCB = nd.MaNDCB
            JOIN CHUDE cd ON nd.MaChuDe = cd.MaChuDe
            JOIN YCCD y ON pb.MaYCCD = y.MaYCCD
            LEFT JOIN YCCD_NL_ANHXA ynl ON y.MaYCCD = ynl.MaYCCD
            LEFT JOIN NANGLUCDACTHU nl ON ynl.MaNL = nl.MaNL
            WHERE ct.MaMaTran = ?
            ORDER BY cd.MaChuDe, nd.MaNDCB, y.MaYCCD`, [maMaTran]);

        // 3. Gom nhóm dữ liệu theo từng YCCD (Mỗi YCCD là 1 dòng trong bản đặc tả)
        const dacTaMap = new Map();

        rawData.forEach(row => {
            if (!dacTaMap.has(row.MaYCCD)) {
                dacTaMap.set(row.MaYCCD, {
                    tenChuDe: row.TenChuDe,
                    tenNoiDung: row.NoiDungChiTiet,
                    noiDungYCCD: row.NoiDungYCCD,
                    maMucDo: (row.MaMucDo || "").toUpperCase(), 
                    maNL: row.MaNL || "NLa",
                    tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0
                });
            }

            const item = dacTaMap.get(row.MaYCCD);
            const soLuong = parseInt(row.SoLuongCau) || 0;
            const loai = row.MaLoaiCauHoi;

            if (loai === 'tn_nhieu_lc') item.tn_nhieu_lc += soLuong;
            else if (loai === 'tn_dung_sai') item.tn_dung_sai += soLuong;
            else if (loai === 'tl_ngan') item.tl_ngan += soLuong;
            else if (loai === 'tu_luan') item.tu_luan += soLuong;
        });

        const dacTaRows = Array.from(dacTaMap.values());

        // 4. Logic đánh dấu gộp ô (Merge cells)
        let lastCD = "", lastND = "";
        dacTaRows.forEach(row => {
            row.isFirstOfChuDe = row.tenChuDe !== lastCD;
            row.isFirstOfND = row.tenNoiDung !== lastND;
            if (row.isFirstOfChuDe) lastCD = row.tenChuDe;
            if (row.isFirstOfND) lastND = row.tenNoiDung;
        });

        // 5. Trả về đúng cấu trúc FE cần
        res.json({
            success: true,
            header: {
                tenMaTran: mtktInfo.TenMaTran,
                thoiGian: mtktInfo.TongThoiGian
            },
            dacTaRows: dacTaRows,
            pointConfig: {
                tn_nhieu_lc: mtktInfo.Diem_TNKQ || 0.25,
                tn_dung_sai: mtktInfo.Diem_DungSai || 1.0,
                tl_ngan: mtktInfo.Diem_TLNgan || 0.5,
                tu_luan_nb: mtktInfo.Diem_TuLuan_NB || 0.5,
                tu_luan_th: mtktInfo.Diem_TuLuan_TH || 1.0,
                tu_luan_vd: mtktInfo.Diem_TuLuan_VD || 1.5
            }
        });

    } catch (error) {
        console.error("X Lỗi Server Đặc Tả:", error);
        res.status(500).json({ error: "Lỗi hệ thống: " + error.message });
    }
});
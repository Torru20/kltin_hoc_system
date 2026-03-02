import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// API Lưu KHBD hoặc Ma Trận soạn thảo từ UI
router.post('/save-composed', async (req, res) => {
    const { UserID, TenBaiDay, Loai, NoiDung } = req.body;

    if (!UserID) {
        return res.status(400).json({ error: "Thiếu UserID. Vui lòng đăng nhập lại." });
    }

    try {
        // Thực hiện lệnh INSERT vào bảng đã có
        const query = `
            INSERT INTO KHBD (UserID, TenBaiDay, Loai, NoiDungJSON, NgayTao) 
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        // NoiDung ở đây là chuỗi JSON.stringify từ React gửi lên
        const [result] = await db.execute(query, [UserID, TenBaiDay, Loai, NoiDung]);

        res.status(201).json({ 
            message: "Lưu thành công!", 
            id: result.insertId 
        });
    } catch (error) {
        console.error("Lỗi MySQL:", error);
        res.status(500).json({ error: "Không thể lưu vào cơ sở dữ liệu." });
    }
});

export default router;
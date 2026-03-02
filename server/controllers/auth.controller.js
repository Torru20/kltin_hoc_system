import admin from '../config/firebase-admin.js'; // <-- Cần thêm .js
import jwt from 'jsonwebtoken';
import { getUserByGoogleId, createUser } from '../models/user.model.js'; 
import dotenv from 'dotenv'; // Thêm nếu chưa có
dotenv.config();

//const admin = require('../config/firebase-admin');
//const jwt = require('jsonwebtoken');

// Giả định bạn có một lớp DB/model để tương tác với MySQL
//const db = require('../models/db'); // Cần tạo lớp tương tác CSDL sau
const JWT_SECRET = process.env.JWT_SECRET; 
const JWT_EXPIRES_IN = '1d';
export const verifyTokenAndLogin = async (req, res) => {
    try {
        // 1. Thu nhận Token từ Header
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            return res.status(401).json({ message: 'Không tìm thấy Firebase ID Token.' });
        }

        // 2. Xác minh Token bằng Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name } = decodedToken;

        // 3. Kiểm tra/Tạo user trong CSDL (NGUOI_DUNG)
        let user = await getUserByGoogleId(uid);

        if (!user) {
            // Đăng ký lần đầu: Tạo người dùng mới
            const defaultRole = 'GV'; 
            const newUserId = await createUser({ // <--- SỬ DỤNG HÀM TỪ MODEL
                Google_ID: uid,
                Email: email,
                HoTen: name || email, 
                VaiTro: defaultRole
            });
            // Lấy lại thông tin user đã tạo để tạo token
            user = { ID_NguoiDung: newUserId, VaiTro: defaultRole, Email: email };
            console.log(`[AUTH] User created: ${newUserId}`);
        }
        
        // Kiểm tra trạng thái nếu cần
        if (user.TrangThai === 'Banned') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
        }

        // 4. Tạo Custom JWT (Session Token) nội bộ
        const sessionToken = jwt.sign(
            { id: user.ID_NguoiDung, role: user.VaiTro, email: user.Email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 5. Phản hồi thành công
        res.status(200).json({
            success: true, // Thêm success để FE dễ kiểm tra
            message: 'Xác thực thành công.',
            user: {
                id: user.ID_NguoiDung,  // Đảm bảo trường này là 'id'
                email: user.Email,
                role: user.VaiTro,
                name: user.HoTen 
            },
            sessionToken: sessionToken
        });
    } catch (error) {
        console.error("Lỗi xác minh token:", error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }
        res.status(500).json({ message: 'Lỗi máy chủ trong quá trình xác thực.' });
    }
};
import jwt from 'jsonwebtoken';
import { getUserById } from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
    let token;

    // 1. Kiểm tra Token trong Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Truy cập bị từ chối: Không có Session Token.' });
    }

    try {
        // 2. Giải mã và Xác minh Token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. Tìm thông tin user trong CSDL (Tùy chọn, để đảm bảo user không bị xóa)
        req.user = await getUserById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ message: 'Token không hợp lệ: Người dùng không tồn tại.' });
        }

        // 4. Lưu thông tin quan trọng vào request
        // Các controller nghiệp vụ sẽ truy cập: req.user.ID_NguoiDung, req.user.VaiTro
        next();

    } catch (error) {
        // Lỗi Token không hợp lệ (hết hạn, sai chữ ký)
        console.error("Lỗi xác minh JWT:", error.message);
        res.status(401).json({ message: 'Session Token không hợp lệ hoặc đã hết hạn.' });
    }
};

// Hàm tùy chọn để kiểm tra vai trò (cho Admin)
export const authorizeRoles = (requiredRole) => {
    return (req, res, next) => {
        if (req.user.VaiTro !== requiredRole) {
            return res.status(403).json({ 
                message: `Quyền truy cập bị từ chối. Chỉ ${requiredRole} mới được phép.` 
            });
        }
        next();
    };
};
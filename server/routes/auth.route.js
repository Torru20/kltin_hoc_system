// routes/authRoutes.js
import express from 'express';
import { loginOrRegister, loginManual, registerManual, getUserProfile, 
    changePassword,   updatePassword,
    linkGoogleAccount  } from '../controllers/userController.js';
import verifyFirebaseToken from '../middleware/authMiddleware.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();

// Đăng ký (Manual) -> gọi đến http://localhost:5000/api/auth/register
router.post('/register', registerManual);

// Đăng nhập (Manual) -> gọi đến http://localhost:5000/api/auth/login-manual
router.post('/login-manual', loginManual);

// Đăng nhập (Google)
router.post('/login', verifyFirebaseToken, loginOrRegister);
// --- NHÓM ROUTE BẢO MẬT (Phải đăng nhập mới dùng được) ---

// Lấy thông tin cá nhân và danh sách giáo án/ma trận
// Sử dụng :userId làm tham số động trên URL
router.get('/profile/:userId', protect, getUserProfile);

// Đổi mật khẩu
router.post('/change-password', protect, changePassword);
router.post('/update-password', protect, updatePassword);

// Liên kết tài khoản Google cho người dùng đăng nhập bằng Email/Pass
// Cần verifyFirebaseToken để lấy thông tin từ Google và protect để biết user hiện tại là ai
// routes/auth.route.js

// Luồng: Xác thực Google (lấy UID) -> Kiểm tra đăng nhập hệ thống -> Thực hiện liên kết
router.post('/link-google', verifyFirebaseToken, linkGoogleAccount);
export default router;
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import bcrypt from 'bcrypt';

// Hàm bổ trợ tạo Token để dùng chung cho cả 2 kiểu login
const generateToken = (user) => {
    return jwt.sign(
        { id: user.UserID, email: user.Email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '1d' }
    );
};

// --- ĐĂNG NHẬP GOOGLE ---
export const loginOrRegister = async (req, res) => {
    const { email, name, uid } = req.user; 
    try {
        const [rows] = await db.execute('SELECT * FROM NGUOIDUNG WHERE GoogleID = ? OR Email = ?', [uid, email]);

        let user;
        if (rows.length > 0) {
            user = rows[0];
            if (!user.GoogleID) {
                await db.execute('UPDATE NGUOIDUNG SET GoogleID = ? WHERE UserID = ?', [uid, user.UserID]);
                user.GoogleID = uid;
            }
        } else {
            const [result] = await db.execute(
                'INSERT INTO NGUOIDUNG (GoogleID, Email, Hoten, Vaitro, TrangThai) VALUES (?, ?, ?, "GiaoVien", 1)',
                [uid, email, name || 'Người dùng Google']
            );
            const [newUser] = await db.execute('SELECT * FROM NGUOIDUNG WHERE UserID = ?', [result.insertId]);
            user = newUser[0];
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            token: token,
            user: {
                id: user.UserID,      // Frontend cần 'id'
                UserID: user.UserID,  // Dự phòng
                Hoten: user.Hoten,
                Email: user.Email,
                //isGGAccount: user.MatKhau === null || 
                isGGAccount: user.GoogleID !== null,
                // KIỂM TRA THỰC TẾ: Nếu MatKhau có giá trị thì là true, ngược lại false
                hasPassword: user.MatKhau ? true : false
            }
        });
    } catch (error) {
        console.error("❌ Lỗi Google Login:", error);
        return res.status(500).json({ success: false, error: "Lỗi hệ thống" });
    }
};

// --- ĐĂNG NHẬP THỦ CÔNG (Cần sửa chỗ này) ---
// --- TRONG userController.js ---

export const loginManual = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute("SELECT * FROM NGUOIDUNG WHERE Email = ?", [email]);

        if (rows.length > 0) {
            const user = rows[0];
            
            // 1. Kiểm tra mật khẩu
            const isMatch = await bcrypt.compare(password, user.MatKhau);
            if (isMatch) {
                // 2. TẠO TOKEN NGAY TẠI ĐÂY
                const token = jwt.sign(
                    { id: user.UserID, email: user.Email },
                    process.env.JWT_SECRET || 'your_jwt_secret',
                    { expiresIn: '1d' }
                );

                // 3. TRẢ VỀ CẢ TOKEN VÀ USER
                console.log("✅ Đăng nhập OK, đã tạo Token cho:", user.Email);
                return res.json({ 
                    success: true,
                    token: token, // Đây chính là Session Token
                    user: { 
                        id: user.UserID,
                        Hoten: user.Hoten, 
                        Email: user.Email,
                        // Nếu họ có GoogleID thì là true, không thì false
                        isGGAccount: user.GoogleID ? true : false,
                        // Đã login manual thì chắc chắn phải có mật khẩu
                        hasPassword: true
                    } 
                });
            } else {
                return res.status(401).json({ error: "Sai mật khẩu!" });
            }
        } else {
            return res.status(404).json({ error: "Email không tồn tại!" });
        }
    } catch (error) {
        console.error("❌ Lỗi Login Manual:", error);
        return res.status(500).json({ error: "Lỗi hệ thống" });
    }
};

// --- ĐĂNG KÝ ---
export const registerManual = async (req, res) => {
    const { hoten, email, password } = req.body;
    try {
        const [rows] = await db.execute("SELECT Email FROM NGUOIDUNG WHERE Email = ?", [email]);
        if (rows.length > 0) return res.status(400).json({ error: "Email này đã được đăng ký!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO NGUOIDUNG (Hoten, Email, MatKhau, Vaitro, TrangThai, NgayTao) VALUES (?, ?, ?, 'GiaoVien', 1, NOW())";
        await db.execute(sql, [hoten, email, hashedPassword]);

        return res.json({ success: true, message: "Đăng ký tài khoản thành công!" });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống khi đăng ký" });
    }
};

// --- LẤY THÔNG TIN PROFILE ---
export const getUserProfile = async (req, res) => {
    const userId = req.params.userId;
    try {
        const [users] = await db.execute(
            'SELECT UserID, GoogleID, Email, Hoten, Vaitro, NgayTao FROM NGUOIDUNG WHERE UserID = ?', 
            [userId]
        );

        if (users.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

        const [khbd] = await db.execute(
            `SELECT k.MaKHBD, p.TenBai, k.GhiChu FROM KHBD k 
             LEFT JOIN PHANPHOISGK p ON k.MaPhanPhoi = p.MaPhanPhoi 
             WHERE k.UserID = ?`, [userId]
        );

        const [mtkt] = await db.execute('SELECT * FROM MTKT WHERE UserID = ?', [userId]);

        return res.json({
            success: true,
            user: users[0],
            listKHBD: khbd || [],
            listMTKT: mtkt || []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- ĐỔI MẬT KHẨU ---
export const changePassword = async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    
    // Log để kiểm tra ID gửi lên
    console.log("--- Yêu cầu đổi pass cho UserID:", userId, "---");

    try {
        // Dùng đúng cú pháp [rows] mà hàm loginManual đang dùng thành công
        const [rows] = await db.execute("SELECT * FROM NGUOIDUNG WHERE UserID = ?", [userId]);

        if (rows.length === 0) {
            console.log("❌ Không tìm thấy UserID:", userId);
            return res.status(404).json({ success: false, message: "Tài khoản không tồn tại!" });
        }

        const user = rows[0];
        

        // 1. Kiểm tra mật khẩu hiện tại (So sánh với $2b$10... trong ảnh của bạn)
        const isMatch = await bcrypt.compare(oldPassword, user.MatKhau);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Mật khẩu hiện tại không chính xác!" });
        }

        // 2. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Cập nhật mật khẩu mới vào DB
        const [updateResult] = await db.execute(
            "UPDATE NGUOIDUNG SET MatKhau = ? WHERE UserID = ?",
            [hashedPassword, userId]
        );

        if (updateResult.affectedRows > 0) {
            console.log("✅ Đổi mật khẩu thành công cho ID:", userId);
            return res.json({ success: true, message: "Đổi mật khẩu thành công!" });
        } else {
            return res.status(500).json({ success: false, message: "Không thể cập nhật mật khẩu!" });
        }

    } catch (error) {
        console.error("❌ Lỗi API ChangePassword:", error);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
};

// --- LIÊN KẾT GOOGLE ---
export const linkGoogleAccount = async (req, res) => {
    const googleUid = req.user.uid; // Lấy từ middleware verifyFirebaseToken
    const { userId } = req.body;

    try {
        // 1. Kiểm tra xem GoogleID này đã bị tài khoản khác sử dụng chưa
        const [existing] = await db.execute(
            'SELECT UserID FROM NGUOIDUNG WHERE GoogleID = ?', 
            [googleUid]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Tài khoản Google này đã được liên kết với một người dùng khác." 
            });
        }

        // 2. Cập nhật GoogleID cho user hiện tại
        const [result] = await db.execute(
            'UPDATE NGUOIDUNG SET GoogleID = ? WHERE UserID = ?', 
            [googleUid, userId]
        );

        if (result.affectedRows > 0) {
            return res.json({ 
                success: true, 
                message: "Liên kết tài khoản Google thành công!" 
            });
        } else {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }
    } catch (error) {
        console.error("Lỗi Link Google:", error);
        res.status(500).json({ success: false, error: "Lỗi hệ thống" });
    }
};

//tạo mật khẩu cho tk google
export const updatePassword = async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
        const [rows] = await db.execute("SELECT MatKhau FROM NGUOIDUNG WHERE UserID = ?", [userId]);
        const user = rows[0];

        // Nếu DB đã có pass, bắt buộc phải có oldPassword để so khớp
        if (user.MatKhau !== null) {
            const isMatch = await bcrypt.compare(oldPassword, user.MatKhau);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Mật khẩu cũ không chính xác" });
            }
        }

        // Cập nhật pass mới
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE NGUOIDUNG SET MatKhau = ? WHERE UserID = ?", [hashed, userId]);

        // QUAN TRỌNG: Nếu đây là lần đầu đặt pass, báo Frontend cập nhật lại isGGAccount
        return res.json({ 
            success: true, 
            message: "Thành công!",
            isNowNormal: true // Trả về để Client biết giờ đã thành tài khoản thường
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
};
// Đổi từ db.config.js sang file db.js mà chúng ta đã thống nhất sửa lúc nãy
import db from '../config/db.js'; 

// 1. Tìm người dùng bằng GoogleID
export const getUserByGoogleId = async (googleId) => {
    // Đổi 'pool.query' thành 'db.query' (vì db là bản promise chúng ta export default)
    const [rows] = await db.query(
        'SELECT UserID, Email, Vaitro, Hoten, TrangThai FROM NGUOIDUNG WHERE GoogleID = ?',
        [googleId]
    );
    return rows[0];
};

// 2. Tạo người dùng mới
export const createUser = async ({ GoogleID, Email, Hoten, Vaitro }) => {
    const [result] = await db.query(
        'INSERT INTO NGUOIDUNG (GoogleID, Email, Hoten, Vaitro, TrangThai, NgayTao) VALUES (?, ?, ?, ?, 1, NOW())',
        [GoogleID, Email, Hoten, Vaitro || 'GiaoVien']
    );
    return result.insertId;
};

// 3. Tìm người dùng bằng ID
export const getUserById = async (id) => {
    const [rows] = await db.query(
        'SELECT UserID, Email, Vaitro, Hoten FROM NGUOIDUNG WHERE UserID = ?',
        [id]
    );
    return rows[0]; 
};
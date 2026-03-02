import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// 1. Tạo Pool gốc (Hỗ trợ Callback - Dùng cho các API cũ)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 50,      // Tăng từ 10 lên 50 để tải được nhiều API cùng lúc
    queueLimit: 0,            // Không giới hạn hàng đợi
    connectTimeout: 30000,    // Tăng thời gian chờ kết nối lên 30s
    acquireTimeout: 30000,    // Tăng thời gian chờ lấy kết nối từ pool
    enableKeepAlive: true,    // Giữ kết nối luôn nóng
    keepAliveInitialDelay: 10000
});

// 2. Tạo bản Promise (Dùng cho API Đăng nhập và Profile đang dùng async/await)
const db = pool.promise();

// Kiểm tra kết nối
pool.getConnection((err, conn) => {
    if (err) {
        console.error("❌ Lỗi kết nối TiDB:", err.message);
    } else {
        console.log("🚀 TiDB Cloud đã thông suốt (Cả Callback & Promise)!");
        conn.release();
    }
});

// 3. XUẤT CẢ HAI
// Xuất mặc định là db (bản Promise) để không làm hỏng file Login/Profile
export default db; 

// Xuất thêm pool (bản Callback) để dùng cho các API cũ
export { pool };
import mysql from 'mysql2/promise'; // Sử dụng promise để dễ dàng dùng async/await
import dotenv from 'dotenv';
dotenv.config();

// Cấu hình kết nối MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ten_csdl_cua_ban', // THAY THẾ TÊN CSDL
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
// server/config/firebase-admin.js

// 1. Dùng lệnh require() để import JSON một cách an toàn
// Node.js luôn hỗ trợ require() cho JSON, kể cả trong ES Module context.
import admin from 'firebase-admin'; 
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const serviceAccount = require('../serviceAccountKey.json'); // <--- SỬA THÀNH require()

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Chuyển sang export default
export default admin;
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Khởi tạo Firebase Admin (chỉ làm 1 lần)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyFirebaseToken = async (req, res, next) => {
  
  const idToken = req.headers.authorization?.split(' ')[1];

  if (!idToken) {
    return res.status(401).json({ message: "Không tìm thấy Token xác thực!" });
  }

  try {
    // Giải mã Token từ Firebase gửi lên
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Lưu thông tin User vào request để Controller dùng
    next(); // Cho phép đi tiếp vào Controller
  } catch (error) {
    res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = verifyFirebaseToken;
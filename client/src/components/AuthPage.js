import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Link,
  CircularProgress, Alert
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../AuthContext';
import { GoogleAuthProvider } from "firebase/auth";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hoten, setHoten] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { login } = useAuth();

  // ------------------------------------------------------------------
  // HÀM GỌI BACKEND THẬT: Gửi Token qua Node.js để lưu vào MySQL
  // ------------------------------------------------------------------
  // file: src/pages/AuthPage.js (Tìm đến hàm sendTokenToBackend)

const sendTokenToBackend = async (idToken) => {
  try {
    const response = await fetch('https://kltin-hoc-system.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && (data.success || data.user)) {
      // 1. Lưu token phiên làm việc
      localStorage.setItem('token', data.token);

      // 2. Lưu các thông tin định danh
      const userId = data.user.id || data.user.UserID;
      if (userId) {
        localStorage.setItem('userId', String(userId));
      }

      // 3. QUAN TRỌNG: Lưu trạng thái mật khẩu từ Backend trả về
      // data.user.isGGAccount sẽ là true (vì đây là luồng Google)
      // data.user.hasPassword sẽ là true/false tùy vào việc họ đã đặt pass chưa
      localStorage.setItem('isGGAccount', String(data.user.isGGAccount));
      localStorage.setItem('hasPassword', String(data.user.hasPassword));

      // 4. Đồng bộ với Context Auth
      login({ user: data.user }); 

      setMessage('Đăng nhập Google thành công!');
    } else {
      setError(data.message || data.error || 'Lỗi xác thực Google từ Server');
    }
  } catch (err) {
    console.error('Lỗi:', err);
    setError('Không thể kết nối tới Server khi đăng nhập Google.');
  }
};

  // ... (Phần handleSubmit 
 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setMessage('');

  if (isLogin) {
    // --- LUỒNG ĐĂNG NHẬP THỦ CÔNG ---
    try {
      const response = await fetch('https://kltin-hoc-system.onrender.com/api/auth/login-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', String(data.user.id));
        
        // Với đăng nhập thủ công:
        // isGGAccount: có thể true hoặc false (tùy họ có liên kết Google không)
        // hasPassword: CHẮC CHẮN là true
        localStorage.setItem('isGGAccount', String(data.user.isGGAccount));
        localStorage.setItem('hasPassword', 'true'); 

        login({ user: data.user });
        setMessage('Đăng nhập thành công!');
      } else {
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối tới Server.');
    } finally {
      setLoading(false);
    }
  } else {
    // --- LUỒNG ĐĂNG KÝ ---
    try {
      const response = await fetch('https://kltin-hoc-system.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoten, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Đăng ký thành công! Hãy chuyển sang Đăng nhập.');
        setIsLogin(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Lỗi kết nối server.');
    } finally {
      setLoading(false);
    }
  }
};

  /*const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setMessage('Đăng nhập Google thành công! Đang kiểm tra tài khoản...');

      const idToken = await result.user.getIdToken();
      await sendTokenToBackend(idToken); // <--- Gọi hàm thật

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };*/
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // 1. Thêm Scope trước khi mở Popup
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, googleProvider);
      
      // 2. Lấy Access Token từ Google để gọi Drive API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const driveToken = credential.accessToken;
      
      if (driveToken) {
        localStorage.setItem('google_drive_token', driveToken);
      }

      setMessage('Đăng nhập Google thành công! Đang kiểm tra tài khoản...');

      const idToken = await result.user.getIdToken();
      await sendTokenToBackend(idToken);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    // ... (Giữ nguyên phần UI MUI phía dưới)
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
          {isLogin ? 'Đăng nhập' : 'Đăng ký'}
        </Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {/* Chỉ hiện ô Họ tên nếu đang ở chế độ Đăng ký */}
          {!isLogin && (
            <TextField
              margin="normal" required fullWidth label="Họ và tên"
              value={hoten} onChange={(e) => setHoten(e.target.value)}
              autoFocus
            />
          )}
          <TextField
            margin="normal" required fullWidth id="email" label="Địa chỉ Email"
            name="email" value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal" required fullWidth name="password" label="Mật khẩu"
            type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </Button>
          <Button
            fullWidth variant="outlined" onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon />} sx={{ mb: 2 }} disabled={loading}
          >
            Đăng nhập với Google
          </Button>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault(); // Ngăn chặn hành vi mặc định của link
              
              // Xóa sạch thông báo trước khi chuyển đổi giao diện
              setError('');
              setMessage('');
              setHoten('');
              setEmail('');
              setPassword('');

              // Sau đó mới chuyển giao diện
              setIsLogin((prev) => !prev);
            }}
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;
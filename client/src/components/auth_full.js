import React, { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Link,
  CircularProgress, Alert
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ĐÃ SỬA: Đặt useAuth() bên trong thân component
  const { login } = useAuth();

  // Hàm gửi token về backend và xử lý đăng nhập cuối cùng
  const sendTokenToBackend = async (idToken) => {
    try {
      const response = await fetch('/api/auth/verify', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Lỗi từ backend khi xác minh token.');
      }

      const data = await response.json(); // Data chứa { user: {...}, sessionToken: 'JWT' }
      
      // GỌI HÀM LOGIN TỪ CONTEXT: Lưu trạng thái và chuyển hướng
      login(data); 

    } catch (backendError) {
      console.error('Lỗi gửi token đến backend:', backendError.message);
      setError('Lỗi xác thực với máy chủ: ' + backendError.message);
      // Ném lỗi ra ngoài để khối finally biết không cần chuyển trạng thái
      throw backendError; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setMessage('Đăng nhập Firebase thành công!');
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Đăng ký Firebase thành công! Đang xác thực với máy chủ...');
      }
      
      // GỌI BACKEND: Lấy ID Token và xác minh
      const idToken = await userCredential.user.getIdToken();
      await sendTokenToBackend(idToken);
      
    } catch (err) {
      // Bắt lỗi từ Firebase HOẶC từ sendTokenToBackend
      console.error('Lỗi Xác thực:', err.message);
      if (!error) { // Nếu error chưa được set bởi sendTokenToBackend (trường hợp lỗi Firebase)
         setError(err.message);
      }
    } finally {
      // Dù thành công hay thất bại, đều ngừng loading
      setLoading(false); 
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setMessage('Đăng nhập bằng Google thành công! Đang xác thực với máy chủ...');

      // GỌI BACKEND: Lấy ID Token và xác minh
      const idToken = await result.user.getIdToken();
      await sendTokenToBackend(idToken);

    } catch (err) {
      // Bắt lỗi từ Firebase HOẶC từ sendTokenToBackend
      console.error('Lỗi đăng nhập Google:', err.message);
      if (!error) { // Nếu error chưa được set bởi sendTokenToBackend (trường hợp lỗi Firebase)
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... (Phần UI giữ nguyên)
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
          {isLogin ? 'Đăng nhập' : 'Đăng ký'}
        </Typography>
        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{message}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Địa chỉ Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Mật khẩu"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon />}
            sx={{ mb: 2 }}
            disabled={loading}
          >
            Đăng nhập với Google
          </Button>
          <Link
            component="button"
            variant="body2"
            onClick={() => setIsLogin(!isLogin)}
            sx={{ display: 'block', textAlign: 'center' }}
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;
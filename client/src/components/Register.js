import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Card, CardContent, Alert } from '@mui/material';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ hoten: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
    }

    try {
      const response = await fetch('https://kltin-hoc-system.onrender.com/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoten: formData.hoten,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setFormData({ hoten: '', email: '', password: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể kết nối server' });
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Card sx={{ width: 400, p: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserPlus /> Đăng ký tài khoản
          </Typography>

          {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

          <form onSubmit={handleRegister}>
            <TextField
              fullWidth label="Họ và tên" sx={{ mb: 2 }} required
              value={formData.hoten}
              onChange={(e) => setFormData({...formData, hoten: e.target.value})}
            />
            <TextField
              fullWidth label="Email" type="email" sx={{ mb: 2 }} required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            <TextField
              fullWidth label="Mật khẩu" type="password" sx={{ mb: 2 }} required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <TextField
              fullWidth label="Xác nhận mật khẩu" type="password" sx={{ mb: 3 }} required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
            <Button fullWidth variant="contained" color="primary" type="submit" size="large">
              Đăng ký ngay
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
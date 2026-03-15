import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import './App.css';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'; // Thêm CssBaseline

// Import các components của bạn
import Home from './components/Home';
import LessonPlanForm from './components/LessonPlanForm';
import SoHoaPDF from './components/SoHoaPDF';
import SoHoaKHBD from "./components/SoHoaKHBD";
import AuthPage from './components/AuthPage';
import { AuthProvider, useAuth } from './AuthContext';
import LessonPlanEditor from './components/LessonPlanEditor';
//import MatrixEditor from './components/MatrixEditor';
import KnowledgeAlignment from './components/KnowledgeAlignment';
import FullMatrixSpec from './components/ExamDesign';
import ExamList from './components/ExamList';
import ProfilePage from './components/ProfilePage';
const theme = createTheme({
  palette: {
    primary: {
      main: '#001e3c', // Xanh Navy
      contrastText: '#ffffff',
    },
    background: {
      default: '#fcfaf5', // Trắng kem sáng
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2027',
      secondary: '#475467',
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
  },
});

// ... các phần import giữ nguyên

function MainAppContent() {
  const { isLoggedIn, logout, user } = useAuth();

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* fixed="top" giúp thanh nav luôn cố định ở đầu trang khi cuộn */}
      <Navbar 
        bg="primary" 
        variant="dark" 
        expand="lg" 
        fixed="top" 
        className="shadow-sm py-2"
        style={{ zIndex: 1050 }}
      >
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold">
            KLTN 2026
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto ms-lg-3">
              <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
              
              {/* Nhóm chức năng SOẠN THẢO */}
              <Nav.Dropdown title="Soạn thảo" id="nav-soan-thao">
                <Nav.Dropdown.Item as={Link} to="/editor-lesson">
                  Kế hoạch bài dạy (AI)
                </Nav.Dropdown.Item>
                <Nav.Dropdown.Item as={Link} to="/matrankiemtrafull">
                  Ma trận kiểm tra
                </Nav.Dropdown.Item>
              </Nav.Dropdown>

              {/* Nhóm chức năng TRA CỨU */}
              <Nav.Dropdown title="Tra cứu" id="nav-tra-cuu">
                <Nav.Dropdown.Item as={Link} to="/exams">
                  Danh sách bài kiểm tra
                </Nav.Dropdown.Item>
                <Nav.Dropdown.Item as={Link} to="/knowledge">
                  Đường liên thông tri thức
                </Nav.Dropdown.Item>
                
              </Nav.Dropdown>

              
            </Nav>

            <Nav className="ms-auto align-items-center">
              {isLoggedIn ? (
                /* Nhóm TÀI KHOẢN nằm bên phải */
                <Nav.Dropdown 
                  title={<span><i className="bi bi-person-circle me-1"></i> {user?.displayName || 'Tài khoản'}</span>} 
                  id="nav-account" 
                  align="end"
                >
                  <Nav.Dropdown.Item as={Link} to="/profile-page">
                    Thông tin cá nhân
                  </Nav.Dropdown.Item>
                  <Nav.Dropdown.Divider />
                  <Nav.Dropdown.Item onClick={logout} className="text-danger">
                    Đăng xuất
                  </Nav.Dropdown.Item>
                </Nav.Dropdown>
              ) : (
                <Nav.Link as={Link} to="/auth">Đăng nhập</Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* CỰC KỲ QUAN TRỌNG: 
          Thêm padding-top 80px để nội dung không bị Navbar che mất (vì Navbar đang fixed) */}
      <Container className="flex-grow-1" style={{ marginTop: '80px', marginBottom: '40px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile-page" element={<ProfilePage />} />
          <Route path="/editor-lesson" element={<LessonPlanEditor />} />
          <Route path="/exams" element={<ExamList />} />
          <Route path="/matrankiemtrafull" element={<FullMatrixSpec />} />
          <Route path="/knowledge" element={<KnowledgeAlignment />} />
          <Route path="/sohoa_khbd" element={<SoHoaKHBD />} />
          {/* Các route khác nếu có... */}
        </Routes>
      </Container>

      <footer className="text-center text-muted py-4 border-top bg-white">
        © 2026 - Dự án Hệ thống Quản lý Giáo dục
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline giúp reset CSS và áp dụng màu nền background.default (trắng kem) lên toàn bộ body */}
      <CssBaseline /> 
      <AuthProvider>
          <Router>
              <MainAppContent />
          </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;





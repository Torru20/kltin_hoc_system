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

function MainAppContent() {
  const { isLoggedIn, logout, user, loading } = useAuth();

  if (loading) return <Container className="text-center mt-5"><p>Đang tải...</p></Container>;
  if (!isLoggedIn) return <AuthPage />;

  return (
    // Sử dụng style inline hoặc class để ép Bootstrap Navbar theo màu Navy của MUI
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        expand="lg" 
        variant="dark" 
        style={{ backgroundColor: '#001e3c', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Container maxWidth="xl">
          <Navbar.Brand as={Link} to="/" style={{ fontWeight: 800 }}>
            🧠 Số hóa KHBD & Ma trận
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
              <Nav.Link as={Link} to="/profile-page">Profile</Nav.Link>
              <Nav.Link as={Link} to="/editor-lesson">Soạn KHBD</Nav.Link>
              
              <Nav.Link as={Link} to="/exams">Xem List</Nav.Link>
              <Nav.Link as={Link} to="/matrankiemtrafull">Tạo bài kiểm tra</Nav.Link>
              <Nav.Link as={Link} to="/knowledge">Tra cứu tri thức</Nav.Link>
            </Nav>
            <Nav className="align-items-center">
                <Navbar.Text className="me-3 text-white">
                    Xin chào, <span style={{ color: '#ffd700' }}>{user?.Hoten || user?.email}</span>
                </Navbar.Text>
                <Button 
                    variant="outline-light" 
                    size="sm" 
                    onClick={logout}
                    style={{ borderRadius: '8px', fontWeight: 'bold' }}
                >
                    Đăng xuất
                </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Container chính */}
      <Container className="mt-4 flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile-page" element={<ProfilePage />} />
          <Route path="/editor-lesson" element={<LessonPlanEditor />} />
          <Route path="/exams" element={<ExamList />} />
          <Route path="/matrankiemtrafull" element={<FullMatrixSpec />} />
          <Route path="/knowledge" element={<KnowledgeAlignment />} />
          <Route path="/lesson" element={<LessonPlanForm />} />
          <Route path="/sohoa" element={<SoHoaPDF />} />
          <Route path="/sohoa_khbd" element={<SoHoaKHBD />} />
        </Routes>
      </Container>

      <footer className="text-center text-muted" style={{ mt: 'auto', py: 4, borderTop: '1px solid #e0e0e0' }}>
        © 2025 - Trần Linh Yến Như | HCMUE
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





import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Button, NavDropdown } from 'react-bootstrap'; // Thêm NavDropdown
import './App.css';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

// Import các components của bạn
import Home from './components/Home';
import LessonPlanForm from './components/LessonPlanForm';
import SoHoaPDF from './components/SoHoaPDF';
import SoHoaKHBD from "./components/SoHoaKHBD";
import AuthPage from './components/AuthPage';
import { AuthProvider, useAuth } from './AuthContext';
import LessonPlanEditor from './components/LessonPlanEditor';
import KnowledgeAlignment from './components/KnowledgeAlignment';
import FullMatrixSpec from './components/ExamDesign';
import ExamList from './components/ExamList';
import ProfilePage from './components/ProfilePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#001e3c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fcfaf5',
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Thêm fixed="top" để cố định thanh Nav.
        2. Giữ nguyên màu Navy #001e3c.
      */}
      <Navbar 
        expand="lg" 
        variant="dark" 
        fixed="top"
        style={{ backgroundColor: '#001e3c', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 1100 }}
      >
        <Container fluid="xl">
          <Navbar.Brand as={Link} to="/" style={{ fontWeight: 800 }}>
             🧠 Số hóa KHBD & Ma trận
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
              
              {/* Nhóm Soạn thảo */}
              <NavDropdown title="Soạn thảo" id="basic-nav-dropdown-soan">
                <NavDropdown.Item as={Link} to="/editor-lesson">Soạn KHBD</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/matrankiemtrafull">Tạo bài kiểm tra</NavDropdown.Item>
              </NavDropdown>

              {/* Nhóm Tra cứu */}
              <NavDropdown title="Tra cứu" id="basic-nav-dropdown-tra">
                <NavDropdown.Item as={Link} to="/exams">Danh sách bài kiểm tra</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/knowledge">Tra cứu tri thức</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/sohoa_khbd">Số hóa KHBD</NavDropdown.Item>
              </NavDropdown>
            </Nav>

            <Nav className="align-items-center">
                {/* Giữ nguyên logic user?.Hoten và Profile */}
                <Nav.Link as={Link} to="/profile-page" className="me-2">
                    Xin chào, <span style={{ color: '#ffd700' }}>{user?.Hoten || user?.email}</span>
                </Nav.Link>
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

      {/* Container chính: 
        Thêm padding-top (pt-5) và margin-top (mt-5) để không bị thanh Nav cố định che mất nội dung 
      */}
      <Container className="flex-grow-1" style={{ marginTop: '80px', marginBottom: '40px' }}>
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

      <footer className="text-center text-muted py-4" style={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
        © 2025 - Trần Linh Yến Như | HCMUE
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
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
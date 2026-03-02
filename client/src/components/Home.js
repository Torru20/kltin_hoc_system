import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { 
  Description, 
  GridOn, 
  ListAlt, 
  AssignmentInd, 
  AutoFixHigh, 
  CloudDownload 
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function Home() {
  const features = [
    {
      title: "Soạn KHBD (CV 5512)",
      icon: <Description sx={{ fontSize: 40, color: '#001e3c' }} />,
      desc: "Hỗ trợ xây dựng Kế hoạch bài dạy chuẩn cấu trúc Công văn 5512. Tích hợp AI gợi ý mục tiêu, thiết bị dạy học và tiến trình dạy học.",
      link: "/editor-lesson",
      buttonText: "Bắt đầu soạn"
    },
    {
      title: "Ma trận & Đặc tả (CV 7991)",
      icon: <GridOn sx={{ fontSize: 40, color: '#001e3c' }} />,
      desc: "Tạo Ma trận và Bản đặc tả đề kiểm tra theo Công văn 7991. Tự động tính toán tỉ lệ phần trăm các mức độ nhận thức.",
      link: "/matrankiemtrafull",
      buttonText: "Tạo Ma trận"
    },
    {
      title: "Đề thi từ Ma trận",
      icon: <AutoFixHigh sx={{ fontSize: 40, color: '#001e3c' }} />,
      desc: "Tạo đề thi dựa trên đúng bố cục ma trận đã thiết lập. Hỗ trợ xuất file Word chuyên nghiệp cho giáo viên.",
      link: "/exams",
      buttonText: "Quản lý đề thi"
    },
    {
      title: "Quản lý & Lưu trữ",
      icon: <AssignmentInd sx={{ fontSize: 40, color: '#001e3c' }} />,
      desc: "Xem lại danh sách KHBD và Ma trận đã soạn trong trang Profile. Dễ dàng chỉnh sửa, tải về hoặc lưu vào Google Drive.",
      link: "/profile-page",
      buttonText: "Vào Profile"
    }
  ];

  return (
    <Container className="py-5">
      {/* Header Giới thiệu */}
      <div className="text-center mb-5">
        <h2 style={{ fontWeight: 800, color: '#001e3c' }}>
          HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
        </h2>
        <p className="text-muted mx-auto" style={{ maxWidth: '700px' }}>
          Công cụ hỗ trợ giáo viên Tin học tối ưu hóa công việc hành chính, 
          tập trung vào chuyên môn giảng dạy với sự hỗ trợ của công nghệ số.
        </p>
      </div>

      {/* Grid Chức năng */}
      <Row className="g-4">
        {features.map((item, index) => (
          <Col key={index} md={6} lg={3}>
            <Card className="h-100 shadow-sm border-0 text-center p-3 hover-card">
              <Card.Body>
                <div className="mb-3">{item.icon}</div>
                <Card.Title style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {item.title}
                </Card.Title>
                <Card.Text className="text-secondary small" style={{ minHeight: '80px' }}>
                  {item.desc}
                </Card.Text>
                <Button 
                  as={Link} 
                  to={item.link} 
                  variant="primary" 
                  className="w-100 mt-3"
                  style={{ backgroundColor: '#001e3c', border: 'none' }}
                >
                  {item.buttonText}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quy trình thực hiện */}
      <Card className="mt-5 border-0 shadow-sm p-4" style={{ backgroundColor: '#f8f9fa' }}>
        <h4 className="mb-4" style={{ fontWeight: 700 }}>🚀 Quy trình thực hiện nhanh</h4>
        <Row>
          <Col md={4} className="mb-3">
            <div className="d-flex align-items-start">
              <div className="badge rounded-circle bg-dark me-3 p-2">1</div>
              <div>
                <h6>Soạn thảo & Gợi ý</h6>
                <p className="small text-muted">Nhập nội dung hoặc dùng AI để gợi ý nhanh các đề mục chuẩn Công văn.</p>
              </div>
            </div>
          </Col>
          <Col md={4} className="mb-3">
            <div className="d-flex align-items-start">
              <div className="badge rounded-circle bg-dark me-3 p-2">2</div>
              <div>
                <h6>Kiểm tra & Xuất bản</h6>
                <p className="small text-muted">Xem trước Ma trận/Đặc tả và xuất file Word (.docx) để nộp chuyên môn.</p>
              </div>
            </div>
          </Col>
          <Col md={4} className="mb-3">
            <div className="d-flex align-items-start">
              <div className="badge rounded-circle bg-dark me-3 p-2">3</div>
              <div>
                <h6>Lưu trữ đám mây</h6>
                <p className="small text-muted">Lưu trực tiếp vào Google Drive cá nhân để sử dụng mọi lúc mọi nơi.</p>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Container>
  );
}

export default Home;
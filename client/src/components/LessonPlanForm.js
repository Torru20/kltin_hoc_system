import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';

function LessonPlanForm() {
  const [formData, setFormData] = useState({
    tenBaiHoc: '',
    lop: '',
    thoiLuong: '',
    giaoVien: '',
    kienThuc: '',
    kyNang: '',
    thaiDo: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('📘 Dữ liệu KHBD đã được lưu tạm!');
    console.log(formData);
  };

  return (
    <Container style={{ marginTop: '30px' }}>
      <Card className="shadow p-4">
        <h3 className="text-center mb-4">🧾 Kế hoạch bài dạy (Công văn 5512)</h3>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên bài học</Form.Label>
                <Form.Control
                  type="text"
                  name="tenBaiHoc"
                  value={formData.tenBaiHoc}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Lớp</Form.Label>
                <Form.Control
                  type="text"
                  name="lop"
                  value={formData.lop}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Thời lượng (tiết)</Form.Label>
                <Form.Control
                  type="number"
                  name="thoiLuong"
                  value={formData.thoiLuong}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Giáo viên phụ trách</Form.Label>
            <Form.Control
              type="text"
              name="giaoVien"
              value={formData.giaoVien}
              onChange={handleChange}
            />
          </Form.Group>

          <hr />

          <Form.Group className="mb-3">
            <Form.Label>Mục tiêu về kiến thức</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="kienThuc"
              value={formData.kienThuc}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mục tiêu về kỹ năng</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="kyNang"
              value={formData.kyNang}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mục tiêu về thái độ</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="thaiDo"
              value={formData.thaiDo}
              onChange={handleChange}
            />
          </Form.Group>

          <div className="text-center mt-4">
            <Button variant="primary" type="submit">
              💾 Lưu KHBD
            </Button>
          </div>
        </Form>
      </Card>
    </Container>
  );
}

export default LessonPlanForm;

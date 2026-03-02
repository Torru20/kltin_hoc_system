import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Typography, Box, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { exportToWordStandard } from '../utils/ExportWordService';

const ExamList = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Lấy danh sách đề thi khi load trang
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/get-exams');
                setExams(res.data);
            } catch (err) {
                console.error("Lỗi fetch danh sách:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    // 2. Hàm xử lý Xuất file Word
    const handleDownload = async (exam) => {
    try {
        const res = await axios.get(`http://localhost:5000/api/get-full-exam-detail/${exam.MaDeThi}`);
        
        const questionsData = res.data.questionsData || []; 
        const header = res.data.header || {};

        if (questionsData.length === 0) {
            alert("Đề thi này chưa có câu hỏi!");
            return;
        }

        const examInfo = {
            subject: header.tenDeThi || exam.TenDeThi || "Môn học",
            grade: exam.Lop || "10", 
            schoolName: "SỞ GIÁO DỤC VÀ ĐÀO TẠO",
            duration: exam.ThoiGian || 45,
            // Đảm bảo object scores luôn đầy đủ các trường để hàm getQPoint không bị NaN
            scores: {
                tnkq: parseFloat(header.scores?.tnkq) || 0,
                dungSai: parseFloat(header.scores?.dungSai) || 0,
                tlNgan: parseFloat(header.scores?.tlNgan) || 0,
                tuLuanNB: parseFloat(header.scores?.tuLuanNB) || 0,
                tuLuanTH: parseFloat(header.scores?.tuLuanTH) || 0,
                tuLuanVD: parseFloat(header.scores?.tuLuanVD) || 0
            }
        };

        // Tham số thứ 3 là false -> Xuất ĐỀ THI
        await exportToWordStandard(questionsData, examInfo, false);
    } catch (err) {
        console.error("Lỗi xuất đề thi:", err);
        alert("Không thể xuất file Word đề thi lúc này.");
    }
};

    // 3. Hàm xử lý Chỉnh sửa (Truyền dữ liệu sang ExamDesign)
    /*const handleEdit = async (exam) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/get-full-exam-detail/${exam.MaDeThi}`);
            
            // Điều hướng và đính kèm dữ liệu vào state của router
            navigate('/matrankiemtrafull', { 
                state: { 
                    initialQuestions: res.data,
                    initialInfo: exam 
                } 
            });
        } catch (err) {
            console.error("Lỗi tải chi tiết:", err);
            alert("Không lấy được chi tiết câu hỏi để chỉnh sửa");
        }
    };*/
    const handleEdit = async (exam) => {
        setLoading(true); // Nếu bạn có state loading trong ExamList
        try {
            // 1. Gọi API lấy chi tiết đề thi (bao gồm cả trường hợp chỉ có khung)
            const res = await axios.get(`http://localhost:5000/api/get-full-exam-detail/${exam.MaDeThi}`);
            
            // 2. Kiểm tra dữ liệu trả về
            if (res.data) {
                // Điều hướng sang trang thiết kế đề thi (ExamDesign)
                navigate('/matrankiemtrafull', { 
                    state: { 
                        // Truyền toàn bộ object chứa { header, questionsData }
                        initialQuestions: res.data, 
                        // Truyền thông tin sơ bộ của đề thi
                        initialInfo: exam 
                    } 
                });
            }
        } catch (err) {
            console.error("Lỗi khi tải chi tiết đề thi:", err);
            // Thông báo lỗi cụ thể cho người dùng
            if (err.response && err.response.status === 404) {
                alert("Không tìm thấy thông tin đề thi hoặc ma trận liên quan.");
            } else {
                alert("Có lỗi xảy ra khi kết nối đến máy chủ. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
        </Box>
    );
    const handleDownloadAnswer = async (exam) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/get-full-exam-detail/${exam.MaDeThi}`);
            
            const questionsData = res.data.questionsData || [];
            const header = res.data.header || {};

            if (questionsData.length === 0) {
                alert("Đề thi này không có dữ liệu để xuất đáp án!");
                return;
            }

            const examInfo = {
                subject: header.tenDeThi || exam.TenDeThi || "Môn học",
                grade: exam.Lop || "10",
                schoolName: "SỞ GIÁO DỤC VÀ ĐÀO TẠO",
                duration: exam.ThoiGian || 45,
                // Đồng nhất cấu trúc scores như hàm trên
                scores: {
                    tnkq: parseFloat(header.scores?.tnkq) || 0,
                    dungSai: parseFloat(header.scores?.dungSai) || 0,
                    tlNgan: parseFloat(header.scores?.tlNgan) || 0,
                    tuLuanNB: parseFloat(header.scores?.tuLuanNB) || 0,
                    tuLuanTH: parseFloat(header.scores?.tuLuanTH) || 0,
                    tuLuanVD: parseFloat(header.scores?.tuLuanVD) || 0
                }
            };

            // Tham số thứ 3 là true -> Xuất ĐÁP ÁN
            await exportToWordStandard(questionsData, examInfo, true);

        } catch (err) {
            console.error("Lỗi xuất đáp án:", err);
            alert("Lỗi xuất file Đáp án. Vui lòng kiểm tra lại dữ liệu.");
        }
    };

    const handleSaveToDrive = async (exam) => {
        try {
            // 1. Lấy dữ liệu từ API
            const res = await axios.get(`http://localhost:5000/api/get-full-exam-detail/${exam.MaDeThi}`);
            const { questionsData, header } = res.data;

            if (!questionsData || questionsData.length === 0) return alert("Không có dữ liệu!");

            // 2. Tạo Blob cho ĐỀ THI (isAnswerMode = false)
            const blobDe = await exportToWordStandard(questionsData, header, false, { getBlob: true });
            
            // 3. Tạo Blob cho ĐÁP ÁN (isAnswerMode = true)
            const blobDapAn = await exportToWordStandard(questionsData, header, true, { getBlob: true });

            // Hàm helper chuyển Blob sang Base64
            const toBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });

            const base64De = await toBase64(blobDe);
            const base64DapAn = await toBase64(blobDapAn);

            // 4. Gửi lên Backend (Gửi mảng hoặc 2 request riêng)
            // Ở đây tôi gửi 1 request chứa cả 2 file để tối ưu
            const uploadRes = await axios.post('http://localhost:5000/api/upload-multiple-to-drive', {
                maDeThi: exam.MaDeThi,
                files: [
                    { 
                        base64: base64De, 
                        name: `De_Thi_${header.tenDeThi || exam.TenDeThi}.docx` 
                    },
                    { 
                        base64: base64DapAn, 
                        name: `Dap_An_${header.tenDeThi || exam.TenDeThi}.docx` 
                    }
                ]
            });

            if (uploadRes.data.success) {
                alert("Đã lưu cả Đề thi và Đáp án lên Google Drive thành công!");
            }
        } catch (err) {
            console.error("Lỗi Drive:", err);
            alert("Hãy đăng nhập bằng tài khoản Google để lưu trữ Drive.");
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1976d2' }}>
                DANH SÁCH ĐỀ THI ĐÃ LƯU
            </Typography>

            {exams.length === 0 ? (
                <Typography variant="body1">Chưa có đề thi nào được tạo hoặc lỗi kết nối CSDL.</Typography>
            ) : (
                <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><b>Tên Đề thi / Ma trận</b></TableCell>
                                <TableCell><b>Ngày tạo</b></TableCell>
                                <TableCell align="center"><b>Thao tác</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {exams.map((exam) => (
                                <TableRow key={exam.MaDeThi} hover>
                                    <TableCell>{exam.TenMaTran}</TableCell>
                                    <TableCell>
                                        {new Date(exam.NgayTao).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button 
                                            size="small"
                                            variant="outlined" 
                                            sx={{ mr: 1 }} 
                                            onClick={() => handleEdit(exam)}
                                        >
                                            Chỉnh sửa đề
                                        </Button>
                                        <Button 
                                            size="small"
                                            variant="contained" 
                                            color="success"
                                            onClick={() => handleDownload(exam)}
                                        >
                                            Tải Word
                                        </Button>
                                        
                                        <Button 
                                            size="small"
                                            variant="contained" 
                                            color="secondary" // Màu tím/hồng để phân biệt với nút Tải đề (màu xanh)
                                            sx={{ ml: 1 }}
                                            onClick={() => handleDownloadAnswer(exam)}
                                        >
                                            Xuất Đáp Án
                                        </Button>
                                        <Button 
                                            size="small"
                                            variant="contained" 
                                            color="secondary" // Màu tím/hồng để phân biệt với nút Tải đề (màu xanh)
                                            sx={{ ml: 1 }}
                                            onClick={() => handleSaveToDrive(exam)}
                                        >
                                            Lưu Drive
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ExamList;
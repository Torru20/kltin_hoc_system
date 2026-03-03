import React, { useEffect, useState, useCallback } from 'react';
import { 
    Container, Grid, Paper, Typography, Avatar, Button, Tabs, Tab, 
    Box, Divider, CircularProgress, Alert, Stack, Chip,
    // Thêm các dòng dưới đây vào:
    Dialog, DialogTitle, DialogContent, DialogActions, TextField 
} from '@mui/material';
import { Assignment, GridOn, Logout, Lock, Visibility, Settings, Google as GoogleIcon, FileDownload,Description} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import { exportToWord7991Direct } from '../utils/ExportWordService';
import { exportKHBDToWord } from '../utils/ExportKHBDService';
import { exportDacTaDirect } from '../utils/ExportDacTa';
import {uploadBlobToDrive} from '../utils/driveService';
import axios from 'axios';
// Thêm icon CloudUpload
import { CloudUpload } from '@mui/icons-material';


// --- 1. CardItem: Giãn 100% theo chiều ngang ---
const CardItem = ({ 
    title, 
    tags, 
    type, 
    onDownload, 
    onDownloadDacTa,
    onSaveDrive,      // Prop cho lưu Drive bản chính
    onSaveDriveDacTa, // Prop cho lưu Drive bản Đặc tả (chỉ MTKT)
    loading, 
    loadingDacTa,
    loadingDrive,     // Loading cho Drive bản chính
    loadingDriveDacTa // Loading cho Drive bản Đặc tả
}) => (
    <Paper 
        variant="outlined" 
        sx={{ 
            p: 2, mb: 1.5, width: '100%', borderRadius: 3, 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderLeft: `6px solid ${type === 'KHBD' ? '#1976d2' : '#2e7d32'}`,
        }}
    >
        <Box sx={{ flexGrow: 1, mr: 2, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight="700" noWrap>
                {title || "Chưa đặt tiêu đề"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {tags && tags.map((tag, i) => (
                    <Chip key={i} label={tag} size="small" variant="soft" sx={{ fontSize: '0.7rem' }} />
                ))}
            </Stack>
        </Box>
        
        <Stack direction="row" spacing={1}>
            {/* NHÓM NÚT BẢN CHÍNH (KHBD hoặc MA TRẬN) */}
            <Stack direction="column" spacing={0.5}>
                <Button 
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FileDownload />} 
                    variant="contained" size="small"
                    onClick={onDownload}
                    disabled={loading || loadingDacTa || loadingDrive}
                    sx={{ borderRadius: 2, fontWeight: 700, minWidth: '120px' }}
                >
                    {loading ? "..." : "XUẤT WORD"}
                </Button>

                <Button 
                    variant="outlined" color="info" size="small"
                    onClick={onSaveDrive}
                    disabled={loading || loadingDrive}
                    startIcon={loadingDrive ? <CircularProgress size={16} /> : <CloudUpload />}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.65rem' }}
                >
                    LƯU DRIVE
                </Button>
            </Stack>

            {/* NHÓM NÚT ĐẶC TẢ (CHỈ HIỆN CHO MTKT) */}
            {type === 'MTKT' && (
                <Stack direction="column" spacing={0.5}>
                    <Button 
                        startIcon={loadingDacTa ? <CircularProgress size={16} color="inherit" /> : <Description />} 
                        variant="outlined" color="secondary" size="small"
                        onClick={onDownloadDacTa}
                        disabled={loading || loadingDacTa || loadingDriveDacTa}
                        sx={{ borderRadius: 2, fontWeight: 700, minWidth: '120px' }}
                    >
                        {loadingDacTa ? "..." : "ĐẶC TẢ"}
                    </Button>
                    
                    <Button 
                        variant="outlined" color="secondary" size="small"
                        onClick={onSaveDriveDacTa}
                        disabled={loadingDacTa || loadingDriveDacTa}
                        startIcon={loadingDriveDacTa ? <CircularProgress size={16} /> : <CloudUpload />}
                        sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.65rem' }}
                    >
                        DRIVE Đ.TẢ
                    </Button>
                </Stack>
            )}
        </Stack>
    </Paper>
);

const ProfilePage = () => {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const {logout } = useAuth();
    
    // Lấy trạng thái từ localStorage (ép kiểu về boolean)
    const isGGAccount = localStorage.getItem('isGGAccount') === 'true' || localStorage.getItem('isGGAccount') === '1';
    const hasPassword = localStorage.getItem('hasPassword') === 'true';

    // Biến này để xác định xem đây là luồng "Thiết lập lần đầu" hay "Đổi mật khẩu"
    const isFirstTimeSetup = isGGAccount && !hasPassword;

    const fetchProfile = useCallback(async () => {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        if (!userId || !token) { setError("Hết hạn phiên."); setLoading(false); return; }
        try {
            const response = await fetch(`https://kltin-hoc-system.onrender.com/api/auth/profile/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setData(result);
            else setError(result.message);
        } catch (err) { setError("Lỗi kết nối."); } finally { setLoading(false); }
    }, []);
    //doi mat khau------------------------------------------------
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: '', success: '' });
    const handleChangePassword = async () => {
        // 1. Lấy thông tin từ localStorage
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        
        // SỬA TẠI ĐÂY: Dùng hasPassword thay vì chỉ dùng isGGAccount
        const isGGAccount = localStorage.getItem('isGGAccount') === 'true';
        const hasPassword = localStorage.getItem('hasPassword') === 'true';

        // 2. Kiểm tra tính hợp lệ cơ bản
        if (!userId || !token) {
            setPasswordStatus({ ...passwordStatus, error: 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại!' });
            return;
        }

        // Kiểm tra khớp mật khẩu mới
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ ...passwordStatus, error: 'Mật khẩu xác nhận không khớp!' });
            return;
        }

        // SỬA LOGIC CHẶN: Chỉ bắt nhập mật khẩu cũ nếu tài khoản ĐÃ CÓ mật khẩu (hasPassword = true)
        if (hasPassword && !passwordData.oldPassword) {
            setPasswordStatus({ ...passwordStatus, error: 'Vui lòng nhập mật khẩu hiện tại!' });
            return;
        }

        if (!passwordData.newPassword) {
            setPasswordStatus({ ...passwordStatus, error: 'Vui lòng nhập mật khẩu mới!' });
            return;
        }

        // 3. Bắt đầu trạng thái Loading
        setPasswordStatus({ ...passwordStatus, loading: true, error: '', success: '' });

        // 4. Chọn đúng Route: Nếu chưa có pass (Google lần đầu) -> update, nếu có rồi -> change
        const apiEndpoint = hasPassword 
            ? 'https://kltin-hoc-system.onrender.com/api/auth/change-password'
            : 'https://kltin-hoc-system.onrender.com/api/auth/update-password';

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: userId,
                    oldPassword: passwordData.oldPassword, 
                    newPassword: passwordData.newPassword
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setPasswordStatus({ 
                    loading: false, 
                    error: '', 
                    success: !hasPassword ? 'Thiết lập mật khẩu thành công!' : 'Đổi mật khẩu thành công!' 
                });

                // CẬP NHẬT QUAN TRỌNG: 
                // Sau khi thành công, chắc chắn tài khoản này đã có mật khẩu trong DB
                localStorage.setItem('hasPassword', 'true');
                
                // GIỮ NGUYÊN isGGAccount là true nếu nó vốn là true (để giữ icon Google)
                // Không nên set isGGAccount thành false ở đây.

                // Đóng Dialog và xóa trắng form sau 1.5s
                setTimeout(() => {
                    setOpenPasswordDialog(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordStatus({ loading: false, error: '', success: '' });
                    // Tùy chọn: reload để cập nhật giao diện Dialog ngay lập tức cho lần mở sau
                    // window.location.reload(); 
                }, 1500);

            } else {
                setPasswordStatus({ 
                    loading: false, 
                    error: result.message || result.error || 'Thao tác thất bại', 
                    success: '' 
                });
            }
        } catch (err) {
            console.error("Lỗi kết nối:", err);
            setPasswordStatus({ 
                loading: false, 
                error: 'Không thể kết nối đến máy chủ', 
                success: '' 
            });
        }
    };
    const handleLinkGoogle = async () => {
        try {
            // 1. Yêu cầu người dùng chọn tài khoản Google
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            const userId = localStorage.getItem('userId');

            // 2. Gửi token lên server để thực hiện liên kết
            const response = await fetch('https://kltin-hoc-system.onrender.com/api/auth/link-google', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}` // Token của Google để BE xác thực UID
                },
                body: JSON.stringify({ userId: userId })
            });

            const data = await response.json();
            if (data.success) {
                alert("Liên kết thành công!");
                window.location.reload(); // Tải lại để cập nhật trạng thái
                
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Lỗi liên kết Google:", error);
            alert("Thao tác thất bại.");
        }
    };
    // Đừng quên import hàm xuất word ở đầu file ProfilePage.js
// import { exportToWord7991Direct } from '../utils/exportWord'; 

    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownloadMatrixWord = async (maMaTran) => {
        setDownloadingId(maMaTran);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`https://kltin-hoc-system.onrender.com/api/export-matrix-word/${maMaTran}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                // BE trả về cấu trúc chuẩn rồi, chỉ việc gọi hàm thôi
                await exportToWord7991Direct(
                    result.header, 
                    result.matrixRows, 
                    result.pointConfig
                );
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (err) {
            alert("Lỗi kết nối máy chủ");
        } finally {
            setDownloadingId(null);
        }
    };
    const handleDownloadKHBD = async (maKHBD) => {
        try {
            const response = await fetch(`https://kltin-hoc-system.onrender.com/api/get-full-khbd/${maKHBD}`);
            const result = await response.json();

            if (result.success) {
                const { info, objectives, activities, processData } = result;
                const combinedText = objectives
                    .filter(o => o.LoaiMucTieu === 'Kiến thức' || o.LoaiMucTieu === '')
                    .map(o => o.NoiDungHienThi)
                    .join("; ");
                // QUAN TRỌNG: Lọc mục tiêu dựa trên cột LoaiMucTieu trong DB
                // ĐỒNG NHẤT DỮ LIỆU: Map từ DB về cấu trúc giống hệt State khi soạn thảo
                const objectivesForWord = {
                    // 1. Kiến thức & NL đặc thù 
                    kienThucText: combinedText,
                    nlucDacThuText: combinedText,
                    // 2. Năng lực chung & Phẩm chất (Service mong đợi mảng Object)
                    // Quan trọng: Phải có thuộc tính 'content' để giống với cấu trúc soạn thảo trực tiếp
                    nangLucChung: objectives
                        .filter(o => o.LoaiMucTieu === 'NangLucChung')
                        .map(o => ({ 
                            content: o.NoiDungHienThi, 
                            checked: true // Đánh dấu true để Service chấp nhận in ra
                        })),
                    
                    phamChat: objectives
                        .filter(o => o.LoaiMucTieu === 'PhamChat')
                        .map(o => ({ 
                            content: o.NoiDungHienThi, 
                            checked: true 
                        }))
                };

                const infoForWord = {
                    baiName: info.baiName,      // Lấy từ formattedInfo của BE
                    lop: info.lop,              // Lấy từ formattedInfo của BE
                    thoiLuong: info.thoiLuong,  // Lấy từ formattedInfo của BE
                    thietBiGV: info.thietBiGV,  // Lấy từ formattedInfo của BE
                    thietBiHS: info.thietBiHS,  // Lấy từ formattedInfo của BE
                    phuLuc: info.phuLuc,        // QUAN TRỌNG: Đây là phần mới đã tách từ Ghi chú
                    fileName: `KHBD_${info.baiName}`
                };

                // Gọi Service dùng chung
                await exportKHBDToWord(infoForWord, objectivesForWord, processData, activities);
            }
        } catch (error) {
            console.error("Lỗi xuất Word:", error);
        }
    };
    const [downloadingDacTaId, setDownloadingDacTaId] = useState(null);
    const handleDownloadDacTa = async (maMaTran) => {
        setDownloadingDacTaId(maMaTran);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`https://kltin-hoc-system.onrender.com/api/dacta/export/${maMaTran}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Thêm cái này cho chuẩn REST
                }
            });

            if (!response.ok) {
                // Nếu server trả về 404 hoặc 500, nó sẽ nhảy vào đây
                const errorData = await response.json();
                throw new Error(errorData.error || `Server báo lỗi ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // ĐẢM BẢO: Các biến header, dacTaRows, pointConfig phải khớp với tên trong res.json của BE
                await exportDacTaDirect(
                    result.header, 
                    result.dacTaRows || result.matrixRows, // "Bảo hiểm": lấy cái nào có dữ liệu
                    result.pointConfig
                );
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (error) {
            console.error("Lỗi chi tiết:", error);
            alert("Không thể tải bản đặc tả: " + error.message);
        } finally {
            setDownloadingDacTaId(null);
        }
    };
    // Thêm state drive vào ProfilePage
    const [loadingDriveStatus, setLoadingDriveStatus] = useState({});

    // Hàm xử lý chung để lưu Drive
    const handleSaveToDrive = async (item, isDacTa = false) => {
        const id = item.MaMaTran || item.MaKHBD;
        const statusKey = `${id}_${isDacTa ? 'dacta' : 'main'}`;
        const token = localStorage.getItem('token');

        setLoadingDriveStatus(prev => ({ ...prev, [statusKey]: true }));

        try {
            let blob;
            let fileName = "";

            // --- TRƯỜNG HỢP 1: KẾ HOẠCH BÀI DẠY (KHBD) ---
            if (item.MaKHBD) {
                const response = await fetch(`https://kltin-hoc-system.onrender.com/api/get-full-khbd/${item.MaKHBD}`);
                const result = await response.json();

                if (result.success) {
                    const { info, objectives, processData, activities } = result;
                    
                    // Map dữ liệu mục tiêu (giống logic handleDownloadKHBD của bạn)
                    const combinedText = objectives
                        .filter(o => o.LoaiMucTieu === 'Kiến thức' || o.LoaiMucTieu === '')
                        .map(o => o.NoiDungHienThi).join("; ");

                    const objectivesForWord = {
                        kienThucText: combinedText,
                        nlucDacThuText: combinedText,
                        nangLucChung: objectives.filter(o => o.LoaiMucTieu === 'NangLucChung').map(o => ({ content: o.NoiDungHienThi, checked: true })),
                        phamChat: objectives.filter(o => o.LoaiMucTieu === 'PhamChat').map(o => ({ content: o.NoiDungHienThi, checked: true }))
                    };

                    const infoForWord = { ...info, fileName: `KHBD_${info.baiName}` };

                    // Gọi hàm lấy Blob (đảm bảo file ExportKHBDService.js đã thêm tham số options)
                    blob = await exportKHBDToWord(infoForWord, objectivesForWord, processData, activities, { getBlob: true });
                    fileName = `KHBD_${info.baiName}.docx`;
                }
            } 
            // --- TRƯỜNG HỢP 2: BẢN ĐẶC TẢ ---
            else if (isDacTa) {
                const response = await axios.get(`https://kltin-hoc-system.onrender.com/api/dacta/export/${item.MaMaTran}`);
                const { header, dacTaRows, pointConfig } = response.data;
                
                // Truyền 4 tham số: header, rows, config, options
                blob = await exportDacTaDirect(header, dacTaRows, pointConfig, { getBlob: true });
                fileName = `Dac_Ta_${header.tenMaTran}.docx`;
            } 
            // --- TRƯỜNG HỢP 3: MA TRẬN KIỂM TRA (MTKT) ---
            else {
                const response = await fetch(`https://kltin-hoc-system.onrender.com/api/export-matrix-word/${item.MaMaTran}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();

                if (result.success) {
                    // Truyền 4 tham số: header, rows, config, options
                    blob = await exportToWord7991Direct(result.header, result.matrixRows, result.pointConfig, { getBlob: true });
                    fileName = `Ma_Tran_${result.header.tenMaTran}.docx`;
                }
            }

            // --- TIẾN HÀNH ĐẨY LÊN DRIVE ---
            if (blob) {
                const success = await uploadBlobToDrive(blob, fileName);
                if (success) console.log("Upload hoàn tất!");
            } else {
                alert("Lỗi: Không lấy được dữ liệu file.");
            }

        } catch (error) {
            console.error("Lỗi Drive:", error);
            alert("Lỗi khi lưu lên Drive: " + error.message);
        } finally {
            setLoadingDriveStatus(prev => ({ ...prev, [statusKey]: false }));
        }
    };
    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    if (error || !data) return <Container sx={{ mt: 5 }}><Alert severity="error">{error}</Alert></Container>;

    const { user, listKHBD, listMTKT } = data;
    //tải ma trận 
    
    
    return (
        <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* CỤM 1: THÔNG TIN NGƯỜI DÙNG (NẰM TRÊN - DÀN NGANG) */}
            <Paper elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', borderRadius: 0, bgcolor: '#fff', pt: 4, pb: 2 }}>
                <Container maxWidth="xl">
                    <Grid container spacing={2} alignItems="center">
                        <Grid item>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: '#1976d2', fontSize: '2rem' }}>
                                {user.Hoten?.charAt(0).toUpperCase()}
                            </Avatar>
                        </Grid>
                        <Grid item xs>
                            <Typography variant="h5" fontWeight="800">{user.Hoten}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={user.Vaitro} size="small" color="primary" sx={{ fontWeight: 600 }} />
                                <Typography variant="body2" color="text.secondary">{user.Email}</Typography>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm="auto">
                            <Stack direction="row" spacing={1}>
                                <Button 
                                    startIcon={<Lock />} 
                                    variant="contained" 
                                    size="small" 
                                    onClick={() => setOpenPasswordDialog(true)}
                                    sx={{ 
                                        borderRadius: '8px',
                                        bgcolor: '#ffffff', 
                                        color: '#3c4043', 
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        border: '1px solid #dadce0',
                                        boxShadow: 'none',
                                        '&:hover': {
                                            bgcolor: '#f8f9fa',
                                            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.30), 0 1px 3px 1px rgba(60,64,67,0.15)',
                                            border: '1px solid #d2d2d2',
                                        },
                                        '& .MuiButton-startIcon': {
                                            color: '#5f6368' // Màu xám icon đặc trưng
                                        }
                                    }}
                                >
                                    {hasPassword ? "Đổi mật khẩu" : "Thêm mật khẩu"}
                                </Button>
                                {/* Chỉ hiện nếu User chưa liên kết Google */}
                                {!user.GoogleID && (
                                    <Button 
                                        variant="contained" 
                                        startIcon={<GoogleIcon />}
                                        onClick={handleLinkGoogle}
                                        sx={{ 
                                            mt: 1, 
                                            ml: 1, 
                                            borderRadius: '8px',
                                            bgcolor: '#ffffff', // Nền trắng
                                            color: '#3c4043',    // Chữ xám đậm Google
                                            textTransform: 'none', // Không viết hoa toàn bộ
                                            fontWeight: 600,
                                            border: '1px solid #dadce0', // Viền xám nhạt
                                            boxShadow: 'none', 
                                            '&:hover': {
                                                bgcolor: '#f8f9fa', // Màu khi di chuột vào
                                                boxShadow: '0 1px 2px 0 rgba(60,64,67,0.30), 0 1px 3px 1px rgba(60,64,67,0.15)',
                                                border: '1px solid #d2d2d2',
                                            },
                                            // Làm cho Icon Google có màu xanh thương hiệu
                                            '& .MuiButton-startIcon': {
                                                color: '#4285F4' 
                                            }
                                        }}
                                    >
                                        Liên kết tài khoản Google
                                    </Button>
                                )}
                                <Button 
                                    startIcon={<Logout />} 
                                    variant="contained" 
                                    size="small" 
                                    onClick={() => {
                                        logout();
                                        localStorage.clear();
                                        navigate('/login');
                                    }}
                                    sx={{ 
                                        borderRadius: '8px',
                                        bgcolor: '#d32f2f', // Màu đỏ sang trọng hơn
                                        color: '#ffffff',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        boxShadow: 'none',
                                        ml: 1, // Khoảng cách với nút bên trái
                                        '&:hover': {
                                            bgcolor: '#b71c1c',
                                            boxShadow: '0 1px 2px 0 rgba(211,47,47,0.30), 0 1px 3px 1px rgba(211,47,47,0.15)',
                                        }
                                    }}
                                >
                                    Đăng xuất
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Container>
            </Paper>

            {/* CỤM 2: DANH SÁCH (NẰM DƯỚI - CHIẾM TOÀN BỘ CHIỀU RỘNG) */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Container maxWidth="xl" sx={{ mt: 2, mb: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            borderRadius: 4, 
                            border: '1px solid #e0e0e0', 
                            display: 'flex', 
                            flexDirection: 'column',
                            maxHeight: 'calc(100vh - 220px)', // Giới hạn chiều cao để tạo cuộn nội bộ
                            width: '100%',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Tabs thanh công cụ */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                            <Tabs 
                                value={tabValue} 
                                onChange={(e, v) => setTabValue(v)} 
                                variant="fullWidth"
                            >
                                <Tab icon={<Assignment />} label={`GIÁO ÁN (${listKHBD.length})`} iconPosition="start" sx={{ fontWeight: 700, py: 2 }} />
                                <Tab icon={<GridOn />} label={`MA TRẬN (${listMTKT.length})`} iconPosition="start" sx={{ fontWeight: 700, py: 2 }} />
                            </Tabs>
                        </Box>

                        {/* Nội dung danh sách có cuộn */}
                        <Box 
                            sx={{ 
                                p: { xs: 1, md: 3 }, 
                                flexGrow: 1, 
                                overflowY: 'auto', 
                                bgcolor: '#fafafa',
                                '&::-webkit-scrollbar': { width: '8px' },
                                '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '10px' },
                            }}
                        >
                           <Stack spacing={1} sx={{ width: '100%' }}>
                                {tabValue === 0 ? (
                                    // --- NHÁNH KẾ HOẠCH BÀI DẠY (KHBD) ---
                                    listKHBD.map((item) => (
                                        <CardItem 
                                            key={item.MaKHBD} 
                                            title={item.TenBai} 
                                            tags={[item.TenLop || 'Lớp 10']} 
                                            type="KHBD" 
                                            loading={downloadingId === item.MaKHBD}
                                            onDownload={() => handleDownloadKHBD(item.MaKHBD)} 
                                            
                                            // --- PROPS CHO DRIVE ---
                                            onSaveDrive={() => handleSaveToDrive(item, false)}
                                            loadingDrive={loadingDriveStatus[`${item.MaKHBD}_main`]}
                                        />
                                    ))
                                ) : (
                                    // --- NHÁNH MA TRẬN KIẾM TRA (MTKT) ---
                                    listMTKT.map((item) => (
                                        <CardItem 
                                            key={item.MaMaTran} 
                                            title={item.TenMaTran} 
                                            tags={[`${item.TongSoCau} câu`, `${item.TongThoiGian} phút`]} 
                                            type="MTKT" 
                                            loading={downloadingId === item.MaMaTran}
                                            onDownload={() => handleDownloadMatrixWord(item.MaMaTran)} 
                                            loadingDacTa={downloadingDacTaId === item.MaMaTran}
                                            onDownloadDacTa={() => handleDownloadDacTa(item.MaMaTran)}

                                            // --- PROPS CHO DRIVE (Gồm cả bản chính và bản đặc tả) ---
                                            onSaveDrive={() => handleSaveToDrive(item, false)}
                                            onSaveDriveDacTa={() => handleSaveToDrive(item, true)}
                                            loadingDrive={loadingDriveStatus[`${item.MaMaTran}_main`]}
                                            loadingDriveDacTa={loadingDriveStatus[`${item.MaMaTran}_dacta`]}
                                        />
                                    ))
                                )}
                            </Stack>
                        </Box>
                    </Paper>
                </Container>
            </Box>
            {/* DIALOG ĐỔI MẬT KHẨU */}
            {/* DIALOG ĐỔI MẬT KHẨU */}
            <Dialog 
                open={openPasswordDialog} 
                onClose={() => setOpenPasswordDialog(false)} 
                fullWidth 
                maxWidth="xs"
            >
                {/* TIÊU ĐỀ: Dựa vào việc đã có mật khẩu hay chưa */}
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {!hasPassword ? "Thiết lập mật khẩu cho tài khoản Google" : "Đổi mật khẩu"}
                </DialogTitle>
                
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {passwordStatus.error && <Alert severity="error">{passwordStatus.error}</Alert>}
                        {passwordStatus.success && <Alert severity="success">{passwordStatus.success}</Alert>}
                        
                        {/* CHỈ HIỆN ô mật khẩu cũ nếu tài khoản ĐÃ CÓ mật khẩu.
                        Nếu chưa có (hasPassword = false), ô này sẽ ẩn đi.
                        */}
                        {hasPassword && (
                            <TextField 
                                label="Mật khẩu hiện tại" 
                                type="password" 
                                fullWidth 
                                size="small"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                            />
                        )}

                        <TextField 
                            label={!hasPassword ? "Đặt mật khẩu mới" : "Mật khẩu mới"}
                            type="password" 
                            fullWidth 
                            size="small"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        />
                        <TextField 
                            label="Xác nhận mật khẩu mới" 
                            type="password" 
                            fullWidth 
                            size="small"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenPasswordDialog(false)} color="inherit">
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleChangePassword} 
                        variant="contained" 
                        disabled={passwordStatus.loading}
                    >
                        {passwordStatus.loading ? 'Đang xử lý...' : (!hasPassword ? 'Thiết lập' : 'Cập nhật')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
    
};

export default ProfilePage;
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, MenuItem, TextField, 
  Stepper, Step, StepLabel, StepContent, Divider, Alert, Grid, 
  CircularProgress, Tabs, Tab, InputAdornment 
} from '@mui/material';
import { School, AccountTree, Search, FilterAlt } from '@mui/icons-material';

const KnowledgeAlignment = () => {
  // --- STATES DỮ LIỆU GỐC ---
  const [capHocs, setCapHocs] = useState([]);
  const [lops, setLops] = useState([]);
  const [chuDes, setChuDes] = useState([]);
  const [dinhHuongs, setDinhHuongs] = useState([]);
  const [noiDungCBs, setNoiDungCBs] = useState([]);

  // --- STATES LỰA CHỌN ---
  const [selectedCap, setSelectedCap] = useState('');
  const [selectedLop, setSelectedLop] = useState('');
  const [selectedChuDe, setSelectedChuDe] = useState('');
  const [selectedDH, setSelectedDH] = useState('');
  const [selectedNDCB, setSelectedNDCB] = useState('');

  // --- STATES KẾT QUẢ ---
  const [alignmentChain, setAlignmentChain] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- STATES TRA CỨU KEYWORD ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMode, setSearchMode] = useState(0); // 0: Tìm nhanh, 1: Bộ lọc chi tiết

  // --- EFFECT: Khởi tạo dữ liệu ban đầu ---
  useEffect(() => {
    fetch('https://kltin-hoc-system.onrender.com/api/caphoc').then(res => res.json()).then(data => setCapHocs(data));
    fetch('https://kltin-hoc-system.onrender.com/api/dinhhuong').then(res => res.json()).then(data => setDinhHuongs(data));
  }, []);

  // --- EFFECT: Lấy Lớp và Chủ đề khi Cấp học thay đổi ---
  useEffect(() => {
    if (selectedCap) {
      fetch(`https://kltin-hoc-system.onrender.com/api/lops?maCap=${selectedCap}`).then(res => res.json()).then(data => setLops(data));
      fetch(`https://kltin-hoc-system.onrender.com/api/chudes?maCap=${selectedCap}`).then(res => res.json()).then(data => setChuDes(data));
      setSelectedLop('');
      setSelectedChuDe('');
      setSelectedNDCB('');
      setNoiDungCBs([]);
    }
  }, [selectedCap]);

  // --- EFFECT: Lấy Nội dung cơ bản theo bộ lọc ---
  useEffect(() => {
    if (selectedCap && selectedChuDe && selectedDH) {
      fetch(`https://kltin-hoc-system.onrender.com/api/noidungcoban?maLop=${selectedLop}&maChuDe=${selectedChuDe}&maDH=${selectedDH}`)
        .then(res => res.json())
        .then(data => {
            setNoiDungCBs(data);
            if(data.length === 0) setError('Không tìm thấy nội dung cơ bản phù hợp với bộ lọc này.');
            else setError('');
        });
    }
  }, [selectedLop, selectedChuDe, selectedDH]);

  // --- EFFECT: Tìm kiếm theo keyword (Debounce) ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length > 2) {
        fetch(`https://kltin-hoc-system.onrender.com/api/noidungcoban/search?keyword=${encodeURIComponent(searchTerm)}`)
          .then(res => res.json())
          .then(data => setSearchResults(data));
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // --- EFFECT: Tra cứu đường liên thông ---
  useEffect(() => {
    if (selectedNDCB) {
      setLoading(true);
      fetch(`https://kltin-hoc-system.onrender.com/api/alignment-trace/${selectedNDCB}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            //setAlignmentChain(result.data.reverse());
            setAlignmentChain(result.data);
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Lỗi kết nối tra cứu liên thông.');
          setLoading(false);
        });
    }
  }, [selectedNDCB]);

  return (
    <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 'bold', color: '#1a237e' }}>
          <AccountTree fontSize="large" /> TRA CỨU ĐƯỜNG LIÊN THÔNG TRI THỨC
        </Typography>
        
        <Tabs 
          value={searchMode} 
          onChange={(e, val) => setSearchMode(val)} 
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Search fontSize="small" />} iconPosition="start" label="Tìm nhanh bằng từ khóa" />
          <Tab icon={<FilterAlt fontSize="small" />} iconPosition="start" label="Bộ lọc theo cấp bậc" />
        </Tabs>

        {/* PHẦN 1: GIAO DIỆN TÌM KIẾM KEYWORD */}
        {searchMode === 0 && (
          <Box sx={{ mb: 4, position: 'relative' }}>
            <TextField 
              fullWidth 
              label="Tìm kiếm nội dung bài học..." 
              placeholder="Nhập từ khóa (Ví dụ: Số hữu tỉ, Tế bào nhân thực...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {searchResults.length > 0 && (
              <Paper sx={{ position: 'absolute', zIndex: 10, width: '100%', mt: 0.5, maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', boxShadow: 3 }}>
                {searchResults.map((item) => (
                  <MenuItem 
                    key={item.id} 
                    onClick={() => {
                      setSelectedNDCB(item.id);
                      setSearchTerm(item.ten);
                      setSearchResults([]);
                    }}
                    sx={{ py: 1.5, borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {item.TenCap} - {item.TenLop}
                    </Typography>
                    <Typography variant="body1">{item.ten}</Typography>
                  </MenuItem>
                ))}
              </Paper>
            )}
          </Box>
        )}

        {/* PHẦN 2: GIAO DIỆN BỘ LỌC CŨ (5 BƯỚC) - ĐÃ CHỈNH THÀNH TỪNG HÀNG */}
        {searchMode === 1 && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {/* Bước 1 */}
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="1. Cấp học" 
                value={selectedCap} 
                onChange={(e) => setSelectedCap(e.target.value)}
                sx={{ backgroundColor: '#fff' }}
              >
                {capHocs.map(c => <MenuItem key={c.id} value={c.id}>{c.ten}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Bước 2 */}
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="2. Lớp" 
                value={selectedLop} 
                onChange={(e) => setSelectedLop(e.target.value)} 
                disabled={!selectedCap}
              >
                {lops.map(l => <MenuItem key={l.id} value={l.id}>{l.ten}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Bước 3 */}
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="3. Chủ đề" 
                value={selectedChuDe} 
                onChange={(e) => setSelectedChuDe(e.target.value)} 
                disabled={!selectedCap}
              >
                {chuDes.map(cd => <MenuItem key={cd.id} value={cd.id}>{cd.ten}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Bước 4 */}
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="4. Định hướng" 
                value={selectedDH} 
                onChange={(e) => setSelectedDH(e.target.value)}
              >
                {dinhHuongs.map(dh => <MenuItem key={dh.MaDH} value={dh.MaDH}>{dh.TenDH}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Bước 5 */}
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="5. Chọn Nội dung cơ bản để tra cứu" 
                value={selectedNDCB} 
                onChange={(e) => setSelectedNDCB(e.target.value)} 
                disabled={noiDungCBs.length === 0}
                variant="filled" // Làm nổi bật bước cuối cùng
              >
                {noiDungCBs.map(nd => <MenuItem key={nd.id} value={nd.id}>{nd.ten}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ mb: 4 }} />
        {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

        {/* HIỂN THỊ KẾT QUẢ SƠ ĐỒ (Giữ nguyên logic của bạn) */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Đang phân tích chuỗi liên thông...</Typography>
          </Box>
        ) : alignmentChain.length > 0 ? (
          <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#ffffff' }}>
            <Typography variant="h6" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, color: '#2e7d32' }}>
              <School /> Sơ đồ tiến trình phát triển kiến thức:
            </Typography>
            
            <Stepper orientation="vertical">
              {alignmentChain.map((step, index) => (
                <Step key={index} active={true}>
                  <StepLabel>
                    <Typography variant="subtitle1" sx={{ 
                        fontWeight: step.MaNDCB.toString() === selectedNDCB.toString() ? 'bold' : 'normal',
                        color: step.MaNDCB.toString() === selectedNDCB.toString() ? '#d32f2f' : 'inherit'
                    }}>
                      {step.TenCap} - {step.TenLop}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Paper variant="outlined" sx={{ 
                        p: 2.5, mb: 2, 
                        bgcolor: step.MaNDCB.toString() === selectedNDCB.toString() ? '#fff9c4' : '#f1f8e9', 
                        borderLeft: '6px solid',
                        borderColor: step.MaNDCB.toString() === selectedNDCB.toString() ? '#fbc02d' : '#81c784',
                    }}>
                      <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                        {step.NoiDungChiTiet}
                      </Typography>
                    </Paper>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 10, border: '2px dashed #ccc', borderRadius: 3 }}>
             <Typography color="textSecondary">Chưa có dữ liệu tra cứu. Hãy tìm kiếm theo từ khóa hoặc sử dụng bộ lọc.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default KnowledgeAlignment;
import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableFooter,
  TableRow, TextField, Paper, Button, Box, Typography, IconButton, Card, Divider
} from '@mui/material';
import { Plus, Trash2, Save, ArrowUp, ArrowDown, GripVertical, ListPlus, ClipboardList } from 'lucide-react';

const SpecificationEditor = () => {
  // Cấu trúc dữ liệu chuẩn: Chủ đề -> Danh sách Nội dung -> 3 Levels (NB, TH, VD)
  const [data, setData] = useState([
    { 
      id: Date.now(), 
      tenChuDe: 'Chủ đề 1', 
      listNoiDung: [
        { 
          idRow: Date.now() + 1, 
          tenNoiDung: '', 
          levels: [
            { id: 'nb', label: 'Biết', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
            { id: 'th', label: 'Hiểu', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
            { id: 'vd', label: 'Vận dụng', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
          ]
        }
      ]
    }
  ]);

  // --- QUẢN LÝ CHỦ ĐỀ ---
  const addChuDe = () => {
    setData([...data, { 
      id: Date.now(), 
      tenChuDe: '', 
      listNoiDung: [{ 
        idRow: Date.now() + 1, 
        tenNoiDung: '', 
        levels: [
          { id: 'nb', label: 'Biết', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          { id: 'th', label: 'Hiểu', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          { id: 'vd', label: 'Vận dụng', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
        ]
      }]
    }]);
  };

  const moveChuDe = (index, direction) => {
    const newData = [...data];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= data.length) return;
    [newData[index], newData[target]] = [newData[target], newData[index]];
    setData(newData);
  };

  const deleteChuDe = (id) => setData(data.filter(cd => cd.id !== id));

  // --- QUẢN LÝ NỘI DUNG (ROW) ---
  const addRow = (chuDeId) => {
    setData(data.map(cd => cd.id === chuDeId ? {
      ...cd,
      listNoiDung: [...cd.listNoiDung, { 
        idRow: Date.now(), 
        tenNoiDung: '', 
        levels: [
          { id: 'nb', label: 'Biết', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          { id: 'th', label: 'Hiểu', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          { id: 'vd', label: 'Vận dụng', yccdContent: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
        ]
      }]
    } : cd));
  };

  const updateLevelCell = (chuDeId, rowId, levelId, field, value) => {
    setData(data.map(cd => cd.id === chuDeId ? {
      ...cd,
      listNoiDung: cd.listNoiDung.map(r => r.idRow === rowId ? {
        ...r,
        levels: r.levels.map(lvl => lvl.id === levelId ? { ...lvl, [field]: value } : lvl)
      } : r)
    } : cd));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClipboardList /> 2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ
        </Typography>
      </Box>

      {data.map((chuDe, idx) => (
        <Card key={chuDe.id} sx={{ mb: 4, boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
          {/* Header của Chủ đề */}
          <Box sx={{ bgcolor: '#f8fafc', p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid #e2e8f0' }}>
            <GripVertical size={20} color="#94a3b8" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{idx + 1}.</Typography>
            <TextField 
              placeholder="Nhập tên Chủ đề..." 
              variant="standard" sx={{ flexGrow: 1, fontWeight: 'bold' }}
              value={chuDe.tenChuDe} 
              onChange={(e) => setData(data.map(cd => cd.id === chuDe.id ? {...cd, tenChuDe: e.target.value} : cd))}
            />
            <IconButton onClick={() => moveChuDe(idx, 'up')} disabled={idx === 0}><ArrowUp size={18}/></IconButton>
            <IconButton onClick={() => moveChuDe(idx, 'down')} disabled={idx === data.length - 1}><ArrowDown size={18}/></IconButton>
            <IconButton onClick={() => deleteChuDe(chuDe.id)} color="error"><Trash2 size={18}/></IconButton>
          </Box>

          <TableContainer>
            <Table size="small" sx={{ '& .MuiTableCell-root': { border: '1px solid #e0e0e0' } }}>
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', width: '15%' }}>Nội dung kiến thức</TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', width: '30%' }}>Yêu cầu cần đạt</TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', width: '7%' }}>Mức độ</TableCell>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fffde7' }}>TN Nhiều LC</TableCell>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', bgcolor: '#f1f8e9' }}>TN Đúng/Sai</TableCell>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }}>Trả lời ngắn</TableCell>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fce4ec' }}>Tự luận</TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Xóa</TableCell>
                </TableRow>
                <TableRow>
                  {/* Các cột B - H - V cho 4 nhóm câu hỏi */}
                  {['B','H','V','B','H','V','B','H','V','B','H','V'].map((m, i) => (
                    <TableCell key={i} align="center" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{m}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {chuDe.listNoiDung.map((row) => (
                  <React.Fragment key={row.idRow}>
                    {row.levels.map((lvl, lIdx) => (
                      <TableRow key={lvl.id}>
                        {/* Cột Nội dung: Gộp 3 dòng ứng với 3 mức độ */}
                        {lIdx === 0 && (
                          <TableCell rowSpan={3} sx={{ verticalAlign: 'top', pt: 2 }}>
                            <TextField 
                              multiline fullWidth variant="standard" placeholder="Tên nội dung..." 
                              value={row.tenNoiDung} 
                              onChange={(e) => setData(data.map(cd => cd.id === chuDe.id ? {
                                ...cd, listNoiDung: cd.listNoiDung.map(r => r.idRow === row.idRow ? {...r, tenNoiDung: e.target.value} : r)
                              } : cd))}
                            />
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <TextField 
                            multiline fullWidth variant="standard" 
                            placeholder={`Mô tả YCCD mức ${lvl.label}...`}
                            value={lvl.yccdContent}
                            onChange={(e) => updateLevelCell(chuDe.id, row.idRow, lvl.id, 'yccdContent', e.target.value)}
                            sx={{ '& .MuiInput-input': { fontSize: '0.85rem', fontStyle: 'italic' } }}
                          />
                        </TableCell>

                        <TableCell align="center"><b>{lvl.label}</b></TableCell>

                        {/* Mapping các ô nhập số liệu tương ứng với dòng mức độ */}
                        {['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan', 'tu_luan'].map((type) => (
                          <React.Fragment key={type}>
                            <TableCell align="center">
                                {lvl.id === 'nb' ? <TextField type="number" size="small" sx={{width: 45}} value={lvl[type]} onChange={(e) => updateLevelCell(chuDe.id, row.idRow, lvl.id, type, e.target.value)} /> : null}
                            </TableCell>
                            <TableCell align="center">
                                {lvl.id === 'th' ? <TextField type="number" size="small" sx={{width: 45}} value={lvl[type]} onChange={(e) => updateLevelCell(chuDe.id, row.idRow, lvl.id, type, e.target.value)} /> : null}
                            </TableCell>
                            <TableCell align="center">
                                {lvl.id === 'vd' ? <TextField type="number" size="small" sx={{width: 45}} value={lvl[type]} onChange={(e) => updateLevelCell(chuDe.id, row.idRow, lvl.id, type, e.target.value)} /> : null}
                            </TableCell>
                          </React.Fragment>
                        ))}

                        {/* Cột nút xóa hàng Nội dung: Gộp 3 dòng */}
                        {lIdx === 0 && (
                          <TableCell rowSpan={3} align="center">
                            <IconButton color="error" size="small" onClick={() => setData(data.map(cd => cd.id === chuDe.id ? {...cd, listNoiDung: cd.listNoiDung.filter(r => r.idRow !== row.idRow)} : cd))}>
                              <Trash2 size={18}/>
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
              <TableFooter>

              </TableFooter>
            </Table>
          </TableContainer>

          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center', bgcolor: '#fcfcfc' }}>
            <Button size="small" startIcon={<ListPlus size={16}/>} onClick={() => addRow(chuDe.id)}>
              Thêm nội dung kiến thức
            </Button>
          </Box>
        </Card>
      ))}

      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', mb: 10 }}>
        <Button variant="outlined" color="primary" startIcon={<Plus />} onClick={addChuDe}>Thêm Chủ đề mới</Button>
        <Button variant="contained" color="success" startIcon={<Save />} onClick={() => console.log("Data Export:", data)}>Lưu Bản Đặc Tả</Button>
      </Box>
    </Box>
  );
};

export default SpecificationEditor;
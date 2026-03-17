import React, { useState, useMemo, useEffect } from 'react';
import { 
  Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, Tooltip,
  TableRow, TextField, Paper, Button, Box, Typography, IconButton, Card, Switch, FormControlLabel,CardContent,Stack, Divider, Grid, MenuItem, Select, FormControl, InputLabel 
} from '@mui/material';
import { Plus, Trash2, Save, ListPlus, Settings2, Database, LayoutGrid, Info, ChevronLeft, FileText, CheckCircle2, AlertCircle, HelpCircle ,FileDown} from 'lucide-react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';


import MultipleChoiceEditor from './QuestionEditors/MultipleChoiceEditor';
import TrueFalseEditor from './QuestionEditors/TrueFalseEditor';
import ShortAnswerEditor from './QuestionEditors/ShortAnswerEditor';
import EssayEditor from './QuestionEditors/EssayEditor';
import { exportToWordStandard } from '../utils/ExportWordService';
import { ExportMatrixService } from '../utils/ExportMatrixService';
import { exportToWord7991Direct } from '../utils/ExportWordService';
//exportDacTaDirect
import { exportDacTaDirect } from '../utils/ExportDacTa';
//exportToWord7991
// ============================================================================
// VỊ TRÍ 1: CHUYỂN RA NGOÀI ĐỂ KHÔNG BỊ MẤT FOCUS KHI NHẬP LIỆU
// ============================================================================
const stripHtml = (html) => {
  if (!html) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};
const QuestionContainer = ({ index, question, onUpdate }) => {
  const renderEditor = () => {
    const props = { question, onUpdate };
    
    switch (question.maLoaiCauHoi) {
      case 'tn_nhieu_lc': 
        return <MultipleChoiceEditor {...props} />;
      case 'tn_dung_sai': 
        return <TrueFalseEditor {...props} />;
      case 'tl_ngan':     
        return <ShortAnswerEditor {...props} />;
      case 'tu_luan':    
        return <EssayEditor {...props} />;
      default:
        return <Alert severity="error">Mã loại câu hỏi "{question.maLoaiCauHoi}" không hợp lệ!</Alert>;
    }
  };

  // Lấy nội dung YCCĐ từ các nguồn dữ liệu khác nhau (phòng trường hợp tên biến khác nhau)
  const displayYCCD = question.yccdText || question.yeuCauCanDat || question.NoiDungYCCD;

  return (
    <Card id={question.idTmp} sx={{ mb: 4, scrollMarginTop: '20px', border: '1px solid #e2e8f0' }}>
      <Box sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label={`CÂU ${index + 1}`} color="primary" size="small" sx={{ fontWeight: 'bold' }} />
          <Typography variant="subtitle2" sx={{ color: '#475569' }}>
            [{question.maMucDo}] {question.tenNDCB || ''}
          </Typography>
        </Box>
        {/* Hiện thêm mã phân bổ để dễ truy vết nếu cần */}
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          {question.maPhanBo}
        </Typography>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {/* Hiển thị YCCĐ nếu có dữ liệu */}
        {displayYCCD ? (
          <Alert 
            severity="info" 
            icon={<Info size={20} />}
            sx={{ 
              mb: 3, 
              bgcolor: '#f0f9ff',
              border: '1px solid #bae6fd',
              '& .MuiAlert-message': { width: '100%' } 
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#0369a1' }}>
              Yêu cầu cần đạt:
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#1e293b' }}>
              {displayYCCD}
            </Typography>
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Chưa có thông tin Yêu cầu cần đạt cho câu hỏi này.
          </Alert>
        )}

        {renderEditor()}
      </Box>
    </Card>
  );
};

// ============================================================================
// COMPONENT CHÍNH
// ============================================================================
const FullMatrixSpec = () => {
  // --- NHÓM 1: THÔNG TIN CHUNG ---
  const [capHocs, setCapHocs] = useState([]);
  const [lops, setLops] = useState([]);
  const [boSGKs, setBoSGKs] = useState([]);
  const [dinhHuongs, setDinhHuongs] = useState([]);
  const [listNangLuc, setListNangLuc] = useState([]);
  const location = useLocation();
  const [generalInfo, setGeneralInfo] = useState({ 
    maCap: '', maLop: '', maSGK: '', maDH: '', tenBaiKiemTra: '' , thoiGian: 90
  });
  
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState([]);
  // Tìm đến useEffect nhận state trong ExamDesign.js
  const convertBackToStep1Structure = (matrixData) => {
    // 1. Nhóm dữ liệu theo maNDCB (Nội dung cơ bản)
    // Giả định matrixData từ BE có dạng: [{ maNDCB, levels: [{ mucDo, details: [] }] }]
    
    return matrixData.map(item => {
        // Tạo cấu trúc levels mặc định cho UI
        const uiLevels = {
            nb: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0, maYCCD: [] },
            th: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0, maYCCD: [] },
            vd: { tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0, maYCCD: [] }
        };

        // Đổ dữ liệu từ BE vào cấu trúc UI
        item.levels.forEach(lvl => {
            const mdcKey = lvl.mucDo.toLowerCase(); // nb, th, vd
            if (uiLevels[mdcKey]) {
                uiLevels[mdcKey].maYCCD = lvl.maYCCD || [];
                lvl.details.forEach(d => {
                    uiLevels[mdcKey][d.type] = d.qty;
                });
            }
        });

        // Trả về định dạng mà giao diện Step 1 đang dùng (Cấu trúc lồng)
        return {
            tenChuDe: "Chủ đề cũ", // Bạn có thể bổ sung tên chủ đề từ BE nếu cần
            listNoiDung: [
                {
                    maNDCB: item.maNDCB,
                    levels: uiLevels,
                    optionsYCCD: [], // Sẽ được load lại khi chọn SGK/Lớp
                    idRow: item.maNDCB
                }
            ]
        };
    });
  };
// Tìm đến useEffect trong ExamDesign.js (FullMatrixSpec)
  useEffect(() => {
    if (location.state && location.state.initialQuestions) {
        const { header, matrixData, questionsData } = location.state.initialQuestions;

        // CONVERT DỮ LIỆU Ở ĐÂY
        const formattedDataForUI = convertBackToStep1Structure(matrixData || []);
        setData(formattedDataForUI); 
        
        setQuestions(questionsData || []);
        
        if (header) {
            setGeneralInfo({
                tenBaiKiemTra: header.tenMaTran || "",
                maSGK: header.maSGK || "",
                thoiGian: header.thoiGian || 90
            });
        }
        
        // Bây giờ bạn có thể ở lại Step 1 hoặc sang Step 2 tùy ý
        // Vì data đã đúng cấu trúc, totals.totalPoints sẽ tính ra 10.00
        setStep(2); 
    }
}, [location.state]);
  // --- VỊ TRÍ 2: ĐƯA HÀM NÀY LÊN TRÊN TRƯỚC KHI ĐƯỢC GỌI ---
  const generateInitialQuestions = () => {
    const newQuestions = [];
    data.forEach(chuDe => {
      chuDe.listNoiDung.forEach(row => {
        ['nb', 'th', 'vd'].forEach(lvl => {
          const levelData = row.levels[lvl];
          const yccdTextContent = (row.optionsYCCD || [])
            .filter(y => (levelData.maYCCD || []).includes(y.MaYCCD))
            .map(y => y.NoiDungYCCD)
            .join('\n');

          ['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan', 'tu_luan'].forEach(type => {
            const qty = parseInt(levelData[type] || 0);
            for (let i = 0; i < qty; i++) {
              newQuestions.push({
                idTmp: `${row.idRow}-${lvl}-${type}-${i}`,
                tenNDCB: row.optionsND?.find(o => o.id === row.maNDCB)?.ten || '', 
                maMucDo: lvl.toUpperCase(),
                maLoaiCauHoi: type,
                yccdText: yccdTextContent || "Chưa có nội dung Yêu cầu cần đạt",
                content: {}
              });
            }
          });
        });
      });
    });
    return newQuestions;
  };

  const handleStartEditor = () => {
    const list = generateInitialQuestions();
    setQuestions(list);
    setStep(2);
  };

  // --- GIỮ NGUYÊN TOÀN BỘ CÁC EFFECT TÁCH RỜI NHƯ CŨ ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [capRes, sgkRes] = await Promise.all([
          axios.get('https://kltin-hoc-system.onrender.com/api/caphoc'),
          axios.get('https://kltin-hoc-system.onrender.com/api/bosgk')
        ]);
        setCapHocs(capRes.data);
        setBoSGKs(sgkRes.data);
      } catch (err) { console.error("Lỗi tải dữ liệu ban đầu:", err); }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchLop = async () => {
      if (!generalInfo.maCap) { setLops([]); return; }
      try {
        const res = await axios.get('https://kltin-hoc-system.onrender.com/api/lops', { params: { maCap: generalInfo.maCap } });
        setLops(res.data);
      } catch (err) { console.error("Lỗi tải danh sách lớp:", err); }
    };
    fetchLop();
  }, [generalInfo.maCap]);

  useEffect(() => {
    const fetchDinhHuong = async () => {
      try {
        const res = await axios.get('https://kltin-hoc-system.onrender.com/api/dinhhuong');
        setDinhHuongs(res.data);
      } catch (err) { console.error("Lỗi tải định hướng:", err); }
    };
    fetchDinhHuong();
  }, []);

  useEffect(() => {
    const fetchNangLuc = async () => {
      try {
        const res = await axios.get('https://kltin-hoc-system.onrender.com/api/nanglucdacthu');
        setListNangLuc(res.data);
      } catch (err) { console.error("Lỗi tải danh mục năng lực:", err); }
    };
    fetchNangLuc();
  }, []);
  // 1. Lưu nháp khi questions thay đổi
  useEffect(() => {
      if (questions.length > 0) {
          localStorage.setItem('exam_draft', JSON.stringify(questions));
      }
  }, [questions]);

  // 2. Khôi phục nháp khi vào trang (nếu chưa có dữ liệu từ Page 1 truyền sang)
  useEffect(() => {
      const draft = localStorage.getItem('exam_draft');
      if (!location.state?.initialQuestions && draft) {
          setQuestions(JSON.parse(draft));
      }
  }, []);
  
  // --- CÁC HÀM XỬ LÝ KHÁC GIỮ NGUYÊN VỊ TRÍ ---
  const handleCapHocChange = (val) => {
    setGeneralInfo({ ...generalInfo, maCap: val, maLop: '' });
  };

  const [pointConfig, setPointConfig] = useState({
    tn_nhieu_lc: 0.25, tn_dung_sai: 1.0, tl_ngan: 0.5, tu_luan_nb: 0.5, tu_luan_th: 1.0, tu_luan_vd: 1.5
  });

  const [isSpecView, setIsSpecView] = useState(true);
  const [data, setData] = useState([
    { 
      id: Date.now(), 
      tenChuDe: 'Chủ đề 1', 
      listNoiDung: [
        { 
          idRow: Date.now() + 1, 
          tenNoiDung: '', 
          levels: {
            nb: { yccd: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
            th: { yccd: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
            vd: { yccd: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
          }
        }
      ]
    }
  ]);
  const [listChuDeDich, setListChuDeDich] = useState([]);

  useEffect(() => {
    const fetchChuDe = async () => {
      if (!generalInfo.maCap) { setListChuDeDich([]); return; }
      try {
        const res = await axios.get('https://kltin-hoc-system.onrender.com/api/chudes', { params: { maCap: generalInfo.maCap } });
        setListChuDeDich(res.data);
      } catch (err) { console.error("Lỗi tải danh mục chủ đề:", err); }
    };
    fetchChuDe();
  }, [generalInfo.maCap]);

  const fetchNoidung = async (maChuDe) => {
    if (!generalInfo.maLop || !maChuDe || !generalInfo.maDH) return [];
    try {
      const res = await axios.get('https://kltin-hoc-system.onrender.com/api/noidungcoban', {
        params: { maLop: generalInfo.maLop, maChuDe: maChuDe, maDH: generalInfo.maDH }
      });
      return res.data;
    } catch (err) { return []; }
  };

  const handleAddRow = async (chuDeId, maChuDe) => {
    if (!maChuDe) { alert("Vui lòng chọn Chủ đề trước!"); return; }
    const options = await fetchNoidung(maChuDe);
    setData(prev => prev.map(cd => cd.id === chuDeId ? {
      ...cd,
      listNoiDung: [...cd.listNoiDung, {
        idRow: Date.now(), maNDCB: '', tenNoiDung: '', optionsND: options,
        levels: {
          nb: { yccd: '', maNL: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          th: { yccd: '', maNL: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 },
          vd: { yccd: '', maNL: '', tn_nhieu_lc: 0, tn_dung_sai: 0, tl_ngan: 0, tu_luan: 0 }
        }
      }]
    } : cd));
  };

  const handleChuDeChange = async (chuDeId, selectedMaChuDe) => {
    const selectedObj = listChuDeDich.find(c => c.id === selectedMaChuDe);
    const options = await fetchNoidung(selectedMaChuDe);
    setData(prev => prev.map(cd => cd.id === chuDeId ? {
      ...cd, maChuDe: selectedMaChuDe, tenChuDe: selectedObj ? selectedObj.ten : '',
      listNoiDung: cd.listNoiDung.map(row => ({ ...row, maNDCB: '', optionsND: options }))
    } : cd));
  };

  const handleNoiDungChange = async (chuDeId, rowId, selectedMaNDCB) => {
    try {
      const response = await axios.get(`https://kltin-hoc-system.onrender.com/api/yccd-by-noidung`, {
        params: { maNDCB: selectedMaNDCB, maCap: generalInfo.maCap }
      });
      setData(prev => prev.map(cd => cd.id === chuDeId ? {
        ...cd,
        listNoiDung: cd.listNoiDung.map(r => r.idRow === rowId ? {
          ...r, maNDCB: selectedMaNDCB, optionsYCCD: response.data,
          levels: {
            nb: { ...r.levels.nb, maYCCD: [], yccd: '', maNL: '', tenNL: '', bieuHien: '' },
            th: { ...r.levels.th, maYCCD: [], yccd: '', maNL: '', tenNL: '', bieuHien: '' },
            vd: { ...r.levels.vd, maYCCD: [], yccd: '', maNL: '', tenNL: '', bieuHien: '' }
          }
        } : r)
      } : cd));
    } catch (err) { console.error("Không thể lấy danh sách YCCD", err); }
  };

  const onSelectYCCD = (chuDeId, rowId, lvl, selectedMaYCCD) => {
  const currentChuDe = data.find(cd => cd.id === chuDeId);
  const currentRow = currentChuDe.listNoiDung.find(r => r.idRow === rowId);
  
  // Lọc lấy các đối tượng đầy đủ từ options
  const selectedDetails = currentRow.optionsYCCD?.filter(y => selectedMaYCCD.includes(y.MaYCCD));

  if (selectedDetails) {
    // TẠO BIẾN CHỨA TEXT: Lấy trường NoiDungYCCD nối lại
    const textNoiDung = selectedDetails.map(d => d.NoiDungYCCD).join('; ');

    setData(prev => prev.map(cd => cd.id === chuDeId ? {
      ...cd,
      listNoiDung: cd.listNoiDung.map(r => r.idRow === rowId ? {
        ...r,
        levels: { 
          ...r.levels, 
          [lvl]: {
            ...r.levels[lvl], 
            maYCCD: selectedMaYCCD,
            // QUAN TRỌNG: Phải lưu cái này thì Export mới thấy chữ
            yccd: textNoiDung, 
            maNL: selectedDetails[0]?.MaNL || '', 
            tenNL: selectedDetails[0]?.TenNL || '',
            bieuHien: selectedDetails.map(d => d.NoiDungBH).join('; ')
          }
        }
      } : r)
    } : cd));
  }
};

  const [constraints, setConstraints] = useState([]);
  useEffect(() => {
    axios.get('https://kltin-hoc-system.onrender.com/api/tile-constraints')
      .then(res => setConstraints(res.data))
      .catch(err => console.error("Lỗi lấy ràng buộc:", err));
  }, []);

  const validateTiles = (showAllErrors = false) => {
    let errors = [];
    constraints.forEach(con => {
      const currentStat = totals.stats[con.MaLoaiCauHoi];
      if (!currentStat) return;
      const score = con.MaLoaiCauHoi === 'tu_luan'
        ? (currentStat.nb * pointConfig.tu_luan_nb + currentStat.th * pointConfig.tu_luan_th + currentStat.vd * pointConfig.tu_luan_vd)
        : (currentStat.nb + currentStat.th + currentStat.vd) * pointConfig[con.MaLoaiCauHoi];
      const currentPercent = (score / 10) * 100;
      if (currentPercent > con.TiLeMax) errors.push(`${con.LoaiCauHoi} vượt mức tối đa (${con.TiLeMax}%). Hiện tại: ${currentPercent}%`);
      if (showAllErrors && currentPercent < con.TiLeMin) errors.push(`${con.LoaiCauHoi} chưa đạt mức tối thiểu (${con.TiLeMin}%). Hiện tại: ${currentPercent}%`);
    });
    return errors;
  };

  const updateQuestionContent = (idTmp, newData) => {
    setQuestions(prev => prev.map(q => q.idTmp === idTmp ? { ...q, content: { ...q.content, ...newData } } : q));
  };

  const calculateRowPoints = (row) => {
    let total = 0;
    ['nb', 'th', 'vd'].forEach(lvl => {
      total += Number(row.levels[lvl].tn_nhieu_lc) * pointConfig.tn_nhieu_lc;
      total += Number(row.levels[lvl].tn_dung_sai) * pointConfig.tn_dung_sai;
      total += Number(row.levels[lvl].tl_ngan) * pointConfig.tl_ngan;
      if (lvl === 'nb') total += Number(row.levels[lvl].tu_luan) * pointConfig.tu_luan_nb;
      if (lvl === 'th') total += Number(row.levels[lvl].tu_luan) * pointConfig.tu_luan_th;
      if (lvl === 'vd') total += Number(row.levels[lvl].tu_luan) * pointConfig.tu_luan_vd;
    });
    return total;
  };
  // Hàm tính điểm dựa trên pointConfig có sẵn trong code của bạn
  const calculatePointForQuestion = (q) => {
      const type = q.maLoaiCauHoi;
      const lvl = q.maMucDo.toLowerCase();
      if (type === 'tu_luan') return pointConfig[`tu_luan_${lvl}`] || 0;
      return pointConfig[type] || 0;
  };
  const totals = useMemo(() => {
    // Kiểm tra xem có phải đang trong chế độ tái bản (từ List chuyển sang) hay không
    const isReproduction = !!location.state?.initialQuestions;

    // Nếu đang ở Step 2 HOẶC là chế độ tái bản, ta tính điểm trực tiếp từ mảng questions
    if (step === 2 || isReproduction) {
        const totalPoints = questions.reduce((sum, q) => {
            // Lấy điểm từ q.diem, nếu chưa có thì tính dựa trên cấu hình pointConfig
            const point = q.diem || calculatePointForQuestion(q);
            return sum + (parseFloat(point) || 0);
        }, 0);

        // Vẫn giữ stats để hiển thị bảng Nhóm 4 nếu cần
        let stats = { tn_nhieu_lc: { nb: 0, th: 0, vd: 0 }, tn_dung_sai: { nb: 0, th: 0, vd: 0 }, tl_ngan: { nb: 0, th: 0, vd: 0 }, tu_luan: { nb: 0, th: 0, vd: 0 } };
        questions.forEach(q => {
            const type = q.maLoaiCauHoi;
            const lvl = q.maMucDo.toLowerCase();
            if (stats[type]) stats[type][lvl] += 1;
        });

        return { stats, totalPoints };
    }

    // Logic cũ cho Step 1 (Dành cho tạo mới hoàn toàn)
    let stats = { tn_nhieu_lc: { nb: 0, th: 0, vd: 0 }, tn_dung_sai: { nb: 0, th: 0, vd: 0 }, tl_ngan: { nb: 0, th: 0, vd: 0 }, tu_luan: { nb: 0, th: 0, vd: 0 } };
    if (!data || !Array.isArray(data)) return { stats, totalPoints: 0 };

    data.forEach(cd => {
        cd.listNoiDung.forEach(row => {
            ['nb', 'th', 'vd'].forEach(lvl => {
                stats.tn_nhieu_lc[lvl] += Number(row.levels[lvl].tn_nhieu_lc);
                stats.tn_dung_sai[lvl] += Number(row.levels[lvl].tn_dung_sai);
                stats.tl_ngan[lvl] += Number(row.levels[lvl].tl_ngan);
                stats.tu_luan[lvl] += Number(row.levels[lvl].tu_luan);
            });
        });
    });

    const totalPoints = data.reduce((sum, cd) => sum + cd.listNoiDung.reduce((s, row) => s + calculateRowPoints(row), 0), 0);
    return { stats, totalPoints };
  }, [data, pointConfig, questions, step, location.state]);

  const addChuDe = () => {
    setData([...data, { id: Date.now(), maChuDe: '', tenChuDe: '', listNoiDung: [] }]);
  };

  const updateCell = (chuDeId, rowId, level, field, value) => {
    setData(prev => prev.map(cd => cd.id === chuDeId ? {
      ...cd,
      listNoiDung: cd.listNoiDung.map(r => r.idRow === rowId ? {
        ...r, levels: { ...r.levels, [level]: { ...r.levels[level], [field]: value } }
      } : r)
    } : cd));
  };

  

  const handleSave = async () => {
    if (totals.totalPoints.toFixed(2) !== "10.00") {
      alert(`Tổng điểm hiện tại là ${totals.totalPoints.toFixed(2)}. Phải đạt đúng 10.00 điểm!`);
      return;
    }
    // Kiểm tra xem đây là chế độ "Chỉnh sửa/Tái bản" hay "Tạo mới"
    
    const currentUserId = localStorage.getItem('userId'); 

    if (!currentUserId) {
        alert("Lỗi: Không tìm thấy thông tin người dùng!");
        return;
    }
    // 2. Xác định xem có phải là đề tái bản từ List không
  // (Dựa vào việc location.state có chứa maMaTran cũ hay không)
  const oldMaMaTran = location.state?.initialQuestions?.header?.maMaTran;

  if (oldMaMaTran) {
    // TRƯỜNG HỢP: TÁI BẢN (Lưu 3 bảng: DETHI, CAUHOI, DAPAN)
    // TRƯỜNG HỢP: TÁI BẢN
  const payload = {
    header: {
      tenDeThi: generalInfo.tenBaiKiemTra,
      maMaTran: oldMaMaTran,
      userId: localStorage.getItem('userId') || '1'
    },
    // Quan trọng: Đảm bảo q.maPhanBo tồn tại
    questionsData: questions.map(q => ({
      ...q,
      maPhanBo: q.maPhanBo || location.state?.initialQuestions?.questionsData?.find(oldQ => oldQ.idTmp === q.idTmp)?.maPhanBo
    }))
  };

    try {
      // Gọi API riêng cho việc tái bản (Tôi sẽ viết BE ở dưới)
      const res = await axios.post('https://kltin-hoc-system.onrender.com/api/save-new-exam-version', payload);
      if (res.data.success) {
        alert("Đã lưu đề thi mới thành công dựa trên ma trận có sẵn!");
      }
    } catch (err) {
      alert("Lỗi khi lưu đề tái bản: " + err.message);
    }

  } else {
    const payload = {
      header: {
        maSGK: generalInfo.maSGK,
        tenMaTran: generalInfo.tenBaiKiemTra,
        tongSoCau: questions.length,
        thoiGian: parseInt(generalInfo.thoiGian) || 90,
        userId: currentUserId,
        pointConfig: pointConfig
      },
      matrixData: data.flatMap(chuDe => 
        chuDe.listNoiDung.map(row => ({
          maNDCB: row.maNDCB,
          levels: Object.entries(row.levels).map(([lvlKey, lvlVal]) => {
            
            // Xử lý lấy mã YCCĐ đầu tiên nếu nó đang ở dạng mảng
            const cleanMaYCCD = Array.isArray(lvlVal.maYCCD) 
              ? lvlVal.maYCCD[0] 
              : lvlVal.maYCCD;

            return {
              mucDo: lvlKey.toUpperCase(),
              maYCCD: cleanMaYCCD, // Lưu mã đã làm sạch (không còn dấu ngoặc)
              maNL: lvlVal.maNL,
              details: [
                { type: 'tn_nhieu_lc', qty: parseInt(lvlVal.tn_nhieu_lc) || 0 },
                { type: 'tn_dung_sai', qty: parseInt(lvlVal.tn_dung_sai) || 0 },
                { type: 'tl_ngan', qty: parseInt(lvlVal.tl_ngan) || 0 },
                { type: 'tu_luan', qty: parseInt(lvlVal.tu_luan) || 0 }
              ].filter(d => d.qty > 0)
            };
          }).filter(l => l.details.length > 0)
        }))
      ),
      questionsData: questions.map((q, index) => {
        const content = q.content || {};
        let dsDapAn = [];

        // 1. TRẮC NGHIỆM NHIỀU LỰA CHỌN (Dựa trên MultipleChoiceEditor.js)
        if (q.maLoaiCauHoi === 'tn_nhieu_lc') {
          const options = content.options || ['', '', '', ''];
          const correctIdx = content.correct; // Lấy index câu đúng (0-3)
          dsDapAn = options.map((optText, idx) => ({
            kyHieu: String.fromCharCode(65 + idx),
            noiDungDapAn: optText,
            laDapAnDung: idx === correctIdx ? 1 : 0 // So sánh index để lấy đáp án đúng
          }));
        } 
        
        // 2. TRẮC NGHIỆM ĐÚNG SAI (Dựa trên TrueFalseEditor.js)
        else if (q.maLoaiCauHoi === 'tn_dung_sai') {
          dsDapAn = (content.subQuestions || []).map((sub, idx) => ({
            kyHieu: String.fromCharCode(97 + idx),
            noiDungDapAn: sub.text || '',
            laDapAnDung: sub.answer === true ? 1 : 0 // TrueFalseEditor dùng trường 'answer'
          }));
        }
        
        // 3. TRẢ LỜI NGẮN (Dựa trên ShortAnswerEditor.js)
        else if (q.maLoaiCauHoi === 'tl_ngan') {
          if (content.answer) {
            dsDapAn = [{
              kyHieu: 'TL',
              noiDungDapAn: content.answer, // ShortAnswer dùng 'answer'
              laDapAnDung: 1
            }];
          }
        }

        // 4. TỰ LUẬN (Dựa trên EssayEditor.js)
        else if (q.maLoaiCauHoi === 'tu_luan') {
          if (content.guide) {
            dsDapAn = [{
              kyHieu: 'HD',
              noiDungDapAn: content.guide, // Essay dùng 'guide'
              laDapAnDung: 1
            }];
          }
        }

        return {
          idTmp: q.idTmp,
          soThuTu: index + 1,
          maLoaiCauHoi: q.maLoaiCauHoi,
          maMucDo: q.maMucDo.toUpperCase(),
          diem: calculatePointForQuestion(q),
          noiDungCauHoi: content.noiDung || '', // Tất cả Editor đều dùng 'noiDung'
          dapAn: dsDapAn
        };
      })
    };

    try {
      const response = await axios.post('https://kltin-hoc-system.onrender.com/api/save-full-exam', payload);
      if (response.data.success) {
        alert("✅ Đã lưu thành công! Dữ liệu đã khớp với các Editor.");
      }
    } catch (error) {
      console.error("Lỗi Save:", error);
      alert("❌ Lỗi: " + (error.response?.data?.error || "Không thể lưu"));
    }
  }
  };
  const handleQuickExport7991 = async () => {
    try {
      // 1. Dữ liệu Header
      const headerInfo = {
        tenMaTran: (generalInfo?.tenBaiKiemTra || "ĐỀ KIỂM TRA").toUpperCase(),
        thoiGian: generalInfo?.thoiGian || 90,
      };

      // 2. Chuyển đổi dữ liệu ma trận sang dạng phẳng
      const matrixRows = data.flatMap(chuDe => 
        chuDe.listNoiDung.map(row => ({
          tenChuDe: chuDe.tenChuDe,
          // Tìm tên nội dung từ maNDCB trong optionsND
          tenNoiDung: row.optionsND?.find(o => o.id === row.maNDCB)?.ten || "Nội dung",
          levels: row.levels
        }))
      );

      // 3. Gọi Utility và truyền biến 'totals' từ useMemo của bạn
      // Biến 'totals' này chứa nbPoints, thPoints, vdPoints đã được bạn tính đúng ở dòng 128
      await exportToWord7991Direct(headerInfo, matrixRows, pointConfig, totals);
      
    } catch (e) {
      console.error("Lỗi xuất Word:", e);
      alert("Có lỗi xảy ra: " + e.message);
    }
  };
  
  const handleExportDacTa = async () => {
  try {
    const hInfo = {
      tenMaTran: (generalInfo?.tenBaiKiemTra || "KTDK").toUpperCase(),
      thoiGian: parseInt(generalInfo?.thoiGian) || 90,
    };

    let finalRows = [];

    data.forEach(chuDe => {
      chuDe.listNoiDung?.forEach(row => {
        // Lấy tên nội dung đơn vị kiến thức
        const tenDonVi = row.optionsND?.find(o => o.id === row.maNDCB)?.ten || "";

        Object.entries(row.levels || {}).forEach(([lvlKey, lvlVal]) => {
          if (!lvlVal) return;

          // LẤY TEXT TỪ STATE (đã lưu ở bước 1)
          const textYCCD = lvlVal.yccd || ""; 

          const totalQ = (Number(lvlVal.tn_nhieu_lc) || 0) + 
                         (Number(lvlVal.tn_dung_sai) || 0) + 
                         (Number(lvlVal.tl_ngan) || 0) + 
                         (Number(lvlVal.tu_luan) || 0);

          if (totalQ > 0 || textYCCD) {
            finalRows.push({
              tenChuDe: chuDe.tenChuDe || "",
              tenNoiDung: tenDonVi,
              maMucDo: lvlKey.toUpperCase(),
              noiDungYCCD: textYCCD || "Chưa chọn yêu cầu",
              maNL: lvlVal.maNL || row.maNL || "NLa", 
              tn_nhieu_lc: lvlVal.tn_nhieu_lc || 0,
              tn_dung_sai: lvlVal.tn_dung_sai || 0,
              tl_ngan: lvlVal.tl_ngan || 0,
              tu_luan: lvlVal.tu_luan || 0,
              isFirstOfChuDe: finalRows.filter(r => r.tenChuDe === chuDe.tenChuDe).length === 0,
              isFirstOfND: finalRows.filter(r => r.tenNoiDung === tenDonVi).length === 0
            });
          }
        });
      });
    });

    //await exportDacTaDirect(hInfo, finalRows);
    
    await exportDacTaDirect(hInfo, finalRows, pointConfig);
  } catch (error) {
    console.error("Lỗi Export:", error);
  }
};

  //UI-----------------------------------------
  return (
    <Box sx={{ p: 3, maxWidth: 1600, margin: 'auto', bgcolor: '#f8fafc' }}>
      {step === 1 && (
      <>
      {/* NHÓM 1: THIẾT LẬP THÔNG TIN CHUNG */}
      <Card sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Box sx={{ 
          bgcolor: '#f8faff', 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Database size={20} color="#1976d2" />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
            Nhóm 1: Thiết lập thông tin chung
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Dùng Stack để tất cả dàn hàng dọc, chiếm 100% chiều rộng Card */}
          <Stack spacing={3.5}>
            
            {/* 1. Cấp học */}
            <FormControl fullWidth size="small">
              <InputLabel shrink sx={{ fontWeight: 'bold', color: '#1565c0' }}>Cấp học</InputLabel>
              <Select 
                notched
                value={generalInfo.maCap} 
                label="Cấp học"
                onChange={(e) => handleCapHocChange(e.target.value)}
              >
                {capHocs.map((cap) => (
                  <MenuItem key={cap.id} value={cap.id}>{cap.ten}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 2. Lớp học */}
            <FormControl fullWidth size="small" disabled={!generalInfo.maCap}>
              <InputLabel shrink sx={{ fontWeight: 'bold', color: '#1565c0' }}>Lớp học</InputLabel>
              <Select 
                notched
                value={generalInfo.maLop} 
                label="Lớp học"
                onChange={(e) => setGeneralInfo({...generalInfo, maLop: e.target.value})}
              >
                {lops.map((lop) => (
                  <MenuItem key={lop.id} value={lop.id}>{lop.ten}</MenuItem>
                ))}
              </Select>
            </FormControl>
                
            {/* 3. Định hướng */}
            <FormControl fullWidth size="small">
              <InputLabel shrink sx={{ fontWeight: 'bold', color: '#1565c0' }}>Định hướng giáo dục</InputLabel>
              <Select 
                notched
                value={generalInfo.maDH} 
                label="Định hướng giáo dục"
                onChange={(e) => setGeneralInfo({...generalInfo, maDH: e.target.value})}
              >
                {dinhHuongs.map((dh) => (
                  <MenuItem key={dh.MaDH} value={dh.MaDH}>{dh.TenDH}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 4. Bộ sách */}
            <FormControl fullWidth size="small">
              <InputLabel shrink sx={{ fontWeight: 'bold', color: '#1565c0' }}>Bộ sách giáo khoa sử dụng</InputLabel>
              <Select 
                notched
                value={generalInfo.maSGK} 
                label="Bộ sách giáo khoa sử dụng"
                onChange={(e) => setGeneralInfo({...generalInfo, maSGK: e.target.value})}
              >
                {boSGKs.map((sgk) => (
                  <MenuItem key={sgk.id} value={sgk.id}>{sgk.ten}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 5. Tên bài học */}
            <TextField 
              fullWidth 
              size="small" 
              label="Tên bài học / Tên bài kiểm tra" 
              placeholder="Ví dụ: Kiểm tra giữa học kì 1 - Tin 10"
              value={generalInfo.tenBaiKiemTra}
              onChange={(e) => setGeneralInfo({...generalInfo, tenBaiKiemTra: e.target.value})}
              slotProps={{
                inputLabel: { shrink: true, sx: { fontWeight: 'bold', color: '#1565c0' } }
              }}
            />

            {/* 6. Thời gian */}
            <TextField 
              sx={{ width: { xs: '100%', md: '250px' } }} // Chỉ thời gian mới cho ngắn lại để nhìn cân đối
              size="small" 
              label="Thời gian làm bài" 
              type="number"
              value={generalInfo.thoiGian}
              onChange={(e) => setGeneralInfo({...generalInfo, thoiGian: e.target.value})}
              slotProps={{
                inputLabel: { shrink: true, sx: { fontWeight: 'bold', color: '#1565c0' } },
                input: {
                  endAdornment: (
                    <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1, fontWeight: '500' }}>
                      phút
                    </Typography>
                  ),
                }
              }}
            />

          </Stack>
        </CardContent>
      </Card>

      {/* NHÓM 2: CẤU HÌNH ĐIỂM */}
      <Card sx={{ p: 3, mb: 3, borderLeft: '6px solid #9c27b0' }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7b1fa2', fontWeight: 'bold' }}>
          <Settings2 size={18} /> Nhóm 2: Điều chỉnh thang điểm (đ/câu)
        </Typography>
        <Grid container spacing={2}>
          {Object.keys(pointConfig).map((key) => (
            <Grid item xs={4} md={2} key={key}>
              <Typography variant="caption" sx={{ fontWeight: '600' }}>{key.replace('_',' ').toUpperCase()}</Typography>
              <TextField type="number" size="small" fullWidth value={pointConfig[key]} onChange={(e) => setPointConfig({...pointConfig, [key]: parseFloat(e.target.value) || 0})} />
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* NHÓM 3: MA TRẬN & ĐẶC TẢ */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControlLabel control={<Switch checked={isSpecView} onChange={(e) => setIsSpecView(e.target.checked)} />} label={isSpecView ? "Chế độ Đặc tả" : "Chế độ Ma trận"} />
        <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: totals.totalPoints === 10 ? '#15803d' : '#b45309' }}>
            Tổng điểm: {totals.totalPoints.toFixed(2)} / 10
          </Typography>
        </Paper>
      </Box>

      {data.map((chuDe, idx) => (
        <Card key={chuDe.id} sx={{ mb: 3, border: '1px solid #e2e8f0' }}>
            {/* HEADER: CHỌN CHỦ ĐỀ */}
            <Box sx={{ bgcolor: '#f8fafc', p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontWeight: 'bold', minWidth: '80px' }}>Chủ đề {idx + 1}:</Typography>
            <FormControl variant="standard" sx={{ minWidth: 400 }}>
                <Select
                displayEmpty
                value={chuDe.maChuDe || ''}
                onChange={(e) => handleChuDeChange(chuDe.id, e.target.value)}
                >
                <MenuItem value="" disabled>--- Chọn chủ đề từ thư viện ---</MenuItem>
                {listChuDeDich.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.ten}</MenuItem>
                ))}
                </Select>
            </FormControl>
            <IconButton color="error" size="small" onClick={() => setData(data.filter(cd => cd.id !== chuDe.id))}>
                <Trash2 size={18}/>
            </IconButton>
            </Box>

            {/* BẢNG DỮ LIỆU */}
            <TableContainer>
            <Table size="small" sx={{ '& td, & th': { border: '1px solid #e2e8f0' } }}>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                    <TableCell rowSpan={2} align="center" width="15%" >Nội dung</TableCell>
                    {isSpecView && (
                      <>
                        <TableCell rowSpan={2} align="center" width="20%">Yêu cầu cần đạt</TableCell>
                        <TableCell rowSpan={2} align="center" width="12%">Năng lực đặc thù</TableCell>
                      </>
                    )}
                    <TableCell rowSpan={2} align="center" width="8%">Mức độ</TableCell>
                    <TableCell colSpan={3} align="center" sx={{ bgcolor: '#fffde7' }}>TN Nhiều LC</TableCell>
                    <TableCell colSpan={3} align="center" sx={{ bgcolor: '#f1f8e9' }}>TN Đúng/Sai</TableCell>
                    <TableCell colSpan={3} align="center" sx={{ bgcolor: '#e3f2fd' }}>Trả lời ngắn</TableCell>
                    <TableCell colSpan={3} align="center" sx={{ bgcolor: '#fce4ec' }}>Tự luận</TableCell>
                    <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', bgcolor: '#f0fdf4' }}>Tỉ lệ %</TableCell>
                </TableRow>
                <TableRow>
                    {Array(4).fill(['B', 'H', 'V']).flat().map((m, i) => (
                    <TableCell key={i} align="center" sx={{ fontSize: '0.65rem', p: 0.5, fontWeight: '700' }}>{m}</TableCell>
                    ))}
                </TableRow>
                </TableHead>

                <TableBody>
                {chuDe.listNoiDung.map((row) => {
                    const rowPoints = calculateRowPoints(row);
                    return ['nb', 'th', 'vd'].map((lvl, lIdx) => (
                    <TableRow key={`${row.idRow}-${lvl}`}>
                        {/* CỘT NỘI DUNG */}
                        {lIdx === 0 && (
                          <TableCell 
                            rowSpan={3} 
                            sx={{ 
                              verticalAlign: 'top', 
                              pt: 2, 
                              width: '180px', // Đặt chiều rộng cố định
                              minWidth: '150px'
                            }}
                          >
                            <FormControl fullWidth variant="standard">
                              <Select
                                value={row.maNDCB || ''}
                                displayEmpty
                                onChange={(e) => handleNoiDungChange(chuDe.id, row.idRow, e.target.value)}
                                sx={{ 
                                  whiteSpace: 'normal', // Cho phép text xuống dòng trong Select
                                  '& .MuiSelect-select': { whiteSpace: 'normal', py: 1 } 
                                }}
                              >
                                <MenuItem value="" disabled>-- Chọn nội dung --</MenuItem>
                                {row.optionsND?.map(opt => (
                                  <MenuItem key={opt.id} value={opt.id} sx={{ whiteSpace: 'normal', fontSize: '0.8rem' }}>
                                    {opt.ten}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        )}

                        {/* CỘT YCCĐ & NĂNG LỰC (Chỉ hiện ở chế độ Đặc tả) */}
                        {isSpecView && (
                          <>
                            <TableCell sx={{ width: '300px', minWidth: '250px' }}>
                              <FormControl fullWidth variant="standard">
                                <Select
                                  multiple // Cho phép chọn nhiều
                                  value={row.levels[lvl].maYCCD || []} 
                                  displayEmpty
                                  onChange={(e) => onSelectYCCD(chuDe.id, row.idRow, lvl, e.target.value)}
                                  renderValue={(selected) => {
                                    if (selected.length === 0) return <em style={{ color: '#94a3b8' }}>-- Chọn YCCD --</em>;
                                    
                                    // Hiển thị các nội dung YCCD đã chọn, phân cách bằng dấu xuống dòng
                                    return (
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1 }}>
                                        {(row.optionsYCCD || [])
                                          .filter(y => selected.includes(y.MaYCCD))
                                          .map((y, i) => (
                                            <Typography key={i} sx={{ fontSize: '0.75rem', whiteSpace: 'normal', lineHeight: 1.4 }}>
                                              • {y.NoiDungYCCD}
                                            </Typography>
                                          ))}
                                      </Box>
                                    );
                                  }}
                                  sx={{ 
                                    '& .MuiSelect-select': { whiteSpace: 'normal', py: 0.5 } 
                                  }}
                                >
                                  {(row.optionsYCCD || [])
                                    .filter(y => {
                                        const mapLevel = { 'MucDo_01': 'nb', 'MucDo_02': 'th', 'MucDo_03': 'vd' };
                                        return mapLevel[y.MaMucDo] === lvl.toLowerCase();
                                    })
                                    .map((y) => (
                                      <MenuItem key={y.MaYCCD} value={y.MaYCCD} sx={{ whiteSpace: 'normal', fontSize: '0.75rem' }}>
                                        {y.NoiDungYCCD}
                                      </MenuItem>
                                    ))}
                                </Select>
                              </FormControl>
                            </TableCell>

                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Typography sx={{ fontSize: '0.75rem' }}>
                                  {row.levels[lvl].maNL || 'Chưa có NL'}
                                </Typography>
                                
                                {/* Nút Info hiển thị biểu hiện chi tiết */}
                                {row.levels[lvl].bieuHien && (
                                  <Tooltip 
                                    arrow 
                                    title={
                                      <Box sx={{ p: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#ffd54f' }}>BIỂU HIỆN:</Typography>
                                        <Typography variant="caption" display="block">{row.levels[lvl].bieuHien}</Typography>
                                      </Box>
                                    }
                                  >
                                    <IconButton size="small" sx={{ p: 0, color: '#1976d2' }}>
                                      <Info size={14} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </>
                        )}

                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{lvl.toUpperCase()}</TableCell>

                        {/* INPUT CÂU HỎI */}
                        {['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan', 'tu_luan'].map(type => (
                          ['nb', 'th', 'vd'].map(m => {
                            // Kiểm tra xem mức độ hiện tại có Yêu cầu cần đạt (YCCD) nào được chọn chưa
                            const hasYCCD = row.levels[lvl].maYCCD && row.levels[lvl].maYCCD.length > 0;

                            return (
                              <TableCell key={type + m} align="center">
                                {lvl === m ? (
                                  <input 
                                    type="number" 
                                    // Ràng buộc: Disable nếu chưa chọn YCCD
                                    disabled={!hasYCCD}
                                    style={{ 
                                      width: '32px', 
                                      textAlign: 'center', 
                                      border: '1px solid #cbd5e1', 
                                      borderRadius: '4px',
                                      // Thêm hiệu ứng thị giác: đổi màu nền khi bị khóa
                                      backgroundColor: hasYCCD ? 'white' : '#f1f5f9',
                                      cursor: hasYCCD ? 'text' : 'not-allowed'
                                    }} 
                                    value={row.levels[lvl][type]} 
                                    onChange={(e) => updateCell(chuDe.id, row.idRow, lvl, type, e.target.value)}
                                    // Ngăn người dùng nhập số âm
                                    onInput={(e) => { if (e.target.value < 0) e.target.value = 0 }} 
                                  />
                                ) : '-'}
                              </TableCell>
                            );
                          })
                        ))}

                        {/* TỈ LỆ % */}
                        {lIdx === 0 && (
                        <TableCell rowSpan={3} align="center" sx={{ bgcolor: '#f0fdf4' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {((rowPoints / 10) * 100).toFixed(1)}%
                            </Typography>
                        </TableCell>
                        )}
                    </TableRow>
                    ));
                })}
                </TableBody>
            </Table>
            </TableContainer>

            {/* NÚT THÊM NỘI DUNG */}
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
            <Button 
                size="small" 
                startIcon={<ListPlus />} 
                onClick={() => handleAddRow(chuDe.id, chuDe.maChuDe)}
            >
                Thêm nội dung kiến thức
            </Button>
            </Box>
        </Card>
        ))}

      {/* --- NÚT THÊM CHỦ ĐỀ --- */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 6 }}>
        <Button 
          variant="outlined" 
          color="secondary" 
          size="large" 
          startIcon={<Plus />} 
          onClick={addChuDe}
          sx={{ px: 4, borderRadius: '8px', borderWidth: 2, '&:hover': { borderWidth: 2 } }}
        >
          Thêm chủ đề mới
        </Button>
      </Box>

      {/* NHÓM 4: BẢNG TỔNG HỢP CẬP NHẬT THEO CV 7991 + RÀNG BUỘC */}
      <Card sx={{ p: 4, bgcolor: '#1e293b', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', mb: 8 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <LayoutGrid size={22} /> Nhóm 4: Bảng tổng hợp số lượng câu hỏi & tỉ lệ điểm số (Theo CV 7991)
        </Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#243143', backgroundImage: 'none' }}>
          <Table size="small" sx={{ '& td, & th': { color: '#cbd5e1', borderColor: '#334155', py: 1.5 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#334155' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Hình thức câu hỏi</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Nhận biết</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Thông hiểu</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Vận dụng</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Tổng số câu</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Tổng điểm</TableCell>
                <TableCell align="center" sx={{ color: '#fbbf24', fontWeight: 'bold' }}>Tỉ lệ %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Trong TableBody của Nhóm 4 */}
              {[
                { label: '1. Trắc nghiệm nhiều lựa chọn', key: 'tn_nhieu_lc', p: pointConfig.tn_nhieu_lc },
                { label: '2. Trắc nghiệm Đúng/Sai', key: 'tn_dung_sai', p: pointConfig.tn_dung_sai },
                { label: '3. Trắc nghiệm trả lời ngắn', key: 'tl_ngan', p: pointConfig.tl_ngan },
                { label: '4. Tự luận', key: 'tu_luan', p: null }
              ].map((item) => {
                const s = totals.stats[item.key] || { nb: 0, th: 0, vd: 0 }; // Giá trị mặc định nếu undefined
                const count = s.nb + s.th + s.vd;
                const score = item.key === 'tu_luan' 
                  ? (s.nb * pointConfig.tu_luan_nb + s.th * pointConfig.tu_luan_th + s.vd * pointConfig.tu_luan_vd)
                  : count * item.p;
                const percentage = (score / 10) * 100;

                const con = constraints.find(c => c.MaLoaiCauHoi === item.key);
                const isError = con && (percentage < con.TiLeMin || percentage > con.TiLeMax);

                return (
                  <TableRow key={item.key} sx={{ '&:hover': { bgcolor: '#2d3d52' } }}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell align="center">{s.nb}</TableCell>
                    <TableCell align="center">{s.th}</TableCell>
                    <TableCell align="center">{s.vd}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{count}</TableCell>
                    <TableCell align="center" sx={{ color: '#4ade80', fontWeight: 'bold' }}>{score.toFixed(2)}</TableCell>
                    <TableCell 
                      align="center" 
                      sx={{ 
                        color: isError ? '#f87171' : '#fbbf24',
                        fontWeight: 'bold',
                        bgcolor: isError ? 'rgba(248, 113, 113, 0.1)' : 'transparent'
                      }}
                    >
                      <Tooltip title={isError ? `Yêu cầu: ${con.TiLeMin}% - ${con.TiLeMax}%` : ""}>
                        <span>{percentage.toFixed(0)}% {isError && "⚠️"}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* DÒNG TỔNG CỘNG AN TOÀN */}
              {/* DÒNG TỔNG CỘNG ĐÃ SỬA LOGIC TÍNH % */}
              <TableRow sx={{ bgcolor: '#0f172a' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#fff' }}>Tổng cộng (Tỉ lệ mức độ)</TableCell>
                
                {/* Tính tỉ lệ % theo từng cột Nhận biết, Thông hiểu, Vận dụng */}
                {['nb', 'th', 'vd'].map((lvl) => {
                  const totalLevelScore = ['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan', 'tu_luan'].reduce((sum, key) => {
                    const s = totals.stats[key] || { nb: 0, th: 0, vd: 0 };
                    const score = key === 'tu_luan' 
                      ? (s[lvl] * (lvl === 'nb' ? pointConfig.tu_luan_nb : lvl === 'th' ? pointConfig.tu_luan_th : pointConfig.tu_luan_vd))
                      : (s[lvl] * pointConfig[key]);
                    return sum + score;
                  }, 0);
                  return (
                    <TableCell key={lvl} align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>
                      {((totalLevelScore / 10) * 100).toFixed(0)}%
                    </TableCell>
                  );
                })}

                {/* Tổng số câu */}
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan', 'tu_luan'].reduce((acc, k) => {
                    const s = totals.stats[k] || { nb: 0, th: 0, vd: 0 };
                    return acc + s.nb + s.th + s.vd;
                  }, 0)}
                </TableCell>

                {/* Tổng điểm thực tế */}
                <TableCell align="center" sx={{ color: '#4ade80', fontWeight: 'bold' }}>
                  {totals.totalPoints.toFixed(2)}
                </TableCell>

                {/* Tỉ lệ % tổng cộng thực tế (Thay vì viết 100% tĩnh) */}
                <TableCell align="center" sx={{ color: '#fbbf24', fontWeight: 'bold' }}>
                  {((totals.totalPoints / 10) * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* THANH CÔNG CỤ NỔI: RÕ RÀNG CHO NGƯỜI LỚN TUỔI */}
<Paper 
  elevation={0} 
  sx={{ 
    position: 'fixed', 
    bottom: 25, 
    left: '50%', 
    transform: 'translateX(-50%)', 
    zIndex: 1100,
    padding: '4px 12px', // Cực kỳ thanh mảnh
    borderRadius: '100px',
    display: 'flex',
    gap: 0.5,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  }}
>
  {/* NHÓM TẢI XUỐNG CÓ CHỮ RÕ RÀNG */}
  <Stack direction="row" spacing={0}>
    <Button 
      size="small"
      startIcon={<FileDown size={16} />}
      onClick={() => exportToWordStandard(questions, { 
        subject: "Tin học", 
        grade: "11",
        scores: {
          tnkq: parseFloat(pointConfig.tn_nhieu_lc) || 0,
          dungSai: parseFloat(pointConfig.tn_dung_sai) || 0,
          tlNgan: parseFloat(pointConfig.tl_ngan) || 0,
          tuLuanNB: parseFloat(pointConfig.tu_luan_nb) || 0,
          tuLuanTH: parseFloat(pointConfig.tu_luan_th) || 0,
          tuLuanVD: parseFloat(pointConfig.tu_luan_vd) || 0
        }
      })}
      sx={{ color: '#334155', textTransform: 'none', fontSize: '0.8rem', px: 1 }}
    >
      Tải đề thi
    </Button>

    <Button 
      size="small"
      startIcon={<FileDown size={16} />}
      onClick={handleQuickExport7991}
      sx={{ color: '#0284c7', textTransform: 'none', fontSize: '0.8rem', px: 1 }}
    >
      Tải MTKT
    </Button>

    <Button
      size="small"
      startIcon={<FileDown size={16} />}
      onClick={handleExportDacTa}
      sx={{ color: '#7c3aed', textTransform: 'none', fontSize: '0.8rem', px: 1 }}
    >
      Bản đặc tả
    </Button>
  </Stack>

  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

  {/* TRẠNG THÁI ĐIỂM */}
  <Box sx={{ px: 1 }}>
    <Chip 
      label={`${totals.totalPoints.toFixed(2)}/10đ`}
      size="small"
      color={totals.totalPoints.toFixed(2) === "10.00" ? "success" : "warning"}
      sx={{ fontWeight: 'bold', height: 22, fontSize: '0.75rem' }}
    />
  </Box>

  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

  {/* NHÓM NÚT LƯU & TIẾP TỤC */}
  <Stack direction="row" spacing={1}>
    <Button 
      variant="text" 
      size="small"
      startIcon={<Save size={16} />}
      onClick={handleSave}
      sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
    >
      Lưu
    </Button>

    <Button 
      variant="contained" 
      color="success" 
      size="small"
      disabled={totals.totalPoints.toFixed(2) !== "10.00"}
      onClick={handleStartEditor}
      sx={{ 
        borderRadius: '20px', 
        textTransform: 'none', 
        fontSize: '0.8rem', 
        fontWeight: 700,
        px: 2,
        boxShadow: 'none'
      }}
    >
      Soạn đề
    </Button>
  </Stack>
</Paper>
      </>
    )}

    {/* --- CHẾ ĐỘ 2: SOẠN THẢO CÂU HỎI (Vị trí thêm mới) --- */}
    {step === 2 && (
      <Box>
        <Button 
            startIcon={<ChevronLeft />} 
            onClick={() => setStep(1)} 
            sx={{ mb: 3 }}
        >
            Quay lại sửa ma trận
        </Button>
        
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 1. Sidebar bên trái: Danh sách số thứ tự câu */}
          <Paper sx={{ width: 280, p: 2, height: '80vh', overflowY: 'auto', position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Cấu trúc đề</Typography>
            {questions.map((q, index) => (
              <Button 
                key={q.idTmp} 
                fullWidth 
                variant="outlined" 
                sx={{ mb: 1, justifyContent: 'flex-start', textAlign: 'left', py: 1 }}
                onClick={() => document.getElementById(q.idTmp).scrollIntoView({ behavior: 'smooth' })}
              >
                Câu {index + 1}: {q.maMucDo} - {q.maLoaiCauHoi.split('_')[1]}
              </Button>
            ))}
          </Paper>

          {/* 2. Nội dung soạn thảo bên phải */}
          <Box sx={{ flex: 1 }}>
            {questions.map((q, index) => (
              <Box id={q.idTmp} key={q.idTmp} sx={{ mb: 4 }}>
                <QuestionContainer 
                   index={index} 
                   question={q} 
                   onUpdate={(newData) => updateQuestionContent(q.idTmp, newData)} 
                />
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, pb: 10 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={handleSave}
              // Nếu là tái bản, chỉ cần tổng điểm = 10 là cho lưu
              disabled={Math.abs(totals.totalPoints - 10) > 0.001}
            >
              {location.state?.initialQuestions ? "Lưu đề mới" : "Lưu đề thi"}
            </Button>
        </Box>
        
      </Box>
      
    )}
  </Box>
  );
};

export default FullMatrixSpec;
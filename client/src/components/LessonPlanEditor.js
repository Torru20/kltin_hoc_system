import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Box, Paper, Typography, Button, TextField, IconButton, MenuItem, 
  Grid, Divider, Checkbox, FormControlLabel, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, FormControl, InputLabel,Stack, CircularProgress
} from '@mui/material';

import { GripVertical, Trash2, Plus, Save, Database, Target, Wrench, PlayCircle, BookOpen, Edit3, Eye  } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useAuth } from '../AuthContext';
import ReactMarkdown from 'react-markdown';
import { exportKHBDToWord } from '../utils/ExportKHBDService';

// Đổi tên Target thành TargetIcon để không trùng với các biến khác trong code
const stripHtml = (html) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};
const LessonPlanEditor = () => {
  const { user } = useAuth();
  
  // --- NHÓM 1: THÔNG TIN CHUNG ---
  const [basicInfo, setBasicInfo] = useState({ 
    cap: '', lop: '', chuDe: '', dinhHuong: '', sgk: '', bai: '', thoiLuong: 1 ,phuLuc:''
  });

  // --- NHÓM 2: MỤC TIÊU ---
  const [objectives, setObjectives] = useState({
    kienThuc: [], // Lọc từ NOIDUNGCOBAN
    nangLucDacThu: [], // Lọc từ MUCTIEUSGK
    nangLucChung: [
      { id: 'nlc1', label: 'Năng lực tự chủ và tự học', checked: false, content: '' },
      { id: 'nlc2', label: 'Năng lực giao tiếp và hợp tác', checked: false, content: '' },
      { id: 'nlc3', label: 'Năng lực giải quyết vấn đề và sáng tạo', checked: false, content: '' },
    ],
    phamChat: [
      { id: 'pc1', label: 'Yêu nước', checked: false, content: '' },
      { id: 'pc2', label: 'Nhân ái', checked: false, content: '' },
      { id: 'pc3', label: 'Chăm chỉ', checked: false, content: '' },
      { id: 'pc4', label: 'Trung thực', checked: false, content: '' },
      { id: 'pc5', label: 'Trách nhiệm', checked: false, content: '' },
    ]
  });
    

    const fetchMuctieuSGK = async (maPhanPhoi) => {
        try {
            const response = await fetch(`http://localhost:5000/api/muctieusgk?maPhanPhoi=${maPhanPhoi}`);
            const data = await response.json();
            // data lúc này sẽ có dạng: [{ id: 1, noiDung: '...' }, ...]
            setListMTTP(data);
        } catch (error) {
            console.error("Lỗi lấy mục tiêu SGK:", error);
        }
    };
  // --- NHÓM 3: THIẾT BỊ DẠY HỌC ---
  const [equipment, setEquipment] = useState({ gv: '', hs: '' });
  const [customPrompt, setCustomPrompt] = useState('');
  // --- NHÓM TÙY BIẾN ---
  const PEDAGOGY_STRATEGIES = [
    { 
      label: 'Chuẩn CV 5555', 
      prompt: 'Thiết kế hoạt động theo Công văn 5512/5555: Đảm bảo chuỗi 4 bước (Chuyển giao - Thực hiện - Báo cáo - Kết luận), sản phẩm học tập cụ thể và phương án đánh giá rõ ràng.' 
    },
    { 
      label: 'Thuyết Kiến tạo', 
      prompt: 'Sử dụng thuyết kiến tạo (Constructivism): Tập trung vào việc tạo tình huống có vấn đề để học sinh tự kiến tạo kiến thức mới thông qua trải nghiệm và thảo luận.' 
    },
    { 
      label: 'Dạy học Tích cực', 
      prompt: 'Áp dụng các kĩ thuật dạy học tích cực (như khăn trải bàn, mảnh ghép hoặc sơ đồ tư duy) để tối đa hóa sự tham gia của mọi học sinh trong lớp.' 
    },
    { 
      label: 'Gamification', 
      prompt: 'Tích hợp trò chơi hóa (Gamification): Thiết kế hoạt động khởi động hoặc luyện tập dưới dạng trò chơi (Quiz, giải mật mã...) để tăng hứng thú.' 
    }
  ];
  // --- NHÓM 4: TIẾN TRÌNH DẠY HỌC ---
  const [activities, setActivities] = useState([
    { 
      id: 'act-1', 
      title: 'Hoạt động 1: Xác định vấn đề', 
      selectedMTIds: [], 
      noiDung: '', 
      sanPham: '',
      steps: [
        { step: 'Chuyển giao nhiệm vụ', gv: '', hs: '' },
        { step: 'Thực hiện nhiệm vụ', gv: '', hs: '' },
        { step: 'Báo cáo nhiệm vụ', gv: '', hs: '' },
        { step: 'Đánh giá kết quả', gv: '', hs: '' },
      ]
    }
  ]);
  //nhom 5
  const [appendices, setAppendices] = useState(''); // Lưu nội dung phụ lục/phiếu học tập
  const [isPreviewAppendices, setIsPreviewAppendices] = useState(false);
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(activities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActivities(items);
  };
  // 1. Khai báo State để chứa danh sách cấp học
  const [capHocs, setCapHocs] = useState([]);

  // 2. Viết hàm lấy dữ liệu từ API
  useEffect(() => {
      const fetchCapHoc = async () => {
          try {
              // Thay đổi URL nếu server của bạn chạy ở port khác (ví dụ: 5000)
              const response = await fetch('http://localhost:5000/api/caphoc');
              const data = await response.json();
              
              // Cập nhật dữ liệu vào State
              setCapHocs(data);
          } catch (error) {
              console.error("Không thể lấy dữ liệu Cấp học:", error);
          }
      };

      fetchCapHoc();
  }, []); // Chạy 1 lần duy nhất khi component mount
  // Thêm State để chứa danh sách lớp
  const [lops, setLops] = useState([]);

  useEffect(() => {
    const fetchLop = async () => {
        if (!basicInfo.maCap) {
            setLops([]);
            return;
        }

        try {
            // SỬ DỤNG DẤU HUYỀN (Backtick) ở đây
            const response = await fetch(`http://localhost:5000/api/lops?maCap=${basicInfo.maCap}`);
            const data = await response.json();
            setLops(data);
        } catch (error) {
            console.error("Lỗi khi fetch lớp:", error);
        }
    };

    fetchLop();
  }, [basicInfo.maCap]); // Theo dõi sự thay đổi của MaCap
  //Chu De
  const [chuDes, setChuDes] = useState([]);
  useEffect(() => {
    const fetchChuDe = async () => {
        if (basicInfo.maCap) {
            try {
                const response = await fetch(`http://localhost:5000/api/chudes?maCap=${basicInfo.maCap}`);
                const data = await response.json();
                setChuDes(data);
            } catch (error) {
                console.error("Lỗi fetch Chủ đề:", error);
            }
        } else {
            setChuDes([]);
        }
    };

    fetchChuDe();
  }, [basicInfo.maCap]); // Tự động load lại khi chọn Cấp học khác
  
  const [dinhHuongs, setDinhHuongs] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/dinhhuong')
      .then(res => res.json())
      .then(data => setDinhHuongs(data))
      .catch(err => console.error("Lỗi:", err));
  }, []);
  //NDCB

  const [listNDCB, setListNDCB] = useState([]);

  useEffect(() => {
    const loadNDCB = async () => {
        // Chỉ gọi API khi có đủ 3 thông tin quan trọng
        if (basicInfo.maLop && basicInfo.maChuDe && basicInfo.maDinhHuong) {
            try {
                // Sửa URL: thay maCap thành maLop và đảm bảo đúng tên tham số maDH
                const url = `http://localhost:5000/api/noidungcoban?maLop=${basicInfo.maLop}&maChuDe=${basicInfo.maChuDe}&maDH=${basicInfo.maDinhHuong}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                setListNDCB(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Lỗi khi load NDCB:", error);
                setListNDCB([]);
            }
        } else {
            // Nếu thiếu 1 trong 3 cái thì reset danh sách về rỗng
            setListNDCB([]);
        }
    };
    loadNDCB();
    // Lắng nghe sự thay đổi của cả 3 biến này
  }, [basicInfo.maLop, basicInfo.maChuDe, basicInfo.maDinhHuong]);
  
  //BóGK
  const [boSgks, setBoSgks] = useState([]);

  useEffect(() => {
      const fetchSGK = async () => {
          try {
              const response = await fetch('http://localhost:5000/api/bosgk');
              if (!response.ok) throw new Error("Không thể kết nối API bộ sách");
              
              const data = await response.json();
              setBoSgks(data); // Đổ dữ liệu vào state
          } catch (error) {
              console.error("Lỗi tải bộ sách giáo khoa:", error);
          }
      };
      fetchSGK();
  }, []); // Chạy 1 lần duy nhất khi mở trang

  //Chon Bai
  const [listBaiHoc, setListBaiHoc] = useState([]);

  useEffect(() => {
      const fetchBaiHoc = async () => {
          // Chỉ gọi khi đã chọn đủ Bộ sách và Nội dung cơ bản
          if (basicInfo.maSGK && basicInfo.maNDCB) {
              try {
                  const url = `http://localhost:5000/api/tenbaihoc?maSGK=${basicInfo.maSGK}&maNDCB=${basicInfo.maNDCB}&maCap=${basicInfo.maCap}&maLop=${basicInfo.maLop}`;
                  const response = await fetch(url);
                  const data = await response.json();
                  setListBaiHoc(Array.isArray(data) ? data : []);
              } catch (error) {
                  setListBaiHoc([]);
              }
          }
      };
      fetchBaiHoc();
  }, [basicInfo.maSGK, basicInfo.maNDCB, basicInfo.maCap, basicInfo.maLop]);
  //Phan 2---------------------------------
    // --- NHÓM 2: MỤC TIÊU ---
  const [listYCCD, setListYCCD] = useState([]);

  useEffect(() => {
      const fetchYCCD = async () => {
          // Phải có cả maNDCB và maCap thì API mới trả về đủ dữ liệu
          if (basicInfo.maNDCB && basicInfo.maCap) {
              try {
                  // Sửa URL cho đúng với Route Backend bạn đã viết
                  const response = await fetch(`http://localhost:5000/api/yccd-by-noidung?maNDCB=${basicInfo.maNDCB}&maCap=${basicInfo.maCap}`);
                  const data = await response.json();
                  
                  // Map lại dữ liệu để khớp với thuộc tính 'id' và 'noiDung' dùng trong component
                  const formattedData = data.map(item => ({
                      id: item.MaYCCD,
                      noiDung: item.NoiDungYCCD,
                      tenNL: item.TenNL // Lưu thêm tên năng lực nếu cần hiển thị
                  }));
                  
                  setListYCCD(formattedData);
              } catch (err) { 
                  console.error("Lỗi load YCCD:", err); 
              }
          } else {
              setListYCCD([]);
          }
      };
      fetchYCCD();
  }, [basicInfo.maNDCB, basicInfo.maCap]); // Theo dõi cả 2 biến này

  // State lưu danh sách ID của các Yêu cầu cần đạt (Nhóm 2.1) được chọn
  //dung chung mttp
  // Hàm cập nhật nội dung mục tiêu khi người dùng sửa trong Textbox
  const handleEditObjective = (type, id, newContent) => {
    if (type === 'YCCD') {
      setListYCCD(prev => prev.map(item => item.id === id ? { ...item, noiDung: newContent } : item));
    } else {
      setListMTTP(prev => prev.map(item => item.id === id ? { ...item, noiDung: newContent } : item));
    }
  };

  const [listMTTP, setListMTTP] = useState([]); // Danh sách mục tiêu từ DB
  const [selectedMTTP, setSelectedMTTP] = useState([]); // Các mục giáo viên đã tích

  useEffect(() => {
      const fetchMuctieu = async () => {
          // basicInfo.maTenBai chính là MaPhanPhoi từ ô số 7
          if (basicInfo.maTenBai) { 
              try {
                  const response = await fetch(`http://localhost:5000/api/muctieusgk?maPhanPhoi=${basicInfo.maTenBai}`);
                  const data = await response.json();
                  setListMTTP(Array.isArray(data) ? data : []);
                  setSelectedMTTP([]); // Reset tích chọn khi đổi bài học
              } catch (error) {
                  console.error("Lỗi fetch mục tiêu:", error);
                  setListMTTP([]);
              }
          }
      };
      fetchMuctieu();
  }, [basicInfo.maTenBai]);

  // Hàm xử lý khi giáo viên tích chọn mục tiêu
  const handleToggleMTTP = (id) => {
      setSelectedMTTP(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

//Goi Gemini api
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = async () => {
    // 1. Kiểm tra điều kiện: Cấp 3 cần maTenBai, Cấp 1-2 cần maNDCB
    if (!basicInfo.maTenBai && !basicInfo.maNDCB) {
      alert("Vui lòng chọn thông tin bài học ở Nhóm 1 trước!");
      return;
    }

    setIsGenerating(true);

    try {
      // --- 2. TRÍCH XUẤT THÔNG TIN NGỮ CẢNH ---
      const tenCap = capHocs.find(c => c.id === basicInfo.maCap)?.ten || "";
      const tenLop = lops.find(l => l.id === basicInfo.maLop)?.ten || "";
      const tenChuDe = chuDes.find(cd => cd.id === basicInfo.maChuDe)?.ten || "";
      const tenSGK = boSgks.find(s => s.id === basicInfo.maSGK)?.ten || "Chương trình GDPT 2018";
      
      const selectedBai = listBaiHoc.find(b => b.id === basicInfo.maTenBai);
      const selectedNDCB = listNDCB.find(n => n.id === basicInfo.maNDCB);
      const finalLessonName = selectedBai?.ten || selectedNDCB?.ten || "Bài dạy mới";

      // --- 3. ĐÁNH SỐ HIỆU MỤC TIÊU (MAPPING LOGIC) ---
      let targetIndex = 1;
      // A. Lấy text từ những YCCD được chọn (trong listYCCD)
      const yccdText = listYCCD
          .filter(y => selectedMTTP.includes(y.id))
          .map(y => `(${targetIndex++}) ${y.noiDung}`)
          .join("\n");

      // B. Lấy text từ những MTTP được chọn (trong listMTTP)
      const mttpText = listMTTP
          .filter(m => selectedMTTP.includes(m.id))
          .map(m => `(${targetIndex++}) ${m.noiDung}`)
          .join("\n");

      // C. Năng lực chung & Phẩm chất (Giữ nguyên logic .checked)
      const nlcText = objectives.nangLucChung
          .filter(nl => nl.checked)
          .map(nl => `(${targetIndex++}) ${nl.label}: ${nl.content}`)
          .join("\n");

      const phamChatText = objectives.phamChat
          .filter(pc => pc.checked)
          .map(pc => `(${targetIndex++}) ${pc.label}: ${pc.content}`)
          .join("\n");

      // TỔNG HỢP PROMPT: Đảm bảo nối các chuỗi text đã .join("\n")
      const fullObjectivesPrompt = [yccdText, mttpText, nlcText, phamChatText]
          .filter(text => text !== "") // Loại bỏ các nhóm trống
          .join("\n");

      console.log("DANH SÁCH GỬI ĐI:\n", fullObjectivesPrompt);

      // --- 4. GỌI API BACKEND ---
      const response = await fetch('http://localhost:5000/api/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonName: finalLessonName,
          capHoc: tenCap,
          lop: tenLop,
          chuDe: tenChuDe,
          boSach: tenSGK,
          thoiLuong: basicInfo.thoiLuong,
          objectives: fullObjectivesPrompt,
          thietBi: `GV: ${basicInfo.thietBiGV || "Máy tính, máy chiếu"}. HS: ${basicInfo.thietBiHS || "SGK, vở ghi"}`,
          teacherNote: customPrompt
        })
      });

      const data = await response.json();

      if (data.content) {
        try {
          // 5. GIẢI MÃ JSON TỪ AI VÀ PHÂN PHỐI VÀO STATE
          const aiData = JSON.parse(data.content);

          // Đổ vào Bảng tiến trình (Mục I) - Kỳ vọng AI trả về cột mucTieu chỉ có số (1), (2)
          if (aiData.tienTrinh) {
            setProcessData(aiData.tienTrinh);
          }

          // Đổ vào Hoạt động chi tiết (Mục II) - Từng Object
          if (aiData.activities) {
            const formattedActs = aiData.activities.map((act, index) => ({
              id: `ai-act-${Date.now()}-${index}`,
              title: act.title || `Hoạt động ${index + 1}`,
              // ĐƯA SỐ HIỆU AI TRẢ VỀ VÀO ĐÂY ĐỂ HIỂN THỊ TRÊN TEXTBOX
              mucTieu: act.mucTieu || "", 
              noiDung: act.noiDung || "",
              sanPham: act.sanPham || "",
              steps: act.steps || [
                { step: "Chuyển giao nhiệm vụ", gv: "", hs: "" },
                { step: "Thực hiện nhiệm vụ", gv: "", hs: "" },
                { step: "Báo cáo, thảo luận", gv: "", hs: "" },
                { step: "Kết luận, nhận định", gv: "", hs: "" }
              ]
            }));
            setActivities(formattedActs);
          }

          // Đổ vào Phụ lục (Mục V)
          if (aiData.appendices) {
            setAppendices(aiData.appendices);
            setBasicInfo(prev => ({
              ...prev,
              phuLuc: aiData.appendices
          }));
          }

          alert("Đã tạo kế hoạch bài dạy thành công!");
        } catch (parseError) {
          console.error("Lỗi parse JSON:", parseError);
          alert("AI trả về sai định dạng JSON. Đang lưu tạm vào Ghi chú.");
          setBasicInfo(prev => ({ ...prev, tienTrinhDayHoc: data.content }));
        }
      } else {
        alert("Lỗi từ AI: " + (data.error || "Không có phản hồi"));
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      alert("Không thể kết nối với Server.");
    } finally {
      setIsGenerating(false);
    }
  };
  const [isPreview, setIsPreview] = useState(false);
  const [processData, setProcessData] = useState([]); // Lưu dữ liệu bảng tiến trình
  //const aiData = JSON.parse(data.content);
  const handleExportWord = () => {
    // 1. Lấy Tên bộ sách (Ví dụ: "Kết nối tri thức")
    const tenSGK = boSgks.find(s => s.id === basicInfo.maSGK)?.ten || "SGK";
    
    // 2. Lấy Tên lớp và xử lý thành định dạng L10, L11...
    const tenLopRaw = lops.find(l => l.id === basicInfo.maLop)?.ten || ""; 
    const soLop = tenLopRaw.replace(/\D/g, ""); // Chỉ lấy số (ví dụ "Lớp 10" -> "10")
    const maLop = soLop ? `L${soLop}` : "LX";

    // 3. Lấy Tên bài học và STT bài
    const selectedBai = listBaiHoc.find(b => b.id === basicInfo.maTenBai);
    const tenBaiRaw = selectedBai?.ten || "BaiHoc"; 
    
    // Tách lấy phần "Bài 34" từ "Bài 34: Nghề phát triển phần mềm"
    const sttBai = tenBaiRaw.split(':')[0].replace(/\s+/g, '');

    // 4. Tạo tên file theo định dạng: L10_KHBD_Bai34_KNTT
    // Viết tắt tên sách (ví dụ: "Kết nối tri thức" -> "KNTT")
    const tenSachVietTat = tenSGK
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();

    const fileName = `${maLop}_KHBD_${sttBai}_${tenSachVietTat}`;
   
    
    // 2. Tìm nội dung chữ của Năng lực đặc thù (Nhóm 2.1)
    // Trong code của bạn dùng selectedMTTP và listMTTP
    const nlucDacThuText = selectedMTTP
      .map(id => listMTTP.find(m => m.id === id)?.noiDung)
      .filter(Boolean)
      .join("; ");

    // 3. Chuẩn bị object objectives đầy đủ
    const objectivesForWord = {
      ...objectives,
      nlucDacThuText: nlucDacThuText,
      // Kiến thức: bạn có thể lấy từ nlucDacThu hoặc một state kiến thức riêng nếu có
      kienThucText: nlucDacThuText 
    };

    const infoForWord = {
      ...basicInfo,
      baiName: tenBaiRaw,
        fileName: fileName, // Truyền tên file đã dựng vào đây
        lop: lops.find(l => l.id === basicInfo.maLop)?.ten || ""
    };

    // Gọi hàm Export từ Service
    exportKHBDToWord(infoForWord, objectivesForWord, processData, activities);
  };
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToDB = async () => {
    // 1. Kiểm tra điều kiện bắt buộc (Dựa trên state hiện tại của bạn)
    // Lưu ý: maTenBai của bạn chính là MaPhanPhoi trong CSDL
    if (!basicInfo.maTenBai || !basicInfo.maNDCB) {
      alert("Vui lòng chọn bài học từ danh sách trước khi lưu!");
      return;
    }

    setIsSaving(true);
    try {
      // 2. Chuẩn bị danh sách mục tiêu (Gom tất cả các loại mục tiêu lại)
      const allObjectives = [
        // Yêu cầu cần đạt & Mục tiêu SGK (Dùng chung selectedMTTP)
        ...selectedMTTP.map(id => {
          const isYCCD = listYCCD.find(y => y.id === id);
          const isMTTP = listMTTP.find(m => m.id === id);
          return {
            type: isYCCD ? 'YCCD' : 'NangLucDacThu',
            ref: id, // MaYCCD hoặc MaMTTP
            content: isYCCD ? isYCCD.noiDung : isMTTP?.noiDung
          };
        }),
        // Năng lực chung
        ...objectives.nangLucChung
          .filter(nl => nl.checked)
          .map(nl => ({ type: 'NangLucChung', ref: nl.id, content: `${nl.label}: ${nl.content}` })),
        // Phẩm chất
        ...objectives.phamChat
          .filter(pc => pc.checked)
          .map(pc => ({ type: 'PhamChat', ref: pc.id, content: `${pc.label}: ${pc.content}` }))
      ];

      // 3. Đóng gói Payload chuẩn
      const currentDH = dinhHuongs.find(dh => dh.MaDH === basicInfo.maDinhHuong);
      const tenDinhHuong = currentDH ? (currentDH.TenDH || currentDH.MaDH) : "";
      const payload = {
        header: {
          maNDCB: basicInfo.maNDCB,
          userId: user?.uid || user?.id || 'GUEST',
          maPhanPhoi: basicInfo.maTenBai, // Trong code của bạn maTenBai lưu ID của phân phối
          ghiChu: `Định hướng: ${tenDinhHuong || ''}. \nPhụ lục: ${basicInfo.phuLuc || ''}`, 
          // THÊM: Gửi thiết bị dạy học
          thietBiGV: basicInfo.thietBiGV, 
          thietBiHS: basicInfo.thietBiHS
        },
        objectives: allObjectives,
        // THÊM: Gửi dữ liệu bảng tổng quan
        processData: processData.map((item, index) => ({
            ten: item.ten || item.HoatDong,
            mucTieu: item.mucTieu || item.MucTieu,
            noiDung: item.noiDung || item.NoiDung,
            phuongPhap: item.phuongPhap || item.PhuongPhap,
            stt: index + 1
        })),
        activities: (activities || []).map(act => ({
          tenHoatDong: act.title || 'Hoạt động không tên',
          // Sử dụng hàm stripHtml ở đây để làm sạch dữ liệu
          mucTieuLienKet: act.mucTieu || '',
          noiDungHoatDong: stripHtml(act.noiDung || ''), 
          spDuKien: stripHtml(act.sanPham || ''), 
          steps: act.steps.map(s => ({
            name: s.step,
            gv: stripHtml(s.gv || ''),
            hs: stripHtml(s.hs || '')
          }))
        }))
      };

      console.log(">>> DỮ LIỆU GỬI LÊN HỆ THỐNG:", payload);

      const response = await fetch('http://localhost:5000/api/save-khbd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (response.ok && result.success) {
          alert("✅ Kế hoạch bài dạy đã được lưu vào hệ thống thành công!");
        } else {
          alert("❌ Lỗi từ Server: " + result.error);
        }
      } else {
        const errorText = await response.text();
        console.error("Lỗi HTML trả về:", errorText);
        alert("❌ Lỗi hệ thống (Server Error). Vui lòng kiểm tra Console.");
      }

    } catch (error) {
      console.error("Lỗi Save:", error);
      alert("❌ Không thể kết nối đến máy chủ.");
    } finally {
      setIsSaving(false);
    }
  };
  
  //UI--------------------------------------------------------------------------------
  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: 'auto', bgcolor: '#f8f9fa' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', textAlign: 'center', color: '#1a237e' }}>
        SOẠN THẢO KẾ HOẠCH BÀI DẠY (5512)
      </Typography>

      {/* NHÓM 1: THÔNG TIN CHUNG - MỖI Ô MỘT HÀNG BIỆT LẬP */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              color: '#1a237e', 
              fontWeight: 'bold' 
            }}
          >
            <Database size={24} /> Nhóm 1: Thông tin chung
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* Sử dụng Box với display block để ép xuống dòng tuyệt đối */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* 1. Cấp học */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                1. Chọn Cấp học:
              </Typography>
              <TextField 
                select 
                fullWidth 
                value={basicInfo.maCap || ''} 
                onChange={(e) => setBasicInfo({
                  ...basicInfo, 
                  maCap: e.target.value, 
                  maLop: '', maChuDe: '', maDinhHuong: '', maNDCB: '', maSGK: '', maTenBai: '', thoiLuong: '' 
                })}
              >
                {capHocs.length === 0 && <MenuItem disabled>Đang tải dữ liệu...</MenuItem>}
                {capHocs.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.ten}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 2. Lớp */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                2. Chọn Lớp:
              </Typography>
              <TextField 
                select 
                fullWidth 
                disabled={!basicInfo.maCap} 
                value={basicInfo.maLop || ''} 
                onChange={(e) => setBasicInfo({
                  ...basicInfo, 
                  maLop: e.target.value, 
                  maChuDe: '', maDinhHuong: '', maNDCB: '', maSGK: '', maTenBai: '', thoiLuong: ''
                })}
              >
                {lops.length === 0 && <MenuItem disabled>Vui lòng chọn cấp học trước</MenuItem>}
                {lops.map((lop) => (
                  <MenuItem key={lop.id} value={lop.id}>{lop.ten}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 3. Chủ đề */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                3. Chọn Chủ đề:
              </Typography>
              <TextField 
                select 
                fullWidth 
                disabled={!basicInfo.maLop} 
                value={basicInfo.maChuDe || ''} 
                onChange={(e) => setBasicInfo({
                  ...basicInfo, 
                  maChuDe: e.target.value, 
                  maDinhHuong: '', maNDCB: '', maSGK: '', maTenBai: '', thoiLuong: ''
                })}
              >
                {chuDes.length === 0 && <MenuItem disabled>Vui lòng chọn lớp học trước</MenuItem>}
                {chuDes.map((cd) => (
                  <MenuItem key={cd.id} value={cd.id}>{cd.ten}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 4. Định hướng */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                4. Định hướng nghề nghiệp / Phát triển năng lực:
              </Typography>
              <TextField
                select
                fullWidth
                disabled={!basicInfo.maChuDe} 
                value={basicInfo.maDinhHuong || ''} 
                onChange={(e) => setBasicInfo({
                  ...basicInfo, 
                  maDinhHuong: e.target.value, 
                  maNDCB: '', maSGK: '', maTenBai: '', thoiLuong: ''
                })}
              >
                {dinhHuongs.length === 0 && <MenuItem disabled>Đang tải định hướng...</MenuItem>}
                {dinhHuongs.map((dh) => (
                  <MenuItem key={dh.MaDH} value={dh.MaDH}>{dh.TenDH || dh.MaDH}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 5. Chọn Nội dung cơ bản */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                5. Nội dung cơ bản (theo chương trình):
              </Typography>
              <TextField 
                select 
                fullWidth 
                disabled={!basicInfo.maDinhHuong} 
                value={basicInfo.maNDCB || ''} 
                onChange={(e) => setBasicInfo({
                  ...basicInfo, 
                  maNDCB: e.target.value, 
                  maSGK: '', maTenBai: '', thoiLuong: ''
                })}
              >
                {listNDCB.length === 0 ? (
                  <MenuItem disabled value="">Không có dữ liệu phù hợp</MenuItem>
                ) : (
                  listNDCB.map((nd) => (
                    <MenuItem key={nd.id} value={nd.id}>{nd.ten}</MenuItem>
                  ))
                )}
              </TextField>
            </Box>

            {/* --- KHỐI CƠ SỞ DỮ LIỆU SGK: CHỈ HIỆN KHI LÀ CẤP 3 --- */}
            {basicInfo.maCap === 'C3' && (
              <>
                {/* 6. Bộ sách */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    6. Chọn Bộ sách giáo khoa:
                  </Typography>
                  <TextField 
                    select 
                    fullWidth 
                    disabled={!basicInfo.maNDCB}
                    value={basicInfo.maSGK || ''} 
                    onChange={(e) => setBasicInfo({
                      ...basicInfo, 
                      maSGK: e.target.value, 
                      maTenBai: '', thoiLuong: ''
                    })}
                  >
                    {boSgks.length === 0 ? (
                      <MenuItem disabled>Đang tải bộ sách...</MenuItem>
                    ) : (
                      boSgks.map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.ten}</MenuItem>
                      ))
                    )}
                  </TextField>
                </Box>

                {/* 7. Bài học */}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    7. Tên bài học chi tiết:
                  </Typography>
                  <TextField 
                    select 
                    fullWidth 
                    disabled={!basicInfo.maSGK} 
                    value={basicInfo.maTenBai || ''} 
                    onChange={(e) => {
                        const selectedBai = listBaiHoc.find(b => b.id === e.target.value);
                        setBasicInfo({
                            ...basicInfo, 
                            maTenBai: e.target.value,
                            thoiLuong: selectedBai ? selectedBai.SoTiet : 1 // Tự động điền số tiết từ CSDL
                        });
                    }}
                  >
                    {listBaiHoc.length === 0 ? (
                      <MenuItem disabled>Không tìm thấy bài học phù hợp</MenuItem>
                    ) : (
                      listBaiHoc.map((bai) => (
                        <MenuItem key={bai.id} value={bai.id}>{bai.ten}</MenuItem>
                      ))
                    )}
                  </TextField>
                </Box>
              </>
            )}

            {/* 8. Thời lượng - Luôn hiện nhưng bị disabled nếu là Cấp 3 (vì đã tự điền) hoặc để người dùng tự chọn nếu cấp học khác */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', color: '#555' }}>
                8. Thời lượng giảng dạy (tiết):
              </Typography>
              <TextField 
                select 
                fullWidth 
                value={basicInfo.thoiLuong || ''} 
                onChange={(e) => setBasicInfo({...basicInfo, thoiLuong: e.target.value})}
              >
                {[1, 2, 3, 4, 5].map((t) => (
                  <MenuItem key={t} value={t}>{t} tiết</MenuItem>
                ))}
              </TextField>
            </Box>

          </Box>
        </CardContent>
      </Card>

      {/* NHÓM 2: MỤC TIÊU */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#1976d2' }}>
            <Target size={22} /> Nhóm 2: Mục tiêu bài dạy
          </Typography>

          {/* 2.1. YÊU CẦU CẦN ĐẠT (Từ Chương trình) */}
          {/* 2.1. YÊU CẦU CẦN ĐẠT (Dùng chung state selectedMTTP) */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, color: '#d32f2f' }}>
              2.1. Yêu cầu cần đạt (Chương trình môn học)
          </Typography>
          <Box sx={{ pl: 1, mt: 1 }}>
              {listYCCD.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 2 }}>
                      Vui lòng chọn Nội dung cơ bản để hiển thị YCCD.
                  </Typography>
              ) : (
                  listYCCD.map((yccd) => (
                      <Box key={`yccd-${yccd.id}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                          <Checkbox 
                              size="small" 
                              // Kiểm tra ID của YCCD có nằm trong mảng dùng chung không
                              checked={selectedMTTP.includes(yccd.id)}
                              onChange={() => handleToggleMTTP(yccd.id)}
                              sx={{ mt: 0.5 }}
                          />
                          <TextField 
                              fullWidth multiline size="small" 
                              value={yccd.noiDung}
                              // Chỉnh sửa nội dung trực tiếp nếu cần
                              onChange={(e) => handleEditObjective('YCCD', yccd.id, e.target.value)}
                              helperText={yccd.tenNL ? `Gắn với: ${yccd.tenNL}` : ""}
                          />
                      </Box>
                  ))
              )}
          </Box>

          {/* 2.2. MỤC TIÊU CỤ THỂ (Chỉ Cấp 3 mới hiện) */}
          {basicInfo.maCap === 'C3' && (
              <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      2.2. Mục tiêu cụ thể hóa (Theo Sách giáo khoa)
                  </Typography>
                  <Box sx={{ pl: 1, mt: 1 }}>
                      {listMTTP.length === 0 ? (
                          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 2 }}>
                              Chọn bài học để hiển thị mục tiêu SGK.
                          </Typography>
                      ) : (
                          listMTTP.map((mt) => (
                              <Box key={`sgk-${mt.id}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                                  <Checkbox 
                                      size="small" 
                                      checked={selectedMTTP.includes(mt.id)}
                                      onChange={() => handleToggleMTTP(mt.id)}
                                      sx={{ mt: 0.5 }}
                                  />
                                  <TextField 
                                      fullWidth multiline size="small" 
                                      value={mt.noiDung}
                                      onChange={(e) => handleEditObjective('SGK', mt.id, e.target.value)}
                                  />
                              </Box>
                          ))
                      )}
                  </Box>
              </>
          )}

          <Divider sx={{ my: 2 }} />
    
          

          {/* 2.2. NĂNG LỰC CHUNG & PHẨM CHẤT - GIỮ NGUYÊN NHƯ CŨ */}
          {/* 2.2. NĂNG LỰC CHUNG & PHẨM CHẤT */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>2.2. Năng lực chung & Phẩm chất</Typography>
          <Grid container spacing={3}>
            {/* CỘT NĂNG LỰC CHUNG */}
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">Năng lực chung:</Typography>
              {objectives.nangLucChung.map((nl, idx) => (
                <Box key={nl.id} sx={{ mb: 1 }}>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        size="small" 
                        checked={nl.checked}
                        onChange={(e) => {
                          const newNLC = [...objectives.nangLucChung];
                          newNLC[idx].checked = e.target.checked;
                          setObjectives({ ...objectives, nangLucChung: newNLC });
                        }}
                      />
                    } 
                    label={nl.label} 
                  />
                  <TextField 
                    fullWidth multiline rows={1} size="small" 
                    placeholder="Nội dung hiển thị..." 
                    value={nl.content}
                    onChange={(e) => {
                      const newNLC = [...objectives.nangLucChung];
                      newNLC[idx].content = e.target.value;
                      setObjectives({ ...objectives, nangLucChung: newNLC });
                    }}
                  />
                </Box>
              ))}
            </Grid>

            {/* CỘT PHẨM CHẤT */}
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">Phẩm chất:</Typography>
              {objectives.phamChat.map((pc, idx) => (
                <Box key={pc.id} sx={{ mb: 1 }}>
                  <FormControlLabel 
                    control={
                      <Checkbox 
                        size="small" 
                        checked={pc.checked}
                        onChange={(e) => {
                          const newPC = [...objectives.phamChat];
                          newPC[idx].checked = e.target.checked;
                          setObjectives({ ...objectives, phamChat: newPC });
                        }}
                      />
                    } 
                    label={pc.label} 
                  />
                  <TextField 
                    fullWidth multiline rows={1} size="small" 
                    placeholder="Nội dung hiển thị..." 
                    value={pc.content}
                    onChange={(e) => {
                      const newPC = [...objectives.phamChat];
                      newPC[idx].content = e.target.value;
                      setObjectives({ ...objectives, phamChat: newPC });
                    }}
                  />
                </Box>
              ))}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* NHÓM 3: THIẾT BỊ DẠY HỌC & CHIẾN LƯỢC SƯ PHẠM */}
      <Card sx={{ mb: 3, border: '1px solid #e0e0e0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#1976d2' }}>
            <Wrench size={22} /> Nhóm 3: Thiết bị dạy học và Chiến lược thiết kế
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '50%', color: '#555' }}>Thiết bị Giáo viên</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '50%', color: '#555' }}>Thiết bị Học sinh</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <TextField 
                      fullWidth multiline rows={2} variant="standard" 
                      value={basicInfo.thietBiGV || ''}
                      onChange={(e) => setBasicInfo({...basicInfo, thietBiGV: e.target.value})}
                      placeholder="Máy tính, máy chiếu, học liệu số..." 
                      InputProps={{ disableUnderline: true, sx: { fontSize: '0.9rem' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField 
                      fullWidth multiline rows={2} variant="standard" 
                      value={basicInfo.thietBiHS || ''}
                      onChange={(e) => setBasicInfo({...basicInfo, thietBiHS: e.target.value})}
                      placeholder="Sách giáo khoa, vở ghi, dụng cụ học tập..." 
                      InputProps={{ disableUnderline: true, sx: { fontSize: '0.9rem' } }}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
    
          {/* PHẦN CHIẾN LƯỢC SƯ PHẠM - ĐÃ NÂNG CẤP */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: '#2e7d32' }}>
              <Edit3 size={18} /> Định hướng thiết kế & Gợi ý từ Chuyên gia
            </Typography>
            
            {/* Chip hiển thị trạng thái hỗ trợ */}
            <Typography variant="caption" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', px: 1, borderRadius: 1, fontWeight: 'bold' }}>
              Dựa trên CV 5555 & Thuyết kiến tạo
            </Typography>
          </Box>

          {/* Các nút bấm chọn nhanh chiến lược */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {PEDAGOGY_STRATEGIES.map((strategy) => (
              <Button 
                key={strategy.label}
                variant="outlined" 
                size="small"
                color="success"
                onClick={() => setCustomPrompt(strategy.prompt)}
                sx={{ 
                  borderRadius: '20px', 
                  textTransform: 'none', 
                  fontSize: '0.75rem',
                  borderColor: '#A5D6A7',
                  '&:hover': { bgcolor: '#f1f8e9' }
                }}
              >
                {strategy.label}
              </Button>
            ))}
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Mô tả ý đồ riêng của bạn hoặc chọn gợi ý phía trên..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            sx={{ 
              bgcolor: '#fffde7', // Màu vàng nhạt đặc trưng cho phần "ghi chú ý tưởng"
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#fff176' },
                '&:hover fieldset': { borderColor: '#fbc02d' },
              }
            }}
          />
          
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            * AI sẽ phân tích các YCCD đã chọn ở Nhóm 2 kết hợp với Định hướng thiết kế ở trên để tạo ra các hoạt động học tập có tính sư phạm cao.
          </Typography>
        </CardContent>
      </Card>

      {/* KHU VỰC ĐIỀU KHIỂN AI */}
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Button 
          variant="contained" size="large" color="secondary" 
          onClick={handleGenerateAI}
          disabled={isGenerating || !basicInfo.maTenBai}
          startIcon={isGenerating ? null : <PlayCircle size={24} />}
          sx={{ px: 6, py: 2, borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(156, 39, 176, 0.3)' }}
        >
          {isGenerating ? "⏳ Đang soạn thảo..." : "✨ Soạn kế hoạch với AI"}
        </Button>
      </Box>

      {/* I. BẢNG TIẾN TRÌNH DẠY HỌC - LUÔN HIỂN THỊ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#ed6c02', mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database size={22} /> I. BẢNG TIẾN TRÌNH DẠY HỌC (TỔNG QUAN)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#fff3e0' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Hoạt động</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Mục tiêu</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Nội dung trọng tâm</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Phương pháp/Kỹ thuật</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processData.length > 0 ? (
                  processData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: '#e65100' }}>{item.ten || item.HoatDong}</TableCell>
                      <TableCell>{item.mucTieu || item.MucTieu}</TableCell>
                      <TableCell>{item.noiDung || item.NoiDung}</TableCell>
                      <TableCell>{item.phuongPhap || item.PhuongPhap}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary', fontStyle: 'italic' }}>
                      {isGenerating ? "AI đang tổng hợp dữ liệu bảng..." : "Chưa có dữ liệu. Hãy nhấn 'Soạn kế hoạch với AI'."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>


      {/* NHÓM 4: TIẾN TRÌNH DẠY HỌC */}
      <Card sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: '#1565c0', fontWeight: '600' }}>
            <PlayCircle size={24} /> Nhóm 4: Tiến trình dạy học
          </Typography>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="activities">
              {(provided) => (
                <Box {...provided.droppableProps} ref={provided.innerRef}>
                  {activities.map((activity, index) => (
                    <Draggable key={activity.id} draggableId={activity.id} index={index}>
                      {(provided) => (
                        <Paper 
                          ref={provided.innerRef} 
                          {...provided.draggableProps} 
                          elevation={0} 
                          sx={{ 
                            p: 3, 
                            mb: 5, 
                            border: '1px solid #cfd8dc', 
                            borderLeft: '5px solid #1565c0',
                            bgcolor: '#fff',
                            position: 'relative'
                          }}
                        >
                          {/* 1. Header: Nút kéo - Tên hoạt động - Nút xóa */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                            {/* NÚT DI CHUYỂN ĐÃ QUAY TRỞ LẠI Ở ĐÂY */}
                            <Box 
                              {...provided.dragHandleProps} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                cursor: 'grab', 
                                p: 0.5,
                                borderRadius: '4px',
                                '&:hover': { bgcolor: '#f0f0f0' }
                              }}
                            >
                              <GripVertical size={24} color="#90a4ae" />
                            </Box>

                            <Typography sx={{ fontWeight: 'bold', color: '#1565c0', whiteSpace: 'nowrap' }}>
                              Hoạt động {index + 1}:
                            </Typography>
                            
                            <TextField 
                              fullWidth 
                              variant="outlined" 
                              size="small"
                              placeholder="Nhập tên hoạt động..."
                              value={activity.title} 
                              onChange={(e) => {
                                const newActs = [...activities];
                                newActs[index].title = e.target.value;
                                setActivities(newActs);
                              }}
                              InputProps={{ sx: { fontWeight: '500', bgcolor: '#f8f9fa' } }} 
                            />

                            <IconButton 
                              color="error" 
                              size="small" 
                              onClick={() => setActivities(activities.filter(a => a.id !== activity.id))}
                            >
                              <Trash2 size={20} />
                            </IconButton>
                          </Box>

                          {/* 2. Mục tiêu */}
                          <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: '4px' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#1565c0' }}>
                              Mục tiêu hoạt động (Số hiệu trích dẫn):
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Ví dụ: (1), (2)..."
                              value={activity.mucTieu || ""} 
                              onChange={(e) => {
                                const newActs = [...activities];
                                newActs[index].mucTieu = e.target.value;
                                setActivities(newActs);
                              }}
                              sx={{ bgcolor: '#fff' }}
                            />
                          </Box>

                          {/* 3. Nội dung & Sản phẩm (Dàn hàng ngang 50-50) */}
                          <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Nội dung học tập:</Typography>
                              <Box sx={{ '& .ql-editor': { minHeight: '120px' } }}>
                                <ReactQuill theme="snow" value={activity.noiDung} onChange={(v) => {
                                  const newActs = [...activities];
                                  newActs[index].noiDung = v;
                                  setActivities(newActs);
                                }} />
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Sản phẩm dự kiến:</Typography>
                              <Box sx={{ '& .ql-editor': { minHeight: '120px' } }}>
                                <ReactQuill theme="snow" value={activity.sanPham} onChange={(v) => {
                                  const newActs = [...activities];
                                  newActs[index].sanPham = v;
                                  setActivities(newActs);
                                }} />
                              </Box>
                            </Grid>
                          </Grid>

                          {/* 4. Bảng tổ chức thực hiện (Full Width) */}
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#1565c0' }}>
                            Tổ chức thực hiện (4 bước 5512):
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                  <TableCell sx={{ width: '18%', fontWeight: 'bold', borderRight: '1px solid #e0e0e0' }}>Bước</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Nội dung chi tiết (GV & HS)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {activity.steps.map((step, sIdx) => (
                                  <TableRow key={sIdx}>
                                    <TableCell sx={{ fontWeight: '600', verticalAlign: 'top', pt: 2, borderRight: '1px solid #e0e0e0', color: '#455a64' }}>
                                      {step.step}
                                    </TableCell>
                                    <TableCell sx={{ p: 2 }}>
                                      <Stack spacing={2}>
                                        <Box>
                                          <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            ● Giáo viên:
                                          </Typography>
                                          <TextField 
                                            fullWidth multiline variant="standard" 
                                            value={step.gv} 
                                            onChange={(e) => {
                                              const newActs = [...activities];
                                              newActs[index].steps[sIdx].gv = e.target.value;
                                              setActivities(newActs);
                                            }}
                                          />
                                        </Box>
                                        <Box>
                                          <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            ● Học sinh:
                                          </Typography>
                                          <TextField 
                                            fullWidth multiline variant="standard" 
                                            value={step.hs} 
                                            onChange={(e) => {
                                              const newActs = [...activities];
                                              newActs[index].steps[sIdx].hs = e.target.value;
                                              setActivities(newActs);
                                            }}
                                            sx={{ '& .MuiInputBase-input': { color: '#2e7d32', fontStyle: 'italic' } }}
                                          />
                                        </Box>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>

          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<Plus />} 
            onClick={() => setActivities([...activities, { id: Date.now().toString(), title: '', steps: activityTemplate }])}
            sx={{ mt: 2, bgcolor: '#1565c0', py: 1.5 }}
          >
            Thêm hoạt động học mới
          </Button>
        </CardContent>
      </Card>
      {/* NHÓM 5: PHỤ LỤC & PHIẾU HỌC TẬP */}
      <Card sx={{ mb: 3, border: '1px solid #9c27b0', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Header dải màu tím nhẹ */}
        <Box sx={{ 
          bgcolor: '#fdf7ff', 
          p: 2, 
          borderBottom: '1px solid #e1bee7', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7b1fa2', fontWeight: 'bold' }}>
            <Plus size={22} /> Nhóm 5: Phụ lục & Học liệu bổ trợ
          </Typography>
          
          <Button
            variant={isPreviewAppendices ? "outlined" : "contained"}
            size="small"
            sx={{ 
              bgcolor: isPreviewAppendices ? 'transparent' : '#9c27b0',
              color: isPreviewAppendices ? '#9c27b0' : '#fff',
              '&:hover': { bgcolor: isPreviewAppendices ? '#f3e5f5' : '#7b1fa2' }
            }}
            onClick={() => setIsPreviewAppendices(!isPreviewAppendices)}
            startIcon={isPreviewAppendices ? <Edit3 size={18} /> : <Eye size={18} />}
          >
            {isPreviewAppendices ? "Chỉnh sửa Markdown" : "Xem bản xem trước"}
          </Button>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Cột chính bên trái */}
            <Grid item xs={12} md={9}>
              {isPreviewAppendices ? (
                <Box sx={{ 
                  p: 4, 
                  border: '1px solid #e1bee7', 
                  borderRadius: '4px', 
                  bgcolor: '#fff',
                  minHeight: '400px', 
                  maxHeight: '600px', 
                  overflowY: 'auto',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                  // Style cho nội dung Markdown bên trong
                  '& .markdown-content': {
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    color: '#333',
                    '& h1, & h2, & h3': { color: '#7b1fa2', mt: 2, mb: 1, borderBottom: '1px solid #f3e5f5', pb: 0.5 },
                    '& table': { borderCollapse: 'collapse', width: '100%', my: 2 },
                    '& th, & td': { border: '1px solid #e1bee7', p: 1 },
                    '& th': { bgcolor: '#fdf7ff' },
                    '& ul, & ol': { pl: 3 }
                  }
                }}>
                  <div className="markdown-content">
                    <ReactMarkdown>{appendices || "*Chưa có nội dung phụ lục. Hãy để AI tạo hoặc tự nhập nội dung Markdown...*"}</ReactMarkdown>
                  </div>
                </Box>
              ) : (
                <TextField
                  fullWidth 
                  multiline 
                  rows={16}
                  variant="outlined"
                  placeholder="Nhập nội dung phụ lục (Sử dụng định dạng Markdown để hiển thị bảng, danh sách, in đậm...)"
                  value={appendices}
                  onChange={(e) => setAppendices(e.target.value)}
                  sx={{ 
                    bgcolor: '#fafafa',
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'monospace', // Để viết Markdown chuẩn hơn
                      fontSize: '0.9rem'
                    }
                  }}
                />
              )}
              <Typography variant="caption" sx={{ color: '#9e9e9e', mt: 1, display: 'block' }}>
                💡 Mẹo: Sử dụng cú pháp Markdown để tạo Bảng đánh giá (Rubric) hoặc Phiếu học tập chuyên nghiệp.
              </Typography>
            </Grid>
            
            {/* Cột gợi ý công cụ bên phải */}
            <Grid item xs={12} md={3}>
              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: '8px', border: '1px dashed #9c27b0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: '#7b1fa2', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ✨ Gợi ý công cụ số
                  </Typography>
                  <Stack spacing={1.5}>
                    {[
                      { name: 'Đánh giá: Quizizz / Kahoot', desc: 'Game hóa bài tập trắc nghiệm.' },
                      { name: 'Thảo luận: Padlet / Jamboard', desc: 'Bảng trắng cộng tác nhóm.' },
                      { name: 'Sáng tạo: Canva / Infographic', desc: 'Thiết kế sơ đồ, poster.' },
                      { name: 'Mô phỏng: Phet / Tinkercad', desc: 'Thí nghiệm ảo, vẽ 3D.' }
                    ].map((tool, i) => (
                      <Box key={i} sx={{ 
                        p: 1.5, 
                        bgcolor: '#fff', 
                        borderRadius: '6px', 
                        border: '1px solid #e1bee7',
                        transition: '0.2s',
                        '&:hover': { boxShadow: '0 2px 8px rgba(156, 39, 176, 0.2)', borderColor: '#9c27b0' }
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7b1fa2', fontSize: '0.85rem' }}>{tool.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#616161', lineHeight: 1.2 }}>{tool.desc}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#9e9e9e', textTransform: 'uppercase' }}>
                    Trạng thái phụ lục
                  </Typography>
                  <Typography variant="body2" sx={{ color: appendices ? '#4caf50' : '#ff9800', fontWeight: '500' }}>
                    {appendices ? '● Đã có nội dung' : '● Đang trống'}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Box sx={{ textAlign: 'center', mt: 5, pb: 5, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {/* Nút Xuất Word mới */}
        <Button 
          variant="outlined" 
          color="primary" 
          size="large" 
          startIcon={<Eye size={28} />} // Bạn có thể thay bằng icon Download nếu muốn
          onClick={handleExportWord}
          sx={{ px: 5, py: 1.5, fontSize: '1.1rem', borderRadius: '50px' }}
        >
          XUẤT FILE WORD (5512)
        </Button>

        {/* Nút Lưu CSDL cũ */}
        <Button 
            variant="contained" 
            color="success" 
            size="large" 
            disabled={isSaving}
            // Nếu đang lưu thì hiện vòng quay, nếu không thì hiện icon Save
            startIcon={isSaving ? <CircularProgress size={24} color="inherit" /> : <Save size={28} />} 
            onClick={handleSaveToDB}
            sx={{ 
                px: 8, 
                py: 1.5, 
                fontSize: '1.2rem', 
                borderRadius: '50px',
                boxShadow: '0 4px 14px 0 rgba(76, 175, 80, 0.39)'
            }}
        >
            {isSaving ? "ĐANG LƯU..." : "LƯU VÀO HỆ THỐNG"}
        </Button>
      </Box>
    </Box>
  );
};

const activityTemplate = [
  { step: 'Chuyển giao nhiệm vụ', gv: '', hs: '' },
  { step: 'Thực hiện nhiệm vụ', gv: '', hs: '' },
  { step: 'Báo cáo nhiệm vụ', gv: '', hs: '' },
  { step: 'Đánh giá kết quả', gv: '', hs: '' },
];

export default LessonPlanEditor;
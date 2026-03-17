import { Document,PageOrientation, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalMergeType} from "docx";
import { saveAs } from "file-saver";






/**
 * Xuất file Word cho Đề thi hoặc Đáp án
 * @param {Array} questions - Danh sách câu hỏi kèm nội dung
 * @param {Object} examInfo - Thông tin tiêu đề và cấu hình điểm (scores)
 * @param {Boolean} isAnswerMode - true: Xuất Đáp án, false: Xuất Đề thi
 */
export const exportToWordStandard = async (questions, examInfo, isAnswerMode = false,options = {}) => {
    const emptyBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const s = examInfo.scores || {};

    // --- HELPER: Tính điểm cho từng câu hỏi dựa trên cấu hình MTKT ---
    // --- HELPER: Tính điểm cho từng câu hỏi dựa trên mã mức độ riêng biệt ---
    const getQPoint = (q) => {
        const type = q.maLoaiCauHoi;
        //const level = String(q.maMucDo || ""); // Ví dụ: 'MucDo_01'
        const level = String(q.maMucDo || "").toLowerCase();

        if (type === 'tn_nhieu_lc') return parseFloat(s.tnkq) || 0;
        if (type === 'tn_dung_sai') return parseFloat(s.dungSai) || 0;
        if (type === 'tl_ngan') return parseFloat(s.tlNgan) || 0;
        
        if (type === 'tu_luan') {
            // Khớp chính xác với mã của bạn
            //if (level === 'MucDo_01') return parseFloat(s.tuLuanNB) || 0; // Biết
            //if (level === 'MucDo_02') return parseFloat(s.tuLuanTH) || 0; // Hiểu
            //if (level === 'MucDo_03') return parseFloat(s.tuLuanVD) || 0; // Vận dụng
            // Kiểm tra cả 2 trường hợp: Mã CSDL (MucDo_01) hoặc Mã soạn thảo trực tiếp (nb, th, vd)
            if (level === 'mucdo_01' || level === 'nb') return parseFloat(s.tuLuanNB) || 0;
            if (level === 'mucdo_02' || level === 'th') return parseFloat(s.tuLuanTH) || 0;
            if (level === 'mucdo_03' || level === 'vd' || level === 'vận dụng') return parseFloat(s.tuLuanVD) || 0;
        }
        return 0;
    };
    // --- 1. HEADER TABLE ---
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: emptyBorder, bottom: emptyBorder, left: emptyBorder, right: emptyBorder, insideHorizontal: emptyBorder, insideVertical: emptyBorder },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examInfo.schoolName || "SỞ GIÁO DỤC VÀ ĐÀO TẠO", bold: true, size: 24 })] }),
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: isAnswerMode ? "ĐÁP ÁN CHÍNH THỨC" : "ĐỀ CHÍNH THỨC", bold: true, size: 24, underline: {} })] }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "KIỂM TRA ĐỊNH KỲ NĂM HỌC 2025-2026", bold: true, size: 24 })] }),
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Môn: ${examInfo.subject} - Lớp: ${examInfo.grade}`, bold: true, size: 24 })] }),
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Thời gian làm bài: ${examInfo.duration || 45} phút`, italics: true, size: 24 })] }),
                        ],
                    }),
                ],
            }),
        ],
    });

    const sections = [];

    // --- Phân loại câu hỏi ---
    const part1List = questions.filter(q => q.maLoaiCauHoi === 'tn_nhieu_lc');
    const part2List = questions.filter(q => q.maLoaiCauHoi === 'tn_dung_sai');
    const part3List = questions.filter(q => ['tl_ngan', 'tu_luan'].includes(q.maLoaiCauHoi));

    // ============================================================
    // PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN
    // ============================================================
    if (part1List.length > 0) {
        const totalP1 = (part1List.length * (parseFloat(s.tnkq) || 0)).toFixed(2);
        sections.push(new Paragraph({ 
            spacing: { before: 400 }, 
            children: [
                new TextRun({ text: "PHẦN I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn.", bold: true, size: 24 }),
                new TextRun({ text: ` (${totalP1} điểm)`, bold: true, size: 24, italics: true })
            ] 
        }));
        
        if (!isAnswerMode) {
            sections.push(new Paragraph({ children: [new TextRun({ text: `Thí sinh trả lời từ câu 1 đến câu ${part1List.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`, italics: true, size: 24 })] }));
            part1List.forEach((q, i) => {
                const content = q.content || {};
                sections.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `Câu ${i + 1}: `, bold: true }), new TextRun({ text: content.noiDung || "" })] }));
                const opts = content.options || ["", "", "", ""];
                sections.push(new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: emptyBorder, bottom: emptyBorder, left: emptyBorder, right: emptyBorder, insideHorizontal: emptyBorder, insideVertical: emptyBorder },
                    rows: [new TableRow({
                        children: opts.map((opt, idx) => new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: `${String.fromCharCode(65 + idx)}. `, bold: true }), new TextRun({ text: (typeof opt === 'object' ? opt.text : opt) || "" })] })]
                        }))
                    })]
                }));
            });
        } else {
            // Hiển thị bảng đáp án gọn gàng cho Part I
            const rows = [];
            for (let i = 0; i < part1List.length; i += 10) {
                const chunk = part1List.slice(i, i + 10);
                // Hàng số thứ tự câu
                rows.push(new TableRow({ 
                    children: chunk.map((_, idx) => new TableCell({ shading: { fill: "F2F2F2" }, children: [new Paragraph({ text: (i + idx + 1).toString(), alignment: AlignmentType.CENTER, bold: true })] })) 
                }));
                // Hàng đáp án đúng
                rows.push(new TableRow({ 
                    children: chunk.map(q => new TableCell({ children: [new Paragraph({ text: String.fromCharCode(65 + (q.content?.correct ?? 0)), alignment: AlignmentType.CENTER, bold: true })] })) 
                }));
            }
            sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, spacing: { before: 200 } }));
        }
    }

    // ============================================================
    // PHẦN II: TRẮC NGHIỆM ĐÚNG SAI
    // ============================================================
    if (part2List.length > 0) {
        const totalP2 = (part2List.length * (parseFloat(s.dungSai) || 0)).toFixed(2);
        sections.push(new Paragraph({ 
            spacing: { before: 400 }, 
            children: [
                new TextRun({ text: "PHẦN II. Câu hỏi trắc nghiệm Đúng - Sai.", bold: true, size: 24 }),
                new TextRun({ text: ` (${totalP2} điểm)`, bold: true, size: 24, italics: true })
            ] 
        }));

        part2List.forEach((q, i) => {
            const content = q.content || {};
            sections.push(new Paragraph({ 
                spacing: { before: 200 }, 
                children: [
                    new TextRun({ text: `Câu ${i + 1}: `, bold: true }), 
                    new TextRun({ text: content.noiDung || "" }),
                    new TextRun({ text: ` (${s.dungSai}đ cho 4 ý)`, italics: true, size: 20, color: "555555" })
                ] 
            }));
            
            (content.subQuestions || []).forEach((sub, idx) => {
                const answerText = isAnswerMode ? (sub.answer ? " - Đúng" : " - Sai") : "";
                sections.push(new Paragraph({ 
                    indent: { left: 400 }, 
                    children: [
                        new TextRun({ text: `${String.fromCharCode(97 + idx)}) ${sub.text || ""}` }),
                        new TextRun({ text: answerText, bold: true, color: sub.answer ? "008000" : "FF0000" })
                    ] 
                }));
            });
        });
    }

    // ============================================================
    // PHẦN III: TRẢ LỜI NGẮN / TỰ LUẬN
    // ============================================================
    if (part3List.length > 0) {
        const totalP3 = part3List.reduce((sum, q) => sum + getQPoint(q), 0).toFixed(2);

        sections.push(new Paragraph({ 
            spacing: { before: 400 }, 
            children: [
                new TextRun({ text: "PHẦN III. Câu hỏi trả lời ngắn / Tự luận.", bold: true, size: 24 }),
                new TextRun({ text: ` (${totalP3} điểm)`, bold: true, size: 24, italics: true })
            ] 
        }));
        
        part3List.forEach((q, i) => {
            const content = q.content || {};
            const p = getQPoint(q);
            sections.push(new Paragraph({ 
                spacing: { before: 200 }, 
                children: [
                    new TextRun({ text: `Câu ${i + 1} (${p}đ): `, bold: true }), 
                    new TextRun({ text: content.noiDung || "" })
                ] 
            }));
            
            if (isAnswerMode) {
                sections.push(new Paragraph({ 
                    indent: { left: 400 }, 
                    spacing: { before: 100 },
                    children: [
                        new TextRun({ text: "Hướng dẫn trả lời: ", italics: true, color: "555555" }),
                        new TextRun({ text: content.answer || content.guide || "(Chưa có đáp án)" })
                    ] 
                }));
            }
        });
    }

    // --- TẠO DOCUMENT ---
    const doc = new Document({
        styles: {
            default: { document: { run: { size: 24, font: "Times New Roman" } } }
        },
        sections: [{
            properties: {
                page: { 
                    margin: { top: "2cm", right: "2cm", bottom: "2cm", left: "2.5cm" },
                    size: { width: "21cm", height: "29.7cm" } 
                }
            },
            children: [
                headerTable, 
                ...sections, 
                new Paragraph({ 
                    alignment: AlignmentType.CENTER, 
                    spacing: { before: 600 }, 
                    children: [new TextRun({ text: "--- HẾT ---", bold: true })] 
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    if (options.getBlob) {
        return blob; // Trả về blob và DỪNG HÀM TẠI ĐÂY (không chạy xuống saveAs)
    } else {
        // CHỈ TẢI VỀ MÁY khi không dùng options.getBlob
        const fileName = isAnswerMode ? `Dap_An_${examInfo.subject}.docx` : `De_Thi_${examInfo.subject}.docx`;
        saveAs(blob, fileName);
        return null; 
    }
    
};
//word cho ma trận trực tiếp


//export const exportToWord7991Direct = async (header, matrixData, questions) => {


//





export const exportToWord7991Direct = async (header, matrixRows, pointConfig,options = {}) => {
    // Thêm dòng console.log này để kiểm tra dữ liệu thực tế lúc chuẩn bị in
    console.log("Dữ liệu nhận vào hàm Export:", { header, matrixRows, pointConfig });

    if (!matrixRows || matrixRows.length === 0) {
        console.error("Không có dữ liệu hàng (matrixRows) để in!");
        return;
    }
  const tableRows = [];
  const lvls = ['nb', 'th', 'vd'];
  const groupTNKQ = ['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan'];

  const formatPoint = (num) => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return "0";
    return parseFloat(num).toFixed(2).replace(/\.?0+$/, "").replace('.', ',');
  };

  // --- 1. TÍNH TOÁN DỮ LIỆU TỔNG HỢP ---
  const colTotals = Array(15).fill(0); 
  const colScores = Array(12).fill(0); 
  const totalPointsByLevel = { nb: 0, th: 0, vd: 0 }; 
  let finalGlobalPoints = 0;

  matrixRows.forEach((row) => {
    const rowLevelQty = { nb: 0, th: 0, vd: 0 };
    let cIdx = 0;

    // A. Tính cho Trắc nghiệm (3 nhóm đầu)
    groupTNKQ.forEach(tKey => {
      lvls.forEach(lKey => {
        const qty = parseInt(row.levels?.[lKey]?.[tKey]) || 0;
        const p = parseFloat(pointConfig[tKey]) || 0;
        const score = qty * p;

        colTotals[cIdx] += qty;
        colScores[cIdx] += score;
        rowLevelQty[lKey] += qty;
        totalPointsByLevel[lKey] += score;
        finalGlobalPoints += score;
        cIdx++;
      });
    });

    // B. Tính cho Tự luận (Nhóm cuối - Ghép mã theo mức độ)
    lvls.forEach(lKey => {
      const qty = parseInt(row.levels?.[lKey]?.['tu_luan']) || 0;
      // QUAN TRỌNG: Lấy đúng pointConfig theo tu_luan_nb, tu_luan_th, tu_luan_vd
      const p = parseFloat(pointConfig[`tu_luan_${lKey}`]) || 0; 
      const score = qty * p;

      colTotals[cIdx] += qty;
      colScores[cIdx] += score;
      rowLevelQty[lKey] += qty;
      totalPointsByLevel[lKey] += score;
      finalGlobalPoints += score;
      cIdx++;
    });

    // C. Tổng số câu dọc theo mức độ
    lvls.forEach((lKey, i) => {
      colTotals[12 + i] += rowLevelQty[lKey];
    });
  });

  // --- 2. HEADER ---
  tableRows.push(new TableRow({ 
    children: [
        createCell("TT", { verticalMerge: VerticalMergeType.RESTART, width: 3 }), 
        createCell("Chủ đề", { verticalMerge: VerticalMergeType.RESTART, width: 12 }), 
        createCell("Nội dung kiến thức", { verticalMerge: VerticalMergeType.RESTART, width: 15 }), 
        createCell("Mức độ đánh giá", { columnSpan: 12, bold: true }), // Tự động nhận 36%
        createCell("Tổng số câu", { columnSpan: 3, bold: true }),      // Tự động nhận 9%
        createCell("Tổng % điểm", { verticalMerge: VerticalMergeType.RESTART, width: 10 })
    ] 
    }));
  tableRows.push(new TableRow({ children: [createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("Trắc nghiệm khách quan", { columnSpan: 9, bold: true }), createCell("Tự luận", { columnSpan: 3, bold: true }), createCell("Biết", { bold: true }), createCell("Hiểu", { bold: true }), createCell("VD", { bold: true }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE })] }));
  tableRows.push(new TableRow({ children: [createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("Nhiều lựa chọn", { columnSpan: 3 }), createCell("Đúng - Sai", { columnSpan: 3 }), createCell("Trả lời ngắn", { columnSpan: 3 }), createCell("Tự luận", { columnSpan: 3 }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE })] }));
  
  const h4Cells = [createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE }), createCell("", { verticalMerge: VerticalMergeType.CONTINUE })];
  // Header mức độ cho 12 cột
  [...groupTNKQ, 'tu_luan'].forEach(() => lvls.forEach(l => h4Cells.push(createCell(l==='nb'?'Biết':l==='th'?'Hiểu':'VD'))));
  ["Biết", "Hiểu", "VD"].forEach(l => h4Cells.push(createCell(l)));
  h4Cells.push(createCell("", { verticalMerge: VerticalMergeType.CONTINUE }));
  tableRows.push(new TableRow({ children: h4Cells }));

  // --- 3. DỮ LIỆU CÁC HÀNG ---
  matrixRows.forEach((row, idx) => {
    let rowScore = 0; 
    const cells = [createCell(String(idx + 1)), createCell(row.tenChuDe), createCell(row.tenNoiDung)];
    const rowLevelQty = { nb: 0, th: 0, vd: 0 };

    // Trắc nghiệm
    groupTNKQ.forEach(tKey => {
      lvls.forEach(lKey => {
        const qty = parseInt(row.levels?.[lKey]?.[tKey]) || 0;
        rowLevelQty[lKey] += qty;
        rowScore += (qty * (parseFloat(pointConfig[tKey]) || 0));
        cells.push(createCell(qty > 0 ? String(qty) : ""));
      });
    });
    // Tự luận
    lvls.forEach(lKey => {
      const qty = parseInt(row.levels?.[lKey]?.['tu_luan']) || 0;
      rowLevelQty[lKey] += qty;
      rowScore += (qty * (parseFloat(pointConfig[`tu_luan_${lKey}`]) || 0));
      cells.push(createCell(qty > 0 ? String(qty) : ""));
    });

    lvls.forEach(l => cells.push(createCell(rowLevelQty[l] > 0 ? String(rowLevelQty[l]) : "0", { bold: true })));
    cells.push(createCell(`${formatPoint((rowScore / 10) * 100)}%`, { bold: true }));
    tableRows.push(new TableRow({ children: cells }));
  });

  // --- 4. HÀNG TỔNG SỐ CÂU ---
  tableRows.push(new TableRow({
    children: [
      createCell("Tổng số câu", { columnSpan: 3, bold: true }),
      ...colTotals.map(t => createCell(String(t), { bold: true })),
      createCell(String(colTotals.slice(12, 15).reduce((a, b) => a + b, 0)), { bold: true }),
    ]
  }));

  // --- 5. HÀNG TỔNG ĐIỂM ---
  const scoreCells = [createCell("Tổng điểm", { columnSpan: 3, bold: true })];
  for (let i = 0; i < 12; i++) {
    scoreCells.push(createCell(formatPoint(colScores[i])));
  }
  scoreCells.push(createCell(formatPoint(totalPointsByLevel.nb), { bold: true }));
  scoreCells.push(createCell(formatPoint(totalPointsByLevel.th), { bold: true }));
  scoreCells.push(createCell(formatPoint(totalPointsByLevel.vd), { bold: true }));
  scoreCells.push(createCell(formatPoint(finalGlobalPoints), { bold: true })); 
  tableRows.push(new TableRow({ children: scoreCells }));

  // --- 6. HÀNG TỈ LỆ % ĐIỂM ---
  const pctCells = [createCell("Tỉ lệ % điểm", { columnSpan: 3, bold: true })];
  for (let i = 0; i < 12; i++) {
    pctCells.push(createCell(`${formatPoint((colScores[i] / 10) * 100)}%`));
  }
  pctCells.push(createCell(`${formatPoint((totalPointsByLevel.nb / 10) * 100)}%`, { bold: true }));
  pctCells.push(createCell(`${formatPoint((totalPointsByLevel.th / 10) * 100)}%`, { bold: true }));
  pctCells.push(createCell(`${formatPoint((totalPointsByLevel.vd / 10) * 100)}%`, { bold: true }));
  pctCells.push(createCell(`${formatPoint((finalGlobalPoints / 10) * 100)}%`, { bold: true })); 
  tableRows.push(new TableRow({ children: pctCells }));

  // --- XUẤT FILE ---
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: header.tenMaTran, bold: true, size: 28, font: "Times New Roman" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Thời gian làm bài: ${header.thoiGian} phút`, font: "Times New Roman", size: 24 })] }),
        new Paragraph({ text: "" }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
    if (options.getBlob) {
        return blob;
    }
  saveAs(blob, `MaTran_Chuan_Diem_TuLuan.docx`);
};

function createCell(text, options = {}) {
  // Tính width dựa trên colSpan: cột đơn = 3%, cột gộp = colSpan * 3
  const calculatedWidth = options.columnSpan ? (options.columnSpan * 3) : 3;

  return new TableCell({
    // Ép width PERCENTAGE y hệt bên bản đặc tả
    width: { size: calculatedWidth, type: WidthType.PERCENTAGE },
    verticalMerge: options.verticalMerge,
    columnSpan: options.columnSpan || 1,
    children: [new Paragraph({ 
      alignment: options.align || AlignmentType.CENTER, 
      spacing: { before: 20, after: 20 },
      children: [new TextRun({ 
        text: String(text || ""), 
        bold: options.bold || false, 
        font: "Times New Roman", 
        size: 16 // Giữ size 16 để ô số không bị phình
      })] 
    })],
  });
}


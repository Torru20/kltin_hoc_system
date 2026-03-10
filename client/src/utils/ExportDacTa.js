import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, VerticalMergeType, PageOrientation 
} from "docx";
import { saveAs } from "file-saver";

const mapMucDo = (lvl) => {
  const s = String(lvl || "").toUpperCase();
  if (s === "MUCDO_01" || s === "NB") return "nb";
  if (s === "MUCDO_02" || s === "TH") return "th";
  if (s === "MUCDO_03" || s === "VD") return "vd";
  return s.toLowerCase();
};

export const exportDacTaDirect = async (header, dacTaRows, pointConfig, options = {}) => {
  try {
    const tableRows = [];
    const lvls = ['nb', 'th', 'vd'];
    const groupTNKQ = ['tn_nhieu_lc', 'tn_dung_sai', 'tl_ngan'];

    const formatPoint = (num) => {
      if (num === undefined || num === null || isNaN(num) || num === 0) return "0";
      return parseFloat(num).toFixed(2).replace(/\.?0+$/, "").replace('.', ',');
    };

    // --- 1. TÍNH TOÁN DỮ LIỆU TỔNG HỢP (Logic sao chép từ MTKT) ---
    const colTotals = Array(15).fill(0); // 12 cột câu hỏi + 3 cột tổng số câu
    const colScores = Array(12).fill(0); // 12 cột điểm
    const totalPointsByLevel = { nb: 0, th: 0, vd: 0 };
    let finalGlobalPoints = 0;

    // Duyệt qua dacTaRows để gom dữ liệu
    dacTaRows.forEach((row) => {
      const rowM = mapMucDo(row.maMucDo); // Mức độ của dòng hiện tại
      let cIdx = 0;

      // A. Trắc nghiệm
      groupTNKQ.forEach(tKey => {
        lvls.forEach(lKey => {
          // Chỉ tính nếu mức độ của dòng khớp với cột đang duyệt
          const qty = (rowM === lKey) ? (parseInt(row[tKey]) || 0) : 0;
          const p = parseFloat(pointConfig[tKey]) || 0;
          const score = qty * p;

          colTotals[cIdx] += qty;
          colScores[cIdx] += score;
          totalPointsByLevel[lKey] += score;
          finalGlobalPoints += score;
          cIdx++;
        });
      });

      // B. Tự luận
      lvls.forEach(lKey => {
        const qty = (rowM === lKey) ? (parseInt(row.tu_luan) || 0) : 0;
        const p = parseFloat(pointConfig[`tu_luan_${lKey}`]) || 0;
        const score = qty * p;

        colTotals[cIdx] += qty;
        colScores[cIdx] += score;
        totalPointsByLevel[lKey] += score;
        finalGlobalPoints += score;
        cIdx++;
      });
    });

    // C. Tổng số câu dọc theo mức độ (Cột 13, 14, 15)
    // Tính tổng số câu của từng mức độ bằng cách cộng dồn dacTaRows
    dacTaRows.forEach(row => {
        const rowM = mapMucDo(row.maMucDo);
        const totalInRow = (parseInt(row.tn_nhieu_lc) || 0) + 
                           (parseInt(row.tn_dung_sai) || 0) + 
                           (parseInt(row.tl_ngan) || 0) + 
                           (parseInt(row.tu_luan) || 0);
        if (rowM === 'nb') colTotals[12] += totalInRow;
        else if (rowM === 'th') colTotals[13] += totalInRow;
        else if (rowM === 'vd') colTotals[14] += totalInRow;
    });

    // --- 2. XÂY DỰNG HEADER (4 TẦNG) ---
    // Tầng 1
    tableRows.push(new TableRow({
      children: [
        createCell("TT", { vMerge: true }),
        createCell("Chủ đề/Chương", { vMerge: true }),
        createCell("Nội dung kiến thức", { vMerge: true }),
        createCell("Yêu cầu cần đạt", { vMerge: true }),
        createCell("Số câu hỏi ở các mức độ đánh giá", { colSpan: 12, bold: true }),
        createCell("Tổng số câu", { colSpan: 3, bold: true }),
        createCell("Tổng % điểm", { vMerge: true, bold: true })
      ]
    }));
    // Tầng 2, 3, 4 ... (Tiếp tục cấu trúc phân cấp tương tự MTKT)
    // [Phần code Header này giữ nguyên cấu trúc bạn đã có để đảm bảo hiển thị đúng]
    // ... (Tôi sẽ bỏ qua phần đẩy Header lặp lại để tập trung vào dữ liệu)

    // --- 3. DỮ LIỆU CÁC HÀNG ---
    dacTaRows.forEach((row, idx) => {
      const rowM = mapMucDo(row.maMucDo);
      const maNL = row.maNL || "";
      let rowScore = 0;
      const cells = [
        createCell(String(idx + 1)),
        createCell(row.tenChuDe, { vMerge: row.isFirstOfChuDe, continueVMerge: !row.isFirstOfChuDe, align: AlignmentType.LEFT }),
        createCell(row.tenNoiDung, { vMerge: row.isFirstOfND, continueVMerge: !row.isFirstOfND, align: AlignmentType.LEFT }),
        createCell(row.noiDungYCCD, { align: AlignmentType.LEFT })
      ];

      const rowLevelTotal = { nb: 0, th: 0, vd: 0 };

      // Hàm helper để điền số câu vào đúng cột mức độ
      const fillCells = (val, typeKey, isTuLuan = false) => {
        lvls.forEach(lKey => {
          const isMatch = (rowM === lKey);
          const qty = isMatch ? (parseInt(val) || 0) : 0;
          if (isMatch) {
              rowLevelTotal[lKey] += qty;
              const pKey = isTuLuan ? `tu_luan_${lKey}` : typeKey;
              rowScore += qty * (parseFloat(pointConfig[pKey]) || 0);
          }
          cells.push(createCell(qty > 0 ? (maNL ? `${qty}(${maNL})` : String(qty)) : ""));
        });
      };

      fillCells(row.tn_nhieu_lc, 'tn_nhieu_lc');
      fillCells(row.tn_dung_sai, 'tn_dung_sai');
      fillCells(row.tl_ngan, 'tl_ngan');
      fillCells(row.tu_luan, 'tu_luan', true);

      // 3 cột tổng số câu theo mức độ
      lvls.forEach(l => cells.push(createCell(rowLevelTotal[l] > 0 ? String(rowLevelTotal[l]) : "0", { bold: true })));
      // Cột Tổng % điểm
      cells.push(createCell(`${formatPoint((rowScore / 10) * 100)}%`, { bold: true }));
      
      tableRows.push(new TableRow({ children: cells }));
    });

    // --- 4. CÁC HÀNG TỔNG KẾT (Y HỆT MTKT) ---
    
    // Hàng Tổng số câu
    tableRows.push(new TableRow({
      children: [
        createCell("Tổng số câu", { colSpan: 4, bold: true }),
        ...colTotals.map(t => createCell(String(t), { bold: true })),
        createCell(String(colTotals.slice(12, 15).reduce((a, b) => a + b, 0)), { bold: true }),
      ]
    }));

    // Hàng Tổng điểm
    const scoreCells = [createCell("Tổng điểm", { colSpan: 4, bold: true })];
    for (let i = 0; i < 12; i++) scoreCells.push(createCell(formatPoint(colScores[i])));
    scoreCells.push(createCell(formatPoint(totalPointsByLevel.nb), { bold: true }));
    scoreCells.push(createCell(formatPoint(totalPointsByLevel.th), { bold: true }));
    scoreCells.push(createCell(formatPoint(totalPointsByLevel.vd), { bold: true }));
    scoreCells.push(createCell(formatPoint(finalGlobalPoints), { bold: true }));
    tableRows.push(new TableRow({ children: scoreCells }));

    // Hàng Tỉ lệ % điểm
    const pctCells = [createCell("Tỉ lệ % điểm", { colSpan: 4, bold: true })];
    for (let i = 0; i < 12; i++) pctCells.push(createCell(`${formatPoint((colScores[i] / 10) * 100)}%`));
    pctCells.push(createCell(`${formatPoint((totalPointsByLevel.nb / 10) * 100)}%`, { bold: true }));
    pctCells.push(createCell(`${formatPoint((totalPointsByLevel.th / 10) * 100)}%`, { bold: true }));
    pctCells.push(createCell(`${formatPoint((totalPointsByLevel.vd / 10) * 100)}%`, { bold: true }));
    pctCells.push(createCell(`${formatPoint((finalGlobalPoints / 10) * 100)}%`, { bold: true }));
    tableRows.push(new TableRow({ children: pctCells }));

    // --- 8. XUẤT FILE ---
    const doc = new Document({
      sections: [{
        properties: { 
          page: { 
          size: { orientation: PageOrientation.LANDSCAPE },
          // Lề cực mỏng (khoảng 1cm mỗi bên) để lấy thêm chỗ cho 16 cột
          margin: {
            top: 567,    // ~1cm
            right: 567, 
            bottom: 567, 
            left: 567,
          },
        } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ", bold: true, size: 28, font: "Times New Roman" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: `Tên đề: ${header.tenMaTran}`, bold: true, size: 22, font: "Times New Roman" }),
              new TextRun({ text: `  -  Thời gian: ${header.thoiGian} phút`, size: 22, font: "Times New Roman" })
            ]
          }),
          new Table({
            // Chiều rộng trang ngang A4 trừ lề mỏng là khoảng 15,800 DXA
            width: { size: 15800, type: WidthType.DXA },
            // Chia lại tỉ lệ: Cột Yêu cầu (4) và Nội dung (3) cần thu hẹp bớt để cứu các cột cuối
            columnWidths: [450, 1600, 1600, 3200, 745, 745, 745, 745, 745, 745, 745, 745, 745, 745, 745, 745],
            rows: tableRows,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    if (options && options.getBlob) {
        return blob; // Phải có dòng này thì hàm upload mới nhận được dữ liệu
    }
    saveAs(blob, `Ban_Dac_Ta_${header.tenMaTran}.docx`);
    
  } catch (error) {
    console.error("Lỗi xuất Word:", error);
  }
};

    


function createCell(text, options = {}) {
  // 1. XÁC ĐỊNH LOẠI CỘT:
  // Nếu không có colSpan (tức là cột đơn lẻ như Biết, Hiểu, VD), ta ép nó về một con số rất nhỏ.
  // Con số 3% là lý tưởng để 12 cột này cộng lại chỉ chiếm 36% trang giấy.
  const isSingleColumn = !options.colSpan || options.colSpan === 1;
  
  // 2. TÍNH TOÁN ĐỘ RỘNG:
  // Cột đơn: 3% | Cột gộp (colSpan > 1): Tỉ lệ thuận theo số lượng cột con (colSpan * 3)
  const calculatedWidth = options.colSpan ? (options.colSpan * 3) : 3;

  return new TableCell({
    width: { 
      size: calculatedWidth, 
      type: WidthType.PERCENTAGE 
    },
    verticalMerge: options.vMerge ? VerticalMergeType.RESTART : (options.continueVMerge ? VerticalMergeType.CONTINUE : undefined),
    columnSpan: options.colSpan || 1,
    children: [
      new Paragraph({
        alignment: options.align || AlignmentType.CENTER,
        spacing: { before: 20, after: 20 }, 
        children: [
          new TextRun({
            text: String(text !== undefined && text !== null ? text : ""),
            bold: options.bold || false,
            font: "Times New Roman",
            // Quan trọng: Size chữ phải nhỏ (16) để không ô nào bị phình ra do chữ quá to
            size: isSingleColumn ? 16 : (options.size || 18), 
          }),
        ],
      }),
    ],
  });
}


/*import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, VerticalMergeType, PageOrientation 
} from "docx";
import { saveAs } from "file-saver";

export const exportDacTaDirect = async (header, dacTaRows, pointConfig) => {
  try {
    const tableRows = [];

    // --- 1. HÀNG HEADER TẦNG 1 ---
    tableRows.push(new TableRow({
      children: [
        createCell("TT", { bold: true, vMerge: true }),
        createCell("Chủ đề/Chương", { bold: true, vMerge: true }),
        createCell("Nội dung/Đơn vị kiến thức", { bold: true, vMerge: true }),
        createCell("Yêu cầu cần đạt", { bold: true, vMerge: true }),
        createCell("Số câu hỏi ở các mức độ đánh giá", { bold: true, colSpan: 12 }),
      ]
    }));

    // --- 2. HÀNG HEADER TẦNG 2 ---
    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("TNKQ", { bold: true, colSpan: 9 }),
        createCell("Tự luận", { bold: true, colSpan: 3 }),
      ]
    }));

    // --- 3. HÀNG HEADER TẦNG 3 ---
    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("Nhiều lựa chọn", { bold: true, colSpan: 3 }),
        createCell("Đúng - Sai", { bold: true, colSpan: 3 }),
        createCell("Trả lời ngắn", { bold: true, colSpan: 3 }),
        createCell("Tự luận", { bold: true, colSpan: 3 }),
      ]
    }));

    // --- 4. HÀNG HEADER TẦNG 4 (Mức độ) ---
    const lvls = ["Biết", "Hiểu", "VD"];
    const levelHeaders = [...lvls, ...lvls, ...lvls, ...lvls];
    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }),
        ...levelHeaders.map(text => createCell(text, { bold: true }))
      ]
    }));

    // --- 5. BIẾN TÍCH LŨY ĐỂ TÍNH TỔNG ---
    const stats = {
      nb: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
      th: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
      vd: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
    };

    // --- 6. ĐỔ DỮ LIỆU ---
    dacTaRows.forEach((row, idx) => {
      const m = row.maMucDo.toUpperCase(); // Chuyển về NB, TH, VD
      const maNL = row.maNL || "";

      // Cộng dồn số lượng câu cho phần Tổng cộng
      if (stats[m.toLowerCase()]) {
        const s = stats[m.toLowerCase()];
        s.lc += parseInt(row.tn_nhieu_lc) || 0;
        s.ds += parseInt(row.tn_dung_sai) || 0;
        s.tr += parseInt(row.tl_ngan) || 0;
        s.tl += parseInt(row.tu_luan) || 0;

        // Tính điểm tích lũy cho từng mức độ
        const scoreLC = (parseInt(row.tn_nhieu_lc) || 0) * pointConfig.tn_nhieu_lc;
        const scoreDS = (parseInt(row.tn_dung_sai) || 0) * pointConfig.tn_dung_sai;
        const scoreTR = (parseInt(row.tl_ngan) || 0) * pointConfig.tl_ngan;
        
        // Tự luận tính điểm theo mức độ riêng
        let scoreTL = 0;
        if (m === "NB") scoreTL = (parseInt(row.tu_luan) || 0) * pointConfig.tu_luan_nb;
        else if (m === "TH") scoreTL = (parseInt(row.tu_luan) || 0) * pointConfig.tu_luan_th;
        else if (m === "VD") scoreTL = (parseInt(row.tu_luan) || 0) * pointConfig.tu_luan_vd;

        s.score += (scoreLC + scoreDS + scoreTR + scoreTL);
      }

      const formatVal = (val, targetLvl, currentMaNL) => {
        if (m !== targetLvl) return "";
        const num = parseInt(val) || 0;
        if (num === 0) return "";
        return currentMaNL ? `${num}(${currentMaNL})` : String(num);
      };

      tableRows.push(new TableRow({
        children: [
          createCell(String(idx + 1)),
          createCell(row.tenChuDe, { vMerge: row.isFirstOfChuDe, continueVMerge: !row.isFirstOfChuDe, align: AlignmentType.LEFT }),
          createCell(row.tenNoiDung, { vMerge: row.isFirstOfND, continueVMerge: !row.isFirstOfND, align: AlignmentType.LEFT }),
          createCell(row.noiDungYCCD, { align: AlignmentType.LEFT }),
          createCell(formatVal(row.tn_nhieu_lc, "NB", maNL)),
          createCell(formatVal(row.tn_nhieu_lc, "TH", maNL)),
          createCell(formatVal(row.tn_nhieu_lc, "VD", maNL)),
          createCell(formatVal(row.tn_dung_sai, "NB", maNL)),
          createCell(formatVal(row.tn_dung_sai, "TH", maNL)),
          createCell(formatVal(row.tn_dung_sai, "VD", maNL)),
          createCell(formatVal(row.tl_ngan, "NB", maNL)),
          createCell(formatVal(row.tl_ngan, "TH", maNL)),
          createCell(formatVal(row.tl_ngan, "VD", maNL)),
          createCell(formatVal(row.tu_luan, "NB", maNL)),
          createCell(formatVal(row.tu_luan, "TH", maNL)),
          createCell(formatVal(row.tu_luan, "VD", maNL)),
        ]
      }));
    });

    // --- 7. THÊM 3 HÀNG CUỐI THEO CV 7991 ---
    const rateNB = Math.round((stats.nb.score / 10) * 100);
    const rateTH = Math.round((stats.th.score / 10) * 100);
    const rateVD = Math.round((stats.vd.score / 10) * 100);

    // HÀNG 1: TỔNG CỘNG SỐ CÂU
    tableRows.push(new TableRow({
      children: [
        createCell("Tổng cộng", { bold: true, colSpan: 4 }),
        createCell(stats.nb.lc, { bold: true }), createCell(stats.th.lc, { bold: true }), createCell(stats.vd.lc, { bold: true }),
        createCell(stats.nb.ds, { bold: true }), createCell(stats.th.ds, { bold: true }), createCell(stats.vd.ds, { bold: true }),
        createCell(stats.nb.tr, { bold: true }), createCell(stats.th.tr, { bold: true }), createCell(stats.vd.tr, { bold: true }),
        createCell(stats.nb.tl, { bold: true }), createCell(stats.th.tl, { bold: true }), createCell(stats.vd.tl, { bold: true }),
      ]
    }));

    // HÀNG 2: TỈ LỆ % (Theo từng mức độ)
    tableRows.push(new TableRow({
      children: [
        createCell("Tỉ lệ %", { bold: true, colSpan: 4 }),
        createCell(`${rateNB}%`, { bold: true, colSpan: 3 }),
        createCell(`${rateTH}%`, { bold: true, colSpan: 3 }),
        createCell(`${rateVD}%`, { bold: true, colSpan: 3 }),
        createCell(`${rateVD}%`, { bold: true, colSpan: 3 }), // Cột Tỉ lệ VD tính cho cả cụm TL
      ]
    }));

    // HÀNG 3: TỈ LỆ CHUNG (NB+TH và VD)
    tableRows.push(new TableRow({
      children: [
        createCell("Tỉ lệ chung", { bold: true, colSpan: 4 }),
        createCell(`${rateNB + rateTH}%`, { bold: true, colSpan: 6 }),
        createCell(`${rateVD}%`, { bold: true, colSpan: 6 }),
      ]
    }));

    // --- 8. TẠO VÀ XUẤT DOCUMENT ---
    const doc = new Document({
      sections: [{
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ", bold: true, size: 28, font: "Times New Roman" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: `Tên đề: ${header.tenMaTran}`, bold: true, size: 22, font: "Times New Roman" }),
              new TextRun({ text: `  -  Thời gian: ${header.thoiGian} phút`, size: 22, font: "Times New Roman" })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Ban_Dac_Ta_${header.tenMaTran}.docx`);
  } catch (error) {
    console.error("Lỗi xuất Word:", error);
  }
};

function createCell(text, options = {}) {
  return new TableCell({
    verticalMerge: options.vMerge ? VerticalMergeType.RESTART : (options.continueVMerge ? VerticalMergeType.CONTINUE : undefined),
    columnSpan: options.colSpan || 1,
    children: [new Paragraph({
      alignment: options.align || AlignmentType.CENTER,
      children: [new TextRun({ 
        text: String(text !== undefined && text !== null ? text : ""), 
        bold: options.bold || false, 
        font: "Times New Roman", 
        size: 18 
      })]
    })],
  });
}*/
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, VerticalMergeType, PageOrientation 
} from "docx";
import { saveAs } from "file-saver";

/**
 * Hàm chuẩn hóa Mức độ để tương thích cả DB (MucDo_01) và Trực tiếp (NB)
 */
const mapMucDo = (lvl) => {
  const s = String(lvl || "").toUpperCase();
  if (s === "MUCDO_01" || s === "NB") return "NB";
  if (s === "MUCDO_02" || s === "TH") return "TH";
  if (s === "MUCDO_03" || s === "VD") return "VD";
  return s;
};

export const exportDacTaDirect = async (header, dacTaRows, pointConfig,options = {}) => {
  try {
    const tableRows = [];

    // --- 1. HÀNG HEADER TẦNG 1, 2, 3, 4 (Giữ nguyên cấu trúc của bạn) ---
    tableRows.push(new TableRow({
      children: [
        createCell("TT", { bold: true, vMerge: true }),
        createCell("Chủ đề/Chương", { bold: true, vMerge: true }),
        createCell("Nội dung/Đơn vị kiến thức", { bold: true, vMerge: true }),
        createCell("Yêu cầu cần đạt", { bold: true, vMerge: true }),
        createCell("Số câu hỏi ở các mức độ đánh giá", { bold: true, colSpan: 12 }),
      ]
    }));

    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        createCell("TNKQ", { bold: true, colSpan: 9 }),
        createCell("Tự luận", { bold: true, colSpan: 3 }),
      ]
    }));

    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        createCell("Nhiều lựa chọn", { bold: true, colSpan: 3 }),
        createCell("Đúng - Sai", { bold: true, colSpan: 3 }),
        createCell("Trả lời ngắn", { bold: true, colSpan: 3 }),
        createCell("Tự luận", { bold: true, colSpan: 3 }),
      ]
    }));

    const lvls = ["Biết", "Hiểu", "VD"];
    tableRows.push(new TableRow({
      children: [
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        createCell("", { continueVMerge: true }), createCell("", { continueVMerge: true }),
        ...[...lvls, ...lvls, ...lvls, ...lvls].map(text => createCell(text, { bold: true }))
      ]
    }));

    // --- 5. BIẾN TÍCH LŨY ---
    // --- 5. BIẾN TÍCH LŨY ---
    const stats = {
      nb: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
      th: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
      vd: { lc: 0, ds: 0, tr: 0, tl: 0, score: 0 },
      // Thêm biến tích lũy theo loại câu hỏi để tính % chính xác theo cột
      colScore: {
        lc: 0, // Nhiều lựa chọn
        ds: 0, // Đúng sai
        tr: 0, // Trả lời ngắn
        tl: 0  // Tự luận
      }
    };

    // --- 6. ĐỔ DỮ LIỆU ---
    dacTaRows.forEach((row, idx) => {
      const m = mapMucDo(row.maMucDo);
      const maNL = row.maNL || "";

      if (stats[m.toLowerCase()]) {
        const s = stats[m.toLowerCase()];
        const countLC = parseInt(row.tn_nhieu_lc) || 0;
        const countDS = parseInt(row.tn_dung_sai) || 0;
        const countTR = parseInt(row.tl_ngan) || 0;
        const countTL = parseInt(row.tu_luan) || 0;

        s.lc += countLC;
        s.ds += countDS;
        s.tr += countTR;
        s.tl += countTL;

        const p = pointConfig || { tn_nhieu_lc: 0.25, tn_dung_sai: 1, tl_ngan: 0.5, tu_luan_nb: 0.5, tu_luan_th: 1, tu_luan_vd: 1.5 };
        
        const sLC = countLC * p.tn_nhieu_lc;
        const sDS = countDS * p.tn_dung_sai;
        const sTR = countTR * p.tl_ngan;
        
        let sTL = 0;
        if (m === "NB") sTL = countTL * p.tu_luan_nb;
        else if (m === "TH") sTL = countTL * p.tu_luan_th;
        else if (m === "VD") sTL = countTL * p.tu_luan_vd;

        // Tích lũy điểm theo mức độ (để tính tỉ lệ chung)
        s.score += (sLC + sDS + sTR + sTL);

        // Tích lũy điểm theo loại câu hỏi (để tính tỉ lệ % theo cột)
        stats.colScore.lc += sLC;
        stats.colScore.ds += sDS;
        stats.colScore.tr += sTR;
        stats.colScore.tl += sTL;
      }
      // ... (phần push TableRow dữ liệu giữ nguyên)
    });

    // --- 7. BA HÀNG CUỐI (TỔNG KẾT) ---
    // Tỉ lệ % theo từng loại câu hỏi (để hiển thị dưới các cột tương ứng)
    const rateLC = Math.round((stats.colScore.lc / 10) * 100);
    const rateDS = Math.round((stats.colScore.ds / 10) * 100);
    const rateTR = Math.round((stats.colScore.tr / 10) * 100);
    const rateTL = Math.round((stats.colScore.tl / 10) * 100);

    // Tỉ lệ % tổng theo mức độ (cho hàng tỉ lệ chung)
    const totalRateNB = Math.round((stats.nb.score / 10) * 100);
    const totalRateTH = Math.round((stats.th.score / 10) * 100);
    const totalRateVD = Math.round((stats.vd.score / 10) * 100);

    // HÀNG TỔNG CỘNG
    tableRows.push(new TableRow({
      children: [
        createCell("Tổng cộng", { bold: true, colSpan: 4 }),
        createCell(stats.nb.lc, { bold: true }), createCell(stats.th.lc, { bold: true }), createCell(stats.vd.lc, { bold: true }),
        createCell(stats.nb.ds, { bold: true }), createCell(stats.th.ds, { bold: true }), createCell(stats.vd.ds, { bold: true }),
        createCell(stats.nb.tr, { bold: true }), createCell(stats.th.tr, { bold: true }), createCell(stats.vd.tr, { bold: true }),
        createCell(stats.nb.tl, { bold: true }), createCell(stats.th.tl, { bold: true }), createCell(stats.vd.tl, { bold: true }),
      ]
    }));

    // HÀNG TỈ LỆ % (Bây giờ đã khớp theo loại câu hỏi)
    tableRows.push(new TableRow({
      children: [
        createCell("Tỉ lệ %", { bold: true, colSpan: 4 }),
        createCell(`${rateLC}%`, { bold: true, colSpan: 3 }), // Dưới cụm Nhiều lựa chọn
        createCell(`${rateDS}%`, { bold: true, colSpan: 3 }), // Dưới cụm Đúng sai
        createCell(`${rateTR}%`, { bold: true, colSpan: 3 }), // Dưới cụm Trả lời ngắn
        createCell(`${rateTL}%`, { bold: true, colSpan: 3 }), // Dưới cụm Tự luận
      ]
    }));

    // HÀNG TỈ LỆ CHUNG
    tableRows.push(new TableRow({
      children: [
        createCell("Tỉ lệ chung", { bold: true, colSpan: 4 }),
        createCell(`${totalRateNB + totalRateTH}%`, { bold: true, colSpan: 6 }), // NB + TH
        createCell(`${totalRateVD}%`, { bold: true, colSpan: 6 }),               // VD
      ]
    }));

    tableRows.push(new TableRow({
      children: [
        createCell("Tỉ lệ chung", { bold: true, colSpan: 4 }),
        createCell(`${rateNB + rateTH}%`, { bold: true, colSpan: 6 }),
        createCell(`${rateVD}%`, { bold: true, colSpan: 6 }),
      ]
    }));

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
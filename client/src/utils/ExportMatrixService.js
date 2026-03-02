import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, WidthType, VerticalMergeType, PageOrientation, BorderStyle 
} from "docx";
import { saveAs } from "file-saver";

export const exportDacTaDirect = async (header, dacTaRows) => {
  const tableRows = [];

  // --- HÀNG HEADER 1: Tiêu đề chính ---
  tableRows.push(new TableRow({
    children: [
      createCell("TT", { bold: true, vMerge: true }),
      createCell("Chủ đề/Chương", { bold: true, vMerge: true }),
      createCell("Nội dung/Đơn vị kiến thức", { bold: true, vMerge: true }),
      createCell("Yêu cầu cần đạt", { bold: true, vMerge: true }),
      createCell("Số câu hỏi ở các mức độ đánh giá", { bold: true, colSpan: 12 }),
    ]
  }));

  // --- HÀNG HEADER 2: Phân loại TNKQ và Tự luận ---
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

  // --- HÀNG HEADER 3: Loại câu hỏi chi tiết ---
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

  // --- HÀNG HEADER 4: Mức độ Biết - Hiểu - Vận dụng ---
  const levelHeaders = Array(4).fill(["Biết", "Hiểu", "VD"]).flat();
  tableRows.push(new TableRow({
    children: [
      createCell("", { continueVMerge: true }),
      createCell("", { continueVMerge: true }),
      createCell("", { continueVMerge: true }),
      createCell("", { continueVMerge: true }),
      ...levelHeaders.map(text => createCell(text, { bold: true }))
    ]
  }));

  // --- ĐỔ DỮ LIỆU ---
  let currentChuDe = "";
  let currentNoiDung = "";

  dacTaRows.forEach((row, idx) => {
    // Kiểm tra để gộp ô dọc
    const isNewChuDe = row.tenChuDe !== currentChuDe;
    const isNewNoiDung = row.tenNoiDung !== currentNoiDung;
    if (isNewChuDe) currentChuDe = row.tenChuDe;
    if (isNewNoiDung) currentNoiDung = row.tenNoiDung;

    // Mapping mức độ vào đúng cột (Biết=0, Hiểu=1, VD=2)
    const getColVal = (type, targetLvl, value) => (row.maMucDo === targetLvl ? String(value || 0) : "");

    tableRows.push(new TableRow({
      children: [
        createCell(String(idx + 1)),
        createCell(row.tenChuDe, { vMerge: isNewChuDe, continueVMerge: !isNewChuDe, align: AlignmentType.LEFT }),
        createCell(row.tenNoiDung, { vMerge: isNewNoiDung, continueVMerge: !isNewNoiDung, align: AlignmentType.LEFT }),
        createCell(row.noiDungYCCD, { align: AlignmentType.LEFT }),
        // TN Nhiều lựa chọn
        createCell(getColVal("tn_nhieu_lc", "NB", row.tn_nhieu_lc)),
        createCell(getColVal("tn_nhieu_lc", "TH", row.tn_nhieu_lc)),
        createCell(getColVal("tn_nhieu_lc", "VD", row.tn_nhieu_lc)),
        // TN Đúng sai
        createCell(getColVal("tn_dung_sai", "NB", row.tn_dung_sai)),
        createCell(getColVal("tn_dung_sai", "TH", row.tn_dung_sai)),
        createCell(getColVal("tn_dung_sai", "VD", row.tn_dung_sai)),
        // TN Trả lời ngắn
        createCell(getColVal("tl_ngan", "NB", row.tl_ngan)),
        createCell(getColVal("tl_ngan", "TH", row.tl_ngan)),
        createCell(getColVal("tl_ngan", "VD", row.tl_ngan)),
        // Tự luận
        createCell(getColVal("tu_luan", "NB", row.tu_luan)),
        createCell(getColVal("tu_luan", "TH", row.tu_luan)),
        createCell(getColVal("tu_luan", "VD", row.tu_luan)),
      ]
    }));
  });

  // --- XUẤT FILE ---
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ", bold: true, size: 28, font: "Times New Roman" })]
        }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ban_Dac_Ta_Chuan.docx`);
};

function createCell(text, options = {}) {
  return new TableCell({
    verticalMerge: options.vMerge ? VerticalMergeType.RESTART : (options.continueVMerge ? VerticalMergeType.CONTINUE : undefined),
    columnSpan: options.colSpan || 1,
    children: [new Paragraph({
      alignment: options.align || AlignmentType.CENTER,
      children: [new TextRun({ text: String(text || ""), bold: options.bold || false, font: "Times New Roman", size: 18 })]
    })],
  });
}
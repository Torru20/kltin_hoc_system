import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    WidthType, AlignmentType, VerticalAlign 
} from "docx";
import { saveAs } from "file-saver";

// 1. Hàm hỗ trợ xóa thẻ HTML và làm sạch văn bản
const cleanHtml = (html) => {
    if (!html) return "";
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let text = doc.body.textContent || "";
        // Giữ lại định dạng xuống dòng cơ bản nếu cần, hoặc làm sạch khoảng trắng thừa
        return text.trim(); 
    } catch (e) {
        return html.replace(/<\/?[^>]+(>|$)/g, "").trim();
    }
};

/**
 * 2. Hàm hỗ trợ đánh số suffix thông minh
 */
const formatNumberedSuffix = (data, startCount) => {
    if (!data || data.length === 0) {
        return { 
            runs: [new TextRun({ text: "(Chưa có dữ liệu mục tiêu trong DB)", italics: true, color: "888888" })], 
            nextCount: startCount 
        };
    }
    if (!data) return { runs: [], nextCount: startCount };
    
    let items = [];
    if (Array.isArray(data)) {
        items = data
            .filter(i => {
                // Nếu là Object (lúc soạn), kiểm tra checked
                if (typeof i === 'object' && i !== null) {
                    return i.checked !== false;
                }
                // Nếu là chuỗi (lấy từ DB), cho qua luôn
                return true; 
            })
            .map(i => {
                if (typeof i === 'object' && i !== null) {
                    if (i.label && i.content) return `${i.label}: ${i.content}`;
                    return i.content || i.NoiDungHienThi || "";
                }
                return i; // Nếu i đã là chuỗi thì trả về chính nó
            })
            .filter(text => text && text.toString().trim().length > 0);
    } else {
        items = data.split(';').map(i => i.trim()).filter(i => i.length > 0);
    }

    let currentCount = startCount;
    const runs = items.map((item, index) => {
        let cleanItem = cleanHtml(item).replace(/\.$/, ""); 
        let textWithNumber = cleanItem;
        if (!/\(\d+\)/.test(cleanItem)) {
            textWithNumber = `${cleanItem} (${currentCount++}).`;
        } else {
            currentCount++;
            textWithNumber = `${cleanItem}.`;
        }
        
        return new TextRun({
            text: textWithNumber,
            break: index > 0 ? 1 : 0,
        });
    });

    return { runs, nextCount: currentCount };
};

export const exportKHBDToWord = async (basicInfo, rawObjectives, processData, activities,options = {}) => {
    const sections = [];
    let objectiveCounter = 1;

    // --- BƯỚC CHUẨN HÓA: Tự động nhận diện dữ liệu ---
    let objectives = {};

    if (Array.isArray(rawObjectives)) {
    // Log ngay để bạn nhìn thấy trên Console F12 xem dữ liệu thực sự tên là gì
    console.log("Dữ liệu mục tiêu nhận được:", rawObjectives);

    const getItems = (types) => {
        return rawObjectives
            .filter(o => types.includes(o.LoaiMucTieu))
            .map(o => o.NoiDungHienThi || o.content || o.NoiDungYCCD || "");
    };

    objectives = {
        kienThucText: getItems(['KienThuc', 'Kiến thức']).join(". "),
        nlucDacThuText: getItems(['YCCD', 'NangLucDacThu', 'YCCĐ']),
        nangLucChung: getItems(['NangLucChung', 'Năng lực chung']),
        phamChat: getItems(['PhamChat', 'Phẩm chất'])
    };
} else {
        // TRƯỜNG HỢP 2: Dữ liệu từ lúc đang soạn (Đã là Object chuẩn)
        objectives = rawObjectives;
    }

    // --- TIÊU ĐỀ ĐẦU TRANG ---
    sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: "TÊN BÀI DẠY: " + (basicInfo.baiName || "").toUpperCase(), bold: true, size: 28 }),
        ]
    }));
    sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
            new TextRun({ text: `Môn học: Tin học; Lớp: ${basicInfo.lop || ""}`, italics: true, size: 26 }),
            new TextRun({ text: `\nThời gian thực hiện: ${basicInfo.thoiLuong || 1} tiết`, italics: true, size: 26, break: 1 }),
        ]
    }));

    // --- I. MỤC TIÊU ---
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "I. Mục tiêu", bold: true, size: 26 })], 
        spacing: { before: 200, after: 100 } 
    }));
    
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "1. Về kiến thức: ", bold: true }), new TextRun(cleanHtml(objectives.kienThucText) || "")]
    }));
    
    sections.push(new Paragraph({ children: [new TextRun({ text: "2. Về năng lực: ", bold: true })], spacing: { before: 100 } }));
    
    const nlucDacThuResult = formatNumberedSuffix(objectives.nlucDacThuText, objectiveCounter);
    objectiveCounter = nlucDacThuResult.nextCount;
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "- Năng lực đặc thù: ", italics: true }), ...nlucDacThuResult.runs] 
    }));

    const nlucChungResult = formatNumberedSuffix(objectives.nangLucChung, objectiveCounter);
    objectiveCounter = nlucChungResult.nextCount;
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "- Năng lực chung: ", italics: true }), ...(nlucChungResult.runs.length > 0 ? nlucChungResult.runs : [new TextRun("Theo chương trình môn học.")])] 
    }));

    const phamChatResult = formatNumberedSuffix(objectives.phamChat, objectiveCounter);
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "3. Về phẩm chất: ", bold: true }), ...(phamChatResult.runs.length > 0 ? phamChatResult.runs : [new TextRun("Theo chương trình môn học.")])],
        spacing: { after: 200 }
    }));

    // --- II. THIẾT BỊ DẠY HỌC ---
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "II. Thiết bị dạy học và học liệu", bold: true, size: 26 })], 
        spacing: { before: 300, after: 100 } 
    }));
    sections.push(new Paragraph({ text: "- Giáo viên: " + (basicInfo.thietBiGV || "Máy tính, máy chiếu, bài giảng.") }));
    sections.push(new Paragraph({ text: "- Học sinh: " + (basicInfo.thietBiHS || "Sách giáo khoa, vở ghi.") }));

    // --- III. TIẾN TRÌNH DẠY HỌC ---
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "III. Tiến trình dạy học", bold: true, size: 26 })], 
        spacing: { before: 300, after: 100 } 
    }));

    if (processData && processData.length > 0) {
        const summaryTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            // Chia tỷ lệ: 20% - 30% - 30% - 20% để các cột nội dung có đất diễn
            columnWidths: [2000, 3000, 3000, 2000], 
            rows: [
                new TableRow({
                    children: ["Hoạt động học", "Mục tiêu", "Nội dung trọng tâm", "PP/Kĩ thuật"].map(h => 
                        new TableCell({ 
                            width: { size: 25, type: WidthType.PERCENTAGE }, // Ép 25% cho header
                            shading: { fill: "F2F2F2" }, 
                            children: [new Paragraph({ 
                                text: h, 
                                bold: true, 
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 100, after: 100 }
                            })] 
                        })
                    )
                }),
                ...processData.map(item => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: cleanHtml(item.HoatDong || item.ten) || "", spacing: { before: 80, after: 80 } })] }),
                        new TableCell({ children: [new Paragraph({ text: cleanHtml(item.MucTieu || item.mucTieu) || "", spacing: { before: 80, after: 80 } })] }),
                        new TableCell({ children: [new Paragraph({ text: cleanHtml(item.NoiDung || item.noiDung) || "", spacing: { before: 80, after: 80 } })] }),
                        new TableCell({ children: [new Paragraph({ text: cleanHtml(item.PhuongPhap || item.phuongPhap) || "", spacing: { before: 80, after: 80 } })] }),
                    ]
                }))
            ]
        });
        sections.push(summaryTable);
    }

    // --- IV. CÁC HOẠT ĐỘNG CHI TIẾT --- (Đổi từ số IV thành các mục con nếu cần, nhưng đây giữ IV để đúng logic cũ của bạn)
    // Lưu ý: Nếu muốn đúng chuẩn 5512 thì các hoạt động này nằm trong mục III.
    activities.forEach((act) => {
        sections.push(new Paragraph({
            children: [new TextRun({ text: cleanHtml(act.title), bold: true, size: 26 })],
            spacing: { before: 400, after: 100 }
        }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "a) Mục tiêu: ", bold: true }), new TextRun(cleanHtml(act.mucTieu))] }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "b) Nội dung: ", bold: true }), new TextRun(cleanHtml(act.noiDung))] }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "c) Sản phẩm: ", bold: true }), new TextRun(cleanHtml(act.sanPham))] }));
        sections.push(new Paragraph({ children: [new TextRun({ text: "d) Tổ chức thực hiện: ", bold: true })], spacing: { after: 100 } }));

        if (act.steps && act.steps.length > 0) {
            const stepTable = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                // Khóa cứng khung: Cột "Các bước" chiếm 25%, cột "Nội dung" chiếm 75%
                columnWidths: [2500, 7500], 
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ 
                                width: { size: 25, type: WidthType.PERCENTAGE }, 
                                shading: { fill: "F2F2F2" }, 
                                children: [new Paragraph({ text: "Các bước", bold: true, alignment: AlignmentType.CENTER })] 
                            }),
                            new TableCell({ 
                                width: { size: 75, type: WidthType.PERCENTAGE }, 
                                shading: { fill: "F2F2F2" }, 
                                children: [new Paragraph({ text: "Nội dung tổ chức thực hiện", bold: true, alignment: AlignmentType.CENTER })] 
                            })
                        ]
                    }),
                    ...act.steps.map(s => new TableRow({
                        children: [
                            new TableCell({ 
                                verticalAlign: VerticalAlign.CENTER, 
                                width: { size: 25, type: WidthType.PERCENTAGE }, // Ép lại ở từng ô
                                children: [new Paragraph({ text: s.step, bold: true, alignment: AlignmentType.CENTER })] 
                            }),
                            new TableCell({ 
                                width: { size: 75, type: WidthType.PERCENTAGE }, // Ép lại ở từng ô
                                children: [
                                    new Paragraph({ 
                                        spacing: { before: 100 },
                                        children: [new TextRun({ text: "GV: ", bold: true, color: "2E75B6" }), new TextRun(cleanHtml(s.gv))] 
                                    }),
                                    new Paragraph({ 
                                        spacing: { before: 100, after: 100 }, 
                                        children: [new TextRun({ text: "HS: ", bold: true, color: "C00000" }), new TextRun(cleanHtml(s.hs))] 
                                    })
                                ] 
                            })
                        ]
                    }))
                ]
            });
            sections.push(stepTable);
        }
    });

    // --- IV (hoặc V). PHỤ LỤC --- 
    // Tôi để là IV hoặc V tùy bạn đánh số, ở đây tôi gọi là "IV. Phụ lục" theo yêu cầu
    if (basicInfo.phuLuc) {
        sections.push(new Paragraph({ 
            children: [new TextRun({ text: "IV. Phụ lục và học liệu bổ trợ", bold: true, size: 26 })], 
            spacing: { before: 400, after: 100 } 
        }));

        // Tách dòng phụ lục để in ra đẹp hơn thay vì một khối văn bản dính liền
        const lines = basicInfo.phuLuc.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                sections.push(new Paragraph({
                    children: [new TextRun(cleanHtml(line))],
                    spacing: { after: 50 }
                }));
            }
        });
    }

    const doc = new Document({
        styles: { default: { document: { run: { size: 26, font: "Times New Roman" } } } },
        sections: [{
            properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 } } },
            children: sections 
        }]
    });

    const blob = await Packer.toBlob(doc);
    if (options.getBlob) {
        return blob;
    }
    saveAs(blob, `${basicInfo.fileName || "KHBD"}.docx`);
};
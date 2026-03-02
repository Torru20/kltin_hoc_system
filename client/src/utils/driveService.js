// src/utils/driveService.js
export const uploadBlobToDrive = async (blob, fileName) => {
    const driveToken = localStorage.getItem('google_drive_token');
    if (!driveToken) {
        alert("Vui lòng đăng nhập lại bằng Google để cấp quyền lưu Drive!");
        return false;
    }

    const metadata = {
        name: fileName.endsWith('.docx') ? fileName : `${fileName}.docx`,
        //mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        mimeType: 'application/octet-stream',
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + driveToken }),
            body: formData,
        });

        if (response.ok) {
            alert("Đã lưu lên Google Drive thành công!");
            return true;
        } else {
            if (response.status === 401) alert("Phiên làm việc Drive hết hạn, hãy đăng nhập lại.");
            return false;
        }
    } catch (err) {
        console.error("Lỗi Drive API:", err);
        return false;
    }
};
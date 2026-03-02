import React from 'react';
import { TextField, Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';

const TrueFalseEditor = ({ question, onUpdate }) => {
  // Khởi tạo cấu trúc mặc định an toàn
  const defaultContent = {
    noiDung: '',
    subQuestions: [
      { text: '', answer: true },
      { text: '', answer: true },
      { text: '', answer: true },
      { text: '', answer: true }
    ]
  };

  // Gộp dữ liệu từ props vào bộ khung mặc định
  const content = {
    ...defaultContent,
    ...(question.content || {}),
    // Đảm bảo subQuestions luôn có đủ 4 phần tử kể cả khi data truyền vào thiếu
    subQuestions: question.content?.subQuestions || defaultContent.subQuestions
  };

  const updateSub = (index, field, value) => {
    const newSubs = [...content.subQuestions];
    newSubs[index] = { ...newSubs[index], [field]: value };
    onUpdate({ ...content, subQuestions: newSubs });
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Lời dẫn (Câu hỏi chung cho cả 4 ý)"
        multiline
        rows={2}
        sx={{ mb: 3 }}
        value={content.noiDung}
        onChange={(e) => onUpdate({ ...content, noiDung: e.target.value })}
        placeholder="Nhập đoạn văn bản dẫn dắt..."
      />

      {['a', 'b', 'c', 'd'].map((label, index) => (
        <Box key={label} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
          <Typography sx={{ fontWeight: 'bold', mt: 1, minWidth: '20px' }}>{label}.</Typography>
          
          <TextField 
            fullWidth 
            size="small" 
            placeholder={`Nội dung ý ${label}...`} 
            value={content.subQuestions[index]?.text || ''}
            onChange={(e) => updateSub(index, 'text', e.target.value)}
            multiline
          />

          <ToggleButtonGroup
            value={content.subQuestions[index]?.answer}
            exclusive
            size="small"
            onChange={(e, val) => {
              if (val !== null) updateSub(index, 'answer', val);
            }}
            sx={{ height: '40px' }}
          >
            <ToggleButton value={true} sx={{ color: '#2e7d32', '&.Mui-selected': { bgcolor: '#e8f5e9' } }}>
              ĐÚNG
            </ToggleButton>
            <ToggleButton value={false} sx={{ color: '#d32f2f', '&.Mui-selected': { bgcolor: '#ffebee' } }}>
              SAI
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      ))}
    </Box>
  );
};

export default TrueFalseEditor;
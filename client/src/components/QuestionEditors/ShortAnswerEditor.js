import React from 'react';
import { TextField, Box } from '@mui/material';

const ShortAnswerEditor = ({ question, onUpdate }) => {
  const content = question.content || { noiDung: '', answer: '' };

  return (
    <Box>
      <TextField
        fullWidth
        label="Nội dung câu hỏi"
        multiline
        rows={3}
        sx={{ mb: 2 }}
        value={content.noiDung}
        onChange={(e) => onUpdate({ ...content, noiDung: e.target.value })}
      />
      <TextField
        fullWidth
        label="Đáp án chấp nhận (ngắn gọn)"
        placeholder="Ví dụ: 15, Chiến dịch Điện Biên Phủ..."
        value={content.answer}
        onChange={(e) => onUpdate({ ...content, answer: e.target.value })}
      />
    </Box>
  );
};

export default ShortAnswerEditor;
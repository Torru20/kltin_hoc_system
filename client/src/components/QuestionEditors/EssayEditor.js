import React from 'react';
import { TextField, Box } from '@mui/material';

const EssayEditor = ({ question, onUpdate }) => {
  const content = question.content || { noiDung: '', guide: '' };

  return (
    <Box>
      <TextField
        fullWidth
        label="Nội dung câu hỏi tự luận"
        multiline
        rows={5}
        sx={{ mb: 2 }}
        value={content.noiDung}
        onChange={(e) => onUpdate({ ...content, noiDung: e.target.value })}
      />
      <TextField
        fullWidth
        label="Hướng dẫn chấm / Đáp án mẫu"
        multiline
        rows={3}
        value={content.guide}
        onChange={(e) => onUpdate({ ...content, guide: e.target.value })}
      />
    </Box>
  );
};

export default EssayEditor;
import React from 'react';
import { TextField, Radio, FormControlLabel, RadioGroup, Box, Typography } from '@mui/material';

const MultipleChoiceEditor = ({ question, onUpdate }) => {
  // Đảm bảo dữ liệu luôn có cấu trúc đúng
  const content = {
    noiDung: question.content?.noiDung || '',
    options: question.content?.options || ['', '', '', ''],
    correct: question.content?.correct ?? 0
  };

  const handleChange = (field, value) => {
    onUpdate({ ...content, [field]: value });
  };

  // Hàm chặn sự kiện phím để không ảnh hưởng đến logic chuyển câu của cha
  const handleKeyDown = (e) => {
    if (e.key === ' ') {
      e.stopPropagation(); 
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <TextField
          fullWidth
          label="Nội dung câu hỏi trắc nghiệm"
          multiline
          rows={4}
          value={content.noiDung}
          onKeyDown={handleKeyDown} // Chặn space nhảy câu
          onChange={(e) => handleChange('noiDung', e.target.value)}
          placeholder="Nhập câu hỏi tại đây..."
        />
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ fontWeight: 'bold', color: 'primary.main', textTransform: 'uppercase', fontSize: '0.75rem' }}
        >
          Chọn đáp án đúng và nhập nội dung:
        </Typography>
      </Box>

      <Box>
        <RadioGroup 
          value={content.correct} 
          onChange={(e) => handleChange('correct', parseInt(e.target.value))}
        >
          {['A', 'B', 'C', 'D'].map((label, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormControlLabel 
                value={index} 
                control={<Radio size="small" />} 
                label={<Typography sx={{ fontWeight: 'bold', minWidth: '25px' }}>{label}</Typography>} 
                sx={{ mr: 1, ml: 0 }}
              />
              <TextField 
                fullWidth 
                size="small" 
                placeholder={`Nhập nội dung lựa chọn ${label}...`}
                value={content.options[index] || ''}
                onKeyDown={handleKeyDown} // Chặn space nhảy câu
                onChange={(e) => {
                  const newOptions = [...content.options];
                  newOptions[index] = e.target.value;
                  handleChange('options', newOptions);
                }}
                sx={{
                  backgroundColor: content.correct === index ? '#f0f9ff' : 'transparent',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: content.correct === index ? '#0284c7' : '#e2e8f0',
                    },
                  },
                }}
              />
            </Box>
          ))}
        </RadioGroup>
      </Box>
    </Box>
  );
};

export default MultipleChoiceEditor;
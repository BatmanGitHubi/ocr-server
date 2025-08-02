import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import axios from 'axios';

config();
const app = express();
const port = process.env.PORT || 10000;

// Usar bodyParser para datos binarios (octet-stream)
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  try {
    const imageBuffer = req.body;

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: 'No image received.' });
    }

    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations', // ⚠️ ¡Reemplazar si estás usando otro endpoint!
      {
        model: 'gpt-4-vision-preview',
        prompt: 'Transcribe el texto de esta imagen',
        image: `data:image/jpeg;base64,${base64Image}`, // o image/png
        size: '1024x1024',
        response_format: 'json'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Este bloque depende de la estructura de la respuesta de OpenAI Vision
    const text = response.data.choices?.[0]?.message?.content || 'No text found';

    res.json({ text });
  } catch (error) {
    console.error('❌ Error procesando la imagen:', error.message);
    res.status(500).json({ error: 'Error procesando la imagen' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});


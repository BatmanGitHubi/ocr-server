import express from "express";
import axios from "axios";
import "dotenv/config";
import vision from "@google-cloud/vision";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para recibir imagen en binario
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

// Cliente de Google Vision
const visionClient = new vision.ImageAnnotatorClient();

// 🔀 Selección dinámica del proveedor
app.post("/ocr", async (req, res) => {
  const proveedor = req.query.modelo || "openai"; // ?modelo=openai | deepseek | google
  const base64Image = req.body.toString("base64");

  try {
    let resultado = "";

    if (proveedor === "openai") {
      resultado = await ocrConOpenAI(base64Image);
    } else if (proveedor === "deepseek") {
      resultado = await ocrConDeepSeek(base64Image);
    } else if (proveedor === "google") {
      resultado = await ocrConGoogleVision(Buffer.from(base64Image, 'base64'));
    } else {
      return res.status(400).json({ error: "Proveedor no válido." });
    }

    res.json({ text: resultado });
  } catch (error) {
    console.error(`❌ Error con ${proveedor}:`, error.message);
    console.error("🧠 Detalles:", error.response?.data || error.stack);
    res.status(500).json({ error: `Error con OCR ${proveedor}.` });
  }
});

// 🔹 OpenAI
async function ocrConOpenAI(base64Image) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae todo el texto visible, incluyendo texto manuscrito y campos de tabla." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            },
          ]
        }
      ],
      max_tokens: 1000,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.choices?.[0]?.message?.content?.trim() || "";
}

// 🔹 DeepSeek
async function ocrConDeepSeek(base64Image) {
  const prompt = `Extrae todo el texto visible de esta imagen.\n\nImagen (base64):\n\ndata:image/jpeg;base64,${base64Image}`;
  const response = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
    }
  );
  return response.data.choices?.[0]?.message?.content?.trim() || "";
}

// 🔹 Google Vision
async function ocrConGoogleVision(imageBuffer) {
  const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
  const detections = result.textAnnotations;
  return detections.length > 0 ? detections[0].description : "";
}

// 🔥 Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});


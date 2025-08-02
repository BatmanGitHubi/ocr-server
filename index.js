import express from "express";
import axios from "axios";
import crypto from "crypto";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para recibir imagen en binario
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

// 🧠 Caché en memoria
const cacheOCR = new Map();

// 🔀 Endpoint único con selector de modelo
app.post("/ocr", async (req, res) => {
  const proveedor = req.query.modelo || "openai"; // ?modelo=openai | deepseek
  const imageBuffer = req.body;
  const base64Image = imageBuffer.toString("base64");

  // Crear hash SHA256 de la imagen
  const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");

  if (cacheOCR.has(hash)) {
    console.log(`⚡ OCR desde caché (${proveedor})`);
    return res.json({ text: cacheOCR.get(hash), cache: true });
  }

  try {
    let resultado = "";

    if (proveedor === "openai") {
      resultado = await ocrConOpenAI(base64Image);
    } else if (proveedor === "deepseek") {
      resultado = await ocrConDeepSeek(base64Image);
    } else {
      return res.status(400).json({ error: "Proveedor no válido." });
    }

    cacheOCR.set(hash, resultado); // Guardar en caché
    res.json({ text: resultado, cache: false });

  } catch (error) {
    console.error(`❌ Error con ${proveedor}:`, error.message);
    console.error("🧠 Detalles:", error.response?.data || error.stack || error);
    res.status(500).json({ error: `Error con OCR ${proveedor}.` });
  }
});

// 🔹 OpenAI GPT-4o
async function ocrConOpenAI(base64Image) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrae todo el texto visible de esta imagen, incluyendo texto manuscrito, tablas, encuestas y respuestas estructuradas. Si hay múltiples filas o columnas, intenta conservar esa estructura."
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 1200
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  return response.data.choices?.[0]?.message?.content?.trim() || "";
}

// 🔹 DeepSeek
async function ocrConDeepSeek(base64Image) {
  const prompt = `Extrae todo el texto visible de esta imagen. Si hay encuestas o respuestas, preserva su estructura.`;
  const response = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages: [{ role: "user", content: `${prompt}\n\nImagen (base64):\n\ndata:image/jpeg;base64,${base64Image}` }],
      max_tokens: 1000
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      }
    }
  );

  return response.data.choices?.[0]?.message?.content?.trim() || "";
}

// 🔥 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});



import express from "express";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para recibir imágenes en binario
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

// 🔹 Endpoint OCR con OpenAI
app.post("/ocr/openai", async (req, res) => {
  try {
    const base64Image = req.body.toString("base64");

    const generarOCR_OpenAI = async () => {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extrae todo el texto visible, incluyendo texto manuscrito, campos de una tabla, nombres y números de WhatsApp escritos a mano." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
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
    };

    let resultado = await generarOCR_OpenAI();
    if (!resultado) {
      console.warn("⚠️ Primera respuesta vacía, intentando nuevamente...");
      await new Promise((r) => setTimeout(r, 2000));
      resultado = await generarOCR_OpenAI();
    }

    if (!resultado) {
      return res.status(500).json({ error: "Respuesta vacía del modelo." });
    }

    console.log("✅ Resultado (OpenAI):", resultado);
    res.json({ text: resultado });

  } catch (error) {
    console.error("❌ Error con OpenAI:", error.message);
    console.error("🧠 Detalles:", error.response?.data || error.stack);
    res.status(500).json({ error: "Error con OCR OpenAI." });
  }
});

// 🔹 Endpoint OCR con DeepSeek (CORREGIDO)
app.post("/ocr/deepseek", async (req, res) => {
  try {
    const base64Image = req.body.toString("base64");

    const prompt = `Extrae todo el texto visible de la siguiente imagen (impreso o manuscrito).\nImagen (base64):\n\ndata:image/jpeg;base64,${base64Image}`;

    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
      }
    );

    const resultado = response.data.choices?.[0]?.message?.content?.trim() || "";

    console.log("✅ Resultado (DeepSeek):", resultado);
    res.json({ text: resultado });

  } catch (error) {
    console.error("❌ Error con DeepSeek:", error.message);
    console.error("🧠 Detalles:", error.response?.data || error.stack);
    res.status(500).json({ error: "Error con OCR DeepSeek." });
  }
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

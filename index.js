import express from "express";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para recibir datos binarios (imágenes en bruto)
app.post("/ocr", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
  try {
    const base64Image = req.body.toString("base64");

    const generarOCR = async () => {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4-vision-preview",
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

    // Primer intento
    let resultado = await generarOCR();

    // Segundo intento si el primero falla (respuesta vacía)
    if (!resultado) {
      console.warn("⚠️ Primera respuesta vacía, intentando nuevamente...");
      await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 seg
      resultado = await generarOCR();
    }

    console.log("🔍 Resultado del OCR:", resultado);

    if (!resultado) {
      return res.status(500).json({ error: "Respuesta vacía del modelo." });
    }

    res.json({ text: resultado });

  } catch (error) {
    console.error("❌ Error procesando OCR:", error.message);
    console.error("🧠 Detalles del error:", error.response?.data || error.stack || error);
    res.status(500).json({ error: "Error procesando la imagen." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});


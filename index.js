import express from "express";
import axios from "axios";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 10000;

// Aceptar binarios directamente (sin multer)
app.post("/ocr", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
  try {
    const base64Image = req.body.toString("base64");

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae el texto de esta imagen." },
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

    const resultado = response.data.choices?.[0]?.message?.content || "";
    res.json({ text: resultado.trim() });
  } catch (error) {
    console.error("❌ Error procesando OCR:", error.message);
    res.status(500).json({ error: "Error procesando la imagen." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

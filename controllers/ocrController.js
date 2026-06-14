const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseOcr = async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "rawText tidak boleh kosong"
      });
    }

    console.log("Menerima rawText untuk OCR:", rawText.substring(0, 50) + "...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `Berikut adalah teks mentah hasil OCR dari struk belanja (urutan baris bisa acak/tidak rapi). Ekstrak informasi berikut dan kembalikan HANYA dalam format JSON valid, tanpa markdown code fence, tanpa teks tambahan apapun:
{
  "merchant": string (nama toko/cafe, biasanya di bagian atas struk, abaikan teks watermark/footer seperti 'free for personal use' dll),
  "items": [
    {
      "nama_barang": string,
      "qty": number,
      "harga_satuan": number,
      "subtotal": number
    }
  ],
  "pajak": {
    "label": string (contoh: 'PB1 10%', 'PPN 11%', null jika tidak ada),
    "nominal": number (0 jika tidak ada)
  },
  "subtotal_items": number (total semua subtotal item, sebelum pajak),
  "grand_total": number
}
Aturan parsing:
- Baris dengan kata 'Total', 'Tagihan', 'Bayar', 'Kembalian', 'PB1', 'PPN', 'Service' bukan item barang.
- Setiap baris tabel menu (format: nama, harga satuan, qty, jumlah) jadi satu item terpisah.
- Jika ada ambiguitas, prioritaskan agar subtotal_items + pajak.nominal = grand_total.

Teks OCR mentah:
${rawText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("Raw Response dari Gemini API:", responseText);

    let cleanJsonString = responseText.trim();
    
    // Strip markdown code fences if they exist
    if (cleanJsonString.startsWith("```json")) {
      cleanJsonString = cleanJsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJsonString.startsWith("```")) {
      cleanJsonString = cleanJsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonString);
    } catch (parseError) {
      console.error("Gagal parsing JSON dari Gemini:", parseError);
      return res.status(502).json({
        success: false,
        error: "Gagal memproses hasil dari AI (invalid JSON format)"
      });
    }

    // Validasi minimal struktur hasil dan isi default jika kosong
    const finalData = {
      merchant: parsedData.merchant || "Unknown Merchant",
      items: Array.isArray(parsedData.items) ? parsedData.items : [],
      pajak: {
        label: parsedData.pajak?.label || null,
        nominal: typeof parsedData.pajak?.nominal === 'number' ? parsedData.pajak.nominal : 0
      },
      subtotal_items: typeof parsedData.subtotal_items === 'number' ? parsedData.subtotal_items : 0,
      grand_total: typeof parsedData.grand_total === 'number' ? parsedData.grand_total : 0
    };

    return res.json({
      success: true,
      data: finalData
    });

  } catch (error) {
    console.error("Error pada endpoint OCR:", error);
    
    // Check for specific API errors
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: "Terlalu banyak request ke API (Rate Limit), silahkan coba lagi nanti."
      });
    }

    return res.status(500).json({
      success: false,
      error: "Terjadi kesalahan internal server saat memproses data OCR."
    });
  }
};

module.exports = {
  parseOcr
};

const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: OCR
 *   description: Proses raw OCR dari struk menjadi data terstruktur
 */

/**
 * @swagger
 * /api/ocr/parse:
 *   post:
 *     summary: Parse raw OCR text dari receipt ke JSON terstruktur menggunakan Gemini API
 *     tags: [OCR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rawText
 *             properties:
 *               rawText:
 *                 type: string
 *                 example: "JO CAFE\n1 LEMONADE ICE 15.000\nTotal 15.000"
 *     responses:
 *       200:
 *         description: Berhasil mem-parse OCR
 *       400:
 *         description: rawText kosong atau format salah
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       502:
 *         description: Gagal parsing output AI
 *       500:
 *         description: Internal server error
 */
router.post('/parse', authMiddleware, ocrController.parseOcr);

module.exports = router;

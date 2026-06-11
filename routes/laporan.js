const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Laporan
 *   description: Generate & manajemen laporan keuangan PDF
 */

/**
 * @swagger
 * /api/laporan/export:
 *   post:
 *     summary: Generate & export laporan PDF berdasarkan bulan & tahun
 *     description: >
 *       Generate PDF laporan keuangan, upload ke Supabase Storage,
 *       dan simpan record ke database. Hanya bisa 1 laporan per month+year per user.
 *       Untuk download ulang, gunakan endpoint GET /api/laporan/history.
 *     tags: [Laporan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: integer
 *                 description: Nomor bulan (1-12)
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 6
 *               year:
 *                 type: integer
 *                 description: Tahun (min 2020, tidak boleh di masa depan)
 *                 minimum: 2020
 *                 example: 2026
 *     responses:
 *       201:
 *         description: Laporan berhasil digenerate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Laporan berhasil digenerate"
 *                 data:
 *                   type: object
 *                   properties:
 *                     laporan_id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: string
 *                       example: "uuid-xxx"
 *                     report_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-06-11"
 *                     period_label:
 *                       type: string
 *                       example: "Juni 2026"
 *                     file_url:
 *                       type: string
 *                       example: "https://storage.supabase.co/report-generate/laporan-2026-06-user-xxx.pdf"
 *                     file_name:
 *                       type: string
 *                       example: "Laporan_Keuangan_Juni_2026.pdf"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_transactions:
 *                           type: integer
 *                           example: 25
 *                         total_spent:
 *                           type: number
 *                           example: 3000000
 *                         income:
 *                           type: number
 *                           example: 5000000
 *                         remaining:
 *                           type: number
 *                           example: 2000000
 *                         percentage:
 *                           type: number
 *                           example: 60
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validasi gagal atau laporan sudah pernah dibuat
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.post('/export', authMiddleware, laporanController.exportLaporan);

/**
 * @swagger
 * /api/laporan/history:
 *   get:
 *     summary: Riwayat laporan yang pernah digenerate
 *     description: >
 *       Menampilkan daftar laporan yang pernah dibuat oleh user.
 *       file_url bisa digunakan untuk download PDF berkali-kali.
 *       Support pagination dan filter by year.
 *     tags: [Laporan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Nomor halaman
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Jumlah data per halaman (maks 100)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan tahun (optional)
 *         example: 2026
 *     responses:
 *       200:
 *         description: Riwayat laporan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     laporan:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           laporan_id:
 *                             type: integer
 *                             example: 1
 *                           report_date:
 *                             type: string
 *                             format: date
 *                             example: "2026-06-11"
 *                           period_label:
 *                             type: string
 *                             example: "Juni 2026"
 *                           file_url:
 *                             type: string
 *                             example: "https://storage.supabase.co/report-generate/laporan-2026-06-user-xxx.pdf"
 *                           file_name:
 *                             type: string
 *                             example: "Laporan_Keuangan_Juni_2026.pdf"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 5
 *                         total_pages:
 *                           type: integer
 *                           example: 1
 *                         has_next:
 *                           type: boolean
 *                           example: false
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/history', authMiddleware, laporanController.getHistory);

/**
 * @swagger
 * /api/laporan/cron/generate-laporan:
 *   post:
 *     summary: Cron job untuk generate laporan bulanan otomatis bagi seluruh user
 *     description: >
 *       Mengecek dan men-generate laporan untuk seluruh user aktif.
 *       Memerlukan header Authorization Bearer <CRON_SECRET>.
 *       Dapat menerima payload month & year opsional untuk manual trigger / backfill.
 *     tags: [Laporan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: integer
 *                 description: Bulan yang digenerate. Default bulan sekarang.
 *                 example: 6
 *               year:
 *                 type: integer
 *                 description: Tahun yang digenerate. Default tahun sekarang.
 *                 example: 2026
 *     responses:
 *       200:
 *         description: Laporan berhasil digenerate untuk semua user
 *       401:
 *         description: Token cron tidak valid
 */
router.post('/cron/generate-laporan', laporanController.cronGenerateLaporan);

module.exports = router;

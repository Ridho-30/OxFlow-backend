const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Dashboard & Analytics pengeluaran
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Dashboard summary + weekly chart + top categories
 *     description: >
 *       Menampilkan ringkasan keuangan bulan ini, chart pengeluaran 7 hari terakhir,
 *       dan 3 kategori dengan pengeluaran terbesar.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data berhasil diambil
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         income:
 *                           type: number
 *                           example: 5000000
 *                         threshold:
 *                           type: number
 *                           example: 4000000
 *                         total_spent:
 *                           type: number
 *                           example: 3000000
 *                         remaining:
 *                           type: number
 *                           example: 1000000
 *                         percentage_spent:
 *                           type: number
 *                           example: 75
 *                         status:
 *                           type: string
 *                           enum: [normal, warning, danger]
 *                     this_month_info:
 *                       type: object
 *                       properties:
 *                         month:
 *                           type: integer
 *                           example: 6
 *                         month_name:
 *                           type: string
 *                           example: "Juni"
 *                         year:
 *                           type: integer
 *                           example: 2026
 *                         month_label:
 *                           type: string
 *                           example: "Juni 2026"
 *                         total_transactions:
 *                           type: integer
 *                           example: 25
 *                     weekly_chart:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: "2026-06-05"
 *                           day:
 *                             type: string
 *                             example: "Jumat"
 *                           total:
 *                             type: number
 *                             example: 150000
 *                     top_categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           kategori_id:
 *                             type: integer
 *                             example: 1
 *                           kategori_nama:
 *                             type: string
 *                             example: "Makanan"
 *                           total_spent:
 *                             type: number
 *                             example: 2000000
 *                           percentage:
 *                             type: number
 *                             example: 66.67
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/dashboard', authMiddleware, analyticsController.getDashboard);

/**
 * @swagger
 * /api/analytics/by-category:
 *   get:
 *     summary: Pengeluaran per kategori (untuk Pie Chart)
 *     description: >
 *       Menampilkan total pengeluaran per kategori untuk bulan & tahun tertentu.
 *       Include semua kategori (bahkan yang belum ada pengeluaran).
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Nomor bulan (1-12). Default bulan saat ini.
 *         example: 6
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun. Default tahun saat ini.
 *         example: 2026
 *     responses:
 *       200:
 *         description: Data pengeluaran per kategori berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kategori_id:
 *                         type: integer
 *                         example: 1
 *                       kategori_nama:
 *                         type: string
 *                         example: "Makanan"
 *                       total_spent:
 *                         type: number
 *                         example: 2000000
 *                       percentage:
 *                         type: number
 *                         example: 66.67
 *                       transaction_count:
 *                         type: integer
 *                         example: 12
 *       400:
 *         description: Month tidak valid
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/by-category', authMiddleware, analyticsController.getByCategory);

/**
 * @swagger
 * /api/analytics/trend:
 *   get:
 *     summary: Tren pengeluaran bulanan (untuk Line Chart)
 *     description: >
 *       Menampilkan total pengeluaran per bulan selama 1 tahun penuh (12 bulan).
 *       Include semua bulan walaupun belum ada pengeluaran (total_spent = 0).
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tahun. Default tahun saat ini.
 *         example: 2026
 *     responses:
 *       200:
 *         description: Data tren pengeluaran berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: integer
 *                         example: 1
 *                       month_name:
 *                         type: string
 *                         example: "Januari"
 *                       date:
 *                         type: string
 *                         example: "2026-01"
 *                       total_spent:
 *                         type: number
 *                         example: 2500000
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/trend', authMiddleware, analyticsController.getTrend);

module.exports = router;

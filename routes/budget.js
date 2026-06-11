const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Budget
 *   description: Manajemen budget pengeluaran
 */

/**
 * @swagger
 * /api/budget:
 *   post:
 *     summary: Create atau Update budget (income & threshold)
 *     description: >
 *       Jika budget belum ada, akan dibuat baru (201).
 *       Jika sudah ada, akan di-update (200).
 *       Hanya boleh 1 budget per user.
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - income
 *               - threshold
 *             properties:
 *               income:
 *                 type: number
 *                 description: Pendapatan bulanan
 *                 example: 5000000
 *               threshold:
 *                 type: number
 *                 description: Batas pengeluaran (harus <= income)
 *                 example: 4000000
 *     responses:
 *       201:
 *         description: Budget berhasil disimpan (create baru)
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
 *                   example: Budget berhasil disimpan
 *                 data:
 *                   type: object
 *                   properties:
 *                     budget_id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: string
 *                       example: "uuid-xxx"
 *                     income:
 *                       type: number
 *                       example: 5000000
 *                     threshold:
 *                       type: number
 *                       example: 4000000
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       200:
 *         description: Budget berhasil diupdate
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.post('/', authMiddleware, budgetController.createOrUpdateBudget);

/**
 * @swagger
 * /api/budget:
 *   get:
 *     summary: Ambil info budget beserta status pengeluaran bulan ini
 *     description: >
 *       Return budget info + total_spent_this_month + remaining + percentage + status.
 *       Status: normal (0-74%), warning (75-99%), danger (>=100%).
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget info berhasil diambil
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
 *                     budget_id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: string
 *                     income:
 *                       type: number
 *                       example: 5000000
 *                     threshold:
 *                       type: number
 *                       example: 4000000
 *                     total_spent_this_month:
 *                       type: number
 *                       example: 3000000
 *                     remaining:
 *                       type: number
 *                       example: 1000000
 *                     percentage_used:
 *                       type: number
 *                       example: 75
 *                     status:
 *                       type: string
 *                       enum: [normal, warning, danger]
 *                       example: warning
 *                     status_description:
 *                       type: string
 *                       example: "Pengeluaran sudah mencapai 75% dari batas."
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Budget belum dibuat
 */
router.get('/', authMiddleware, budgetController.getBudget);

/**
 * @swagger
 * /api/budget/status:
 *   get:
 *     summary: Quick check status budget (lightweight)
 *     description: >
 *       Endpoint ringan untuk cek apakah budget sudah exceeded/warning.
 *       Cocok untuk notifikasi/badge di mobile app.
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget status berhasil diambil
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
 *                     is_exceeded:
 *                       type: boolean
 *                       example: false
 *                     is_warning:
 *                       type: boolean
 *                       example: true
 *                     percentage:
 *                       type: number
 *                       example: 75
 *                     status:
 *                       type: string
 *                       enum: [normal, warning, danger]
 *                       example: warning
 *                     remaining:
 *                       type: number
 *                       example: 1000000
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Budget belum dibuat
 */
router.get('/status', authMiddleware, budgetController.getBudgetStatus);

module.exports = router;

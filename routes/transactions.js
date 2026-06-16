const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Manajemen transaksi pengeluaran
 */

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Buat transaksi baru
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - total
 *               - date
 *               - details
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               total:
 *                 type: number
 *                 example: 50000
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-23"
 *               foto_struk:
 *                 type: string
 *                 nullable: true
 *                 example: "https://bucket.example.com/struk-123.jpg"
 *               nama_toko:
 *                 type: string
 *                 nullable: true
 *                 example: "Indomaret Jember"
 *               details:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - name_items
 *                     - quantity
 *                     - price
 *                   properties:
 *                     name_items:
 *                       type: string
 *                       example: "Indomie Goreng"
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *                     price:
 *                       type: number
 *                       example: 7000
 *     responses:
 *       201:
 *         description: Transaksi berhasil dibuat
 *       400:
 *         description: Validasi gagal
 *
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.post('/', authMiddleware, transactionController.createTransaction);

/**
 * @swagger
 * /api/transactions/upload-receipt:
 *   post:
 *     summary: Upload foto struk transaksi
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto berhasil diunggah
 */
router.post('/upload-receipt', authMiddleware, upload.single('receipt'), transactionController.uploadReceipt);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Ambil semua transaksi milik user (pagination & filter)
 *     tags: [Transactions]
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
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter berdasarkan kategori
 *         example: 1
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter dari tanggal (YYYY-MM-DD)"
 *         example: "2026-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Filter sampai tanggal (YYYY-MM-DD)"
 *         example: "2026-05-31"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [date_asc, date_desc]
 *           default: date_desc
 *         description: Urutan data
 *     responses:
 *       200:
 *         description: Daftar transaksi berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/', authMiddleware, transactionController.getAllTransactions);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Ambil detail satu transaksi beserta item-nya
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Detail transaksi berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.get('/:id', authMiddleware, transactionController.getTransactionDetail);

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update transaksi beserta detail item-nya
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - total
 *               - date
 *               - details
 *             properties:
 *               category_id:
 *                 type: integer
 *               total:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               foto_struk:
 *                 type: string
 *                 nullable: true
 *               nama_toko:
 *                 type: string
 *                 nullable: true
 *                 example: "Alfamart Jember"
 *               details:
 *                 type: array
 *     responses:
 *       200:
 *         description: Transaksi berhasil diupdate
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.put('/:id', authMiddleware, transactionController.updateTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Hapus transaksi (soft delete)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *         example: 1
 *     responses:
 *       200:
 *         description: Transaksi berhasil dihapus
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
 *                   example: Transaksi berhasil dihapus
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.delete('/:id', authMiddleware, transactionController.deleteTransaction);

module.exports = router;

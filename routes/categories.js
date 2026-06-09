const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Manajemen kategori transaksi
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Ambil semua kategori
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar kategori berhasil diambil
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.get('/', authMiddleware, categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Buat kategori baru
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_category
 *             properties:
 *               name_category:
 *                 type: string
 *                 example: Gaming
 *     responses:
 *       201:
 *         description: Kategori berhasil dibuat
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 */
router.post('/', authMiddleware, categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update kategori
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *         example: 9
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name_category
 *             properties:
 *               name_category:
 *                 type: string
 *                 example: Video Gaming
 *     responses:
 *       200:
 *         description: Kategori berhasil diupdate
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Kategori tidak ditemukan
 */
router.put('/:id', authMiddleware, categoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Hapus kategori (tidak bisa dihapus jika sedang dipakai transaksi)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID kategori
 *         example: 9
 *     responses:
 *       200:
 *         description: Kategori berhasil dihapus
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
 *                   example: Kategori berhasil dihapus
 *       400:
 *         description: Kategori sedang digunakan, tidak bisa dihapus
 *       401:
 *         description: Token tidak valid atau tidak ditemukan
 *       404:
 *         description: Kategori tidak ditemukan
 */
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user baru
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *       400:
 *         description: Validasi gagal
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Email atau password salah
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token berhasil diperbarui
 */
router.post('/refresh', authMiddleware, authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Ubah password dengan password lama
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *                 example: "password_lama123"
 *               new_password:
 *                 type: string
 *                 example: "password_baru456"
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *       400:
 *         description: Validasi gagal atau password lama tidak sesuai
 *       401:
 *         description: Token tidak valid
 */
router.patch('/change-password', authMiddleware, authController.changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request reset password via email
 *     description: >
 *       User yang lupa password bisa request reset.
 *       Backend akan kirim email berisi link reset password.
 *       Link berlaku selama 15 menit.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@gmail.com"
 *     responses:
 *       200:
 *         description: Email reset password berhasil dikirim
 *       400:
 *         description: Email tidak valid
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password dengan token dari email
 *     description: >
 *       Endpoint untuk reset password menggunakan token yang dikirim via email.
 *       Token diperoleh dari link di email yang dikirim oleh endpoint /forgot-password.
 *       Token berlaku 15 menit.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - new_password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token dari email reset password
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password_baru123"
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Token tidak valid atau sudah kadaluarsa
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;

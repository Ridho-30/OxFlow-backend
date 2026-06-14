const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users/profile/photo:
 *   post:
 *     summary: Upload foto profil user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto profil berhasil diunggah
 */
router.post('/profile/photo', authMiddleware, upload.single('photo'), userController.uploadPhoto);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get profil user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil
 */
router.get('/profile', authMiddleware, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update profil user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *                 format: url
 *     responses:
 *       200:
 *         description: Profil berhasil diupdate
 */
router.put('/profile', authMiddleware, userController.updateProfile);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Hapus akun
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Akun berhasil dihapus
 */
router.delete('/account', authMiddleware, userController.deleteAccount);

module.exports = router;

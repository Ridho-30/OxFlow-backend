const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const user = await db.users.findFirst({
      where: {
        user_id: userId,
        deleted_at: null
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        profile_picture: true,
        fcm_token: true,
        created_at: true
      }
    });

    if (!user) {
      return errorResponse(res, 404, 'User tidak ditemukan');
    }

    return successResponse(
      res,
      200,
      'Berhasil mendapatkan profil',
      user
    );

  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { name, fcm_token } = req.body;

    if (!name) {
      return errorResponse(
        res,
        400,
        'Validasi gagal',
        ['Nama wajib diisi']
      );
    }

    const user = await db.users.update({
      where: {
        user_id: userId
      },
      data: {
        name,
        fcm_token: fcm_token || undefined,
        updated_at: new Date()
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        profile_picture: true,
        fcm_token: true
      }
    });

    return successResponse(
      res,
      200,
      'Profil berhasil diupdate',
      user
    );

  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.user_id;

    if (!req.file) {
      return errorResponse(
        res,
        400,
        'Validasi gagal',
        ['Foto profil wajib diunggah']
      );
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const user = await db.users.update({
      where: {
        user_id: userId
      },
      data: {
        profile_picture: fileUrl,
        updated_at: new Date()
      },
      select: {
        user_id: true,
        profile_picture: true
      }
    });

    return successResponse(
      res,
      200,
      'Foto profil berhasil diunggah',
      user
    );

  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.user_id;

    await db.users.update({
      where: {
        user_id: userId
      },
      data: {
        deleted_at: new Date()
      }
    });

    return successResponse(
      res,
      200,
      'Akun berhasil dihapus'
    );

  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      500,
      'Terjadi kesalahan pada server'
    );
  }
};
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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
    const { name, fcm_token, profile_picture } = req.body;

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
        ...(profile_picture !== undefined && { profile_picture }),
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
      return errorResponse(res, 400, 'Validasi gagal', ['Foto profil wajib diunggah']);
    }

    // Upload ke Supabase Storage
    const fileName = `${userId}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('profile-pictures') // Pastikan nama bucket ini SAMA dengan di dashboard Supabase
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (error) throw error;

    // Ambil URL publiknya
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    // Update database
    const user = await db.users.update({
      where: { user_id: userId },
      data: { profile_picture: data.publicUrl, updated_at: new Date() },
      select: { user_id: true, profile_picture: true }
    });

    return successResponse(res, 200, 'Foto profil berhasil diunggah', user);
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
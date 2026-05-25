const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/helpers');

const generateToken = (userId) => {
  return jwt.sign({ user_id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ user_id: userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRE });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return errorResponse(res, 400, 'Validasi gagal', ['Nama, email, dan password wajib diisi']);
    }

    // Check if email exists
    const userExists = await db.users.findUnique({
  where: {
    email: email
  }
});

if (userExists) {
  return errorResponse(res, 400, 'Validasi gagal', ['Email sudah terdaftar']);
}

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const user = await db.users.create({
  data: {
    name,
    email,
    password: hashedPassword
  },
  select: {
    user_id: true,
    name: true,
    email: true,
    created_at: true
  }
});
    const token = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    return successResponse(res, 201, 'Registrasi berhasil', { user, token, refreshToken });
  } catch (error) {
    // Tambahkan console.log ini untuk melihat detail error di terminal VS Code
    console.error("DETAIL ERROR REGISTER:", error); 
    
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return errorResponse(res, 400, 'Validasi gagal', ['Email dan password wajib diisi']);
    }

    // Check user
    const user = await db.users.findUnique({
  where: {
    email: email
  }
});

if (!user) {
  return errorResponse(res, 401, 'Email atau password salah');
}

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Email atau password salah');
    }

    const token = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    delete user.password; // jangan return password

    return successResponse(res, 200, 'Login berhasil', { user, token, refreshToken });
  } catch (error) {
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return errorResponse(res, 400, 'Validasi gagal', ['Refresh token wajib diisi']);
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    
    const token = generateToken(decoded.user_id);
    const newRefreshToken = generateRefreshToken(decoded.user_id);

    return successResponse(res, 200, 'Token berhasil diperbarui', { token, refreshToken: newRefreshToken });
  } catch (error) {
    return errorResponse(res, 401, 'Refresh token tidak valid atau sudah kadaluarsa');
  }
};

exports.logout = async (req, res) => {
  // Client-side harus menghapus token dari storage
  // Secara server-side tanpa redis, kita hanya membalas sukses
  return successResponse(res, 200, 'Logout berhasil');
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return errorResponse(res, 400, 'Validasi gagal', ['Email, password lama, dan password baru wajib diisi']);
    }

    // Cari user
    const user = await db.users.findUnique({
  where: {
    email: email
  }
});

if (!user) {
  return errorResponse(res, 404, 'User tidak ditemukan');
}

    // Cek password lama
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return errorResponse(res, 400, 'Validasi gagal', ['Password lama tidak cocok']);
    }

    // Hash password baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
await db.users.update({
  where: {
    email: email
  },
  data: {
    password: hashedPassword,
    updated_at: new Date()
  }
});

    return successResponse(res, 200, 'Password berhasil diubah');
  } catch (error) {
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};
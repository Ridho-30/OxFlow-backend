const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendEmail } = require('../utils/email');

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

exports.changePassword = async (req, res) => {
  try {
    const email = req.body.email;
    const oldPassword = req.body.oldPassword || req.body.old_password;
    const newPassword = req.body.newPassword || req.body.new_password;

    const user_id = req.user?.user_id;

    if (!oldPassword || !newPassword) {
      return errorResponse(res, 400, 'Validasi gagal', ['Password lama dan password baru wajib diisi']);
    }

    let user;
    if (user_id) {
      user = await db.users.findUnique({
        where: { user_id: user_id }
      });
    } else if (email) {
      user = await db.users.findUnique({
        where: { email: email }
      });
    } else {
      return errorResponse(res, 400, 'Validasi gagal', ['Email wajib diisi jika tidak terautentikasi']);
    }

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
        user_id: user.user_id
      },
      data: {
        password: hashedPassword,
        updated_at: new Date()
      }
    });

    return successResponse(res, 200, 'Password berhasil diubah');
  } catch (error) {
    console.error('ERROR changePassword:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validasi
    if (!email || String(email).trim() === '') {
      return errorResponse(res, 400, 'Validasi gagal', ['Email wajib diisi']);
    }

    // Cari user berdasarkan email
    const user = await db.users.findUnique({
      where: { email: String(email).trim().toLowerCase() }
    });

    if (!user) {
      // Jangan reveal kalau email tidak ada (security best practice)
      return successResponse(res, 200, 'Jika email terdaftar, link reset akan dikirim');
    }

    // Generate reset token (valid 15 menit)
    const resetToken = jwt.sign(
      { user_id: user.user_id, type: 'password_reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Buat reset link
    const baseUrl = env.APP_RESET_PASSWORD_URL || 'https://ox-flow-backend.vercel.app/reset-password';
    const resetLink = `${baseUrl}?token=${resetToken}`;

    // Logging untuk memudahkan debugging
    console.log(`[AUTH] Generate Reset Password Link for ${user.email}:`);
    console.log(`[AUTH] Token: ${resetToken}`);
    console.log(`[AUTH] Complete Link: ${resetLink}`);

    // Template email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 8px; }
            h2 { color: #333; }
            .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset Password - OxFlow</h2>
            <p>Halo ${user.name},</p>
            <p>Kami menerima permintaan untuk reset password akun Anda. Klik tombol di bawah untuk reset password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p><strong>Link berlaku selama 15 menit.</strong></p>
            <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda tetap aman.</p>
            <p>Jika tombol tidak berfungsi, Anda juga bisa menyalin link berikut: <br/>${resetLink}</p>
            <div class="footer">
              <p>© 2026 OxFlow - Aplikasi Pencatatan Keuangan Digital</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Kirim email
    const emailSent = await sendEmail(
      user.email,
      'Reset Password - OxFlow',
      emailHtml
    );

    if (!emailSent) {
      return errorResponse(res, 500, 'Gagal mengirim email reset password');
    }

    return successResponse(res, 200, 'Link reset password sudah dikirim ke email Anda');
  } catch (error) {
    console.error('ERROR forgotPassword:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const token = req.body.token;
    const new_password = req.body.newPassword || req.body.new_password;

    // Validasi input
    const errors = [];
    if (!token || String(token).trim() === '') {
      errors.push('Token wajib diisi');
    }
    if (!new_password || String(new_password).trim() === '') {
      errors.push('Password baru wajib diisi');
    } else if (new_password.length < 6) {
      errors.push('Password minimal 6 karakter');
    }

    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Validasi token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
      
      // Pastikan token tipe password_reset
      if (decoded.type !== 'password_reset') {
        return errorResponse(res, 401, 'Token tidak valid');
      }
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Link reset sudah kadaluarsa (berlaku 15 menit)');
      }
      return errorResponse(res, 401, 'Token tidak valid atau kadaluarsa');
    }

    // Cari user
    const user = await db.users.findUnique({
      where: { user_id: decoded.user_id }
    });

    if (!user) {
      return errorResponse(res, 404, 'User tidak ditemukan');
    }

    // Hash password baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password di database
    await db.users.update({
      where: { user_id: decoded.user_id },
      data: { 
        password: hashedPassword,
        updated_at: new Date()
      }
    });

    // Kirim email notifikasi (opsional tapi recommended)
    const notifHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 8px; }
            .alert { background-color: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Berhasil Direset</h2>
            <p>Halo ${user.name},</p>
            <div class="alert">
              <strong>✓ Password Anda berhasil direset.</strong>
            </div>
            <p>Anda sekarang bisa login dengan password baru Anda.</p>
            <p>Jika ini bukan Anda yang melakukan reset, segera hubungi kami.</p>
            <div style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              <p>© 2026 OxFlow</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail(user.email, 'Password Berhasil Direset - OxFlow', notifHtml);

    return successResponse(res, 200, 'Password berhasil direset. Silakan login dengan password baru Anda.');
  } catch (error) {
    console.error('ERROR resetPassword:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};
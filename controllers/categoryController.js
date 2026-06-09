const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// ─────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await db.categories.findMany({
      select: {
        category_id: true,
        name_category: true
      },
      orderBy: { category_id: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('ERROR getAllCategories:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────
// POST /api/categories
// ─────────────────────────────────────────
exports.createCategory = async (req, res) => {
  try {
    const { name_category } = req.body;
    const errors = [];

    if (!name_category || String(name_category).trim() === '') {
      errors.push('name_category wajib diisi');
    } else if (String(name_category).trim().length > 255) {
      errors.push('name_category maksimal 255 karakter');
    }

    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Cek duplikasi nama (case-insensitive)
    const existing = await db.categories.findFirst({
      where: {
        name_category: { equals: String(name_category).trim() },
        deleted_at: null
      }
    });
    if (existing) {
      return errorResponse(res, 400, 'Validasi gagal', ['Nama kategori sudah ada']);
    }

    const category = await db.categories.create({
      data: {
        name_category: String(name_category).trim(),
        is_default: false
      },
      select: {
        category_id: true,
        name_category: true
      }
    });

    return successResponse(res, 201, 'Kategori berhasil dibuat', category);
  } catch (error) {
    console.error('ERROR createCategory:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────
// PUT /api/categories/:id
// ─────────────────────────────────────────
exports.updateCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return errorResponse(res, 400, 'ID kategori tidak valid');
    }

    const existing = await db.categories.findFirst({
      where: { category_id: categoryId, deleted_at: null }
    });

    if (!existing) {
      return errorResponse(res, 404, 'Kategori tidak ditemukan');
    }

    const { name_category } = req.body;
    const errors = [];

    if (!name_category || String(name_category).trim() === '') {
      errors.push('name_category wajib diisi');
    } else if (String(name_category).trim().length > 255) {
      errors.push('name_category maksimal 255 karakter');
    }

    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Cek duplikasi (kecuali diri sendiri)
    const duplicate = await db.categories.findFirst({
      where: {
        name_category: { equals: String(name_category).trim() },
        NOT: { category_id: categoryId },
        deleted_at: null
      }
    });
    if (duplicate) {
      return errorResponse(res, 400, 'Validasi gagal', ['Nama kategori sudah ada']);
    }

    const updated = await db.categories.update({
      where: { category_id: categoryId },
      data: { name_category: String(name_category).trim() },
      select: {
        category_id: true,
        name_category: true
      }
    });

    return successResponse(res, 200, 'Kategori berhasil diupdate', updated);
  } catch (error) {
    console.error('ERROR updateCategory:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────
// DELETE /api/categories/:id
// ─────────────────────────────────────────
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return errorResponse(res, 400, 'ID kategori tidak valid');
    }

    const existing = await db.categories.findFirst({
      where: { category_id: categoryId, deleted_at: null }
    });

    if (!existing) {
      return errorResponse(res, 404, 'Kategori tidak ditemukan');
    }

    // Cek apakah kategori sedang digunakan di transaksi aktif
    const usedInTransaction = await db.transaction.count({
      where: { category_id: categoryId, deleted_at: null }
    });

    if (usedInTransaction > 0) {
      return errorResponse(res, 400, 'Kategori sedang digunakan, tidak bisa dihapus');
    }

    await db.categories.update({
      where: { category_id: categoryId },
      data: { deleted_at: new Date() }
    });

    return successResponse(res, 200, 'Kategori berhasil dihapus');
  } catch (error) {
    console.error('ERROR deleteCategory:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

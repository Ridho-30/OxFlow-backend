const db = require('../config/database');
const { successResponse, errorResponse, isNotFutureDate } = require('../utils/helpers');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ─────────────────────────────────────────────────────────────
// HELPER: Build response detail object
// ─────────────────────────────────────────────────────────────
const buildDetailItems = (details) =>
  details.map((d) => ({
    detail_transaction_id: d.detail_transaction_id,
    name_items: d.name_items,
    quantity: d.quantity,
    price: Number(d.price),
    subtotal: Number(d.subtotal)
  }));

// ─────────────────────────────────────────────────────────────
// HELPER: Validate transaction payload
// ─────────────────────────────────────────────────────────────
const validateTransactionPayload = (body) => {
  const errors = [];
  const { category_id, total, date, details } = body;

  if (!category_id || isNaN(parseInt(category_id))) {
    errors.push('category_id wajib diisi dan harus berupa angka');
  }

  if (total === undefined || total === null || isNaN(Number(total)) || Number(total) <= 0) {
    errors.push('Total harus berupa angka dan lebih dari 0');
  }

  if (!date) {
    errors.push('Tanggal transaksi wajib diisi');
  } else if (!isNotFutureDate(date)) {
    errors.push('Tanggal transaksi tidak boleh di masa depan');
  }

  if (!Array.isArray(details) || details.length === 0) {
    errors.push('Detail transaksi minimal 1 item');
  } else if (details.length > 100) {
    errors.push('Detail transaksi maksimal 100 item');
  } else {
    details.forEach((item, idx) => {
      const no = idx + 1;
      if (!item.name_items || String(item.name_items).trim() === '') {
        errors.push(`Item ke-${no}: nama item wajib diisi`);
      } else if (String(item.name_items).trim().length > 255) {
        errors.push(`Item ke-${no}: nama item maksimal 255 karakter`);
      }
      if (!item.quantity || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        errors.push(`Item ke-${no}: quantity harus integer >= 1`);
      }
      if (item.price === undefined || isNaN(Number(item.price)) || Number(item.price) <= 0) {
        errors.push(`Item ke-${no}: harga harus lebih dari 0`);
      }
    });

    if (errors.length === 0 && total !== undefined) {
      details.forEach(d => { d.subtotal = Number(d.quantity) * Number(d.price); });
      const sumSubtotal = details.reduce((acc, d) => {
        return acc + (parseInt(d.quantity) * Number(d.price));
      }, 0);
      if (Math.abs(sumSubtotal - Number(total)) > 1000) {
        errors.push('Total tidak sesuai dengan penjumlahan detail (toleransi ±1.000)');
      }
    }
  }

  return errors;
};

// ─────────────────────────────────────────────────────────────
// POST /api/transactions
// ─────────────────────────────────────────────────────────────
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { category_id, total, date, foto_struk, nama_toko, details } = req.body;  // ← tambah nama_toko

    const errors = validateTransactionPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Cek category_id valid
    const category = await db.categories.findFirst({
      where: { category_id: parseInt(category_id), deleted_at: null }
    });
    if (!category) {
      return errorResponse(res, 400, 'Validasi gagal', ['category_id tidak valid']);
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Insert transaction (tambah nama_toko)
      const trx = await tx.transaction.create({
        data: {
          user_id: userId,
          category_id: parseInt(category_id),
          total: Number(total),
          date: new Date(date),
          foto_struk: foto_struk || null,
          nama_toko: nama_toko ? String(nama_toko).trim() : null  // ← TAMBAH INI
        }
      });

      // 2. Insert detail items (sama seperti sebelumnya)
      const detailData = details.map((d) => ({
        transaction_id: trx.transaction_id,
        name_items: String(d.name_items).trim(),
        quantity: parseInt(d.quantity),
        price: Number(d.price),
        subtotal: parseInt(d.quantity) * Number(d.price)
      }));

      await tx.detail_transaction.createMany({ data: detailData });

      // 3. Fetch inserted details
      const insertedDetails = await tx.detail_transaction.findMany({
        where: { transaction_id: trx.transaction_id }
      });

      return { trx, insertedDetails };
    });

    const responseData = {
      transaction_id: result.trx.transaction_id,
      user_id: result.trx.user_id,
      category_id: result.trx.category_id,
      total: Number(result.trx.total),
      date: result.trx.date,
      foto_struk: result.trx.foto_struk,
      nama_toko: result.trx.nama_toko,  // ← TAMBAH INI
      created_at: result.trx.created_at,
      details: buildDetailItems(result.insertedDetails)
    };

    return successResponse(res, 201, 'Transaksi berhasil dibuat', responseData);
  } catch (error) {
    console.error('ERROR createTransaction:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/transactions
// ─────────────────────────────────────────────────────────────
exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id) : undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : undefined;
    const sort = req.query.sort === 'date_asc' ? 'asc' : 'desc';

    const where = {
      user_id: userId,
      deleted_at: null,
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(startDate || endDate
        ? {
          date: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        }
        : {})
    };

    const total = await db.transaction.count({ where });

    const transactions = await db.transaction.findMany({
      where,
      select: {
        transaction_id: true,
        category_id: true,
        categories: { select: { name_category: true } },
        total: true,
        date: true,
        foto_struk: true,
        nama_toko: true,  // ← TAMBAH INI
        created_at: true,
        _count: { select: { detail_transaction: true } }
      },
      orderBy: { date: sort },
      skip,
      take: limit
    });

    const data = transactions.map((t) => ({
      transaction_id: t.transaction_id,
      category_id: t.category_id,
      category_name: t.categories.name_category,
      total: Number(t.total),
      date: t.date,
      foto_struk: t.foto_struk,
      nama_toko: t.nama_toko,  // ← TAMBAH INI
      created_at: t.created_at,
      item_count: t._count.detail_transaction
    }));

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        transactions: data,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('ERROR getAllTransactions:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/transactions/:id
// ─────────────────────────────────────────────────────────────
exports.getTransactionDetail = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const transactionId = parseInt(req.params.id);

    if (isNaN(transactionId)) {
      return errorResponse(res, 400, 'ID transaksi tidak valid');
    }

    const trx = await db.transaction.findFirst({
      where: {
        transaction_id: transactionId,
        user_id: userId,
        deleted_at: null
      },
      include: {
        categories: { select: { name_category: true } },
        detail_transaction: true
      }
    });

    if (!trx) {
      return errorResponse(res, 404, 'Transaksi tidak ditemukan');
    }

    const responseData = {
      transaction_id: trx.transaction_id,
      user_id: trx.user_id,
      category_id: trx.category_id,
      category_name: trx.categories.name_category,
      total: Number(trx.total),
      date: trx.date,
      foto_struk: trx.foto_struk,
      nama_toko: trx.nama_toko,  // ← TAMBAH INI
      created_at: trx.created_at,
      details: buildDetailItems(trx.detail_transaction)
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('ERROR getTransactionDetail:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id
// ─────────────────────────────────────────────────────────────
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const transactionId = parseInt(req.params.id);

    if (isNaN(transactionId)) {
      return errorResponse(res, 400, 'ID transaksi tidak valid');
    }

    const existing = await db.transaction.findFirst({
      where: { transaction_id: transactionId, user_id: userId, deleted_at: null }
    });
    if (!existing) {
      return errorResponse(res, 404, 'Transaksi tidak ditemukan');
    }

    const { category_id, total, date, foto_struk, nama_toko, details } = req.body;  // ← tambah nama_toko

    const errors = validateTransactionPayload(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Cek category valid
    const category = await db.categories.findFirst({
      where: { category_id: parseInt(category_id), deleted_at: null }
    });
    if (!category) {
      return errorResponse(res, 400, 'Validasi gagal', ['category_id tidak valid']);
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Update header (tambah nama_toko)
      const updatedTrx = await tx.transaction.update({
        where: { transaction_id: transactionId },
        data: {
          category_id: parseInt(category_id),
          total: Number(total),
          date: new Date(date),
          foto_struk: foto_struk ?? null,
          nama_toko: nama_toko ? String(nama_toko).trim() : null  // ← TAMBAH INI
        }
      });

      // 2-6. (sama seperti sebelumnya)
      const incomingWithId = details.filter((d) => d.detail_transaction_id);
      const incomingWithoutId = details.filter((d) => !d.detail_transaction_id);
      const incomingIds = incomingWithId.map((d) => d.detail_transaction_id);

      await tx.detail_transaction.deleteMany({
        where: {
          transaction_id: transactionId,
          NOT: { detail_transaction_id: { in: incomingIds } }
        }
      });

      for (const d of incomingWithId) {
        await tx.detail_transaction.update({
          where: { detail_transaction_id: d.detail_transaction_id },
          data: {
            name_items: String(d.name_items).trim(),
            quantity: parseInt(d.quantity),
            price: Number(d.price),
            subtotal: parseInt(d.quantity) * Number(d.price)
          }
        });
      }

      if (incomingWithoutId.length > 0) {
        await tx.detail_transaction.createMany({
          data: incomingWithoutId.map((d) => ({
            transaction_id: transactionId,
            name_items: String(d.name_items).trim(),
            quantity: parseInt(d.quantity),
            price: Number(d.price),
            subtotal: parseInt(d.quantity) * Number(d.price)
          }))
        });
      }

      const finalDetails = await tx.detail_transaction.findMany({
        where: { transaction_id: transactionId }
      });

      return { updatedTrx, finalDetails };
    });

    const responseData = {
      transaction_id: result.updatedTrx.transaction_id,
      user_id: result.updatedTrx.user_id,
      category_id: result.updatedTrx.category_id,
      total: Number(result.updatedTrx.total),
      date: result.updatedTrx.date,
      foto_struk: result.updatedTrx.foto_struk,
      nama_toko: result.updatedTrx.nama_toko,  // ← TAMBAH INI
      created_at: result.updatedTrx.created_at,
      details: buildDetailItems(result.finalDetails)
    };

    return successResponse(res, 200, 'Transaksi berhasil diupdate', responseData);
  } catch (error) {
    console.error('ERROR updateTransaction:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/transactions/:id (SOFT DELETE)
// ─────────────────────────────────────────────────────────────
exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const transactionId = parseInt(req.params.id);

    if (isNaN(transactionId)) {
      return errorResponse(res, 400, 'ID transaksi tidak valid');
    }

    const existing = await db.transaction.findFirst({
      where: { transaction_id: transactionId, user_id: userId, deleted_at: null }
    });
    if (!existing) {
      return errorResponse(res, 404, 'Transaksi tidak ditemukan');
    }

    await db.transaction.update({
      where: { transaction_id: transactionId },
      data: { deleted_at: new Date() }
    });

    return successResponse(res, 200, 'Transaksi berhasil dihapus');
  } catch (error) {
    console.error('ERROR deleteTransaction:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// UPLOAD RECEIPT IMAGE
// ─────────────────────────────────────────────────────────────
exports.uploadReceipt = async (req, res) => {
  try {
    const userId = req.user.user_id;
    if (!req.file) {
      return errorResponse(res, 400, 'Validasi gagal', ['Foto struk wajib diunggah']);
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${userId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('foto-transaksi')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (error) throw error;

    const { data } = supabase.storage
      .from('foto-transaksi')
      .getPublicUrl(fileName);

    return successResponse(res, 200, 'Foto struk berhasil diunggah', { photoUrl: data.publicUrl });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

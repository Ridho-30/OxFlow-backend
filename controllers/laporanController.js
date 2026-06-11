const db = require('../config/database');
const { createClient } = require('@supabase/supabase-js');
const {
  successResponse,
  errorResponse,
  getMonthName,
  formatCurrency,
  calculateBudgetStatus,
  generateReportPDF
} = require('../utils/helpers');

// ─────────────────────────────────────────────────────────────
// Supabase Storage Client
// ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'report-generate';

// ─────────────────────────────────────────────────────────────
// POST /api/laporan/export — Generate & Export Report PDF
// ─────────────────────────────────────────────────────────────
exports.exportLaporan = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { month, year } = req.body;
    const errors = [];

    // Validations
    if (!month || isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
      errors.push('Month harus antara 1-12');
    }

    if (!year || isNaN(parseInt(year))) {
      errors.push('Year wajib diisi dan harus berupa angka');
    } else if (parseInt(year) < 2020) {
      errors.push('Year minimal 2020');
    } else {
      // Check if month+year is in the future
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (parseInt(year) > currentYear || 
          (parseInt(year) === currentYear && parseInt(month) > currentMonth)) {
        errors.push('Tidak bisa generate laporan untuk bulan di masa depan');
      }
    }

    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    // Cek duplicate: jika laporan sudah ada, hapus record lama (jangan return error)
    const startOfMonth = new Date(yearInt, monthInt - 1, 1);
    const endOfMonth = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);

    await db.laporan.deleteMany({
      where: {
        user_id: userId,
        report_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // ─── Gather Data ───

    // Get user info
    const user = await db.users.findUnique({
      where: { user_id: userId },
      select: { name: true, email: true }
    });

    // Get budget
    const budget = await db.budget.findUnique({
      where: { user_id: userId }
    });

    const income = budget ? Number(budget.income) : 0;
    const threshold = budget ? Number(budget.threshold) : 0;

    // Get transactions for this month+year
    const transactions = await db.transaction.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        categories: { select: { name_category: true } }
      },
      orderBy: { date: 'asc' }
    });

    const totalSpent = transactions.reduce((acc, t) => acc + Number(t.total), 0);
    const remaining = income - totalSpent;
    const percentage = income > 0 ? Math.round((totalSpent / income) * 10000) / 100 : 0;
    const { status } = calculateBudgetStatus(totalSpent, threshold);
    const periodLabel = `${getMonthName(monthInt)} ${yearInt}`;

    // Category breakdown for PDF
    const categoryMap = {};
    for (const trx of transactions) {
      const catName = trx.categories?.name_category || 'Lainnya';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { total_spent: 0 };
      }
      categoryMap[catName].total_spent += Number(trx.total);
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({
      kategori_nama: name,
      total_spent: data.total_spent,
      percentage: totalSpent > 0 ? Math.round((data.total_spent / totalSpent) * 10000) / 100 : 0
    }));
    categoryBreakdown.sort((a, b) => b.total_spent - a.total_spent);

    // Format transactions for PDF
    const transactionsForPDF = transactions.map((t) => ({
      date: t.date,
      category_name: t.categories?.name_category || 'Lainnya',
      total: Number(t.total)
    }));

    // ─── Generate PDF ───
    const pdfBuffer = await generateReportPDF({
      userName: user.name,
      periodLabel,
      income,
      totalSpent,
      remaining,
      percentage,
      status,
      transactions: transactionsForPDF,
      categoryBreakdown
    });

    // ─── Upload to Supabase Storage ───
    const fileName = `laporan-${yearInt}-${String(monthInt).padStart(2, '0')}-${userId}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return errorResponse(res, 500, 'Gagal mengupload PDF ke storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // ─── Insert to DB ───
    const today = new Date();
    const lastDayOfMonth = new Date(yearInt, monthInt, 0).getDate();
    const reportDate = new Date(yearInt, monthInt - 1, Math.min(today.getDate(), lastDayOfMonth));

    const laporan = await db.laporan.create({
      data: {
        user_id: userId,
        report_date: reportDate,
        file_url: fileUrl,
        income_snapshot: income,
        threshold_snapshot: threshold
      }
    });

    return successResponse(res, 201, 'Laporan berhasil digenerate', {
      laporan_id: laporan.laporan_id,
      user_id: laporan.user_id,
      report_date: laporan.report_date,
      period_label: periodLabel,
      file_url: fileUrl,
      file_name: `Laporan_Keuangan_${getMonthName(monthInt)}_${yearInt}.pdf`,
      summary: {
        total_transactions: transactions.length,
        total_spent: totalSpent,
        income,
        remaining,
        percentage
      },
      created_at: laporan.created_at
    });
  } catch (error) {
    console.error('ERROR exportLaporan:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/laporan/history — Report History
// ─────────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const yearFilter = req.query.year ? parseInt(req.query.year) : null;

    // Build where clause
    const where = { user_id: userId };

    if (yearFilter) {
      const startOfYear = new Date(yearFilter, 0, 1);
      const endOfYear = new Date(yearFilter, 11, 31, 23, 59, 59, 999);
      where.report_date = { gte: startOfYear, lte: endOfYear };
    }

    // Count total
    const total = await db.laporan.count({ where });

    // Get laporan
    const laporanList = await db.laporan.findMany({
      where,
      orderBy: { report_date: 'desc' },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    const data = laporanList.map((lap) => {
      const reportDate = new Date(lap.report_date);
      const m = reportDate.getMonth() + 1;
      const y = reportDate.getFullYear();

      return {
        laporan_id: lap.laporan_id,
        report_date: lap.report_date,
        period_label: `${getMonthName(m)} ${y}`,
        file_url: lap.file_url,
        file_name: `Laporan_Keuangan_${getMonthName(m)}_${y}.pdf`,
        income_snapshot: lap.income_snapshot ? Number(lap.income_snapshot) : null,
        threshold_snapshot: lap.threshold_snapshot ? Number(lap.threshold_snapshot) : null,
        created_at: lap.created_at
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        laporan: data,
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
    console.error('ERROR getHistory:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/laporan/cron/generate-laporan — Cron job auto-generate
// ─────────────────────────────────────────────────────────────
exports.cronGenerateLaporan = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Token cron tidak valid.'
      });
    }

    const now = new Date();
    
    // Hanya jalankan pada hari terakhir setiap bulan jika tidak dipanggil manual
    const isManual = req.body.month || req.query.month || req.body.year || req.query.year;
    if (!isManual) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (tomorrow.getDate() !== 1) {
        return res.status(200).json({
          success: true,
          message: 'Bukan hari terakhir bulan ini. Cron skipped.'
        });
      }
    }

    const monthInt = parseInt(req.body.month || req.query.month || (now.getMonth() + 1));
    const yearInt = parseInt(req.body.year || req.query.year || now.getFullYear());

    const startOfMonth = new Date(yearInt, monthInt - 1, 1);
    const endOfMonth = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);
    const periodLabel = `${getMonthName(monthInt)} ${yearInt}`;

    // Get all users who are not deleted
    const users = await db.users.findMany({
      where: { deleted_at: null }
    });

    const results = [];

    for (const user of users) {
      try {
        const userId = user.user_id;

        // Get budget
        const budget = await db.budget.findUnique({
          where: { user_id: userId }
        });

        const income = budget ? Number(budget.income) : 0;
        const threshold = budget ? Number(budget.threshold) : 0;

        // Get transactions
        const transactions = await db.transaction.findMany({
          where: {
            user_id: userId,
            deleted_at: null,
            date: { gte: startOfMonth, lte: endOfMonth }
          },
          include: {
            categories: { select: { name_category: true } }
          },
          orderBy: { date: 'asc' }
        });

        const totalSpent = transactions.reduce((acc, t) => acc + Number(t.total), 0);
        const remaining = income - totalSpent;
        const percentage = income > 0 ? Math.round((totalSpent / income) * 10000) / 100 : 0;
        const { status } = calculateBudgetStatus(totalSpent, threshold);

        // Group categories for PDF
        const categoryMap = {};
        for (const trx of transactions) {
          const catName = trx.categories?.name_category || 'Lainnya';
          if (!categoryMap[catName]) {
            categoryMap[catName] = { total_spent: 0 };
          }
          categoryMap[catName].total_spent += Number(trx.total);
        }

        const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => ({
          kategori_nama: name,
          total_spent: data.total_spent,
          percentage: totalSpent > 0 ? Math.round((data.total_spent / totalSpent) * 10000) / 100 : 0
        }));
        categoryBreakdown.sort((a, b) => b.total_spent - a.total_spent);

        const transactionsForPDF = transactions.map((t) => ({
          date: t.date,
          category_name: t.categories?.name_category || 'Lainnya',
          total: Number(t.total)
        }));

        // Generate PDF
        const pdfBuffer = await generateReportPDF({
          userName: user.name,
          periodLabel,
          income,
          totalSpent,
          remaining,
          percentage,
          status,
          transactions: transactionsForPDF,
          categoryBreakdown
        });

        // Upload to Supabase Storage
        const fileName = `laporan-${yearInt}-${String(monthInt).padStart(2, '0')}-${userId}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`Gagal upload laporan untuk user ${userId}:`, uploadError);
          results.push({ userId, name: user.name, status: 'error', error: 'Upload failed' });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);

        const fileUrl = urlData.publicUrl;

        // Hapus laporan lama jika ada
        await db.laporan.deleteMany({
          where: {
            user_id: userId,
            report_date: { gte: startOfMonth, lte: endOfMonth }
          }
        });

        // Simpan laporan baru dengan snapshot
        const lastDayOfMonth = new Date(yearInt, monthInt, 0).getDate();
        const reportDate = new Date(yearInt, monthInt - 1, Math.min(now.getDate(), lastDayOfMonth));

        await db.laporan.create({
          data: {
            user_id: userId,
            report_date: reportDate,
            file_url: fileUrl,
            income_snapshot: income,
            threshold_snapshot: threshold
          }
        });

        results.push({ userId, name: user.name, status: 'success' });
      } catch (err) {
        console.error(`Error generating report for user ${user.user_id}:`, err);
        results.push({ userId: user.user_id, name: user.name, status: 'error', error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Cron job selesai. Diproses: ${users.length} user.`,
      data: results
    });
  } catch (error) {
    console.error('ERROR cronGenerateLaporan:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

const db = require('../config/database');
const {
  errorResponse,
  getMonthName,
  getDayName,
  calculateBudgetStatus
} = require('../utils/helpers');

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/dashboard — Dashboard Summary
// ─────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // ─── Budget Data ───
    const budget = await db.budget.findUnique({
      where: { user_id: userId }
    });

    const income = budget ? Number(budget.income) : 0;
    const threshold = budget ? Number(budget.threshold) : 0;

    // ─── Total Spent This Month ───
    const spentResult = await db.transaction.aggregate({
      where: {
        user_id: userId,
        deleted_at: null,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { total: true },
      _count: { transaction_id: true }
    });

    const totalSpent = Number(spentResult._sum.total || 0);
    const totalTransactions = spentResult._count.transaction_id || 0;
    const remaining = threshold - totalSpent;

    const { status, percentage } = calculateBudgetStatus(totalSpent, threshold);

    // ─── Weekly Chart (7 days backward from today) ───
    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayResult = await db.transaction.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          date: { gte: dayStart, lte: dayEnd }
        },
        _sum: { total: true }
      });

      const dateStr = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

      weeklyChart.push({
        date: dateStr,
        day: getDayName(dayStart.getDay()),
        total: Number(dayResult._sum.total || 0)
      });
    }

    // ─── Top 3 Categories This Month ───
    const categorySpending = await db.transaction.groupBy({
      by: ['category_id'],
      where: {
        user_id: userId,
        deleted_at: null,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 3
    });

    const topCategories = [];
    for (const cat of categorySpending) {
      const category = await db.categories.findUnique({
        where: { category_id: cat.category_id }
      });

      const catTotal = Number(cat._sum.total || 0);
      topCategories.push({
        kategori_id: cat.category_id,
        kategori_nama: category ? category.name_category : 'Unknown',
        total_spent: catTotal,
        percentage: totalSpent > 0 ? Math.round((catTotal / totalSpent) * 10000) / 100 : 0
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          income,
          threshold,
          total_spent: totalSpent,
          remaining,
          percentage_spent: percentage,
          status
        },
        this_month_info: {
          month: month + 1,
          month_name: getMonthName(month + 1),
          year,
          month_label: `${getMonthName(month + 1)} ${year}`,
          total_transactions: totalTransactions
        },
        weekly_chart: weeklyChart,
        top_categories: topCategories
      }
    });
  } catch (error) {
    console.error('ERROR getDashboard:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/by-category — Spending by Category
// ─────────────────────────────────────────────────────────────
exports.getByCategory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    // Validate month
    if (month < 1 || month > 12) {
      return errorResponse(res, 400, 'Month harus antara 1-12');
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all categories (including those with no spending)
    const allCategories = await db.categories.findMany({
      where: { deleted_at: null },
      orderBy: { category_id: 'asc' }
    });

    // Get spending grouped by category
    const categorySpending = await db.transaction.groupBy({
      by: ['category_id'],
      where: {
        user_id: userId,
        deleted_at: null,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { total: true },
      _count: { transaction_id: true }
    });

    // Calculate total spending for percentage calculation
    const totalSpending = categorySpending.reduce(
      (acc, cat) => acc + Number(cat._sum.total || 0), 0
    );

    // Build spending map
    const spendingMap = {};
    for (const cat of categorySpending) {
      spendingMap[cat.category_id] = {
        total_spent: Number(cat._sum.total || 0),
        transaction_count: cat._count.transaction_id || 0
      };
    }

    // Combine all categories with spending data
    const data = allCategories.map((cat) => {
      const spending = spendingMap[cat.category_id] || { total_spent: 0, transaction_count: 0 };
      return {
        kategori_id: cat.category_id,
        kategori_nama: cat.name_category,
        total_spent: spending.total_spent,
        percentage: totalSpending > 0
          ? Math.round((spending.total_spent / totalSpending) * 10000) / 100
          : 0,
        transaction_count: spending.transaction_count
      };
    });

    // Sort by total_spent descending
    data.sort((a, b) => b.total_spent - a.total_spent);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('ERROR getByCategory:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/analytics/trend — Monthly Spending Trend
// ─────────────────────────────────────────────────────────────
exports.getTrend = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();

    const data = [];

    for (let m = 1; m <= 12; m++) {
      const startOfMonth = new Date(year, m - 1, 1);
      const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);

      const result = await db.transaction.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          date: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { total: true }
      });

      data.push({
        month: m,
        month_name: getMonthName(m),
        date: `${year}-${String(m).padStart(2, '0')}`,
        total_spent: Number(result._sum.total || 0)
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('ERROR getTrend:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

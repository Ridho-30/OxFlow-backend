const db = require('../config/database');
const {
  successResponse,
  errorResponse,
  calculateBudgetStatus,
  getMonthName
} = require('../utils/helpers');

// ─────────────────────────────────────────────────────────────
// HELPER: Get total spending for current month
// ─────────────────────────────────────────────────────────────
const getTotalSpentThisMonth = async (userId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const result = await db.transaction.aggregate({
    where: {
      user_id: userId,
      deleted_at: null,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    _sum: {
      total: true
    }
  });

  return Number(result._sum.total || 0);
};

// ─────────────────────────────────────────────────────────────
// POST /api/budget — Create or Update Budget
// ─────────────────────────────────────────────────────────────
exports.createOrUpdateBudget = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { income, threshold } = req.body;
    const errors = [];

    // Validations
    if (income === undefined || income === null || isNaN(Number(income))) {
      errors.push('Income wajib diisi dan harus berupa angka');
    } else if (Number(income) < 0) {
      errors.push('Income harus >= 0');
    }

    if (threshold === undefined || threshold === null || isNaN(Number(threshold))) {
      errors.push('Threshold wajib diisi dan harus berupa angka');
    } else if (Number(threshold) < 0) {
      errors.push('Threshold harus >= 0');
    }

    if (
      errors.length === 0 &&
      Number(threshold) > Number(income)
    ) {
      errors.push('Threshold tidak boleh lebih besar dari income');
    }

    if (errors.length > 0) {
      return errorResponse(res, 400, 'Validasi gagal', errors);
    }

    // Check if budget already exists for this user
    const existing = await db.budget.findUnique({
      where: { user_id: userId }
    });

    let budget;
    let statusCode;
    let message;

    if (existing) {
      // UPDATE
      budget = await db.budget.update({
        where: { user_id: userId },
        data: {
          income: Number(income),
          threshold: Number(threshold),
          updated_at: new Date()
        }
      });
      statusCode = 200;
      message = 'Budget berhasil diupdate';
    } else {
      // CREATE
      budget = await db.budget.create({
        data: {
          user_id: userId,
          income: Number(income),
          threshold: Number(threshold)
        }
      });
      statusCode = 201;
      message = 'Budget berhasil disimpan';
    }

    return successResponse(res, statusCode, message, {
      budget_id: budget.budget_id,
      user_id: budget.user_id,
      income: Number(budget.income),
      threshold: Number(budget.threshold),
      created_at: budget.created_at,
      updated_at: budget.updated_at
    });
  } catch (error) {
    console.error('ERROR createOrUpdateBudget:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/budget — Get Budget Info + Spending Status
// ─────────────────────────────────────────────────────────────
exports.getBudget = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const budget = await db.budget.findUnique({
      where: { user_id: userId }
    });

    if (!budget) {
      return errorResponse(res, 404, 'Budget belum dibuat. Silakan buat budget terlebih dahulu.');
    }

    const totalSpent = await getTotalSpentThisMonth(userId);
    const thresholdNum = Number(budget.threshold);
    const remaining = thresholdNum - totalSpent;

    const { status, percentage, statusDescription } = calculateBudgetStatus(totalSpent, thresholdNum);

    return res.status(200).json({
      success: true,
      data: {
        budget_id: budget.budget_id,
        user_id: budget.user_id,
        income: Number(budget.income),
        threshold: thresholdNum,
        total_spent_this_month: totalSpent,
        remaining: remaining,
        percentage_used: percentage,
        status: status,
        status_description: statusDescription,
        updated_at: budget.updated_at
      }
    });
  } catch (error) {
    console.error('ERROR getBudget:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/budget/status — Quick Check Budget Status
// ─────────────────────────────────────────────────────────────
exports.getBudgetStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const budget = await db.budget.findUnique({
      where: { user_id: userId }
    });

    if (!budget) {
      return errorResponse(res, 404, 'Budget belum dibuat. Silakan buat budget terlebih dahulu.');
    }

    const totalSpent = await getTotalSpentThisMonth(userId);
    const thresholdNum = Number(budget.threshold);
    const remaining = thresholdNum - totalSpent;

    const { status, percentage, isExceeded, isWarning } = calculateBudgetStatus(totalSpent, thresholdNum);

    return res.status(200).json({
      success: true,
      data: {
        is_exceeded: isExceeded,
        is_warning: isWarning,
        percentage: percentage,
        status: status,
        remaining: remaining
      }
    });
  } catch (error) {
    console.error('ERROR getBudgetStatus:', error);
    return errorResponse(res, 500, 'Terjadi kesalahan pada server');
  }
};

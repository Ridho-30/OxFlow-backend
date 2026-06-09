/**
 * Standar format untuk success response
 */
const successResponse = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standar format untuk error response
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Helper untuk konversi nomor bulan menjadi nama bulan (Bahasa Indonesia)
 */
const getMonthName = (month) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April',
    'Mei', 'Juni', 'Juli', 'Agustus',
    'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month - 1];
};

/**
 * Validasi apakah string adalah hex color yang valid (#RRGGBB)
 * @param {string} color
 * @returns {boolean}
 */
const isValidHexColor = (color) => {
  return /^#([A-Fa-f0-9]{6})$/.test(color);
};

/**
 * Validasi apakah tanggal TIDAK di masa depan (bukan setelah hari ini)
 * @param {string|Date} date
 * @returns {boolean}
 */
const isNotFutureDate = (date) => {
  const input = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // bandingkan sampai akhir hari ini
  return input <= today;
};

/**
 * Format angka menjadi format Rupiah
 * @param {number} amount
 * @returns {string} Rp X.XXX.XXX
 */
const formatCurrency = (amount) => {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
};

module.exports = {
  successResponse,
  errorResponse,
  getMonthName,
  isValidHexColor,
  isNotFutureDate,
  formatCurrency
};

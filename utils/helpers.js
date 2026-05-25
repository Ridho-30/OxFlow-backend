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

module.exports = {
  successResponse,
  errorResponse,
  getMonthName
};

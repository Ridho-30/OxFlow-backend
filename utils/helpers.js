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

/**
 * Hitung status budget berdasarkan pengeluaran vs threshold
 * @param {number} spent  - Total pengeluaran
 * @param {number} threshold - Batas pengeluaran
 * @returns {{ status: string, percentage: number, isExceeded: boolean, isWarning: boolean, statusDescription: string }}
 */
const calculateBudgetStatus = (spent, threshold) => {
  if (threshold <= 0) {
    return {
      status: 'normal',
      percentage: 0,
      isExceeded: false,
      isWarning: false,
      statusDescription: 'Threshold belum diatur.'
    };
  }

  const percentage = Math.round((spent / threshold) * 100 * 100) / 100; // 2 decimal
  let status = 'normal';
  let isExceeded = false;
  let isWarning = false;
  let statusDescription = '';

  if (percentage >= 100) {
    status = 'danger';
    isExceeded = true;
    statusDescription = `Pengeluaran sudah melebihi batas! (${percentage}%). Segera kurangi pengeluaran.`;
  } else if (percentage >= 75) {
    status = 'warning';
    isWarning = true;
    statusDescription = `Pengeluaran sudah mencapai ${percentage}% dari batas. Hati-hati agar tidak melebihi!`;
  } else {
    status = 'normal';
    statusDescription = `Pengeluaran masih aman (${percentage}% dari batas).`;
  }

  return { status, percentage, isExceeded, isWarning, statusDescription };
};

/**
 * Generate PDF laporan keuangan menggunakan pdfkit
 * @param {object} data - Data laporan
 * @param {string} data.userName - Nama user
 * @param {string} data.periodLabel - Label periode (e.g. "Mei 2026")
 * @param {number} data.income - Income user
 * @param {number} data.totalSpent - Total pengeluaran
 * @param {number} data.remaining - Sisa budget
 * @param {number} data.percentage - Persentase terpakai
 * @param {string} data.status - Status budget (normal/warning/danger)
 * @param {Array} data.transactions - Daftar transaksi
 * @param {Array} data.categoryBreakdown - Breakdown per kategori
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateReportPDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ─── HEADER ───
      doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN KEUANGAN', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica').text(data.userName, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).text(`Periode: ${data.periodLabel}`, { align: 'center' });
      doc.moveDown(1);

      // ─── GARIS PEMISAH ───
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ─── SUMMARY SECTION ───
      doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan Keuangan');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Income:          ${formatCurrency(data.income)}`);
      doc.text(`Total Spent:     ${formatCurrency(data.totalSpent)}`);
      doc.text(`Remaining:       ${formatCurrency(data.remaining)}`);
      doc.text(`Percentage:      ${data.percentage}%`);
      doc.text(`Status:          ${data.status.toUpperCase()}`);
      doc.moveDown(1);

      // ─── GARIS PEMISAH ───
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ─── TRANSACTION LIST ───
      doc.fontSize(14).font('Helvetica-Bold').text('Daftar Transaksi');
      doc.moveDown(0.5);

      if (data.transactions && data.transactions.length > 0) {
        // Table header
        const tableTop = doc.y;
        const colX = { date: 50, category: 170, total: 400 };

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Tanggal', colX.date, tableTop);
        doc.text('Kategori', colX.category, tableTop);
        doc.text('Total (Rp)', colX.total, tableTop);
        doc.moveDown(0.5);

        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);

        // Table rows
        doc.font('Helvetica').fontSize(10);
        let grandTotal = 0;
        for (const trx of data.transactions) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }
          const rowY = doc.y;
          const dateStr = new Date(trx.date).toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          });
          doc.text(dateStr, colX.date, rowY);
          doc.text(trx.category_name || '-', colX.category, rowY);
          doc.text(formatCurrency(Number(trx.total)), colX.total, rowY);
          grandTotal += Number(trx.total);
          doc.moveDown(0.4);
        }

        // Total row
        doc.moveDown(0.2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(10);
        const totalRowY = doc.y;
        doc.text('TOTAL', colX.date, totalRowY);
        doc.text(formatCurrency(grandTotal), colX.total, totalRowY);
        doc.moveDown(1);
      } else {
        doc.fontSize(10).font('Helvetica').text('Tidak ada transaksi pada periode ini.');
        doc.moveDown(1);
      }

      // ─── CATEGORY BREAKDOWN ───
      if (doc.y > 650) doc.addPage();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      doc.x = 50;
      doc.fontSize(14).font('Helvetica-Bold').text('Breakdown Per Kategori', 50, doc.y);
      doc.moveDown(0.5);

      if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
        const catTop = doc.y;
        const catX = { name: 50, total: 250, pct: 430 };

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Kategori', catX.name, catTop);
        doc.text('Total (Rp)', catX.total, catTop);
        doc.text('Persentase (%)', catX.pct, catTop);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);

        doc.font('Helvetica').fontSize(10);
        for (const cat of data.categoryBreakdown) {
          if (doc.y > 700) doc.addPage();
          const catRowY = doc.y;
          doc.text(cat.kategori_nama, catX.name, catRowY);
          doc.text(formatCurrency(Number(cat.total_spent)), catX.total, catRowY);
          doc.text(`${cat.percentage}%`, catX.pct, catRowY);
          doc.moveDown(0.4);
        }
      }

      doc.moveDown(1.5);

      // ─── FOOTER ───
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, { align: 'center' });
      doc.text(`User: ${data.userName}`, { align: 'center' });
      doc.text('OxFlow - Aplikasi Pencatatan Keuangan Digital', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Helper: get Indonesian day name
 * @param {number} dayIndex - 0 (Minggu) to 6 (Sabtu)
 * @returns {string}
 */
const getDayName = (dayIndex) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[dayIndex];
};

module.exports = {
  successResponse,
  errorResponse,
  getMonthName,
  isValidHexColor,
  isNotFutureDate,
  formatCurrency,
  calculateBudgetStatus,
  generateReportPDF,
  getDayName
};

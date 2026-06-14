require('dotenv').config();
const { parseOcr } = require('./controllers/ocrController');

const req = {
  body: {
    rawText: `QRIS BANK MANDIRI
JO CAFE
Jl. Bondoyudo No. 31, Patrang
Telp. +6282332656497
Meja 532 - 1 - Code TR : TR732605230457 17 - 17:04 WIB
NO MENU HARGA QTY JUMLAH
1 LEMONADE ICE 15.000 1 Rp. 15.000
2 CHICKEN CURY 25.000 2 Rp. 50.000
3 ES CINCAU 10.000 1 Rp. 10.000
PB1 10% Rp. 7.500
Total Rp. 82.500
Tagihan : Rp. 82.500
Bayar : Rp. 82.500
Kembalian : Rp. 0
DewRT app is free for personal use, commercial use requires Lhe...`
  }
};

const res = {
  status: function(code) {
    console.log("Status:", code);
    return this;
  },
  json: function(data) {
    console.log("JSON Response:", JSON.stringify(data, null, 2));
  }
};

console.log("Testing OCR Parsing...");
parseOcr(req, res);

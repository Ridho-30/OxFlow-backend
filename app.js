const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Konfigurasi Dasar Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OxFlow API Documentation',
            version: '1.0.0',
            description: 'Dokumentasi API untuk Proyek Akhir PAA - Aplikasi OxFlow',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
        ],
    },
    // Mengatur tempat Swagger membaca dokumentasi API kamu nanti
    apis: ['./app.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 2. Hubungkan Swagger UI ke Route /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /:
 * get:
 * summary: Endpoint Utama
 * description: Mengecek apakah server OxFlow backend sudah berjalan aktif.
 * responses:
 * 200:
 * description: Server berjalan dengan baik.
 */
app.get('/', (req, res) => {
    res.json({ message: "Welcome to OxFlow API! Buka /api-docs untuk melihat Swagger." });
});

// 3. Jalankan Server
app.listen(PORT, () => {
    console.log(`Server OxFlow berjalan di http://localhost:${PORT}`);
    console.log(`Dokumentasi Swagger siap dibuka di http://localhost:${PORT}/api-docs`);
});
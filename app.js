const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const db = require('./config/database');
const app = express();
app.use(cors());

// Middleware
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder (untuk foto profil atau laporan)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'OxFlow API',
      version: '1.0.0',
      description: 'API Documentation for OxFlow Backend'
    },
    servers: [
      { url: 'https://ox-flow-backend.vercel.app', description: 'Production server' },
      { url: 'http://localhost:3000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

// 2. INISIALISASI swaggerDocs DI SINI (Wajib sebelum digunakan di bawah)
const swaggerDocs = swaggerJsDoc(swaggerOptions);

const swaggerOptionsUi = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js'
  ]
};

// 3. BARU PASANG KE ROUTE setelah variabel di atas siap
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerOptionsUi));

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budget');
const analyticsRoutes = require('./routes/analytics');
const laporanRoutes = require('./routes/laporan');
const ocrRoutes = require('./routes/ocr');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/ocr', ocrRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Welcome to OxFlow API' });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Start Server
const server = app.listen(env.PORT, async () => {
  console.log(`🚀 OxFlow API running on http://localhost:${env.PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${env.PORT}/api-docs`);

  // // Test Database Connection
  // try {
  //   await prisma.$connect();
  //   console.log('🔌 Database connection verified');
  // } catch (err) {
  //   console.error('❌ DATABASE ERROR FATAL:', err);
  //   console.log('Menutup server karena database tidak siap...');
  //   server.close(() => {
  //     process.exit(1);
  //   });
  // }
});

module.exports = app;
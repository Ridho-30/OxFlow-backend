require('dotenv').config(); // Paling atas agar env terbaca sejak awal
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const prisma = require('./config/database');

const app = express();

// Middleware Global
app.use(cors({ origin: env.CORS_ORIGIN || '*' }));
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
      {
        url: 'https://oxflow-backend.vercel.app',
        description: 'Production server (Vercel)'
      },
      {
        url: env.PORT ? `http://localhost:${env.PORT}` : 'http://localhost:3000',
        description: 'Development server'
      }
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

// PERBAIKAN: Menginisialisasi swaggerDocs sebelum digunakan
const swaggerDocs = swaggerJsDoc(swaggerOptions);

const swaggerOptionsUi = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js'
  ]
};

// Route untuk dokumentasi API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerOptionsUi));

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Welcome to OxFlow API' });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Export app untuk serverless Vercel
module.exports = app;
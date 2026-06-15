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

// App Links: assetlinks.json
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.example.oxflow",
        "sha256_cert_fingerprints": [
          "4B:60:FB:E6:24:5C:DA:16:E6:C5:19:EA:10:3B:35:E1:C1:14:08:A0:35:FF:6E:24:AB:3F:CB:AB:81:1B:15:27"
        ]
      }
    }
  ]);
});

// Fallback Route for /reset-password (For Web browser or if app not installed)
app.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('<h2>Error: Token tidak ditemukan</h2>');
  }

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Reset Password - OxFlow</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 400px; margin: 40px auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #333; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #666; font-weight: bold; }
        input[type="password"] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 16px; }
        button { width: 100%; padding: 14px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background-color: #45a049; }
        #message { margin-top: 15px; text-align: center; padding: 10px; border-radius: 4px; display: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reset Password</h2>
        <form id="resetForm">
          <input type="hidden" id="token" value="${token}">
          <div class="form-group">
            <label for="new_password">Password Baru</label>
            <input type="password" id="new_password" required minlength="6" placeholder="Masukkan minimal 6 karakter">
          </div>
          <button type="submit" id="submitBtn">Update Password</button>
        </form>
        <div id="message"></div>
      </div>
      <script>
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitBtn');
          btn.disabled = true;
          btn.innerText = 'Memproses...';
          
          const token = document.getElementById('token').value;
          const new_password = document.getElementById('new_password').value;
          const messageDiv = document.getElementById('message');
          
          try {
            const response = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, new_password })
            });
            const data = await response.json();
            
            messageDiv.style.display = 'block';
            if (response.ok) {
              messageDiv.style.backgroundColor = '#e8f5e9';
              messageDiv.style.color = '#2e7d32';
              messageDiv.innerHTML = '<b>Berhasil!</b><br/>' + data.message;
              document.getElementById('resetForm').style.display = 'none';
            } else {
              messageDiv.style.backgroundColor = '#ffebee';
              messageDiv.style.color = '#c62828';
              messageDiv.innerHTML = '<b>Gagal:</b><br/>' + (data.message || 'Terjadi kesalahan');
              btn.disabled = false;
              btn.innerText = 'Update Password';
            }
          } catch (err) {
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#ffebee';
            messageDiv.style.color = '#c62828';
            messageDiv.innerHTML = '<b>Gagal:</b><br/>Tidak dapat terhubung ke server.';
            btn.disabled = false;
            btn.innerText = 'Update Password';
          }
        });
      </script>
    </body>
  </html>
  `;
  res.send(html);
});

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
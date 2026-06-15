require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_min_32_characters',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_min_32_characters',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1h',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  APP_RESET_PASSWORD_URL: process.env.APP_RESET_PASSWORD_URL || 'https://ox-flow-backend.vercel.app/reset-password'
};
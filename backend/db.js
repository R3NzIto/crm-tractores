const { Pool } = require('pg');
require('dotenv').config();

// Configuración limpia: Si hay URL (Prod), la usa con SSL. Si no (Dev), busca variables locales.
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

// Fallback para desarrollo local sin DATABASE_URL
if (!process.env.DATABASE_URL) {
  connectionConfig.host = process.env.DB_HOST;
  connectionConfig.user = process.env.DB_USER;
  connectionConfig.password = process.env.DB_PASSWORD;
  connectionConfig.database = process.env.DB_NAME;
  connectionConfig.port = process.env.DB_PORT;
}

const pool = new Pool(connectionConfig);

module.exports = pool;
// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Detectar si estamos en producción (Render) o desarrollo
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const connectionConfig = {
  // Si existe DATABASE_URL (Render), úsala. Si no, undefined.
  connectionString: process.env.DATABASE_URL,
  
  // Opciones de SSL: Requerido por Render en producción
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

// Si NO hay DATABASE_URL, usa las variables individuales (para desarrollo local)
if (!process.env.DATABASE_URL) {
  connectionConfig.host = process.env.DB_HOST;
  connectionConfig.user = process.env.DB_USER;
  connectionConfig.password = process.env.DB_PASSWORD;
  connectionConfig.database = process.env.DB_NAME;
  connectionConfig.port = process.env.DB_PORT;
}

const pool = new Pool(connectionConfig);

module.exports = pool;
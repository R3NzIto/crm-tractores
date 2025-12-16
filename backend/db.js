const { Pool } = require('pg');
require('dotenv').config();

// 1. Detectar si existe la variable de Render
const connectionString = process.env.DATABASE_URL;

// 2. Configuración inteligente
const connectionConfig = {
  connectionString: connectionString, // Usa la URL de Render si existe
  ssl: connectionString ? { rejectUnauthorized: false } : false, // Activa SSL solo si hay URL (Producción)
};

// 3. Si NO estamos en Render (local), usa las variables sueltas
if (!connectionString) {
  connectionConfig.host = process.env.DB_HOST;
  connectionConfig.user = process.env.DB_USER;
  connectionConfig.password = process.env.DB_PASSWORD;
  connectionConfig.database = process.env.DB_NAME;
  connectionConfig.port = process.env.DB_PORT;
}

const pool = new Pool(connectionConfig);

module.exports = pool;
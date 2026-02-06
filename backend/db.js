const { Pool } = require('pg');
require('dotenv').config();

const useUrl = !!process.env.DATABASE_URL;
const connectionConfig = useUrl
  ? {
      connectionString: process.env.DATABASE_URL.includes('sslmode')
        ? process.env.DATABASE_URL
        : `${process.env.DATABASE_URL}?sslmode=require`,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: process.env.DB_HOST && process.env.DB_HOST.includes('render.com')
        ? { rejectUnauthorized: false }
        : false,
    };

// Log ligero en dev (no imprime credenciales)
if (process.env.NODE_ENV !== 'production') {
  console.log('[db] url?', useUrl, 'host:', connectionConfig.host || 'via url', 'port:', connectionConfig.port || 'via url', 'ssl:', !!connectionConfig.ssl);
}

const pool = new Pool(connectionConfig);

module.exports = pool;

const { Pool } = require('pg');
require('dotenv').config();

// --- ZONA DE DEBUG (EL CHISMOSO) ---
console.log("🔴 --- INICIO DEPURACIÓN DB ---");
console.log("¿Existe DATABASE_URL?:", !!process.env.DATABASE_URL); // Dirá true o false

if (process.env.DATABASE_URL) {
    console.log("La URL empieza con:", process.env.DATABASE_URL.substring(0, 10) + "...");
} else {
    console.log("⚠️ NO SE ENCONTRÓ DATABASE_URL. Intentando usar variables sueltas...");
    console.log("DB_HOST detectado:", process.env.DB_HOST || "INDEFINIDO (Esto causará que use localhost)");
}
console.log("🔴 --- FIN DEPURACIÓN DB ---");
// ------------------------------------

const connectionString = process.env.DATABASE_URL;

const connectionConfig = {
  connectionString: connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
};

if (!connectionString) {
  connectionConfig.host = process.env.DB_HOST;
  connectionConfig.user = process.env.DB_USER;
  connectionConfig.password = process.env.DB_PASSWORD;
  connectionConfig.database = process.env.DB_NAME;
  connectionConfig.port = process.env.DB_PORT;
}

const pool = new Pool(connectionConfig);

module.exports = pool;
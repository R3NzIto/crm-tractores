const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// --- 1. IMPORTAR TODAS LAS RUTAS ---
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerNotesRoutes = require('./routes/customerNotesRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const userRoutes = require('./routes/userRoutes');
const customerAssignRoutes = require('./routes/customerAssignRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const customerUnitsRoutes = require('./routes/customerUnitsRoutes');
const modelsRoutes = require('./routes/modelsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes'); // 👈 Tu nueva ruta de rendimientos

const app = express();
app.set('trust proxy', 1); 

// --- 2. CONFIGURACIÓN DE CORS BLINDADA ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const allowedOrigins = [
    'http://localhost:5173',            // Tu entorno local
    'http://127.0.0.1:5173',            // Local alternativo
    'https://crm-tractores.vercel.app', // 🚨 ESTE DABA EL ERROR EN EL LOG (Vercel original)
    'https://wolfhardcrm.space',        // Tu nuevo dominio
    'https://www.wolfhardcrm.space',    // Tu nuevo dominio (www)
    FRONTEND_URL,                       // Variable de entorno extra
].filter(Boolean);

app.use(helmet({
    referrerPolicy: { policy: 'no-referrer' },
    contentSecurityPolicy: false, 
}));

app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origen (como Postman o scripts de servidor)
        if (!origin) return callback(null, true); 
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        console.error(`🚫 Bloqueado por CORS: ${origin}`); // Esto te ayudará a ver en los logs quién intenta entrar
        return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// --- 3. LIMITADORES DE VELOCIDAD ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 20, // Límite de intentos
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes de login, intenta más tarde' },
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes, intenta más tarde' },
});

// --- 4. DEFINICIÓN DE RUTAS ---
app.get('/', (req, res) => {
    res.send('API CRM Tractores OK - Wolf Hard v2');
});

// Autenticación
app.use('/api/auth', authLimiter, authRoutes);

// Clientes y sub-rutas
app.use('/api/customers', customerRoutes); 
app.use('/api/customers/:customerId/units', customerUnitsRoutes); 
app.use('/api/customers', customerAssignRoutes);
app.use('/api/customers', customerNotesRoutes);

// Módulos funcionales
app.use('/api/agenda', agendaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/models', modelsRoutes);
app.use('/api/analytics', analyticsRoutes); // 👈 Aquí se activa la magia de los gráficos

// Middleware global para el resto de la API
app.use('/api', apiLimiter);

// --- 5. INICIAR SERVIDOR ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    console.log(`🛡️ Orígenes permitidos: ${allowedOrigins.join(', ')}`);
});
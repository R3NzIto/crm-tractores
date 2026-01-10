const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// --- IMPORTAR RUTAS ---
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerNotesRoutes = require('./routes/customerNotesRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const userRoutes = require('./routes/userRoutes');
const customerAssignRoutes = require('./routes/customerAssignRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // <--- NUEVA RUTA IMPORTADA

const app = express();

// --- CONFIGURACIÓN DE CORS ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    FRONTEND_URL, 
].filter(Boolean);

app.use(helmet({
    referrerPolicy: { policy: 'no-referrer' },
    contentSecurityPolicy: false, 
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); 
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// --- LIMITADORES DE VELOCIDAD ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes, intenta más tarde' },
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes, intenta más tarde' },
});

// --- DEFINICIÓN DE RUTAS ---
app.get('/', (req, res) => {
    res.send('API CRM Tractores OK');
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/customers', customerRoutes);
app.use('/api/customers', customerAssignRoutes);
app.use('/api/customers', customerNotesRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes); // <--- NUEVA RUTA CONECTADA AQUÍ

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerNotesRoutes = require('./routes/customerNotesRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const userRoutes = require('./routes/userRoutes');
const customerAssignRoutes = require('./routes/customerAssignRoutes');

const app = express();

// --- CORRECCIÓN DE CORS Y VARIABLES DE ENTORNO ---
// 1. Usamos FRONTEND_URL, que es la variable que tienes configurada en Render.
// 2. Si la variable no existe (desarrollo local), usa 'http://localhost:5173' como fallback.

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Lista de orígenes permitidos. Incluye la URL de producción de Vercel y dominios locales.
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // IMPORTANTE: En producción, FRONTEND_URL será 'https://crm-tractores.vercel.app/'
    FRONTEND_URL, 
].filter(Boolean);


app.use(helmet({
    referrerPolicy: { policy: 'no-referrer' },
    // Nota: Mantener CSP desactivada o muy permisiva en prod, o configurarla con cuidado.
    contentSecurityPolicy: false, 
}));

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como Postman o CURL)
        if (!origin) return callback(null, true); 
        
        // Permitir los orígenes de la lista (incluyendo Vercel si FRONTEND_URL está seteada)
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Si el origen no está permitido, rechazar
        return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
}));

// --- FIN DE CORRECCIÓN DE CORS ---

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const userRoutes = require('./routes/userRoutes');
const customerAssignRoutes = require('./routes/customerAssignRoutes');

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  FRONTEND_ORIGIN,
].filter(Boolean);

app.use(helmet({
  referrerPolicy: { policy: 'no-referrer' },
  contentSecurityPolicy: false, // desactivar CSP estricta por ahora para evitar romper el front; config especial en prod.
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
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
app.use('/api/agenda', agendaRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

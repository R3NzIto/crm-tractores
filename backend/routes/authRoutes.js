// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || '2h';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'token';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mapRoleForToken = (dbRole) => (dbRole === 'admin' ? 'jefe' : 'empleado');
const mapRoleForDb = (requestedRole) =>
  requestedRole === 'jefe' || requestedRole === 'admin' ? 'admin' : 'employee';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid('jefe', 'empleado', 'admin', 'employee').default('empleado'),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).max(100).required(),
});

function sendAuthResponse(res, user, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2, // 2h
  });

  res.json({
    token,
    user,
  });
}

async function sendResetEmail(to, token) {
  const resetLink = `${FRONTEND_URL}/reset?token=${token}`;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const html = `
    <p>Recibimos una solicitud para restablecer tu contrasena.</p>
    <p>Puedes hacerlo aqui: <a href="${resetLink}">${resetLink}</a></p>
    <p>Si no solicitaste este cambio, ignora este mensaje.</p>
  `;

  await smtpTransport.sendMail({
    from,
    to,
    subject: 'Recuperar contrasena - CRM Tractores',
    html,
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { email, password } = value;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Usuario o contrasena incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Usuario o contrasena incorrectos' });
    }

    const roleForToken = mapRoleForToken(user.role);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: roleForToken, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );

    sendAuthResponse(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleForToken,
    }, token);
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST /api/auth/register (public)
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { name, email, password, role } = value;
  const dbRole = mapRoleForDb(role);

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashed, dbRole]
    );

    const user = result.rows[0];
    const roleForToken = mapRoleForToken(user.role);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: roleForToken, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );

    sendAuthResponse(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleForToken,
    }, token);
  } catch (err) {
    console.error('Error en registro:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'El email ya existe' });
    }
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  const { error, value } = forgotSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { email } = value;

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.json({ message: 'Si el correo existe, enviaremos instrucciones.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1000 * 60 * 30);

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at, used)
       VALUES ($1, $2, $3, FALSE)`,
      [user.id, token, expires_at]
    );

    try {
      await sendResetEmail(email, token);
    } catch (mailErr) {
      console.error('Error enviando email de reset:', mailErr);
      return res.status(500).json({ message: 'No pudimos enviar el correo de recuperacion' });
    }

    res.json({
      message: 'Instrucciones enviadas si el correo es valido.',
      reset_token: process.env.NODE_ENV === 'development' ? token : undefined,
    });
  } catch (err) {
    console.error('Error en forgot:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

// POST /api/auth/reset
router.post('/reset', async (req, res) => {
  const { error, value } = resetSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { token, password } = value;

  try {
    const result = await pool.query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used
       FROM password_resets pr
       WHERE pr.token = $1`,
      [token]
    );

    const resetReq = result.rows[0];
    if (!resetReq || resetReq.used || new Date(resetReq.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token invalido o expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const updateRes = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING email, password_hash',
      [
      hashed,
      resetReq.user_id,
      ]
    );

    if (updateRes.rowCount === 0) {
      return res.status(500).json({ message: 'No se pudo actualizar la contrasena' });
    }
    console.log('[reset] actualizada fila:', updateRes.rows[0]);

    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [resetReq.id]);

    res.json({ message: 'Contrasena actualizada. Ya puedes iniciar sesion.' });
  } catch (err) {
    console.error('Error en reset:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;


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

// 👇 CONFIGURACIÓN CORREGIDA PARA GMAIL (Evita Timeouts en Render)
const smtpTransport = nodemailer.createTransport({
  service: 'gmail', // Esto configura host, puerto y seguridad automáticamente
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mapRoleForToken = (dbRole) => (dbRole === 'admin' ? 'jefe' : 'empleado');
const mapRoleForDb = (requestedRole) =>
  requestedRole === 'jefe' || requestedRole === 'admin' ? 'admin' : 'employee';

// --- ESQUEMAS DE VALIDACIÓN ---
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

// --- FUNCIONES AUXILIARES ---
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
  // Usamos el mismo usuario SMTP como remitente si no está definido FROM
  const from = process.env.SMTP_FROM || process.env.SMTP_USER; 

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #f0b43a;">Wolf Hard - Recuperación</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva:</p>
      <a href="${resetLink}" style="background-color: #f0b43a; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Restablecer Contraseña</a>
      <p style="margin-top: 20px; color: #888; font-size: 0.9em;">Si no solicitaste esto, ignora este mensaje.</p>
    </div>
  `;

  await smtpTransport.sendMail({
    from: `"Wolf Hard CRM" <${from}>`, // Nombre amigable
    to,
    subject: 'Recuperar contraseña - CRM Tractores',
    html,
  });
}

// --- RUTAS ---

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { email, password } = value;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
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
    // Verificación manual de duplicados para dar un mensaje claro
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
        return res.status(400).json({ message: 'El email ya está registrado' });
    }

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
    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    // Por seguridad no decimos si existe o no, pero logueamos para debug
    if (!user) {
      console.log(`Intento de recuperar contraseña para email no existente: ${email}`);
      return res.json({ message: 'Si el correo existe, enviaremos instrucciones.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1000 * 60 * 60); // 1 hora de validez

    // Guardamos en la tabla password_resets
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at, used)
       VALUES ($1, $2, $3, FALSE)`,
      [user.id, token, expires_at]
    );

    try {
      await sendResetEmail(email, token);
    } catch (mailErr) {
      console.error('Error enviando email de reset:', mailErr);
      return res.status(500).json({ message: 'No pudimos enviar el correo de recuperación. Intenta más tarde.' });
    }

    res.json({
      message: 'Instrucciones enviadas si el correo es valido.',
      // En desarrollo mandamos el token por si no tienes email configurado aún
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
    // Buscamos el token válido y no usado
    const result = await pool.query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used
       FROM password_resets pr
       WHERE pr.token = $1`,
      [token]
    );

    const resetReq = result.rows[0];
    
    if (!resetReq) {
        return res.status(400).json({ message: 'Token inválido' });
    }
    
    if (resetReq.used) {
        return res.status(400).json({ message: 'Este enlace ya fue utilizado' });
    }
    
    if (new Date(resetReq.expires_at) < new Date()) {
        return res.status(400).json({ message: 'El enlace ha expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Actualizamos contraseña
    const updateRes = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING email',
      [hashed, resetReq.user_id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(500).json({ message: 'No se pudo actualizar la contraseña (Usuario no encontrado)' });
    }

    // Marcamos token como usado
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [resetReq.id]);

    res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error en reset:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
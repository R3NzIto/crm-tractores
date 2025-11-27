// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
require('dotenv').config();

const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN || '2h';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'token';

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

module.exports = router;

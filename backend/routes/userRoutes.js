// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { authMiddleware } = require('../middleware/authMiddleware');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid('admin', 'manager', 'employee').default('employee'),
});

const isAdmin = (role) => role === 'admin';

router.get('/', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }

  const { error, value } = createUserSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { name, email, password, role } = value;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({ message: 'El email ya esta registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, normalizedEmail, hashed, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando usuario:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'El email ya existe' });
    }
    res.status(500).json({ message: 'Error de servidor' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (!isAdmin(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }

  const userId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: 'ID invalido' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
  }

  try {
    const existing = await pool.query('SELECT id, role FROM users WHERE id = $1', [userId]);
    const target = existing.rows[0];
    if (!target) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (target.role === 'admin') {
      const admins = await pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'`);
      if (admins.rows[0].total <= 1) {
        return res.status(400).json({ message: 'No puedes eliminar el ultimo admin del sistema' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.status(204).send();
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;

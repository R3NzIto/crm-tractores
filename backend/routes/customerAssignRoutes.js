// backend/routes/customerAssignRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const Joi = require('joi');

const assignSchema = Joi.object({
  user_id: Joi.number().integer().required(),
});

const canManageAll = (role) => ['admin', 'manager', 'jefe'].includes(role);

router.patch('/:id/assign', authMiddleware, async (req, res) => {
  if (!canManageAll(req.user.role)) {
    return res.status(403).json({ message: 'No tienes permisos' });
  }

  const { error, value } = assignSchema.validate(req.body);
  if (error) return res.status(400).json({ message: 'Datos invalidos' });

  const { id } = req.params;
  const { user_id } = value;

  try {
    const existing = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!userCheck.rows.length) {
      return res.status(400).json({ message: 'Usuario destino no existe' });
    }

    const result = await pool.query(
      `UPDATE customers SET assigned_to = $1 WHERE id = $2 RETURNING *`,
      [user_id, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error asignando cliente:', err);
    res.status(500).json({ message: 'Error de servidor' });
  }
});

module.exports = router;
